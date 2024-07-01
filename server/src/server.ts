import express from "express";
import { generateSlug } from "random-word-slugs";

const app = express();
app.use(express.json());

app.post("/project", (req, res) => {
  const { gitURL } = req.body;
  const projectSlug = generateSlug();

  // Spin the container
});

app.listen(9000, () => console.log("running on port 900-"));
