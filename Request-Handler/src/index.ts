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

const S3PATH = "https://vercel-clone-konan.s3.eu-north-1.amazonaws.com/dist";
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
});
proxy.on("proxyReq", (proxyReq, req, res) => {
  const url = req.url;
  if (url === "/") proxyReq.path += "index.html";
});

app.listen(8000, () => console.log("Reverse proxy running on 8000"));
