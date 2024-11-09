import express from "express";
import { default as expressWsInit } from "express-ws";
import logger from "./logger.mjs";
import { dirname } from "path";

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
    ws.on("message", (msg) => {
        if (msg[0] === "{") {
            const state = JSON.parse(msg);
            const host = hosts.find((host) => host === ws);
            host.state = state;
            // console.log(host.state);
        } else {
            clients.forEach((client) => {
                client.send(msg);
            });
        }
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
