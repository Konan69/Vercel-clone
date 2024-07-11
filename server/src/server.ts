import express from "express";
import path from "path";
import { Kafka } from "kafkajs";
import fs from "fs";
import { PrismaClient, Prisma } from "@prisma/client";
import { ECSClient, RunTaskCommand } from "@aws-sdk/client-ecs";
import { generateSlug } from "random-word-slugs";
import { Server } from "socket.io";
import dotenv from "dotenv";
import z from "zod";
import { createClient } from "@clickhouse/client";

//ENViRONMENT VARIABLES
const clickhouse_host = process.env.CLICKHOUSE_HOST;
const region = process.env.BUCKET_REGION!;
const accessKeyId = process.env.S3_ACCESS_KEY!;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY!;
const PASSWORD = process.env.KAFKA_PW;
const BROKER = process.env.KAFKA_URL;
// CONFIGS
const ecsClient = new ECSClient({
  region,
  credentials: {
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
  },
});
const config = {
  CLUSTER: "arn:aws:ecs:eu-north-1:805866672805:cluster/builder-cluster",
  TASK: "arn:aws:ecs:eu-north-1:805866672805:task-definition/builder-task:2",
};
dotenv.config({ path: path.resolve("../.env") });

const prisma = new PrismaClient();

const client = createClient({
  host: clickhouse_host,
  database: "default",
  username: "avnadmin",
  password: process.env.CLICKHOUSE_PW,
});
const kafka = new Kafka({
  clientId: `api-server`,
  brokers: [BROKER!],
  ssl: {
    ca: [fs.readFileSync(path.join(__dirname, "kafka.pem"), "utf8")],
  },
  sasl: {
    mechanism: "plain",
    username: "avnadmin",
    password: PASSWORD!,
  },
});

const consumer = kafka.consumer({ groupId: "api-server-logs-consumer" });

const app = express();
app.use(express.json());

const io = new Server({ cors: { origin: "*" } });

io.on("connection", (socket) => {
  console.log("New socket connection");
  socket.on("subscribe", (channel) => {
    socket.join(channel);
    socket.emit("message", `joined ${channel}`);
  });
});

subscriber.on("error", (error) => {
  console.error("Redis subscription error:", error);
});
io.listen(9001);

// ROUTE

app.post("/projects", async (req, res) => {
  const schema = z.object({
    name: z.string(),
    gitURL: z.string(),
  });
  const safeBody = schema.safeParse(req.body);
  if (safeBody.error) return res.status(400).send({ error: safeBody.error });

  const { name, gitURL } = safeBody.data;

  const project = await prisma.project.create({
    data: {
      name,
      gitURL,
      subDomain: generateSlug(),
    },
  });
  res.status(201).send({ status: "success", data: { project } });
});

app.post("/deploy", async (req, res) => {
  const { projectId, rootDir } = req.body;

  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
  });
  if (!project) return res.status(404).send({ error: "Project not found" });

  // create a deployment status
  const deployment = await prisma.deployment.create({
    data: {
      projectId,
      status: "QUEUED",
    },
  });

  // Spin the container
  const command = new RunTaskCommand({
    cluster: config.CLUSTER,
    taskDefinition: config.TASK,
    launchType: "FARGATE",
    count: 1,
    networkConfiguration: {
      awsvpcConfiguration: {
        assignPublicIp: "ENABLED",
        subnets: [
          "subnet-0ac9880008a14808e",
          "subnet-00d5c3ade8f1889c2",
          "subnet-05d699f79fb5e6aa8",
        ],
        securityGroups: ["sg-0f3c0982ae018bc42"],
      },
    },
    overrides: {
      containerOverrides: [
        {
          name: "builder-image",
          environment: [
            {
              name: "GIT_REPO_URL",
              value: project.gitURL,
            },
            {
              name: "PROJECT_ID",
              value: project.id,
            },
            {
              name: "DEPLOYMENT_ID",
              value: deployment.id,
            },
            {
              name: "ROOTDIR",
              value: rootDir,
            },
          ],
        },
      ],
    },
  });
  await ecsClient.send(command);

  return res.json({
    status: deployment.status,
    data: { project, url: `http://${project.subDomain}.localhost:8000 ` },
  });
});

app.listen(9000, () => console.log("running on port 9000"));
