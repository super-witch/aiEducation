const fs = require('fs');

let comContent = fs.readFileSync('frontend/community.html', 'utf8');
comContent = comContent.replace(/document\.getElementById\('backBtn'\)\.addEventListener\('click'[\s\S]*?\}\);/, '');
fs.writeFileSync('frontend/community.html', comContent);

let idxContent = fs.readFileSync('frontend/index.html', 'utf8');
idxContent = idxContent.replace(/document\.getElementById\('communityBtn'\)\.addEventListener\('click'[\s\S]*?\}\);/, '');
fs.writeFileSync('frontend/index.html', idxContent);

console.log('Cleanup done.');

