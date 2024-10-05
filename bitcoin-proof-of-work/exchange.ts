import mqtt from "mqtt";
import logger from "./logger";
import config from "./config.json";

export interface Exchange {
    stop(): void;
    onNewBlock: (cbk: (block: Block) => void) => void;
    onNewTransaction: (cbk: (transaction: Transaction) => void) => void;
    publishBlock(block: Block): void;
}

export interface ExchangeSerializer {
    serializeBlock(block: Block): string;
    serializeTransaction(transaction: Transaction): string;
    deserializeBlock(data: string): Block;
    deserializeTransaction(data: string): Transaction;
}

export class JsonExchangeSerializer implements ExchangeSerializer {
    serializeBlock(block: Block): string {
        return JSON.stringify(block);
    }

    serializeTransaction(transaction: Transaction): string {
        return JSON.stringify(transaction);
    }

    deserializeBlock(data: string): Block {
        let block = JSON.parse(data);
        // Check if the block is valid
        if (
            !block.block.curNr ||
            !block.block.timestamp ||
            !block.block.transaction ||
            !block.block.previoushash ||
            !block.block.pow ||
            !block.block.owner ||
            !block.block.nonce ||
            !block.newhash ||
            !(typeof block.block.curNr === "number") ||
            !(typeof block.block.timestamp === "string") ||
            !(typeof block.block.transaction === "string") ||
            !(typeof block.block.previoushash === "string") ||
            !(typeof block.block.pow === "number") ||
            !(typeof block.block.owner === "string") ||
            !(typeof block.block.nonce === "number") ||
            !(typeof block.newhash === "string")
        ) {
            throw new Error("Invalid block");
        }
        return block;
    }

    deserializeTransaction(data: string): Transaction {
        let transaction = JSON.parse(data);
        // Check if the transaction is valid
        if (
            !transaction.block.curNr ||
            !transaction.block.timestamp ||
            !transaction.block.transaction ||
            !transaction.block.previoushash ||
            !transaction.block.pow ||
            !(typeof transaction.block.curNr === "number") ||
            !(typeof transaction.block.timestamp === "string") ||
            !(typeof transaction.block.transaction === "string") ||
            !(typeof transaction.block.previoushash === "string") ||
            !(typeof transaction.block.pow === "number")
        ) {
            throw new Error("Invalid transaction");
        }
        return transaction;
    }
}

export class MQTTExchange implements Exchange {
    private client = mqtt.connect(config.mqtt.url, {
        username: config.mqtt.username,
        password: config.mqtt.password,
        port: config.mqtt.port,
    });

    private serializer = new JsonExchangeSerializer();

    constructor() {
        this.client.on("connect", () => {
            logger.info("Connected to MQTT broker");
        });
    }

    stop() {
        this.client.end();
    }

    onNewBlock(cbk: (block: Block) => void) {
        this.client.subscribe(config.mqtt.topics.newblock);
        this.client.on("message", (topic, message) => {
            if (topic === config.mqtt.topics.newblock) {
                try {
                    cbk(this.serializer.deserializeBlock(message.toString()));
                } catch (e) {
                    logger.error("Invalid block recieved", e);
                }
            }
        });
    }

    onNewTransaction(cbk: (transaction: Transaction) => void) {
        this.client.subscribe(config.mqtt.topics.newtransaction);
        this.client.on("message", (topic, message) => {
            if (topic === config.mqtt.topics.newtransaction) {
                const str = message.toString();
                if (!str || str.trim() === "") {
                    return;
                }
                try {
                    cbk(this.serializer.deserializeTransaction(str));
                } catch (e) {
                    logger.error(`Invalid transaction recieved: ${str} ${e}`);
                }
            }
        });
    }

    publishBlock(block: Block) {
        this.client.publish(config.mqtt.topics.newblock, JSON.stringify(block));
    }
}
