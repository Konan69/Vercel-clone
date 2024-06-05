import { createClient, commandOptions } from "redis";
import { downloadS3Folder } from "./aws";
import { buildProject } from "./util";


const subscriber = createClient();
subscriber.connect()

async function main() {
    while(1) {
        const res = await subscriber.brPop(
            commandOptions({ isolated: true }),
            'build-queue',
            0
          );//@ts-ignore
          const id = res.element
          //@ts-ignore
		 console.log(res.element)
        await downloadS3Folder(`output/${id}`)
        await buildProject(id)
        console.log("all files downloaded succesfully");
    }
}
main();