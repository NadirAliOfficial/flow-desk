# FlowDesk

A real‑time trading dashboard that displays Discord trade alerts alongside interactive candlestick charts. It parses NuntioBot Discord messages, extracts alert data, and streams it via Server‑Sent Events to a lightweight front‑end built with vanilla HTML, CSS and JavaScript.

## Features

- Live alert cards showing ticker, price level, % change, float, RVol, volume, IO, MC, SI, theme and flags (NHOD, Halted, High CTB, Reg SHO, etc.)
- Watchlist of latest alerts with instant chart switching
- Candlestick chart with MA20 overlay and multiple timeframes (1D → All)
- Volume histogram panel
- Dark theme with gold accents

## Requirements

- Node.js (v14 or later)
- npm (comes with Node)

## Installation

```bash
# Clone the repository
git clone https://github.com/NadirAliOfficial/flow-desk.git
cd flow-desk

# Install backend dependencies
npm install --prefix backend
```

## Configuration

Create a `.env` file (or set environment variables) with the following variables:

- `DISCORD_TOKEN` – Discord bot token used to fetch messages
- `CHANNEL_ID` – Discord channel ID to poll (default: `936597136764727320`)
- `PORT` – Port for the backend server (default: `3001`)

Example `.env.example`:

```
DISCORD_TOKEN=your_discord_token_here
CHANNEL_ID=936597136764727320
PORT=3001
```

## Usage

Start the backend server:

```bash
node backend/server.js
```

The front‑end (`index.html`) connects to the backend at `http://localhost:3001/events` to receive live alerts.

## Project Structure

```
.
├── .github/                # GitHub templates
├── backend/                # Node.js backend
│   ├── package.json        # Backend dependencies
│   ├── parser.js           # Discord message parser
│   └── server.js           # Express server with SSE
├── app.js                  # Front‑end JavaScript (charting, mock data)
├── index.html              # Dashboard UI
├── styles.css              # Styling for the dashboard
├── LICENSE                 # MIT license
└── README.md               # Project documentation
```

## License

MIT License © 2026 Nadir Ali
