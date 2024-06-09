import {S3} from 'aws-sdk';
import dotenv from "dotenv";
import path from "path";
import fs from "fs"; 
dotenv.config({path: path.resolve('../.env')});


const region = process.env.BUCKET_REGION
const accessKeyId = process.env.S3_ACCESS_KEY
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY
const bucketName = process.env.BUCKET_NAME


const s3 = new S3({
  accessKeyId: accessKeyId,
  secretAccessKey: secretAccessKey,
  region:region
});

export const uploadFile = async (fileName:string, localFilePath:string) => {
  const fileContent = fs.readFileSync(localFilePath);
  const response = await s3.upload({
    Body:fileContent,
    Bucket: bucketName!,
    Key: fileName
  }).promise()
  console.log(response)
}
