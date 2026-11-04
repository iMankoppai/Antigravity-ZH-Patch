'use strict';
// Merge the v74 marketplace-DETAIL additions (plugin detail pages: suggested prompts,
// skill/agent/rule descriptions) into Assets.
const fs = require('fs');
const file = 'src/AntigravityZhManager/Assets/dictionaries.json';
const dictionary = JSON.parse(fs.readFileSync(file, 'utf8'));
for (const key of Object.keys(dictionary)) if (key.trim() !== key) {
  if (!Object.hasOwn(dictionary, key.trim())) dictionary[key.trim()] = dictionary[key];
  delete dictionary[key];
}
const additions = require('../localization/v74-marketplace-detail-additions.json');
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
console.log('v74 marketplace-detail additions applied:', added, 'already present:', unchanged, 'terms total:', Object.keys(dictionary).length);
