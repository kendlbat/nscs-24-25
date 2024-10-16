import * as crypto from "node:crypto";
import child_process, { ChildProcess } from "node:child_process";

function serializeBlockPayload(block: Block): string {
    return `${block.block.curNr}${block.block.timestamp}${block.block.transaction}${block.block.previoushash}${block.block.pow}${block.block.owner}${block.block.nonce}`;
}

export function isBlockValid(block: Block): boolean {
    const hash = crypto.createHash("sha256");
    hash.update(serializeBlockPayload(block));
    let digest = hash.digest("hex");
    return digest.toUpperCase() === block.newhash;
}

export function tryProveThis(transaction: Transaction): {
    prom: Promise<Block>;
    cancel: () => void;
} {
    let cancel = () => {};
    const workers: ChildProcess[] = [];
    cancel = async () => {
        workers.forEach((worker) => {
            worker.kill();
        });
    };
    let prom = new Promise<Block>((resolve, reject) => {
        // Spawn a node process with IPC enabled, send the transaction to it

        for (let i = 0; i < 10; i++) {
            const worker = child_process.fork(
                new URL("./worker.ts", import.meta.url).pathname,
                [],
                {
                    stdio: ["ipc"],
                }
            );
            workers.push(worker);

            worker.on("message", (block: Block) => {
                resolve(block);
                cancel();
            });
            worker.send(transaction);
        }
    });

    return { prom, cancel };
}
