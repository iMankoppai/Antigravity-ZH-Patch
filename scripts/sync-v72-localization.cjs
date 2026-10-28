'use strict';
// Merge the v72 UI additions (2.28.0 adaptation; see work/v72/) into Assets.
// Same contract as sync-v71-localization.cjs, plus explicit "modifications"
// for entries whose translation must change in place.
const fs = require('fs');
const file = 'src/AntigravityZhManager/Assets/dictionaries.json';
const dictionary = JSON.parse(fs.readFileSync(file, 'utf8'));
for (const key of Object.keys(dictionary)) if (key.trim() !== key) {
  if (!Object.hasOwn(dictionary, key.trim())) dictionary[key.trim()] = dictionary[key];
  delete dictionary[key];
}
const additions = require('../localization/v72-ui-additions.json');
for (const [key, value] of Object.entries(additions.dictionary)) {
  if (Object.hasOwn(dictionary, key) && dictionary[key] !== value) {
    throw new Error(`词条已存在且译文不同: ${key}`);
  }
  dictionary[key] = value;
}
for (const [key, value] of Object.entries(additions.modifications || {})) {
  if (!Object.hasOwn(dictionary, key)) throw new Error(`修订目标词条不存在: ${key}`);
  console.log('modification:', key, ':', JSON.stringify(dictionary[key]), '->', JSON.stringify(value));
  dictionary[key] = value;
}
fs.writeFileSync(file, JSON.stringify(dictionary, null, 2) + '\n');
console.log('v72 additions applied:', Object.keys(additions.dictionary).length, 'terms total:', Object.keys(dictionary).length);
