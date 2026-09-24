'use strict';

const { spawnSync } = require('child_process');
const path = require('path');
const { createReporter } = require('./helpers/assert');
const { ROOT, read, exists, CLASSES } = require('./helpers/env');

function run(cmd, args) {
  return spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
  });
}

function listRootJs() {
  const fs = require('fs');
  return fs.readdirSync(ROOT).filter(function (f) {
    return f.endsWith('.js') && !f.startsWith('.');
  });
}

function listClassJs() {
  const fs = require('fs');
  const dir = path.join(ROOT, 'classes');
  return fs.readdirSync(dir).filter(function (f) { return f.endsWith('.js'); })
    .map(function (f) { return 'classes/' + f; });
}

function listPhp() {
  const fs = require('fs');
  const files = ['login.php', 'register.php', 'change-password.php'];
  const apiDir = path.join(ROOT, 'api');
  if (fs.existsSync(apiDir)) {
    fs.readdirSync(apiDir).filter(function (f) { return f.endsWith('.php'); })
      .forEach(function (f) { files.push('api/' + f); });
  }
  return files;
}

module.exports = function suite() {
  const r = createReporter('01-syntax');

  listRootJs().forEach(function (file) {
    const res = run('node', ['--check', file]);
    r.ok(res.status === 0, 'node --check ' + file + (res.stderr ? ': ' + res.stderr.trim().split('\n')[0] : ''));
  });

  listClassJs().forEach(function (file) {
    const res = run('node', ['--check', file]);
    r.ok(res.status === 0, 'node --check ' + file + (res.stderr ? ': ' + res.stderr.trim().split('\n')[0] : ''));
  });

  const phpBin = process.env.PHP_BIN || 'php';
  const phpProbe = run(phpBin, ['-v']);
  const phpAvailable = !phpProbe.error && phpProbe.status === 0;

  listPhp().forEach(function (file) {
    if (!exists(file)) {
      r.fail('missing PHP file ' + file);
      return;
    }
    if (!phpAvailable) {
      r.skip('php -l ' + file + ' (php not available)');
      return;
    }
    const res = run(phpBin, ['-l', file]);
    r.ok(res.status === 0, 'php -l ' + file + (res.stdout ? ': ' + res.stdout.trim().split('\n')[0] : ''));
  });

  const html = read('index.html');
  const scriptRe = /<script\s+src="([^"]+)"/g;
  let m;
  let scriptCount = 0;
  while ((m = scriptRe.exec(html)) !== null) {
    scriptCount += 1;
    r.ok(exists(m[1]), 'index.html script exists: ' + m[1]);
  }
  r.ok(scriptCount >= 9, 'index.html references enough scripts (got ' + scriptCount + ')');

  CLASSES.forEach(function (cls) {
    r.ok(exists('classes/' + cls + '.js'), 'class module exists: ' + cls);
  });

  return r;
};
