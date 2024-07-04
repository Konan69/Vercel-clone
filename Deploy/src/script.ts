import { exec, spawn } from "child_process";
import path from "path";
import dotenv from "dotenv";
import Redis from "ioredis";
import { getAllFiles, uploadFilev3 } from "./aws";

dotenv.config();

const REDIS_KEY = process.env.REDIS_KEY;
const PROJECT_ID = process.env.PROJECT_ID;
const ROOTDIR = process.env.ROOTDIR;

const publisher = new Redis(REDIS_KEY!);

function publishLog(logs: string) {
  publisher.publish(`logs:${PROJECT_ID}`, JSON.stringify(logs));
}

async function init(ROOTDIR: string = "") {
  try {
    console.log("executing script.js");
    publishLog("Build Started");

    const outDirPath = path.join(__dirname, `../uploads/${ROOTDIR}`);

    // Execute build command with a timeout
    await new Promise((resolve, reject) => {
      const p = exec(`cd ${outDirPath} && npm install && npm run build`, {
        timeout: 600000,
      }); // 10 minute timeout
      console.log(outDirPath);

      p.stdout?.on("data", (data) => {
        console.log(`stdout: ${data}`);
        publishLog(data.toString());
      });

      p.stderr?.on("data", (data) => {
        console.log(`stderr: ${data}`);
        publishLog(`error: ${data.toString()}`);
      });

      p.on("close", resolve);
      p.on("error", reject);
    });

    console.log("build complete");
    publishLog(`Build complete`);

    const distFolderPath = path.join(
      __dirname,
      `../uploads/${ROOTDIR}`,
      "dist",
    );
    publishLog("upload starting...");
    const distFolderContents = getAllFiles(distFolderPath);
    const uploadPromises = distFolderContents.map(async (file) => {
      console.log("uploading", file);
      publishLog(`uploading ${file}`);
      await uploadFilev3(
        `dist/${PROJECT_ID}/` + file.slice(distFolderPath.length + 1),
        file,
      );
      publishLog(`uploaded ${file}`);
    });

    await Promise.all(uploadPromises);
    publishLog("all files uploaded");
  } catch (error) {
    console.error("An error occurred:", error);
    publishLog(`Error: ${error}`);
  } finally {
    // Close Redis connection
    await publisher.quit();
    // Exit the process
    process.exit(0);
  }
}

init(ROOTDIR);
