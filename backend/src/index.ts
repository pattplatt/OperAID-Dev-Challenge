import express, { Request, Response } from 'express'
import http from 'http';
import { Server } from 'socket.io';
import mqtt from 'mqtt';

class SlidingWindow {
  private buffer: ScrapEvent[] = [];
  constructor(private windowMs: number) {}
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

/**
 * Buffer for MQTT messages when no WebSocket clients are connected.
 * Maintains a limited history so late connections still receive recent data.
 */
class FallbackBuffer<T = any> {
  private buffer: T[] = [];
  constructor(private capacity = 500) {}

  /** Add a message to the buffer, trimming oldest if capacity exceeded */
  push(msg: T) {
    this.buffer.push(msg);
    if (this.buffer.length > this.capacity) {
      this.buffer.shift();
    }
  }

  /** Drain buffered messages using the provided send function */
  drain(sendFn: (msg: T) => void) {
    while (this.buffer.length) {
      const msg = this.buffer.shift()!;
      sendFn(msg);
    }
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

// Track connected WebSocket clients and store messages when none are connected
let activeConnections = 0;
const fallbackBuffer = new FallbackBuffer<Record<string, any>>();

io.on('connection', socket => {
  activeConnections++;
  // Deliver any buffered MQTT messages to the new client
  fallbackBuffer.drain(m => socket.emit('mqtt', m));
  socket.on('disconnect', () => {
    activeConnections--;
  });
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

  const msg = {
    machineId: ev.machineId,
    scrapIndex: ev.scrapIndex,
    ...metrics,
    timestamp: new Date().toISOString()
  };

  if (activeConnections > 0) {
    io.emit('mqtt', msg);
  } else {
    fallbackBuffer.push(msg);
  }
});

/* Basic REST health check */
app.get('/api/health', (_: Request, res: Response) => {
  res.json({ status: 'ok' })
})

/*Start servers */
const PORT = Number(process.env.PORT) || 3000;
server.listen(PORT, () => console.log(`HTTP+WS listening on :${PORT}`));
