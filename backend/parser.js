// Strip Discord markdown formatting
function clean(text) {
  return text
    .replace(/\*\*/g, '')              // bold
    .replace(/`/g, '')                  // inline code
    .replace(/<t:\d+:[A-Za-z]>/g, '')  // Discord timestamps <t:123:R>
    .replace(/<https?:\/\/[^>]+>/g, '') // Discord masked links
    .replace(/:flag_[a-z]+:/g, '')      // flag emojis
    .replace(/\s+/g, ' ')              // normalize whitespace
    .trim();
}

// Parses NuntioBot Discord message format into structured alert objects

function parseNuntioMessage(rawContent) {
  const content = clean(rawContent);
  const results = [];
  const lines = content.trim().split('\n').map(l => l.trim()).filter(Boolean);

  // Volume update format: "TICKER\nTIME  PCT%  VOLvol"
  if (lines.length >= 2 && /^[A-Z]{1,6}$/.test(lines[0])) {
    const ticker = lines[0];
    for (let i = 1; i < lines.length; i++) {
      const m = lines[i].match(/^(\d{2}:\d{2})\s+([\d.]+)%\s+([\d.]+[kKmMbB]?\s*(?:vol)?)/i);
      if (m) {
        results.push({ type: 'volume_update', ticker, time: m[1], pct: parseFloat(m[2]), vol: m[3].trim() });
      }
    }
    if (results.length) return results;
  }

  // Main alert lines
  for (const line of lines) {
    const alert = parseLine(line);
    if (alert) results.push(alert);
  }

  return results;
}

function parseLine(line) {
  // Must start with time HH:MM
  const timeMatch = line.match(/^(\d{2}:\d{2})/);
  if (!timeMatch) return null;

  // Must have a ticker after an arrow
  const tickerMatch = line.match(/[↑↗↓↘→]\s+([A-Z]{1,6})/);
  if (!tickerMatch) return null;

  const time   = timeMatch[1];
  const ticker = tickerMatch[1];

  const priceLvlMatch = line.match(/<\s*\$[\d.]+[ck]?/i);
  const pctMatch      = line.match(/\s([\d.]+)%/);
  const nhodMatch     = line.match(/·\s*(\d+)\s*NHOD/);

  // Parse key:value pairs after pipe separators
  const fields = {};
  line.split('|').forEach(part => {
    const kv = part.match(/([A-Za-z\s]{1,10}):\s*([^|>*\n]{1,20})/);
    if (kv) fields[kv[1].trim().toUpperCase()] = kv[2].trim();
  });

  const flags = [];
  if (nhodMatch)                        flags.push('NHOD');
  if (/Halted\s+DOWN/i.test(line))      flags.push('Halted ↓');
  else if (/Halted\s+UP/i.test(line))   flags.push('Halted ↑');
  else if (/Halted/i.test(line))        flags.push('Halted');
  if (/High CTB/i.test(line))           flags.push('High CTB');
  if (/Reg SHO/i.test(line))            flags.push('Reg SHO');
  if (/News Pending/i.test(line))       flags.push('News Pending');
  if (/green bars/i.test(line))         flags.push('Green Bars');
  if (/Volatility/i.test(line))         flags.push('Volatility');
  if (/PR[⬏↗]/.test(line))             flags.push('PR');

  return {
    type:     'alert',
    time,
    ticker,
    priceLvl: priceLvlMatch ? priceLvlMatch[0].replace(/\s/g, '') : null,
    pct:      pctMatch ? parseFloat(pctMatch[1]) : null,
    nhod:     nhodMatch ? parseInt(nhodMatch[1]) : 0,
    float:    fields['FLOAT'] || null,
    rvol:     fields['RVOL']  || null,
    vol:      fields['VOL']   || null,
    io:       fields['IO']    || null,
    mc:       fields['MC']    || null,
    si:       fields['SI']    || null,
    theme:    fields['THEME'] || null,
    flags,
    raw:      line,
  };
}

module.exports = { parseNuntioMessage };
