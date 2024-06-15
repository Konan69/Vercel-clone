import { exec, spawn } from "child_process";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import mime from "mime-types";
import { getAllFiles, uploadFile, uploadFilev3 } from "./aws";
dotenv.config({ path: path.resolve("../.env") });

const PROJECT_ID = process.env.PROJECT_ID!;
const ROOTDIR = process.env.ROOTDIR!;

export async function init(ROOTDIR: string = "") {
  console.log("executing script.js");
  const outDirPath = path.join(__dirname, `uploads/${ROOTDIR}`);

  const p = exec(`cd ${outDirPath} && npm install && npm run build`);
  p.stdout?.on("data", (data) => {
    console.log(`stdout: ${data}`);
  });
  p.stderr?.on("data", (data) => {
    console.log(`stderr: ${data}`);
  });
  p.on("close", async function () {
    console.log("build complete");

    const distFolderPath = path.join(__dirname, `uploads`, "dist");
    const distFolderContents = getAllFiles(distFolderPath);

    const uploadPromises = distFolderContents.map(async (file) => {
      const filePath = path.join(distFolderPath, file);
      if (fs.lstatSync(filePath).isDirectory()) return;
      console.log("uploading", filePath);
      uploadFilev3(`__outputs/${PROJECT_ID}/${file}`, filePath);
    });
    await Promise.all(uploadPromises);
  });
}

init(ROOTDIR);
