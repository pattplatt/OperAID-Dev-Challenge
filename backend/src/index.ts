import express, { Request, Response } from 'express'
import http from 'http';
import { Server } from 'socket.io';
import mqtt from 'mqtt';

class SlidingWindow {
  private buffer: ScrapEvent[] = [];
  constructor(private windowMs: number) { }
  add(event: ScrapEvent) {
    this.buffer.push(event);
    const cutoff = Date.now() - this.windowMs;
    while (this.buffer.length && new Date(this.buffer[0].timestamp).getTime() < cutoff) {
      this.buffer.shift();
    }
    const sum = this.buffer.reduce((acc, e) => acc + e.value, 0);
    const count = this.buffer.length;
    const avg = count > 0 ? sum / count : 0;
    return { sumLast60s: sum, avgLast60s: avg, countLast60s: count };
  }
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:4200', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});
// 1. Define a type and a buffer map at top-level
interface ScrapEvent {
  machineId: string
  scrapIndex: number
  value: number
  timestamp: string
}
const windowBuffers = new Map<string, SlidingWindow>();

/* MQTT → Socket.IO bridge */
const mqttUrl = process.env.MQTT_URL || 'mqtt://localhost:1883';
const mqttClient = mqtt.connect(mqttUrl);

mqttClient.on('connect', () => mqttClient.subscribe('machines/+/scrap'));
mqttClient.on('message', (topic, payload) => {
  const ev = JSON.parse(payload.toString()) as ScrapEvent
  const key = `${ev.machineId}|${ev.scrapIndex}`;
  if (!windowBuffers.has(key)) {
    windowBuffers.set(key, new SlidingWindow(60 * 1000));
  }
  const metrics = windowBuffers.get(key)!.add(ev);

  io.emit('mqtt', {
    machineId: ev.machineId,
    scrapIndex: ev.scrapIndex,
    ...metrics,
    timestamp: new Date().toISOString()
  })
});

/* Basic REST health check */
app.get('/api/health', (_: Request, res: Response) => {
  res.json({ status: 'ok' })
})

/*Start servers */
const PORT = Number(process.env.PORT) || 3000;
server.listen(PORT, () => console.log(`HTTP+WS listening on :${PORT}`));
