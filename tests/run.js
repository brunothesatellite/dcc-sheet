'use strict';

const fs = require('fs');
const path = require('path');

const suites = [
  require('./01-syntax.test'),
  require('./02-css.test'),
  require('./03-modules.test'),
  require('./04-equipe.test'),
  require('./05-export.test'),
];

function pad(s, n) {
  s = String(s);
  while (s.length < n) s += ' ';
  return s;
}

async function main() {
  const results = [];
  const started = Date.now();

  for (const suite of suites) {
    let result;
    try {
      result = await suite();
    } catch (e) {
      result = {
        name: suite.name || 'unknown',
        passed: 0,
        failed: 1,
        skipped: 0,
        failures: ['suite crashed: ' + (e && e.stack ? e.stack : e)],
      };
    }
    results.push(result);

    let tag = '[OK]';
    if (result.failed > 0) tag = '[FAIL]';
    else if (result.passed === 0 && result.skipped > 0) tag = '[SKIP]';

    const total = result.passed + result.failed;
    console.log(tag + ' ' + pad(result.name, 14) + ' (' + result.passed + '/' + total +
      (result.skipped ? ', ' + result.skipped + ' skip' : '') + ')');

    if (result.failed > 0) {
      result.failures
        .filter(function (f) { return !f.startsWith('SKIP: '); })
        .forEach(function (f) { console.log('       - ' + f); });
    }
  }

  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  results.forEach(function (r) {
    totalPassed += r.passed;
    totalFailed += r.failed;
    totalSkipped += r.skipped;
  });

  const durationMs = Date.now() - started;
  const ok = totalFailed === 0;
  console.log('────────────────────────────');
  console.log('TOTAL: ' + totalPassed + '/' + (totalPassed + totalFailed) +
    (totalSkipped ? ', ' + totalSkipped + ' skip' : '') +
    '  ' + (ok ? 'OK' : 'FAIL') +
    '  (' + durationMs + ' ms)');

  writeReport(results, { totalPassed, totalFailed, totalSkipped, durationMs, ok });

  process.exit(ok ? 0 : 1);
}

function writeReport(results, summary) {
  const lines = [];
  const now = new Date().toISOString();
  lines.push('# Rapport de tests non-régression — DCC Sheet');
  lines.push('');
  lines.push('- Date : ' + now);
  lines.push('- Résultat : **' + (summary.ok ? 'OK' : 'FAIL') + '**');
  lines.push('- Total : ' + summary.totalPassed + '/' + (summary.totalPassed + summary.totalFailed) +
    (summary.skipped ? '' : '') + (summary.totalSkipped ? ', ' + summary.totalSkipped + ' skip' : ''));
  lines.push('- Durée : ' + summary.durationMs + ' ms');
  lines.push('');
  lines.push('| Suite | Statut | Pass | Fail | Skip |');
  lines.push('|-------|--------|------|------|------|');
  results.forEach(function (r) {
    const status = r.failed > 0 ? 'FAIL' : (r.passed === 0 && r.skipped > 0 ? 'SKIP' : 'OK');
    lines.push('| ' + r.name + ' | ' + status + ' | ' + r.passed + ' | ' + r.failed + ' | ' + r.skipped + ' |');
  });
  lines.push('');

  const failures = [];
  results.forEach(function (r) {
    (r.failures || []).forEach(function (f) {
      if (!f.startsWith('SKIP: ')) failures.push('- **' + r.name + '** — ' + f);
    });
  });
  if (failures.length) {
    lines.push('## Échecs');
    lines.push('');
    failures.forEach(function (f) { lines.push(f); });
    lines.push('');
  }

  const skips = [];
  results.forEach(function (r) {
    (r.failures || []).forEach(function (f) {
      if (f.startsWith('SKIP: ')) skips.push('- **' + r.name + '** — ' + f.slice(6));
    });
  });
  if (skips.length) {
    lines.push('## Skips');
    lines.push('');
    skips.forEach(function (f) { lines.push(f); });
    lines.push('');
  }

  const out = path.join(__dirname, 'report.md');
  fs.writeFileSync(out, lines.join('\n'), 'utf8');
}

main().catch(function (e) {
  console.error('run.js crashed:', e);
  process.exit(1);
});
