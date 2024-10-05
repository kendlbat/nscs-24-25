import * as crypto from "node:crypto";
import child_process from "node:child_process";

function serializeBlockPayload(block: Block): string {
    return `${block.block.curNr},${block.block.timestamp},${block.block.transaction},${block.block.previoushash},${block.block.pow},${block.block.owner},${block.block.nonce}`;
}

export function isBlockValid(block: Block): boolean {
    const hash = crypto.createHash("sha256");
    hash.update(serializeBlockPayload(block));
    return hash.digest("hex") === block.newhash;
}

export function tryProveThis(transaction: Transaction): {
    prom: Promise<Block>;
    cancel: () => void;
} {
    let cancel = () => {};
    let prom = new Promise<Block>((resolve, reject) => {
        // Spawn a node process with IPC enabled, send the transaction to it
        const worker = child_process.fork(
            new URL("./worker.ts", import.meta.url).pathname,
            [],
            {
                stdio: ["ipc"],
            }
        );
        cancel = () => {
            worker.kill();
            reject("Cancelled");
        };
        worker.on("message", (block: Block) => {
            if (isBlockValid(block)) {
                worker.kill();
                resolve(block);
            }
        });
        worker.send(transaction);
    });
    return { prom, cancel };
}
