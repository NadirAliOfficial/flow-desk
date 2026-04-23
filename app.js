// ── Mock data ──────────────────────────────────────────────────────────────
// Structure mirrors NuntioBot Discord alert format:
// ticker, price level, % change, float, rvol, vol, theme, io, mc, si, flags

const ALERTS = [
  {
    ticker: 'ENVB',  time: '07:33', price: 4.21,  priceLvl: '< $5',
    pct: +147, nhod: true,  halted: false, flags: ['NHOD'],
    float: '1.5M',  rvol: '4,100x', vol: '14.1M',
    io: '2.1%',  mc: '6.3M',   si: '8.4%',  theme: 'Psychedelic',
  },
  {
    ticker: 'GNS',   time: '07:43', price: 0.348, priceLvl: '< $1',
    pct: +62,  nhod: false, halted: true,  flags: ['Halted', 'News Pending'],
    float: '20.2K', rvol: '890x',   vol: '20.2K',
    io: '0%',   mc: '4.2M',   si: '0%',    theme: 'Biotech',
  },
  {
    ticker: 'PBM',   time: '03:42', price: 12.40, priceLvl: '< $15',
    pct: +38,  nhod: false, halted: false, flags: [],
    float: '250K',  rvol: '620x',   vol: '3.1M',
    io: '58.55%', mc: '4.2M', si: '20.2%', theme: 'Pharma',
  },
  {
    ticker: 'RCT',   time: '03:50', price: 0.74,  priceLvl: '< $1',
    pct: +55,  nhod: false, halted: false, flags: ['High CTB'],
    float: '44.2M', rvol: '310x',   vol: '8.8M',
    io: '3.29%', mc: '30.8M', si: '12.1%', theme: 'Energy',
  },
  {
    ticker: 'ARTL',  time: '07:50', price: 3.85,  priceLvl: '< $5',
    pct: +91,  nhod: false, halted: false, flags: ['Reg SHO', 'High CTB'],
    float: '700K',  rvol: '2,200x', vol: '6.4M',
    io: '3.68%', mc: '4.2M',  si: '67.6%', theme: 'Biotech',
  },
  {
    ticker: 'SOPA',  time: '06:15', price: 1.12,  priceLvl: '< $5',
    pct: +113, nhod: true,  halted: false, flags: ['NHOD'],
    float: '3.2M',  rvol: '1,800x', vol: '9.1M',
    io: '1.2%',  mc: '8.1M',   si: '5.3%',  theme: 'Tech',
  },
  {
    ticker: 'MFON',  time: '05:58', price: 2.44,  priceLvl: '< $5',
    pct: +74,  nhod: false, halted: false, flags: ['High CTB'],
    float: '890K',  rvol: '950x',   vol: '4.2M',
    io: '0.8%',  mc: '5.5M',   si: '44.1%', theme: 'Comm',
  },
  {
    ticker: 'PEGY',  time: '05:22', price: 0.61,  priceLvl: '< $1',
    pct: +48,  nhod: false, halted: false, flags: [],
    float: '6.1M',  rvol: '420x',   vol: '2.9M',
    io: '4.5%',  mc: '3.7M',   si: '9.2%',  theme: 'Energy',
  },
];

// ── Chart instances ────────────────────────────────────────────────────────

let mainChart = null;
let candleSeries = null;
let volumeChart = null;
let volBarSeries = null;
let currentTicker = 'ENVB';
let currentTf = '1D';

// ── Candlestick data generator ─────────────────────────────────────────────

function priceFromAlert(item) {
  if (item.price != null) return item.price;
  if (item.priceLvl) {
    const m = item.priceLvl.match(/([\d.]+)/);
    if (m) return parseFloat(m[1]);
  }
  return 10;
}

function generateCandles(ticker, tf) {
  const seed = ticker.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const meta = ALERTS.find(a => a.ticker === ticker) || ALERTS[0];
  const basePrice = priceFromAlert(meta);

  const tfConfig = {
    '1D':  { bars: 78,  step: 5 * 60,       startOffset: 6.5 * 3600 },
    '5D':  { bars: 195, step: 15 * 60,      startOffset: 5 * 86400  },
    '1M':  { bars: 22,  step: 86400,         startOffset: 30 * 86400 },
    '3M':  { bars: 65,  step: 86400,         startOffset: 90 * 86400 },
    '6M':  { bars: 130, step: 86400,         startOffset: 180 * 86400},
    '1Y':  { bars: 252, step: 86400,         startOffset: 365 * 86400},
    '5Y':  { bars: 260, step: 7 * 86400,     startOffset: 5 * 365 * 86400 },
    'ALL': { bars: 300, step: 14 * 86400,    startOffset: 10 * 365 * 86400},
  };

  const cfg = tfConfig[tf] || tfConfig['1D'];
  const now = Math.floor(Date.now() / 1000);
  const startTime = now - cfg.startOffset;

  let price = basePrice * (0.85 + (seed % 20) * 0.01);
  const candles = [];
  const volumes = [];

  let rng = seed * 1234567;
  function rand() {
    rng = (rng * 1664525 + 1013904223) & 0xffffffff;
    return (rng >>> 0) / 0xffffffff;
  }

  for (let i = 0; i < cfg.bars; i++) {
    const t = startTime + i * cfg.step;
    const vol = (rand() * 0.06 - 0.03);
    const open = price;
    const close = price * (1 + vol);
    const high = Math.max(open, close) * (1 + rand() * 0.012);
    const low  = Math.min(open, close) * (1 - rand() * 0.012);
    price = close;

    candles.push({ time: t, open, high, low, close });
    volumes.push({
      time: t,
      value: 20e6 + rand() * 80e6,
      color: close >= open ? 'rgba(38,166,154,0.6)' : 'rgba(239,83,80,0.6)',
    });
  }

  // Drift final price toward real price
  const lastClose = candles[candles.length - 1].close;
  const drift = basePrice / lastClose;
  candles.forEach(c => {
    c.open  *= drift;
    c.high  *= drift;
    c.low   *= drift;
    c.close *= drift;
  });

  return { candles, volumes };
}

// ── Init charts ────────────────────────────────────────────────────────────

function initCharts() {
  const mainEl = document.getElementById('main-chart');
  const volEl  = document.getElementById('volume-chart');

  mainChart = LightweightCharts.createChart(mainEl, chartOptions(mainEl));
  candleSeries = mainChart.addCandlestickSeries({
    upColor:          '#26a69a',
    downColor:        '#ef5350',
    borderUpColor:    '#26a69a',
    borderDownColor:  '#ef5350',
    wickUpColor:      '#26a69a',
    wickDownColor:    '#ef5350',
  });

  // Moving average line
  const maSeries = mainChart.addLineSeries({
    color:       '#c9a227',
    lineWidth:   1.5,
    priceLineVisible: false,
    lastValueVisible: false,
  });

  volumeChart = LightweightCharts.createChart(volEl, {
    ...chartOptions(volEl),
    timeScale: { visible: false },
  });
  volBarSeries = volumeChart.addHistogramSeries({
    priceFormat: { type: 'volume' },
    priceScaleId: '',
    scaleMargins: { top: 0.1, bottom: 0 },
  });

  window._maSeries = maSeries;

  loadTicker(currentTicker, currentTf);
  bindResizeObserver(mainEl, mainChart);
  bindResizeObserver(volEl, volumeChart);
}

function chartOptions(el) {
  return {
    layout: {
      background: { type: 'solid', color: 'transparent' },
      textColor: '#6b6b75',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
      fontSize: 11,
    },
    grid: {
      vertLines: { color: 'rgba(255,255,255,0.03)' },
      horzLines:  { color: 'rgba(255,255,255,0.03)' },
    },
    crosshair: {
      mode: LightweightCharts.CrosshairMode.Normal,
      vertLine: { color: 'rgba(201,162,39,0.4)', width: 1, style: 2 },
      horzLine: { color: 'rgba(201,162,39,0.4)', width: 1, style: 2 },
    },
    rightPriceScale: {
      borderColor: 'rgba(255,255,255,0.06)',
      textColor: '#6b6b75',
    },
    timeScale: {
      borderColor: 'rgba(255,255,255,0.06)',
      timeVisible: true,
      secondsVisible: false,
    },
    handleScroll: true,
    handleScale:  true,
  };
}

function bindResizeObserver(el, chart) {
  const ro = new ResizeObserver(() => {
    chart.resize(el.clientWidth, el.clientHeight);
  });
  ro.observe(el);
}

// ── Load ticker ────────────────────────────────────────────────────────────

function loadTicker(ticker, tf) {
  currentTicker = ticker;
  currentTf = tf;

  const { candles, volumes } = generateCandles(ticker, tf);
  candleSeries.setData(candles);
  volBarSeries.setData(volumes);
  window._maSeries.setData(calcMA(candles, 20));
  mainChart.timeScale().fitContent();

  updateStockCard(ticker);
  document.getElementById('chart-ticker').textContent = ticker;
}

function updateStockCard(ticker) {
  const item = ALERTS.find(a => a.ticker === ticker);
  if (!item) return;

  document.getElementById('selected-ticker').textContent     = item.ticker;
  document.getElementById('selected-time').textContent       = item.time || '';
  document.getElementById('selected-price').textContent      = item.priceLvl || (item.price != null ? `$${item.price.toFixed(2)}` : '—');
  document.getElementById('selected-pricelevel').textContent = item.priceLvl || '';

  const pctEl = document.getElementById('selected-pct');
  if (item.pct != null) {
    const sign = item.pct >= 0 ? '+' : '';
    pctEl.textContent = `${sign}${item.pct}%`;
    pctEl.className   = 'stock-pct ' + (item.pct >= 0 ? 'positive' : 'negative');
  } else {
    pctEl.textContent = '';
  }

  document.getElementById('selected-float').textContent = item.float;
  document.getElementById('selected-rvol').textContent  = item.rvol;
  document.getElementById('selected-vol').textContent   = item.vol;
  document.getElementById('selected-io').textContent    = item.io;
  document.getElementById('selected-mc').textContent    = item.mc;
  document.getElementById('selected-si').textContent    = item.si;
  document.getElementById('selected-theme').textContent = item.theme;

  // Flags (NHOD, Halted, High CTB, Reg SHO)
  const flagsEl = document.getElementById('selected-flags');
  flagsEl.innerHTML = item.flags.map(f => {
    const cls = f === 'Halted' ? 'flag-halted' : f === 'NHOD' ? 'flag-nhod' : 'flag-default';
    return `<span class="flag ${cls}">${f}</span>`;
  }).join('');
}

function calcMA(candles, period) {
  const ma = [];
  for (let i = period - 1; i < candles.length; i++) {
    const sum = candles.slice(i - period + 1, i + 1).reduce((a, c) => a + c.close, 0);
    ma.push({ time: candles[i].time, value: sum / period });
  }
  return ma;
}

// ── Watchlist ──────────────────────────────────────────────────────────────

function renderWatchlist() {
  const container = document.getElementById('watchlist-items');
  container.innerHTML = ALERTS.map(item => {
    const active = item.ticker === currentTicker ? ' active' : '';
    const cls    = item.pct >= 0 ? 'positive' : 'negative';
    const sign   = item.pct >= 0 ? '+' : '';
    const displayPrice = item.priceLvl || (item.price != null ? `$${item.price.toFixed(2)}` : '—');
    return `
      <div class="watchlist-item${active}" onclick="selectWatchlistItem('${item.ticker}')">
        <span class="wl-ticker">${item.ticker}</span>
        <span class="wl-price">${displayPrice}</span>
        <span class="wl-change ${cls}">${item.pct != null ? sign + item.pct + '%' : ''}</span>
      </div>`;
  }).join('');
}

function selectWatchlistItem(ticker) {
  loadTicker(ticker, currentTf);
  renderWatchlist();
}

function refreshWatchlist() {
  renderWatchlist();
}

// ── Timeframe buttons ──────────────────────────────────────────────────────

document.querySelectorAll('.tf-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadTicker(currentTicker, btn.dataset.tf);
  });
});

// ── Live Discord feed via SSE ──────────────────────────────────────────────

const BACKEND = 'http://localhost:3001';

function connectLiveFeed() {
  const es = new EventSource(`${BACKEND}/events`);

  es.onmessage = (e) => {
    const data = JSON.parse(e.data);

    if (data.type === 'init') {
      // REST fetch already loaded latest alerts — skip SSE init to avoid reordering
      return;
    }

    // New live alert — always switch to newest
    upsertAlert(data);
    loadTicker(ALERTS[0].ticker, currentTf);
    renderWatchlist();
    flashNewAlert(data.ticker);
    playAlertSound(data.ticker);
  };

  es.onerror = () => {
    // Backend not reachable — keep using mock data silently
    es.close();
  };
}

function upsertAlert(alert) {
  const idx = ALERTS.findIndex(a => a.ticker === alert.ticker);
  if (idx !== -1) {
    ALERTS[idx] = { ...ALERTS[idx], ...alert };
    // Move to top if it was updated
    const [item] = ALERTS.splice(idx, 1);
    ALERTS.unshift(item);
  } else {
    ALERTS.unshift(alert);
    if (ALERTS.length > 20) ALERTS.pop();
  }
}

function playAlertSound(ticker) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(ticker.split('').join(' '));
  utter.rate  = 0.9;
  utter.pitch = 1.1;
  utter.volume = 1;
  window.speechSynthesis.speak(utter);
}

function flashNewAlert(ticker) {
  setTimeout(() => {
    const items = document.querySelectorAll('.watchlist-item');
    items.forEach(el => {
      if (el.querySelector('.wl-ticker')?.textContent === ticker) {
        el.style.transition = 'background 0.1s';
        el.style.background = 'rgba(201,162,39,0.25)';
        setTimeout(() => el.style.background = '', 600);
      }
    });
  }, 50);
}

// ── Boot ───────────────────────────────────────────────────────────────────

// Try real alerts first, fall back to mock if backend unreachable
fetch(`${BACKEND}/alerts`)
  .then(r => r.json())
  .then(data => {
    if (data.length) {
      ALERTS.length = 0;
      const seen = new Set();
      data.forEach(a => {
        if (!seen.has(a.ticker)) {
          seen.add(a.ticker);
          ALERTS.push(a);
        }
      });
    }
  })
  .catch(() => {})
  .finally(() => {
    currentTicker = ALERTS[0].ticker;
    renderWatchlist();
    initCharts();
    connectLiveFeed();
  });
