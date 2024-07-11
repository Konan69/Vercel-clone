import { exec, spawn } from "child_process";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { getAllFiles, uploadFilev3 } from "./aws";
import { Kafka } from "kafkajs";

dotenv.config();

const PROJECT_ID = process.env.PROJECT_ID;
const ROOTDIR = process.env.ROOTDIR;
const DEPLOYMENT_ID = process.env.DEPLOYMENT_ID;
const BROKER = process.env.KAFKA_URL;
const PASSWORD = process.env.KAFKA_PW;

const kafka = new Kafka({
  clientId: `docker-build-server${DEPLOYMENT_ID}`,
  brokers: [BROKER!],
  ssl: {
    ca: [fs.readFileSync(path.join(__dirname, "kafka.pem"), "utf8")],
  },
  sasl: {
    mechanism: "plain",
    username: "avnadmin",
    password: PASSWORD!,
  },
});

const producer = kafka.producer();

const publishLog = async (log: any) => {
  await producer.send({
    topic: "container-logs",
    messages: [
      { key: "log", value: JSON.stringify({ PROJECT_ID, DEPLOYMENT_ID, log }) },
    ],
  });
};

async function init(ROOTDIR: string = "") {
  try {
    await producer.connect();
    console.log("executing script.js");
    await publishLog("Build Started");

    const outDirPath = path.join(__dirname, `../uploads/${ROOTDIR}`);

    // Execute build command with a timeout
    await new Promise((resolve, reject) => {
      const p = exec(`cd ${outDirPath} && npm install && npm run build`, {
        timeout: 600000,
      }); // 10 minute timeout
      console.log(outDirPath);

      p.stdout?.on("data", async (data) => {
        console.log(`stdout: ${data}`);
        await publishLog(data.toString());
      });

      p.stderr?.on("data", async (data) => {
        console.log(`stderr: ${data}`);
        await publishLog(`error: ${data.toString()}`);
      });

      p.on("close", resolve);
      p.on("error", reject);
    });

    console.log("build complete");
    await publishLog(`Build complete`);

    const distFolderPath = path.join(
      __dirname,
      `../uploads/${ROOTDIR}`,
      "dist",
    );
    await publishLog("upload starting...");
    const distFolderContents = getAllFiles(distFolderPath);
    const uploadPromises = distFolderContents.map(async (file) => {
      console.log("uploading", file);
      await publishLog(`uploading ${file}`);
      await uploadFilev3(
        `dist/${PROJECT_ID}/` + file.slice(distFolderPath.length + 1),
        file,
      );
      publishLog(`uploaded ${file}`);
    });

    await Promise.all(uploadPromises);
    await publishLog("all files uploaded");
  } catch (error) {
    console.error("An error occurred:", error);
    publishLog(`Error: ${error}`);
  } finally {
    // Close Redis connection
    await producer.disconnect();
    // Exit the process
    process.exit(0);
  }
}

init(ROOTDIR);
