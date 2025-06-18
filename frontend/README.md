# OperAID Angular Frontend

This directory contains the Angular application for the OperAID project.

## Prerequisites

- [Node.js](https://nodejs.org/) and npm
- Angular CLI (`npm install -g @angular/cli`)

## Development Server

Install dependencies and start the dev server:

```bash
npm install
ng serve
```

Navigate to `http://localhost:4200/` to view the application. The server reloads on file changes.

The frontend expects the backend to be running on `http://localhost:3000` as configured in `src/app/core/socket.service.ts`.

## Building for Production

To create an optimized build in `dist/`:

```bash
ng build
```

## Project Structure

- `src/app/core/socket.service.ts` – establishes the WebSocket connection to the backend.
- `src/app/dashboard/` – dashboard component displaying real‑time metrics with Chart.js.

## Running from the Repository Root

From the repository root you can also start the frontend via:

```bash
npm run start:frontend
```

