'use strict';
// Merge the v69 UI additions (see work/audit-v68-fresh/summary.md) into Assets.
// Same contract as sync-v68-localization.cjs: normalize trimmed keys, then apply.
const fs = require('fs');
const file = 'src/AntigravityZhManager/Assets/dictionaries.json';
const dictionary = JSON.parse(fs.readFileSync(file, 'utf8'));
for (const key of Object.keys(dictionary)) if (key.trim() !== key) {
  if (!Object.hasOwn(dictionary, key.trim())) dictionary[key.trim()] = dictionary[key];
  delete dictionary[key];
}
const additions = require('../localization/v69-ui-additions.json').dictionary;
for (const [key, value] of Object.entries(additions)) {
  if (Object.hasOwn(dictionary, key) && dictionary[key] !== value) {
    throw new Error(`词条已存在且译文不同: ${key}`);
  }
  dictionary[key] = value;
}
fs.writeFileSync(file, JSON.stringify(dictionary, null, 2) + '\n');
console.log('v69 additions applied:', Object.keys(additions).length, 'terms total:', Object.keys(dictionary).length);
