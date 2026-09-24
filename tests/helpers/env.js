'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..', '..');
const CLASSES = ['clerc', 'elfe', 'guerrier', 'halfelin', 'mage', 'nain', 'voleur'];

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function createEnv() {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
    runScripts: 'dangerously',
    url: 'http://localhost/',
    pretendToBeVisual: true,
  });
  const { window } = dom;
  const document = window.document;

  if (typeof window.requestAnimationFrame !== 'function') {
    window.requestAnimationFrame = function (fn) {
      return setTimeout(fn, 0);
    };
    window.cancelAnimationFrame = function (id) {
      clearTimeout(id);
    };
  }

  window.getPortraitSrc = function () {
    return { src: 'icons/dcc/x.png', source: 'dcc', index: 0, label: 'DCC' };
  };
  window.switchTab = function () {};
  window.openSheet = function () {};
  window.showToast = function () {};
  window.showToastSave = function () {};
  window.bindAutoSave = function () {};

  function load(rel) {
    const code = read(rel);
    const script = document.createElement('script');
    script.textContent = code;
    document.body.appendChild(script);
  }

  function loadClass(cls) {
    load('classes/bloc_commun.js');
    load('classes/' + cls + '.js');
  }

  function loadEquipe() {
    load('classes/equipe.js');
  }

  return { dom, window, document, load, loadClass, loadEquipe };
}

function delay(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

function collectSheetData(cls, charId, container) {
  const data = {};
  const prefix = cls + '-' + charId + '-';
  const inputs = container.querySelectorAll('input[data-key], textarea[data-key], select[data-key]');
  inputs.forEach(function (input) {
    const key = input.getAttribute('data-key');
    if (key && key.indexOf(prefix) === 0) {
      data[key.slice(prefix.length)] = input.value;
    }
  });
  return data;
}

module.exports = {
  ROOT,
  CLASSES,
  read,
  exists,
  createEnv,
  delay,
  collectSheetData,
};
