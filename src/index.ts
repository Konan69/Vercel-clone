import express from "express";
import path from "path";
import cors from "cors";
import simpleGit from "simple-git";
import { generateId, getAllFiles } from "./helpers";
import AWS from 'aws-sdk';
import {S3Client, PutObjectCommand} from '@aws-sdk/client-s3'


// load .env variables
import dotenv from "dotenv";
dotenv.config({path: path.resolve(__dirname, '../.env')});

// console.log();

const region = process.env.BUCKET_REGION
const accessKeyId = process.env.S3_ACCESS_KEY
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY
const bucketName = process.env.BUCKET_NAME


const s3 = new S3Client({
  credentials: {
    accessKeyId: accessKeyId!,
    secretAccessKey: secretAccessKey!,
  },
  region:region
});

// ( async () => await 
// s3.putObject({
//   Body: "hello",
//   Bucket: "vercel-clone-konan",
//   Key: "myfile.txt"
// }))

const app = express()
app.use(cors())
app.use(express.json())

app.post('/deploy', async (req, res) => {
  const repoUrl = req.body.repoUrl;
  const id = generateId()
  console.log(id)
  await simpleGit().clone(repoUrl, path.join(__dirname, `./output/${id}`));

  const files = getAllFiles(path.join(__dirname, `./output/${id}`));
  // push to s3 bucket
  
  res.json({ id: id })
})


app.listen(3000, () => console.log('Server running on port 3000'))
