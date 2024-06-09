import { S3 } from "aws-sdk";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve('../.env') });

const s3 = new S3({
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    region: process.env.S3_REGION
});

export async function downloadS3Folder(prefix: string) {
    try {
        const allFiles = await s3.listObjectsV2({
            Bucket: process.env.BUCKET_NAME!,
            Prefix: prefix
        }).promise();

        console.log("Fetched files list from S3:", allFiles);
        console.log("triggered download function");

        if (!allFiles.Contents || allFiles.Contents.length === 0) {
            console.log("No files found in the specified prefix.");
            return;
        }

        const allPromises = allFiles.Contents.map(({ Key }) => {
            return new Promise<void>((resolve, reject) => {
                if (!Key) {
                    resolve();
                    return;
                }

                const finalOutputPath = path.join(__dirname, Key);
                const outputFile = fs.createWriteStream(finalOutputPath);
                const dirName = path.dirname(finalOutputPath);

                if (!fs.existsSync(dirName)) {
                    fs.mkdirSync(dirName, { recursive: true });
                }

                const stream = s3.getObject({
                    Bucket: process.env.BUCKET_NAME!,
                    Key
                }).createReadStream();

                stream.pipe(outputFile).on('finish', () => {
                    console.log(`Downloaded: ${Key}`);
                    resolve();
                }).on('error', (err) => {
                    console.error(`Error downloading ${Key}:`, err);
                    reject(err);
                });
            });
        });

        await Promise.all(allPromises);
        console.log("All files downloaded");

    } catch (error) {
        console.error("Error in downloadS3Folder:", error);
    }
}
