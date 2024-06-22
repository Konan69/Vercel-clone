import { exec, spawn } from "child_process";
import path from "path";

export function buildProject(id: string, root: string | null = "") {
  return new Promise((resolve) => {
    console.log(__dirname);
    const child = exec(
      `cd ${path.join(__dirname, `./uploads/${id}/${root}`)} && npm install && npm run build`,
    );

    child.stdout?.on("data", (data) => {
      console.log(`stdout: ${data}`);
    });
    child.stderr?.on("data", (data) => {
      console.log(`stderr: ${data}`);
    });

    child.on("close", (code) => {
      console.log(`child process exited with code ${code}`);
      resolve(code);
    });
  });
}

export function mime(filePath: string) {
  filePath.endsWith(".html")
    ? "text/html"
    : filePath.endsWith(".css")
      ? "text/css"
      : "application/javascript";
}
