'use strict';
// Merge the v73 UI additions (2.28.1 plugin detail footer; see work/v73/) into Assets.
// Same contract as sync-v72-localization.cjs.
const fs = require('fs');
const file = 'src/AntigravityZhManager/Assets/dictionaries.json';
const dictionary = JSON.parse(fs.readFileSync(file, 'utf8'));
for (const key of Object.keys(dictionary)) if (key.trim() !== key) {
  if (!Object.hasOwn(dictionary, key.trim())) dictionary[key.trim()] = dictionary[key];
  delete dictionary[key];
}
const additions = require('../localization/v73-ui-additions.json');
for (const [key, value] of Object.entries(additions.dictionary)) {
  if (Object.hasOwn(dictionary, key) && dictionary[key] !== value) {
    throw new Error(`词条已存在且译文不同: ${key}`);
  }
  dictionary[key] = value;
}
fs.writeFileSync(file, JSON.stringify(dictionary, null, 2) + '\n');
console.log('v73 additions applied:', Object.keys(additions.dictionary).length, 'terms total:', Object.keys(dictionary).length);
