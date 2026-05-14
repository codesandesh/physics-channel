const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('workflows/seedancehighnice-stage2.json', 'utf8'));
const n = wf.nodes.find(n => n.id === 'shn2-n8');

// Font: 72 → 52, outline 4 → 3, marginV 120 → 60
n.parameters.jsCode = n.parameters.jsCode.replace(
  'Style: Caption,Arial,72,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,4,0,2,30,30,120,1',
  'Style: Caption,Arial,52,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,0,2,30,30,60,1'
);

// The jsCode string in memory contains: '{\\move(540,1825,540,1800,0,150)}'
// Two actual backslash chars before 'move'
const twoSlash = '\\\\';
n.parameters.jsCode = n.parameters.jsCode.replace(
  "'{" + twoSlash + "move(540,1825,540,1800,0,150)}'",
  "'{" + twoSlash + "move(540,1490,540,1465,0,150)}'"
);

fs.writeFileSync('workflows/seedancehighnice-stage2.json', JSON.stringify(wf, null, 2));

// Verify
const nu = JSON.parse(fs.readFileSync('workflows/seedancehighnice-stage2.json', 'utf8')).nodes.find(n => n.id === 'shn2-n8');
console.log('Font 52 :', nu.parameters.jsCode.includes('Arial,52') ? 'OK' : 'FAIL');
console.log('Pos 1465:', nu.parameters.jsCode.includes('1465') ? 'OK' : 'FAIL');
const idx = nu.parameters.jsCode.indexOf('move(540');
console.log('Motion  :', nu.parameters.jsCode.slice(idx - 5, idx + 45));
