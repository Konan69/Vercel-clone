import { exec, spawn } from "child_process";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { getAllFiles, uploadFilev3 } from "./aws";
import { Kafka } from "kafkajs";

dotenv.config();

const requiredEnvVars = [
  "PROJECT_ID",
  "DEPLOYMENT_ID",
  "KAFKA_URL",
  "KAFKA_PW",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

const PROJECT_ID = process.env.PROJECT_ID;
const ROOTDIR = process.env.ROOTDIR;
const DEPLOYMENT_ID = process.env.DEPLOYMENT_ID;
const BROKER = process.env.KAFKA_URL;
const PASSWORD = process.env.KAFKA_PW;

const kafka = new Kafka({
  clientId: `docker-build-server${DEPLOYMENT_ID}`,
  brokers: [BROKER!],
  ssl: {
    ca: [fs.readFileSync(path.join(__dirname, "../kafka.pem"), "utf8")],
  },
  sasl: {
    mechanism: "plain",
    username: "avnadmin",
    password: PASSWORD!,
  },
});

const producer = kafka.producer();

const publishLog = async (log: any) => {
  try {
    await producer.send({
      topic: "container-logs",
      messages: [
        {
          key: "log",
          value: JSON.stringify({ PROJECT_ID, DEPLOYMENT_ID, log }),
        },
      ],
    });
  } catch (error) {
    console.error("Error publishing log:", error);
  }
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
        timeout: 300000,
      }); // 5 minute timeout
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

    const possibleFolders = ["dist", "build"];
    let distFolderPath = null;
    // path.join(
    //   __dirname,
    //   `../uploads/${ROOTDIR}`,
    //   "dist",
    // );
    for (const folder of possibleFolders) {
      const possibleFolderPath = path.join(
        __dirname,
        `../uploads/${ROOTDIR}`,
        folder,
      );

      if (fs.existsSync(possibleFolderPath)) {
        distFolderPath = possibleFolderPath;
        break;
      }
    }

    if (!distFolderPath) {
      console.error("Neither 'dist' nor 'build' folder found!");
      publishLog("Neither 'dist' nor 'build' folder found!");
      return;
    }
    await publishLog("upload starting...");
    const distFolderContents = getAllFiles(distFolderPath);
    const uploadPromises = distFolderContents.map(async (file) => {
      console.log("uploading", file);
      await publishLog(`uploading ${file}`);
      await uploadFilev3(
        `dist/${PROJECT_ID}/` + file.slice(distFolderPath.length + 1),
        file,
      );
      await publishLog(`uploaded ${file}`);
    });

    await Promise.all(uploadPromises);
    await publishLog("all files uploaded");
  } catch (error) {
    console.error("An error occurred:", error);
    publishLog(`Error: ${error}`);
  } finally {
    // Close the connection
    await producer.disconnect();
    // Exit the process
    setTimeout(() => process.exit(0), 1000);
  }
}

init(ROOTDIR);
