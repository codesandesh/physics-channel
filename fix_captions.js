const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('workflows/seedancehighnice-stage2.json', 'utf8'));
const n = wf.nodes.find(n => n.id === 'shn2-n8');

// WrapStyle 0 → 2 (no wrap — captions stay single line, never push into black bar)
n.parameters.jsCode = n.parameters.jsCode.replace(
  'WrapStyle: 0',
  'WrapStyle: 2'
);

// Move anchor up to y=1430 — even 2 lines of 52pt (~124px) stay within square (ends y=1499)
const twoSlash = '\\\\';
n.parameters.jsCode = n.parameters.jsCode.replace(
  "'{" + twoSlash + "move(540,1490,540,1465,0,150)}'",
  "'{" + twoSlash + "move(540,1460,540,1430,0,150)}'"
);

fs.writeFileSync('workflows/seedancehighnice-stage2.json', JSON.stringify(wf, null, 2));

// Verify
const nu = JSON.parse(fs.readFileSync('workflows/seedancehighnice-stage2.json', 'utf8')).nodes.find(n => n.id === 'shn2-n8');
console.log('WrapStyle 2:', nu.parameters.jsCode.includes('WrapStyle: 2') ? 'OK' : 'FAIL');
console.log('Pos 1430   :', nu.parameters.jsCode.includes('1430') ? 'OK' : 'FAIL');
const idx = nu.parameters.jsCode.indexOf('move(540');
console.log('Motion     :', nu.parameters.jsCode.slice(idx - 5, idx + 45));
