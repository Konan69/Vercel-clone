import { createClient, commandOptions } from "redis";
import { downloadS3Folder, copyFinalDist } from "./aws";
import { buildProject} from "./util";


const subscriber = createClient();
subscriber.connect()

const publisher = createClient()
publisher.connect();

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
        await downloadS3Folder(`uploads/${id}`)
        await buildProject(id, "Client")
        await copyFinalDist(id)
    publisher.hSet("status", id, "deployed")
    }
}
main();