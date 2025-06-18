# OperAID-Dev-Challenge

This repository contains a small demo stack consisting of a Node.js backend, an Angular frontend and a Mosquitto MQTT broker. The backend subscribes to MQTT topics and broadcasts metrics over WebSockets for the frontend dashboard.

## Prerequisites

- [Node.js](https://nodejs.org/) (includes npm)
- [Mosquitto MQTT Broker](https://mosquitto.org/)

### Installing Mosquitto

#### macOS
```bash
brew install mosquitto
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install mosquitto mosquitto-clients
sudo systemctl enable mosquitto
sudo systemctl start mosquitto
```

## Running the Entire Stack

From the repository root install all dependencies and start every service (broker, backend, publisher and frontend) in parallel:
```bash
npm install
npm run start:all
```

To run only the broker, backend and publisher without the Angular dev server use:
```bash
npm run start
```

## Individual Services

Each service can be started separately if needed.

- **Backend** – see [backend/README.md](backend/README.md) for detailed instructions.
- **Frontend** – from the root run `npm run start:frontend` or from the `frontend` directory run `ng serve`.
- **Broker** – `mosquitto -c mosquitto/config/mosquitto.conf`.
- **Publisher** – `npm --prefix backend run publisher` generates demo MQTT messages.

## Repository Structure

- `backend/` – Node.js/TypeScript service bridging MQTT and WebSockets.
- `frontend/` – Angular dashboard application.
- `mosquitto/` – simple broker configuration.


