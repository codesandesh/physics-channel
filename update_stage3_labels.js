const fs = require('fs');

const wfPath = 'D:\\Quantum-physics-channel\\workflows\\fit_stage3_assembly.json';
const wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));
const n3 = wf.nodes.find(n => n.id === 'fit3-n3');
let code = n3.parameters.jsCode;

// Replace old muscle labels section
const labStart = code.indexOf('// ─── MUSCLE LABELS');
const labEnd   = code.indexOf('// ─── ASS Subtitles');
if (labStart === -1 || labEnd === -1) { console.error('Label markers not found'); process.exit(1); }

const newLabels = `// ─── MUSCLE LABELS — glowing text + dashed lines via Python PIL overlay ────────
const labelStart = 15, labelEnd = 20;
const labelEn = "between(t," + labelStart + "," + labelEnd + ")";

// Fade in over 0.5s at t=15, fade out over 0.5s at t=19.5
const labelAlpha = "if(between(t,15,15.5),(t-15)/0.5,if(between(t,19.5,20),(20-t)/0.5,1))";

if (muscleLabels && muscleLabels.length > 0) {
  // Generate label overlay PNG via Python PIL
  const labelPngHost = n8nIn + '/' + jobId + '_labels.png';
  const labelPngCont = contIn + '/' + jobId + '_labels.png';

  // Write gen script to input dir
  const genScript = n8nIn + '/_gen_labels.py';
  if (!fs.existsSync(genScript)) {
    // Copy the script if not there (first run) — embedded version
    const scriptSrc = '/data/ffmpeg/input/_gen_labels.py';
    if (fs.existsSync(scriptSrc)) {
      fs.copyFileSync(scriptSrc, genScript);
    }
  }

  const labelsJson = JSON.stringify(muscleLabels).replace(/"/g, '\\"');
  const pyCmd = 'docker exec qpc_ffmpeg_runner python3 /ffmpeg/input/_gen_labels.py ' +
    '"' + labelsJson + '" ' +
    '"' + labelPngCont + '" 1080 1920';
  const pyRes = run(pyCmd, 60000);
  console.log('Label overlay:', pyRes.trim());

  const hasLabelPng = fs.existsSync(labelPngHost);
  if (hasLabelPng) {
    const labelI = inp.push('-i "' + labelPngCont + '"') - 1;
    // Overlay with fade-in/out animation
    vf += ';[' + labelI + ':v]format=rgba[labels_raw]';
    vf += ';[' + cur + '][labels_raw]overlay=x=0:y=0:format=auto' +
          ':enable=\\'' + labelEn + '\\'[vb' + lbl + ']';
    cur = 'vb' + lbl; lbl++;
    console.log('Muscle label PNG overlay added | labels: ' + muscleLabels.length);
  } else {
    console.warn('Label PNG not generated — falling back to drawtext');
    for (const ml of muscleLabels) {
      if (!ml.name) continue;
      const name = ml.name.replace(/['"\\:]/g,'').slice(0,28).toUpperCase();
      const lx = Math.max(20, Math.min(840, Math.round((ml.x_pct||0.5)*1080)-130));
      const ly = Math.max(20, Math.min(1860, Math.round((ml.y_pct||0.5)*1920)-20));
      vf += ';['+cur+"]drawtext=text='"+name+"':fontcolor=white:fontsize=52:x="+lx+":y="+ly+":bordercolor=black:borderw=4:enable='"+labelEn+"'[vb"+lbl+']';
      cur='vb'+lbl; lbl++;
    }
  }
}

`;

code = code.slice(0, labStart) + newLabels + code.slice(labEnd);
n3.parameters.jsCode = code;
fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2), 'utf8');
console.log('✓ Stage 3 muscle labels upgraded');

const payload = { name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: { executionOrder: wf.settings?.executionOrder || 'v1' } };
fs.writeFileSync('D:\\Quantum-physics-channel\\workflows\\fit_stage3_assembly-payload.json', JSON.stringify(payload), 'utf8');
console.log('✓ Payload ready');
