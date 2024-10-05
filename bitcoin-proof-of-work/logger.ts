import winston from "winston";

const format = winston.format.printf(
    ({ level, message, timestamp }) => `${timestamp} ${level}: ${message}`
);

const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        format
    ),
    defaultMeta: { service: "user-service" },
    transports: [new winston.transports.Console()],
});

export default logger;
