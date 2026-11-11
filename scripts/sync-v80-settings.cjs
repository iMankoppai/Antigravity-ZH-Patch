'use strict';
const fs = require('fs');
const file = 'src/AntigravityZhManager/Assets/dictionaries.json';
const dictionary = JSON.parse(fs.readFileSync(file, 'utf8'));
for (const key of Object.keys(dictionary)) if (key.trim() !== key) {
  if (!Object.hasOwn(dictionary, key.trim())) dictionary[key.trim()] = dictionary[key];
  delete dictionary[key];
}
const additions = require('../localization/v80-settings-additions.json');
let added = 0, unchanged = 0;
for (const [key, value] of Object.entries(additions.dictionary)) {
  if (Object.hasOwn(dictionary, key)) {
    if (dictionary[key] !== value) { console.log('SKIP DIFF:', key, '=>', dictionary[key]); unchanged++; continue; }
    unchanged++; continue;
  }
  dictionary[key] = value; added++;
}
fs.writeFileSync(file, JSON.stringify(dictionary, null, 2) + '\n');
console.log('v80 additions applied:', added, 'unchanged:', unchanged, 'terms total:', Object.keys(dictionary).length);
