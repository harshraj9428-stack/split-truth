const fs = require('fs');
const content = fs.readFileSync('d:/SplitTruth-git-ready/src/App.jsx', 'utf8');
const lines = content.split('\n');

// Find the start of duplicate functions
const startIndex = lines.findIndex(l => l.includes('// ---- Balance & Trust Score calculations ----'));
// Find the end of duplicate functions
const endIndex = lines.findIndex(l => l.includes('if (loading || !state) {'));

// Find the extra } at the end
let newLines = lines;
if (startIndex !== -1 && endIndex !== -1) {
  newLines = [...lines.slice(0, startIndex), ...lines.slice(endIndex)];
}

// Remove the last }
if (newLines[newLines.length - 2] === '}') {
  newLines.splice(newLines.length - 2, 2);
}

fs.writeFileSync('d:/SplitTruth-git-ready/src/App.jsx', newLines.join('\n'));
console.log('Fixed App.jsx');
