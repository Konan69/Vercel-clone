import express from "express";
import path from "path";
import { ECSClient, RunTaskCommand } from "@aws-sdk/client-ecs";
import { generateSlug } from "random-word-slugs";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve("../.env") });

const region = process.env.BUCKET_REGION!;
const accessKeyId = process.env.S3_ACCESS_KEY!;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY!;
const bucketName = process.env.BUCKET_NAME;

const ecsClient = new ECSClient({
  region,
  credentials: {
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
  },
});

const config = {
  CLUSTER: "arn:aws:ecs:eu-north-1:805866672805:cluster/builder-cluster",
  TASK: "arn:aws:ecs:eu-north-1:805866672805:task-definition/builder-task:1",
};

const app = express();
app.use(express.json());

app.post("/project", async (req, res) => {
  const { gitURL, rootDir } = req.body;
  const projectSlug = generateSlug();

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

app.listen(9000, () => console.log("running on port 9000"));
