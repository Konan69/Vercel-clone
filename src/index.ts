import express from "express";
import path from "path";
import cors from "cors";
import simpleGit from "simple-git";
import { generateId, getAllFiles } from "./helpers";
import { uploadFile } from "./aws";
// redis or aws sqs for queuing
import {createClient} from "redis"
const publisher = createClient();
publisher.connect();

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
  console.log(files)
  
  files.forEach(async file => {
      await uploadFile(file.slice(__dirname.length + 1), file)
  })
  // push to redis queue 
  publisher.lPush("build-queue", id)
  res.json({ id: id })
})


app.listen(3000, () => console.log('Server running on port 3000'))
