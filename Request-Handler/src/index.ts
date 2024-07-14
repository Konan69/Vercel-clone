import express from "express";
import httpProxy from "http-proxy";
import { PrismaClient } from "@prisma/client";

import dotenv from "dotenv";
import path from "path";

const prisma = new PrismaClient();
dotenv.config({ path: path.resolve("../.env") });

const app = express();

const S3PATH = "https://vercel-clone-konan.s3.eu-north-1.amazonaws.com/dist";
const proxy = httpProxy.createProxy();

app.use(async (req, res) => {
  const host = req.hostname;

  const id = host.split(".")[0];

  const project = await prisma.project.findFirst({
    where: {
      subDomain: id,
    },
  });
  if (!project) {
    return res.status(404).send({ error: "Project not found" });
  }

  const resolvesTo = `${S3PATH}/${project.id}`;
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
