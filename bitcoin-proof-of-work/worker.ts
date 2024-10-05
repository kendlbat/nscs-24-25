// This gets started by the main thread and is responsible for computing the newhash of a block.

import * as crypto from "node:crypto";
import logger from "./logger";
import config from "./config.json";

function main(transaction: Transaction) {
    try {
        let hash: crypto.Hash;
        let block = {
            block: {
                curNr: transaction.block.curNr,
                timestamp: transaction.block.timestamp,
                transaction: transaction.block.transaction,
                previoushash: transaction.block.previoushash,
                pow: transaction.block.pow,
                owner: config.client.owner,
                nonce: 0,
            },
            newhash: "",
        };
        // transaction.block.pow is the required number of leading zeroes

        while (true) {
            block.block.nonce++;
            hash = crypto.createHash("sha256");
            hash.update(
                `${block.block.curNr},${block.block.timestamp},${block.block.transaction},${block.block.previoushash},${block.block.pow},${block.block.owner},${block.block.nonce}`
            );
            block.newhash = hash.digest("hex");
            if (
                block.newhash.startsWith("0".repeat(block.block.pow)) ||
                block.block.nonce === Number.MAX_SAFE_INTEGER
            ) {
                break;
            }
        }

        process.send!(block);
    } catch (e) {
        logger.error(e);
        process.exit(1);
    }
}

// Recieve the transaction from the main thread via IPC
process.on("message", (transaction: Transaction) => {
    main(transaction);
});
