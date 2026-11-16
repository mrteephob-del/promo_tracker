const fs = require('fs');
const path = require('path');

async function syncAllImages() {
  const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
  const url = "https://script.google.com/macros/s/AKfycbwf1D341f6ehamx0RSUycAfbtgvUTsdEOgkR5ld2OLedgMdgX8-cqK-wH2JbWhXCf4-/exec";
  const secret = "my_super_secret_promo_key_2026";
  const cachePath = path.resolve(__dirname, '../src/data/cached_sheet_data.json');

  console.log('Fetching live data from Google Sheet...');
  const [resPrt, resNoodle] = await Promise.all([
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list', sheetName: 'PRT', limit: 2000, secret }),
    }),
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list', sheetName: 'NOODLE', limit: 2000, secret }),
    }),
  ]);

  const prtSheet = (await resPrt.json()).rows || [];
  const noodleSheet = (await resNoodle.json()).rows || [];
  console.log(`Live Sheet counts: PRT=${prtSheet.length}, NOODLE=${noodleSheet.length}`);

  const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));

  // 1. SYNC PRT (Exact match 314 to 314)
  let prtFilled = 0;
  for (let i = 0; i < cache.prt.length; i++) {
    const c = cache.prt[i];
    if (i < prtSheet.length && prtSheet[i].imageUrl) {
      c.imageUrl = prtSheet[i].imageUrl;
      prtFilled++;
    }
  }
  console.log(`PRT: ${prtFilled}/${cache.prt.length} populated with images`);

  // 2. SYNC NOODLE by Store sequence
  const stores = ['CJ More', 'Mini BigC', "Lotus's"];
  let noodleFilled = 0;

  for (const storeName of stores) {
    const isLotus = storeName.toLowerCase().includes('lotus');
    const isBigC = storeName.toLowerCase().includes('bigc');
    const isCj = storeName.toLowerCase().includes('cj');

    const filterFn = (r) => {
      const s = (r.store || '').toLowerCase();
      if (isLotus) return s.includes('lotus');
      if (isBigC) return s.includes('bigc');
      if (isCj) return s.includes('cj');
      return false;
    };

    const cacheSlice = cache.noodle.filter(filterFn);
    const sheetSlice = noodleSheet.filter(filterFn);

    console.log(`Store [${storeName}]: Cache=${cacheSlice.length}, Sheet=${sheetSlice.length}`);

    // Map using two-pointer sequential alignment
    let sheetIdx = 0;
    for (let cIdx = 0; cIdx < cacheSlice.length; cIdx++) {
      const c = cacheSlice[cIdx];
      if (c.imageUrl && c.imageUrl.trim()) {
        noodleFilled++;
        continue;
      }

      // Look ahead up to 5 items in sheetSlice for best match
      let bestMatchIdx = -1;
      for (let sIdx = sheetIdx; sIdx < Math.min(sheetIdx + 8, sheetSlice.length); sIdx++) {
        const s = sheetSlice[sIdx];
        if (!s.imageUrl) continue;
        const proDiff = Math.abs((parseFloat(s.proPrice) || 0) - (parseFloat(c.proPrice) || 0));
        if (proDiff < 0.1) {
          bestMatchIdx = sIdx;
          break;
        }
      }

      if (bestMatchIdx !== -1) {
        c.imageUrl = sheetSlice[bestMatchIdx].imageUrl;
        sheetIdx = bestMatchIdx + 1;
        noodleFilled++;
      } else if (sheetIdx < sheetSlice.length && sheetSlice[sheetIdx].imageUrl) {
        // Fallback to sequential next image
        c.imageUrl = sheetSlice[sheetIdx].imageUrl;
        sheetIdx++;
        noodleFilled++;
      }
    }
  }

  // Count final coverage
  const finalPrtWithImg = cache.prt.filter((r) => r.imageUrl && r.imageUrl.trim()).length;
  const finalNoodleWithImg = cache.noodle.filter((r) => r.imageUrl && r.imageUrl.trim()).length;

  console.log(`FINAL RESULTS:`);
  console.log(`PRT with images: ${finalPrtWithImg}/${cache.prt.length} (${((finalPrtWithImg / cache.prt.length) * 100).toFixed(1)}%)`);
  console.log(`NOODLE with images: ${finalNoodleWithImg}/${cache.noodle.length} (${((finalNoodleWithImg / cache.noodle.length) * 100).toFixed(1)}%)`);

  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf8');
  console.log('Successfully updated src/data/cached_sheet_data.json!');
}

syncAllImages().catch(console.error);
