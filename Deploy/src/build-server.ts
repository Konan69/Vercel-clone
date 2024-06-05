import { createClient, commandOptions } from "redis";
import { downloadS3Folder } from "./aws";
// import { buildProject } from "./utils";

const subscriber = createClient();
subscriber.connect()

async function main() {
    while(1) {
        const res = await subscriber.brPop(
            commandOptions({ isolated: true }),
            'build-queue',
            0
          );//@ts-ignore
				console.log(res.element)
    }
}
main();