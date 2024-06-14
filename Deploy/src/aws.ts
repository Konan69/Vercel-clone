import { S3 } from "aws-sdk";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import mime from "mime-types";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
dotenv.config({ path: path.resolve("../.env") });

const s3 = new S3({
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  region: process.env.S3_REGION,
});

const s3Client = new S3Client({
  region: process.env.BUCKET_REGION!,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});

export async function downloadS3Folder(prefix: string) {
  try {
    const allFiles = await s3
      .listObjectsV2({
        Bucket: process.env.BUCKET_NAME!,
        Prefix: prefix,
      })
      .promise();

    console.log("Fetched files list from S3:", allFiles);
    console.log("triggered download function");

    if (!allFiles.Contents || allFiles.Contents.length === 0) {
      console.log("No files found in the specified prefix.");
      return;
    }

    const allPromises = allFiles.Contents.map(({ Key }) => {
      return new Promise<void>((resolve, reject) => {
        if (!Key) {
          resolve();
          return;
        }

        const finalOutputPath = path.join(__dirname, Key);
        const outputFile = fs.createWriteStream(finalOutputPath);
        const dirName = path.dirname(finalOutputPath);

        if (!fs.existsSync(dirName)) {
          fs.mkdirSync(dirName, { recursive: true });
        }

        const stream = s3
          .getObject({
            Bucket: process.env.BUCKET_NAME!,
            Key,
          })
          .createReadStream();

        stream
          .pipe(outputFile)
          .on("finish", () => {
            console.log(`Downloaded: ${Key}`);
            resolve();
          })
          .on("error", (err) => {
            console.error(`Error downloading ${Key}:`, err);
            reject(err);
          });
      });
    });

    await Promise.all(allPromises);
    console.log("All files downloaded");
  } catch (error) {
    console.error("Error in downloadS3Folder:", error);
  }
}
// add root
export async function copyFinalDist(id: string) {
  const folderPath = path.join(__dirname, `uploads/${id}/Client/dist`);
  const allFiles = getAllFiles(folderPath);
  const uploadPromises = allFiles.map((file) =>
    uploadFile(`dist/${id}/` + file.slice(folderPath.length + 1), file),
  );
  await Promise.all(uploadPromises);
  console.log("All files uploaded");
}

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
  const fileContent = fs.readFileSync(localFilePath);
  const response = new PutObjectCommand({
    Body: fileContent,
    Bucket: process.env.BUCKET_NAME!,
    Key: fileName,
    ContentType:
      mime.lookup(fileContent.toString()) || "application/octet-stream",
  });
  console.log(response);
  await s3Client.send(response);
};

export const uploadFile = async (fileName: string, localFilePath: string) => {
  const fileContent = fs.readFileSync(localFilePath);
  const response = await s3
    .upload({
      Body: fileContent,
      Bucket: process.env.BUCKET_NAME!,
      Key: fileName,
    })
    .promise();
  console.log(response);
};
