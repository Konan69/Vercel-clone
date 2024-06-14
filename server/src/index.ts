import express from "express";
import path from "path";
import cors from "cors";
import simpleGit from "simple-git";
import { generateId, getAllFiles } from "./helpers";
import { uploadFile } from "./aws";
// redis or aws sqs for queuing
import { createClient } from "redis";
const publisher = createClient();
publisher.connect();
const subscriber = createClient();
subscriber.connect();
const app = express();
app.use(cors());
app.use(express.json());

app.post("/upload", async (req, res) => {
  try {
    const repoUrl = req.body.repoUrl;
    const id = generateId();
    console.log(id);
    await simpleGit().clone(
      repoUrl,
      path.resolve(__dirname, `../dist/uploads/${id}`),
    );

    const files = getAllFiles(path.join(__dirname, `../dist/uploads/${id}`));

    // Create an array of upload promises
    const uploadPromises = files.map((file) => {
      const slicedFile = file.slice(__dirname.length + 2);
      return uploadFile(slicedFile, file);
    });

    // Wait for all upload promises to resolve
    await Promise.all(uploadPromises);

    // Push to Redis queue and update status
    await publisher.lPush("build-queue", id);
    await publisher.hSet("status", id, "uploaded");

    res.json({ id: id });
  } catch (error) {
    console.error("Error during upload process:", error);
    res.status(500).send("Error during upload process");
  }
});

app.get("/status", async (req, res) => {
  const id = req.query.id;
  const response = await subscriber.hGet("status", id as string);

  res.json({
    status: response,
  });
});

app.listen(3000, () => console.log("Server running on port 3000"));
