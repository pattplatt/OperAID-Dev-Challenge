# OperAID Node.js Backend

This service subscribes to MQTT topics from production machines and exposes the data to clients via Socket.IO. It also provides a simple REST endpoint for health checks. The code is written in TypeScript.

## Requirements

- Node.js >=16
- A running MQTT broker (e.g. Mosquitto)

## Installation

From this directory install dependencies:
```bash
npm install
```

## Running in Development

Start the server with live reload using nodemon and ts-node:
```bash
npm run dev
```

## Running in Production

Compile and launch the server:
```bash
npm run start
```

Optional environment variables:
- `PORT` – HTTP/WebSocket port (default: 3000)
- `MQTT_URL` – broker URL (default: `mqtt://localhost:1883`)

## MQTT Publisher

A demo publisher is provided to generate sample events:
```bash
npm run publisher
```

## Project Structure

- `src/index.ts` – Express/Socket.IO server bridging MQTT messages.
- `src/mqtt-publisher.js` – utility script that publishes random scrap events.
- `tsconfig.json` – TypeScript configuration.


