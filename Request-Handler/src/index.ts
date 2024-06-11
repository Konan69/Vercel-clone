import express from "express";
import { S3 } from "aws-sdk";

import dotenv from "dotenv";
import path from "path";
dotenv.config({path: path.resolve('../.env')});


const s3 = new S3({
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    region: process.env.S3_REGION
})

const app = express();

app.get("/*", async (req, res) => {
    
    const host = req.hostname;

    const id = host.split(".")[0];
    const filePath = req.path;
    console.log(id)

    const contents = await s3.getObject({
        Bucket: process.env.BUCKET_NAME!,
        Key: `dist/${id}${filePath}`
    }).promise();
    
    const type = filePath.endsWith("html") ? "text/html" : filePath.endsWith("css") ? "text/css" : "application/javascript"
    res.set("Content-Type", type);

    res.send(contents.Body);
})

app.listen(3001, () => console.log("listening on port 3001"));