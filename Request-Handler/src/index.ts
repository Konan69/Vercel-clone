import express from "express";
import { S3 } from "aws-sdk";
import httpProxy from "http-proxy";

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve("../.env") });

const s3 = new S3({
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  region: process.env.S3_REGION,
});

const app = express();

const S3PATH = "http://vercel-clone-konan.s3.eu-north-1.amazonaws.com/dist";
const proxy = httpProxy.createProxy();

app.use(async (req, res) => {
  const host = req.hostname;

  const id = host.split(".")[0];

  const resolvesTo = `${S3PATH}/${id}`;
  const filePath = req.path;
  console.log(id);
  console.log(filePath);

  proxy.web(req, res, {
    target: resolvesTo,
    changeOrigin: true,
  });

  //   try {
  //     const contents = await s3
  //       .getObject({
  //         Bucket: process.env.BUCKET_NAME!,
  //         Key: `dist/${id}${filePath}`,
  //       })
  //       .promise();

  //     const type = filePath.endsWith(".html")
  //       ? "text/html"
  //       : filePath.endsWith(".css")
  //         ? "text/css"
  //         : "application/javascript";

  //     res.set("Content-Type", type);
  //     res.send(contents.Body);
  //   } catch (error: any) {
  //     if (error.code === "NoSuchKey") {
  //       console.error(`File not found: dist/${id}${filePath}`);
  //       res.status(404).send("File not found");
  //     } else {
  //       console.error(`Error fetching file from S3: ${error.message}`);
  //       res.status(500).send("Internal Server Error");
  //     }
  //   }
});

app.listen(8000, () => console.log("Reverse proxy running on 8000"));
