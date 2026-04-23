#!/usr/bin/env node

import amqplib from "amqplib";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { appendFileSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const LOG_PATH = resolve(__dirname, "control-recording.jsonl");

const RABBITMQ_HOST = process.env.RABBITMQ_HOST || "localhost";
const RABBITMQ_PORT = Number(process.env.RABBITMQ_PORT || "5672");
const RABBITMQ_USER = process.env.RABBITMQ_DEFAULT_USER || "guest";
const RABBITMQ_PASS = process.env.RABBITMQ_DEFAULT_PASS || "guest";
const RABBITMQ_VHOST = process.env.RABBITMQ_VHOST || "/";
const CONTROL_EXCHANGE = process.env.POCKETHIVE_CONTROL_PLANE_EXCHANGE || "ph.control";

function rabbitUrl() {
  const vhost = RABBITMQ_VHOST === "/" ? "%2F" : encodeURIComponent(RABBITMQ_VHOST);
  return `amqp://${encodeURIComponent(RABBITMQ_USER)}:${encodeURIComponent(RABBITMQ_PASS)}@${RABBITMQ_HOST}:${RABBITMQ_PORT}/${vhost}`;
}

async function main() {
  const conn = await amqplib.connect(rabbitUrl());
  const ch = await conn.createChannel();
  await ch.assertExchange(CONTROL_EXCHANGE, "topic", { durable: true });
  const q = await ch.assertQueue("", { exclusive: true, autoDelete: true });

  for (const key of ["signal.#", "event.#"]) {
    await ch.bindQueue(q.queue, CONTROL_EXCHANGE, key);
  }

  ch.consume(
    q.queue,
    (msg) => {
      if (!msg) {
        return;
      }
      const entry = {
        timestamp: new Date().toISOString(),
        routingKey: msg.fields.routingKey,
        headers: msg.properties.headers || {},
        body: msg.content.toString("utf8")
      };
      appendFileSync(LOG_PATH, `${JSON.stringify(entry)}\n`, "utf8");
      ch.ack(msg);
    },
    { noAck: false }
  );

  const shutdown = async () => {
    try {
      await ch.close();
    } catch {}
    try {
      await conn.close();
    } catch {}
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

