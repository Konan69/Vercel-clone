import express from "express";
import path from "path";
import { ECSClient, RunTaskCommand } from "@aws-sdk/client-ecs";
import { generateSlug } from "random-word-slugs";
import { Server } from "socket.io";
import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve("../.env") });

const app = express();
app.use(express.json());

//ENViRONMENT VARIABLES
const region = process.env.BUCKET_REGION!;
const accessKeyId = process.env.S3_ACCESS_KEY!;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY!;
const REDIS_KEY = process.env.REDIS_KEY;
const bucketName = process.env.BUCKET_NAME;

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

const subscriber = new Redis(REDIS_KEY!);

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
app.post("/project", async (req, res) => {
  const { gitURL, slug, rootDir } = req.body;
  const projectSlug = slug ? slug : generateSlug();

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
              value: gitURL,
            },
            {
              name: "PROJECT_ID",
              value: projectSlug,
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
  console.log(gitURL);

  return res.json({
    status: "queued",
    data: { projectSlug, url: `http://${projectSlug}.localhost:8000 ` },
  });
});

const initRedisSubscribe = async () => {
  console.log("subscribed to logs");
  subscriber.psubscribe("logs:*");
  subscriber.on("pmessage", (pattern, channel, message) => {
    io.to(channel).emit("message", message);
  });
};

initRedisSubscribe();
app.listen(9000, () => console.log("running on port 9000"));
