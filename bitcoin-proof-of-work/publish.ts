let initial = 40000;

// Send the following to the mqtt broker:
// {
//     "block": {
//         "curNr": 58,
//         "timestamp": dd.MM.yyyy HH:mm:ss,
//         "transaction": "I am Groot",
//         "previoushash": "random hash",
//         "pow": 6,
//     },

import { MQTTExchange } from "./exchange";
import logger from "./logger";
import * as crypto from "node:crypto";

const exchange = new MQTTExchange();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
    // When enter is pressed, send a new transaction
    const send = () => {
        const transaction = {
            block: {
                curNr: initial++,
                timestamp: new Date().toLocaleString("de-AT").replace(",", ""),
                transaction:
                    "I am Groot" + crypto.randomBytes(32).toString("hex"),
                previoushash: crypto
                    .randomBytes(32)
                    .toString("hex")
                    .toUpperCase(),
                pow: 6,
            },
        };
        logger.info(`Sending new transaction: ${transaction.block.curNr}`);
        exchange.publishTransaction(transaction);
    };

    while (true) {
        send();
        await sleep(1);
    }
}

main();
