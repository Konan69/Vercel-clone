import { exec, spawn } from "child_process";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import Redis from "ioredis";
import { getAllFiles, uploadFilev3 } from "./aws";
dotenv.config();

const REDIS_KEY = process.env.REDIS_KEY;
const GIT_URL = process.env.GIT_REPO_URL;
const PROJECT_ID = process.env.PROJECT_ID;
const ROOTDIR = process.env.ROOTDIR;

const publisher = new Redis(REDIS_KEY!);

function publishLog(logs: string) {
  publisher.publish(`logs: ${logs}`, JSON.stringify(logs));
}

export async function init(ROOTDIR: string = "") {
  console.log("executing script.js");
  publishLog("Build Started");

  const outDirPath = path.join(__dirname, `../uploads/${ROOTDIR}`);

  const p = exec(`cd ${outDirPath} && npm install && npm run build`);
  console.log(outDirPath);

  p.stdout?.on("data", (data) => {
    console.log(`stdout: ${data}`);
    publishLog(data.toString());
  });

  p.stderr?.on("data", (data) => {
    console.log(`stderr: ${data}`);
    publishLog(`error: ${data.toString()}`);
  });

  p.on("close", async function () {
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
      uploadFilev3(
        `dist/${PROJECT_ID}/` + file.slice(distFolderPath.length + 1),
        file,
      );
      publishLog(`uploaded ${file}`);
    });

    await Promise.all(uploadPromises);
    publishLog("all files uploaded");
  });
}

init(ROOTDIR);
