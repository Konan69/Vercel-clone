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



app.post('/upload', async (req, res) => {
  const repoUrl = req.body.repoUrl;
  const id = generateId()
  console.log(id)
  await simpleGit().clone(repoUrl, path.resolve(__dirname, `../dist/uploads/${id}`));


  const files = getAllFiles(path.join(__dirname, `../dist/uploads/${id}`));
  // push to s3 bucket
  
  files.forEach(async file => {
    const slicedFile = file.slice(__dirname.length + 2);
    await uploadFile(slicedFile, file);
  })
  // push to redis queue 
  publisher.lPush("build-queue", id)
  //store  status
  publisher.hSet('status', id, "uploaded")
  res.json({ id: id })

  

})


app.listen(3000, () => console.log('Server running on port 3000'))
