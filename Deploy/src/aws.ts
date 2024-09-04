import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { mimes } from "./util";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
dotenv.config();

const s3Client = new S3Client({
  region: process.env.BUCKET_REGION!,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});

export const getAllFiles = (folderPath: string) => {
  let response: string[] = [];
  const allFilesAndFolders = fs.readdirSync(folderPath);
  allFilesAndFolders.forEach((file) => {
    const fullFilePath = path.join(folderPath, file);
    if (fs.statSync(fullFilePath).isDirectory()) {
      response = response.concat(getAllFiles(fullFilePath));
    } else {
      response.push(fullFilePath);
    }
  });
  return response;
};

export const uploadFilev3 = async (fileName: string, localFilePath: string) => {
  const fileContent = fs.createReadStream(localFilePath);
  const response = new PutObjectCommand({
    Body: fileContent,
    Bucket: process.env.BUCKET_NAME!,
    Key: fileName,
    ContentType: mimes(fileName),
  });
  console.log(response);
  await s3Client.send(response);
  console.log("done!");
};
