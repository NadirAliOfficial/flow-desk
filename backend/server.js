require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const axios   = require('axios');
const { parseNuntioMessage } = require('./parser');

const app = express();
app.use(cors());
app.use(express.json());

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID    = process.env.CHANNEL_ID || '936597136764727320';
const POLL_INTERVAL = 12000; // ms — slow enough to avoid detection

let lastMessageId = null;
let alerts        = [];
const sseClients  = new Set();

function discordHeaders() {
  return {
    'Authorization': DISCORD_TOKEN,
    'User-Agent': 'Mozilla/5.0 (Linux; Android 8.0.0; SM-G955U Build/R16NW) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'en-GB,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'X-Discord-Locale': 'en-US',
    'X-Discord-Timezone': 'Asia/Dubai',
    'X-Debug-Options': 'bugReporterEnabled',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'Referer': `https://discord.com/channels/936597136764727316/${CHANNEL_ID}`,
  };
}

// Random jitter so requests don't fire on a fixed clock
function jitter() {
  return Math.floor(Math.random() * 4000); // 0–4s extra
}

// ── Discord polling ────────────────────────────────────────────────────────

async function pollDiscord() {
  try {
    const params = { limit: 10 };
    if (lastMessageId) params.after = lastMessageId;

    const res = await axios.get(
      `https://discord.com/api/v9/channels/${CHANNEL_ID}/messages`,
      {
        params,
        headers: discordHeaders(),
      }
    );

    const messages = res.data;
    if (!messages || !messages.length) return;

    // Discord returns newest first — reverse to process oldest first
    const ordered = [...messages].reverse();

    for (const msg of ordered) {
      lastMessageId = msg.id;

      // Only process NuntioBot messages
      if (!msg.author?.username?.toLowerCase().includes('nuntio')) continue;

      const parsed = parseNuntioMessage(msg.content);
      for (const alert of parsed) {
        if (alert.type !== 'alert') continue;
        alerts.unshift(alert);
        if (alerts.length > 50) alerts.pop();
        broadcast(alert);
        console.log(`[alert] ${alert.time} ${alert.ticker} ${alert.pct ? '+' + alert.pct + '%' : ''}`);
      }
    }
  } catch (err) {
    if (err.response?.status === 429) {
      console.warn('[rate limit] backing off 10s');
      await new Promise(r => setTimeout(r, 10000));
    } else {
      console.error('[poll error]', err.message);
    }
  }
}

// ── SSE broadcast ──────────────────────────────────────────────────────────

function broadcast(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(res => res.write(payload));
}

// ── Routes ─────────────────────────────────────────────────────────────────

// SSE stream — dashboard subscribes here
app.get('/events', (req, res) => {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.flushHeaders();

  // Send latest alerts on connect
  res.write(`data: ${JSON.stringify({ type: 'init', alerts })}\n\n`);

  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
});

// Latest alerts REST endpoint
app.get('/alerts', (req, res) => res.json(alerts));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', alerts: alerts.length }));

// ── Boot ───────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`FlowDesk backend running on port ${PORT}`));

// Fetch recent history on boot, then start polling for new messages
(async () => {
  try {
    const res = await axios.get(
      `https://discord.com/api/v9/channels/${CHANNEL_ID}/messages?limit=50`,
      {
        headers: discordHeaders(),
      }
    );

    const messages = [...res.data].reverse(); // oldest first
    for (const msg of messages) {
      if (!msg.author?.username?.toLowerCase().includes('nuntio')) continue;
      const parsed = parseNuntioMessage(msg.content);
      for (const alert of parsed) {
        if (alert.type !== 'alert') continue;
        alerts.unshift(alert);
      }
    }
    if (alerts.length > 50) alerts.length = 50;

    lastMessageId = res.data[0]?.id; // most recent message ID
    console.log(`[boot] loaded ${alerts.length} alerts, polling from ${lastMessageId}`);
  } catch (e) {
    console.error('[boot error]', e.message);
  }
  const schedulePoll = () => setTimeout(async () => {
    await pollDiscord();
    schedulePoll();
  }, POLL_INTERVAL + jitter());
  schedulePoll();
})();
