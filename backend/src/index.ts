import express, { Request, Response } from 'express'
import http from 'http';
import { Server } from 'socket.io';
import mqtt from 'mqtt';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

/* 1️⃣  MQTT → Socket.IO bridge */
const mqttUrl = process.env.MQTT_URL || 'mqtt://localhost:1883';
const mqttClient = mqtt.connect(mqttUrl);         // MQTT.js 5.13.1 [oai_citation:2‡npmjs.com](https://www.npmjs.com/package/mqtt?utm_source=chatgpt.com)

mqttClient.on('connect', () => mqttClient.subscribe('machines/+/scrap'));
mqttClient.on('message', (topic, payload) => {
  const message = payload.toString();
  console.log(`MQTT Message → ${topic}: ${message}`);
  io.emit('mqtt', { topic, payload: payload.toString() });
});

/* 2️⃣  Basic REST health check */
app.get('/api/health', (_: Request, res: Response) => {
  res.json({ status: 'ok' })
})

/* 3️⃣  Start servers */
const PORT = Number(process.env.PORT) || 3000;
server.listen(PORT, () => console.log(`HTTP+WS listening on :${PORT}`));
