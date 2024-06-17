import { exec, spawn } from "child_process";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { getAllFiles, uploadFilev3 } from "./aws";
dotenv.config();

const GIT_URL = process.env.GIT_REPO_URL;
const PROJECT_ID = process.env.PROJECT_ID;
const ROOTDIR = process.env.ROOTDIR;

export async function init(ROOTDIR: string = "") {
  // console.log("copying");
  // const c = exec(`git clone ${GIT_URL} /usr/app/uploads`);
  // c.stdout?.on("data", (data) => {
  //   console.log(`stdout: ${data}`);
  // });
  // c.stderr?.on("data", (data) => {
  //   console.log(`stderr: ${data}`);
  // });
  // c.on("close", async function () {
  //   console.log("build complete");
  // });

  console.log("executing script.js");

  const outDirPath = path.join(__dirname, `../uploads/${ROOTDIR}`);

  const p = exec(`cd ${outDirPath} && npm install && npm run build`);
  p.stdout?.on("data", (data) => {
    console.log(`stdout: ${data}`);
  });
  p.stderr?.on("data", (data) => {
    console.log(`stderr: ${data}`);
  });
  p.on("close", async function () {
    console.log("build complete");

    const distFolderPath = path.join(
      __dirname,
      `../uploads/${ROOTDIR}`,
      "dist",
    );
    const distFolderContents = getAllFiles(distFolderPath);

    const uploadPromises = distFolderContents.map(async (file) => {
      const filePath = path.join(distFolderPath, file);
      if (fs.lstatSync(filePath).isDirectory()) return;
      console.log("uploading", filePath);
      uploadFilev3(`__uploads/${PROJECT_ID}/${file}`, filePath);
    });
    await Promise.all(uploadPromises);
  });
}

init(ROOTDIR);
