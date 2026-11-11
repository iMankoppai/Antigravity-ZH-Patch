'use strict';
// Merge the v76 UI additions (Antigravity 2.31.0 new UI; see work/2-31-0-probe/) into Assets.
// Same contract as sync-v75-localization.cjs.
const fs = require('fs');
const file = 'src/AntigravityZhManager/Assets/dictionaries.json';
const dictionary = JSON.parse(fs.readFileSync(file, 'utf8'));
for (const key of Object.keys(dictionary)) if (key.trim() !== key) {
  if (!Object.hasOwn(dictionary, key.trim())) dictionary[key.trim()] = dictionary[key];
  delete dictionary[key];
}
const additions = require('../localization/v76-ui-additions.json');
let added = 0, unchanged = 0;
for (const [key, value] of Object.entries(additions.dictionary)) {
  if (Object.hasOwn(dictionary, key)) {
    if (dictionary[key] !== value) throw new Error(`词条已存在且译文不同: ${key}`);
    unchanged++;
    continue;
  }
  dictionary[key] = value;
  added++;
}
fs.writeFileSync(file, JSON.stringify(dictionary, null, 2) + '\n');
console.log('v76 additions applied:', added, 'already present:', unchanged, 'terms total:', Object.keys(dictionary).length);
