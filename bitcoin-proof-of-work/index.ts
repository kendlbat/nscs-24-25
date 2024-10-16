#!/usr/bin/env node
import { MQTTExchange } from "./exchange";
import logger from "./logger";
import { tryProveThis, isBlockValid } from "./algo";

const exchange = new MQTTExchange();
const working: { [curId: number]: () => void } = {};
const chain: Block[] = [];

exchange.onNewTransaction(async (transaction) => {
    logger.info(`Recieved new transaction: ${transaction.block.curNr}`);
    const { prom, cancel } = tryProveThis(transaction);
    working[transaction.block.curNr] = cancel;
    try {
        const block = await prom;
        logger.info(
            `Found new block: ${transaction.block.curNr} with nonce ${block.block.nonce}`
        );
        delete working[transaction.block.curNr];
        exchange.publishBlock(block);
    } catch (e) {
        logger.error(`Failed to find block: ${transaction.block.curNr}`);
        logger.error(e);
    }
});

exchange.onNewBlock((block) => {
    logger.info(
        `Recieved new block: ${block.block.curNr} with hash ${block.newhash}`
    );
    if (isBlockValid(block)) {
        logger.info("Block is valid");
        chain.push(block);
        logger.info(`Chain length: ${chain.length}`);
        if (working[block.block.curNr]) {
            working[block.block.curNr]();
        }
    } else {
        logger.error("Block is invalid");
    }
});

// Exit gracefully
const end = () => {
    logger.info("Shutting down");
    exchange.stop();
    process.exit();
};

process.on("SIGINT", end);
process.on("SIGTERM", end);
