const fs = require('fs');
const path = require('path');

// Helper parsing functions matching src/lib/calc.ts
function parseDMYDate(dmy) {
  if (!dmy) return null;
  const parts = String(dmy).trim().split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    let year = parseInt(parts[2], 10);
    if (year > 2400) year -= 543;
    const d = new Date(Date.UTC(year, month, day));
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function extractPromoMonth(item) {
  const p = item.period || '';
  if (p) {
    const dmyMatches = p.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g);
    if (dmyMatches && dmyMatches.length > 0) {
      const parts = dmyMatches[0].split('/');
      const m = parseInt(parts[1], 10);
      if (m >= 1 && m <= 12) return m;
    }
  }

  const d = item.date || '';
  if (d) {
    const dmyMatches = d.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
    if (dmyMatches) {
      const m = parseInt(dmyMatches[2], 10);
      if (m >= 1 && m <= 12) return m;
    }
  }

  return 0;
}

function predictMissingPromoPeriods(rows) {
  const isInvalid = (p) => {
    if (!p) return true;
    const s = String(p).trim().toLowerCase();
    return s === '' || s === '-' || s === 'null' || s === 'null - null' || s === 'ไม่มี';
  };

  return rows.map((r, idx) => {
    let period = (r.period || '').trim();
    let isPredicted = !!r.isPredictedPeriod;

    if (isInvalid(period)) {
      let candidate = '';
      // ค้นหาแถวรอบข้างในห้างเดียวกันย้อนหลัง (backward scan)
      for (let i = idx - 1; i >= Math.max(0, idx - 40); i--) {
        if (rows[i].store === r.store && !isInvalid(rows[i].period)) {
          candidate = rows[i].period.trim();
          break;
        }
      }
      // หากไม่พบ ให้ค้นหาแถวถัดไปข้างหน้า (forward scan)
      if (!candidate) {
        for (let i = idx + 1; i < Math.min(rows.length, idx + 40); i++) {
          if (rows[i].store === r.store && !isInvalid(rows[i].period)) {
            candidate = rows[i].period.trim();
            break;
          }
        }
      }

      // หากยังไม่พบ ใช้วันที่ของรายการ + 14 วัน
      if (!candidate && r.date) {
        const d = parseDMYDate(r.date);
        if (d) {
          const endDate = new Date(d.getTime() + 14 * 24 * 60 * 60 * 1000);
          const sDay = String(d.getUTCDate()).padStart(2, '0');
          const sMonth = String(d.getUTCMonth() + 1).padStart(2, '0');
          const sYear = d.getUTCFullYear();
          const eDay = String(endDate.getUTCDate()).padStart(2, '0');
          const eMonth = String(endDate.getUTCMonth() + 1).padStart(2, '0');
          const eYear = endDate.getUTCFullYear();
          candidate = `${sDay}/${sMonth}/${sYear} - ${eDay}/${eMonth}/${eYear}`;
        }
      }

      if (!candidate) {
        candidate = 'รอบโปรโมชั่น 14 วัน (คาดการณ์)';
      }

      period = candidate;
      isPredicted = true;
    }

    return {
      ...r,
      period,
      isPredictedPeriod: isPredicted,
    };
  });
}

function calculateMonthlyFrequencies(rows) {
  const counts = {};

  rows.forEach((r) => {
    const m = extractPromoMonth(r);
    const key = `${r.store || 'all'}|${r.brand || 'all'}|${m}`;
    counts[key] = (counts[key] || 0) + 1;
  });

  return rows.map((r) => {
    const m = extractPromoMonth(r);
    const key = `${r.store || 'all'}|${r.brand || 'all'}|${m}`;
    return {
      ...r,
      freqMonth: counts[key] || 1,
    };
  });
}

function run() {
  const cachePath = path.resolve(__dirname, '../src/data/cached_sheet_data.json');
  const raw = fs.readFileSync(cachePath, 'utf8');
  const data = JSON.parse(raw);

  console.log('Original PRT count:', data.prt?.length);
  console.log('Original NOODLE count:', data.noodle?.length);

  const prtPredicted = predictMissingPromoPeriods(data.prt || []);
  const prtUpdated = calculateMonthlyFrequencies(prtPredicted);

  const noodlePredicted = predictMissingPromoPeriods(data.noodle || []);
  const noodleUpdated = calculateMonthlyFrequencies(noodlePredicted);

  const prtMissing = (data.prt || []).filter(r => !r.period || r.period.trim() === '').length;
  const prtImputed = prtUpdated.filter(r => r.isPredictedPeriod).length;
  const noodleMissing = (data.noodle || []).filter(r => !r.period || r.period.trim() === '').length;
  const noodleImputed = noodleUpdated.filter(r => r.isPredictedPeriod).length;

  console.log(`PRT: ${prtMissing} missing -> ${prtImputed} imputed with predicted periods`);
  console.log(`NOODLE: ${noodleMissing} missing -> ${noodleImputed} imputed with predicted periods`);

  const updatedData = {
    timestamp: new Date().toISOString(),
    prt: prtUpdated,
    noodle: noodleUpdated,
  };

  fs.writeFileSync(cachePath, JSON.stringify(updatedData, null, 2), 'utf8');
  console.log('Successfully wrote updated cache to', cachePath);
}

run();

