const fs = require('fs');
const path = require('path');

const driveMapPath = path.resolve(__dirname, '../src/data/drive_images_map.json');
const cachedPath = path.resolve(__dirname, '../src/data/cached_sheet_data.json');
const codePath = path.resolve(__dirname, '../apps-script/Code.gs');

if (!fs.existsSync(driveMapPath) || !fs.existsSync(cachedPath) || !fs.existsSync(codePath)) {
  console.error('Missing required files');
  process.exit(1);
}

const driveMap = JSON.parse(fs.readFileSync(driveMapPath, 'utf8'));
const cached = JSON.parse(fs.readFileSync(cachedPath, 'utf8'));
const code = fs.readFileSync(codePath, 'utf8');

function norm(s) {
  return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

const normDriveMap = {};
for (const [k, v] of Object.entries(driveMap)) {
  normDriveMap[norm(k)] = v;
}

// Extract batch configs from Code.gs
const matchPrt = code.match(/var COFFEE_BATCH_CONFIG = (\[.*?\]);/s);
const matchNoodle = code.match(/var NOODLE_BATCH_CONFIG = (\[.*?\]);/s);
if (!matchPrt || !matchNoodle) {
  console.error('Failed to parse batch configs from Code.gs');
  process.exit(1);
}
const coffeeConfig = JSON.parse(matchPrt[1]);
const noodleConfig = JSON.parse(matchNoodle[1]);

function getStoreKey(name) {
  const s = String(name || '').toLowerCase();
  if (s.includes('cj') || s.includes('ซีเจ')) return 'cj';
  if (s.includes('bigc') || s.includes('big c') || s.includes('บิ๊กซี')) return 'bigc';
  if (s.includes('lotus') || s.includes('โลตัส')) return 'lotus';
  return 'other';
}

function expandBatches(batches) {
  const list = [];
  for (const [fname, count] of batches) {
    for (let i = 0; i < count; i++) {
      list.push(fname);
    }
  }
  return list;
}

function splitBatches(config) {
  const cj = [];
  const bigc = [];
  const lotus = [];
  for (const b of config) {
    const fl = b[0].toLowerCase();
    if (fl.includes('cj') || fl.startsWith('img_')) cj.push(b);
    else if (fl.includes('bigc') || fl.includes('big c')) bigc.push(b);
    else if (fl.includes('lotus')) lotus.push(b);
  }
  return {
    cj: expandBatches(cj),
    bigc: expandBatches(bigc),
    lotus: expandBatches(lotus),
  };
}

// 1. UPDATE PRT
// cached.prt is reverse sheet order (index 0 is sheet bottom, last index is Sheet Row 2)
const prtAsc = cached.prt.slice().reverse();
const prtImages = splitBatches(coffeeConfig);

let prtCjIdx = 0;
let prtBigCIdx = 0;
let prtLotusIdx = 0;
let prtMatched = 0;

for (let i = 0; i < prtAsc.length; i++) {
  const r = prtAsc[i];
  const sheetRow = i + 2;
  const storeKey = getStoreKey(r.store);
  let fname = null;

  if (sheetRow === 2) {
    // Manual row (preserve existing)
    continue;
  } else if (storeKey === 'cj') {
    if (prtCjIdx < prtImages.cj.length) fname = prtImages.cj[prtCjIdx++];
  } else if (storeKey === 'bigc') {
    if (prtBigCIdx < prtImages.bigc.length) fname = prtImages.bigc[prtBigCIdx++];
  } else if (storeKey === 'lotus') {
    if (prtLotusIdx < prtImages.lotus.length) fname = prtImages.lotus[prtLotusIdx++];
  }

  if (fname) {
    const fObj = normDriveMap[norm(fname)];
    if (fObj) {
      r.imageUrl = fObj.view_url;
      prtMatched++;
    }
  }
}
cached.prt = prtAsc.reverse();
console.log(`Updated PRT: ${prtMatched} rows populated with Drive images`);

// 2. UPDATE NOODLE
// cached.noodle is reverse sheet order
const noodleAsc = cached.noodle.slice().reverse();
const noodleImages = splitBatches(noodleConfig);

let noodleCjIdx = 0;
let noodleBigCIdx = 0;
let noodleLotusIdx = 0;
let noodleMatched = 0;

for (let i = 0; i < noodleAsc.length; i++) {
  const r = noodleAsc[i];
  const sheetRow = i + 2;
  const storeKey = getStoreKey(r.store);
  let fname = null;

  if (sheetRow === 2 || sheetRow === 3) {
    // Manual test rows (preserve existing)
    continue;
  } else if (storeKey === 'cj') {
    if (noodleCjIdx < noodleImages.cj.length) fname = noodleImages.cj[noodleCjIdx++];
  } else if (storeKey === 'bigc') {
    if (noodleBigCIdx < noodleImages.bigc.length) fname = noodleImages.bigc[noodleBigCIdx++];
  } else if (storeKey === 'lotus') {
    if (noodleLotusIdx < noodleImages.lotus.length) fname = noodleImages.lotus[noodleLotusIdx++];
  }

  if (fname) {
    const fObj = normDriveMap[norm(fname)];
    if (fObj) {
      r.imageUrl = fObj.view_url;
      noodleMatched++;
    }
  }
}
cached.noodle = noodleAsc.reverse();
console.log(`Updated NOODLE: ${noodleMatched} rows populated with Drive images`);

fs.writeFileSync(cachedPath, JSON.stringify(cached, null, 2));
console.log('Saved to src/data/cached_sheet_data.json');
