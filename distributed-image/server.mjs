import express from "express";
import { default as expressWsInit } from "express-ws";
import logger from "./logger.mjs";
import { dirname } from "path";
import sharp from "sharp";
import crypto from "node:crypto";
const IMAGES = {};

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
        const data = JSON.parse(msg);

        if (data.type === "image") {
            logger.info(
                `CLIENT ${
                    req.socket.remoteAddress
                } sent image: ${JSON.stringify({
                    ...data,
                    image: {
                        ...data.image,
                        data: undefined,
                    },
                })}`
            );

            const { image, filter } = data;
            const { id, slice } = image;

            if (IMAGES[id]) {
                IMAGES[id].slices.push({
                    slice,
                    image,
                    filter,
                    data: convertFromRawBase64(image.data),
                });

                if (IMAGES[id].slices.length === IMAGES[id].count) {
                    const { info, slices: sls } = IMAGES[id];
                    const { width, height } = info;
                    const assembledImage = new Uint8Array(width * height * 4);

                    const slices = sls.sort((a, b) => a.slice - b.slice);

                    slices.forEach((slice, i) => {
                        const { image, filter, data } = slice;
                        const { width: sliceWidth, height: sliceHeight } =
                            image;

                        const sliceBeginCol =
                            i * (sliceWidth - filter.width * 2) - filter.width;

                        for (let y = 0; y < sliceHeight; y++) {
                            for (let x = filter.width; x < sliceWidth; x++) {
                                const index = (y * sliceWidth + x) * 4;
                                const dataIndex = (y * sliceWidth + x) * 4;
                                const assembledIndex =
                                    ((y + filter.height) * width +
                                        x +
                                        sliceBeginCol) *
                                    4;

                                assembledImage[assembledIndex] =
                                    data[dataIndex];
                                assembledImage[assembledIndex + 1] =
                                    data[dataIndex + 1];
                                assembledImage[assembledIndex + 2] =
                                    data[dataIndex + 2];
                                assembledImage[assembledIndex + 3] =
                                    data[dataIndex + 3];
                            }
                        }
                    });

                    logger.info(`Assembled image ${id}`);

                    sharp(assembledImage, {
                        raw: { width, height, channels: 4 },
                    })
                        .toFormat("png")
                        .toBuffer()
                        .then((png) => {
                            hosts.forEach((host) => {
                                host.send(
                                    JSON.stringify({
                                        type: "image",
                                        filter,
                                        image: {
                                            id,
                                            data:
                                                "data:image/png;base64," +
                                                convertToRawBase64(png),
                                        },
                                    })
                                );
                            });
                        });

                    delete IMAGES[id];
                }
            }
        }
    });

    ws.on("close", () => {
        logger.info(
            `DISCONNECT ${req.socket.remoteAddress}:${req.socket.remotePort}`
        );
        clients.splice(clients.indexOf(ws), 1);
        notifyHostsOfClientChanges();
    });

    clients.push(ws);
    logger.info(`CONNECT ${req.socket.remoteAddress}:${req.socket.remotePort}`);
    logger.info(`CLIENTS: ${clients.length}`);
    notifyHostsOfClientChanges();
});

function getAreaAsPixelData(data, info, x, y, width, height) {
    const area = new Uint8Array(width * height * 4);
    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            const index = (i * width + j) * 4;
            const dataIndex = ((y + i) * info.width + x + j) * 4;
            area[index] = data[dataIndex];
            area[index + 1] = data[dataIndex + 1];
            area[index + 2] = data[dataIndex + 2];
            area[index + 3] = data[dataIndex + 3];
        }
    }
    return {
        data: area,
        width,
        height,
    };
}

function convertToRawBase64(data) {
    return Buffer.from(data).toString("base64");
}

function convertFromRawBase64(data) {
    return Buffer.from(data, "base64");
}

app.ws("/host", (ws, req) => {
    ws.on("message", async (msg) => {
        const message = JSON.parse(msg);

        logger.info(
            `HOST ${req.socket.remoteAddress}:${
                req.socket.remotePort
            } sent message: ${JSON.stringify({
                ...message,
                data: message.data.substring(0, 10) + "...",
            })}`
        );

        const { med_w, med_h } = message;

        /**
         * @type {Array<{width: number; height: number; x: number; y: number; data: Buffer }>}
         */
        const slices = [];

        const image = sharp(Buffer.from(message.data.split(",")[1], "base64"));
        const { data, info } = await image
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        /* id for unique image
        const hash = crypto.createHash("sha256");
        hash.update(data);
        const digest = hash.digest("base64");
        const id = digest.slice(0, 8);
        */
        const id = crypto.randomUUID();

        IMAGES[id] = {
            info,
            count: clients.length,
            slices: [],
        };

        logger.info(`Image ID: ${id}`);

        const { width, height } = info;

        const sliceWidth = Math.ceil(width / clients.length);

        clients.forEach((client, i) => {
            let sliceBeginCol = i * sliceWidth - med_w;
            let sliceEndCol = (i + 1) * sliceWidth + med_w;
            if (sliceBeginCol < 0) {
                sliceBeginCol = 0;
            }
            if (sliceEndCol > width) {
                sliceEndCol = width;
            }

            const slice = getAreaAsPixelData(
                data,
                info,
                sliceBeginCol,
                0,
                sliceEndCol - sliceBeginCol,
                height
            );

            client.send(
                JSON.stringify({
                    type: "image",
                    image: {
                        width: sliceEndCol - sliceBeginCol,
                        height: height,
                        id,
                        slice: i,
                        data: convertToRawBase64(slice.data),
                    },
                    filter: {
                        type: "median",
                        width: med_w,
                        height: med_h,
                    },
                })
            );
        });
    });

    ws.on("close", () => {
        logger.info(
            `DISCONNECT ${req.socket.remoteAddress}:${req.socket.remotePort}`
        );
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

    logger.info(`CONNECT ${req.socket.remoteAddress}:${req.socket.remotePort}`);
    logger.info(`HOSTS: ${hosts.length}`);
});

app.use(express.static("public"));
app.use("/dist", express.static("dist"));

app.get("/host", (req, res) => {
    res.sendFile(__dirname + "/host.html");
});

app.listen(3000, () => {
    logger.info("Server started on http://localhost:3000");
});
