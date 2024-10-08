import express from "express";
import path from "path";
import { Kafka } from "kafkajs";
import fs from "fs";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { ECSClient, RunTaskCommand } from "@aws-sdk/client-ecs";
import { generateSlug } from "random-word-slugs";
import dotenv from "dotenv";
import z from "zod";
import { v4 as uuidv4 } from "uuid";
import { createClient } from "@clickhouse/client";

//ENViRONMENT VARIABLES
const clickhouse_host = process.env.CLICKHOUSE_HOST;
const region = process.env.BUCKET_REGION;
const accessKeyId = process.env.S3_ACCESS_KEY!;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY!;
const PASSWORD = process.env.KAFKA_PW;
const BROKER = process.env.KAFKA_URL;
const CLICKHOUSE_PW = process.env.CLICKHOUSE_PW;
const CLUSTER = process.env.CLUSTER;
const TASK = process.env.TASK;
// CONFIGS
const ecsClient = new ECSClient({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});
const config = {
  CLUSTER,
  TASK,
};
dotenv.config({ path: path.resolve("../.env") });

const prisma = new PrismaClient();

const client = createClient({
  url: clickhouse_host,
  database: "default",
  username: "avnadmin",
  password: CLICKHOUSE_PW,
});
const kafka = new Kafka({
  clientId: `api-server`,
  brokers: [BROKER!],
  connectionTimeout: 3000,
  ssl: {
    ca: [fs.readFileSync(path.join(__dirname, "../kafka.pem"), "utf8")],
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
app.use(cors({ origin: "*" }));

const initkafkaConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({ topics: ["container-logs"], fromBeginning: true });

  await consumer.run({
    eachBatch: async ({
      batch,
      heartbeat,
      commitOffsetsIfNecessary,
      resolveOffset,
    }) => {
      const messages = batch.messages;
      for (const message of messages) {
        if (!message.value) continue;
        const stringMessage = message.value.toString()!;
        const { PROJECT_ID, DEPLOYMENT_ID, log } = JSON.parse(stringMessage);
        try {
          const { query_id } = await client.insert({
            table: "log_events",
            values: {
              project_id: uuidv4(),
              deployment_id: DEPLOYMENT_ID,
              log: log,
            },
            format: "JSONEachRow",
          });
          // Fix: Pass an object with the topic and partition
          resolveOffset(message.offset);
          // Fix: Pass an object with the topic and partition
          await commitOffsetsIfNecessary({
            topics: [
              {
                topic: batch.topic,
                partitions: [
                  {
                    partition: batch.partition,
                    offset: message.offset,
                  },
                ],
              },
            ],
          });
          await heartbeat();
        } catch (error) {
          console.error(error);
        }
      }
    },
  });
};

// ROUTES
app.get("/logs/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const logs = await client.query({
      query: `SELECT event_id, deployment_id, log, timestamp FROM log_events WHERE deployment_id ={deployment_id:String}`,
      query_params: {
        deployment_id: id,
      },
      format: "JSONEachRow",
    });
    const rawLogs = await logs.json();
    return res.status(200).json({ logs: rawLogs });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/projects", async (req, res) => {
  try {
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
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
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
  try {
    const deployment = await prisma.deployment.create({
      data: {
        projectId,
        status: "QUEUED",
      },
    });
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
                name: "PROJECT_ID",
                value: projectId,
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
      data: { project, data: { deploymentId: deployment.id } },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }

  // Spin the container
});

initkafkaConsumer();

app.listen(9000, () => console.log("running on port 9000"));
