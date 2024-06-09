import {exec, spawn } from 'child_process';
import path from "path";

export function buildProject(id: string) {
    return new Promise((resolve) => {
      console.log(__dirname)
      const child = exec(`cd ${path.join(__dirname, `./output/${id}/Client`)} && npm install && npm run build`)

      child.stdout?.on('data', (data) => {
        console.log(`stdout: ${data}`);
      });
      child.stderr?.on('data', (data) => {
        console.log(`stderr: ${data}`);
      });

      child.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
        resolve(code)
      });
    })

}