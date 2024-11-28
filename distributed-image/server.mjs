import express from "express";
import { default as expressWsInit } from "express-ws";
import logger from "./logger.mjs";
import { dirname } from "path";
import sharp from "sharp";

const __dirname = dirname(new URL(import.meta.url).pathname);

const app = express();
const expressWs = expressWsInit(app);

const clients = [];
const hosts = [];

function notifyHostsOfClientChanges() {
    hosts.forEach((host) => {
        host.send(
            JSON.stringify({
                type: "clients",
                clients: clients.map((client) => {
                    return {
                        address: "[" + client._socket.remoteAddress + "]",
                        port: client._socket.remotePort,
                    };
                }),
            })
        );
    });
}

app.ws("/ws", (ws, req) => {
    ws.on("message", (msg) => {
        ws.send(msg);
    });

    ws.on("close", () => {
        logger.info(`DISCONNECT ${req.socket.remoteAddress}`);
        clients.splice(clients.indexOf(ws), 1);
        notifyHostsOfClientChanges();
    });

    clients.push(ws);
    logger.info(`CONNECT ${req.socket.remoteAddress}`);
    logger.info(`CLIENTS: ${clients.length}`);
    notifyHostsOfClientChanges();
});

app.ws("/host", (ws, req) => {
    ws.on("message", async (msg) => {
        const message = JSON.parse(msg);

        logger.info(
            `HOST ${req.socket.remoteAddress} sent message: ${JSON.stringify({
                ...message,
                data: message.data.substring(0, 10) + "...",
            })}`
        );

        const { med_w, med_h } = message;

        // Convert image to RGBA data
        const image = sharp(Buffer.from(message.data.split(",")[1], "base64"));
        const { data, info } = await image
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });
    });

    ws.on("close", () => {
        logger.info(`DISCONNECT ${req.socket.remoteAddress}`);
        hosts.splice(hosts.indexOf(ws), 1);
    });

    hosts.push(ws);
    ws.send(
        JSON.stringify({
            type: "clients",
            clients: clients.map((client) => {
                return {
                    address: "[" + client._socket.remoteAddress + "]",
                    port: client._socket.remotePort,
                };
            }),
        })
    );

    logger.info(`CONNECT ${req.socket.remoteAddress}`);
    logger.info(`HOSTS: ${hosts.length}`);
});

app.use(express.static("public"));

app.get("/host", (req, res) => {
    res.sendFile(__dirname + "/host.html");
});

app.listen(3000, () => {
    logger.info("Server started on http://localhost:3000");
});
