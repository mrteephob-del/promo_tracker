const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let val = (match[2] || '').trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        process.env[match[1]] = val;
      }
    }
  }
}

loadEnv();

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const APPS_SCRIPT_SECRET = process.env.APPS_SCRIPT_SECRET;

async function sync() {
  console.log('Fetching all rows from Google Sheets...');
  const [resPrt, resNoodle] = await Promise.all([
    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list', secret: APPS_SCRIPT_SECRET, sheetName: 'PRT', limit: 2000 })
    }),
    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list', secret: APPS_SCRIPT_SECRET, sheetName: 'NOODLE', limit: 2000 })
    })
  ]);

  const dataPrt = await resPrt.json();
  const dataNoodle = await resNoodle.json();

  console.log('PRT rows:', dataPrt.rows?.length);
  console.log('NOODLE rows:', dataNoodle.rows?.length);

  const outDir = path.resolve(__dirname, '../src/data');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const cacheFile = path.join(outDir, 'cached_sheet_data.json');
  fs.writeFileSync(cacheFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    prt: dataPrt.rows || [],
    noodle: dataNoodle.rows || []
  }, null, 2));

  console.log('Saved to', cacheFile);
}

sync().catch(console.error);

