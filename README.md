# OperAID-Dev-Challenge

## Prerequisites

Before starting, ensure you have the following installed on your system:

- [Node.js](https://nodejs.org/) (includes npm)
- [Mosquitto MQTT Broker](https://mosquitto.org/)

## Installing Mosquitto

### macOS

```bash
brew install mosquitto
```

### Ubuntu/Debian

```bash
sudo apt update
sudo apt install mosquitto mosquitto-clients
sudo systemctl enable mosquitto
sudo systemctl start mosquitto
```

## Starting the Backend

From the root directory, install dependencies and start the backend server:

```bash
npm install && npm run start
```

This command installs the required Node.js packages and starts the backend service.

## Starting Individual Services

If you prefer to start each service separately, use the following commands:

### Backend

From the root directory:

```bash
npm install && npm run start
```

This starts the backend server.

### Publisher

From the root directory, run the MQTT publisher script:

```bash
node src/mqtt-publisher.js
```

This script publishes messages to the MQTT broker.

### Broker

Start the Mosquitto broker with the custom configuration:

```bash
mosquitto -c mosquitto/config/mosquitto.conf
```

## Starting the Frontend

### From the root directory

Install dependencies and start the frontend development server:

```bash
npm install && npm run start:frontend
```

### From the frontend directory

Alternatively, navigate to the frontend directory and run:

```bash
cd frontend
npm install && ng serve
```

This will start the Angular development server for the frontend application.