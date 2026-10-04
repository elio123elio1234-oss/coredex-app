/**
 * Build the Vercel-ready deck from the single-file offline export.
 *
 * The offline export is one 48 MB file because it carries both videos (42 MB of
 * base64 in <script type="application/octet-stream"> blocks) and the 3D strap mesh
 * (3.25 MB of JSON) inline, so it can run from file://. On the web that shape is the
 * worst case: nothing paints until the last byte lands, and decoding a 23 MB data:
 * URL on iOS Safari is a memory risk. This build:
 *
 *   1. streams the videos from /media instead of embedding them,
 *   2. moves the mesh to /model.json, preloaded in parallel and consumed when ready,
 *   3. shows a branded boot screen while the remaining ~2 MB arrives,
 *   4. asks phones held in portrait to rotate — a 1920x1080 stage letterboxes to
 *      ~220 px tall in portrait, which no amount of scaling can make readable.
 *
 * Usage: node tools/build.mjs <source.html> <outDir> [origin]
 */
import fs from 'node:fs';
import path from 'node:path';

const [srcPath, outDir, originArg] = process.argv.slice(2);
if (!srcPath || !outDir) { console.error('usage: build.mjs <source.html> <outDir> [origin]'); process.exit(1); }
const ORIGIN = (originArg || 'https://cyphix-tinvent.vercel.app').replace(/[/]+$/, '');
const outPath = path.join(outDir, 'index.html');

let html = fs.readFileSync(srcPath, 'utf8');
const before = Buffer.byteLength(html);
fs.mkdirSync(outDir, { recursive: true });
const report = [];
const must = (label, ok) => { report.push([label, ok]); if (!ok) process.exitCode = 1; };

/* ---------- 1. videos: embedded base64 -> streamed /media files ---------- */
let dropped = 0;
html = html.replace(/<script type="application\/octet-stream" id="vid-[^"]*">[\s\S]*?<\/script>\s*/g,
  m => { dropped += Buffer.byteLength(m); return ''; });
const embeds = (html.match(/ data-embed="[^"]*"/g) || []).length;
html = html.replace(/ data-embed="[^"]*"/g, '');          // makes the player use src="media/*.mp4"
must('2 video payloads removed', dropped > 40e6);
must('2 players switched to /media', embeds === 2);
must('no octet-stream blobs left', !html.includes('application/octet-stream'));

/* ---------- 2. the 3D mesh moves out of the document ---------- */
const mesh = html.match(/<script type="application\/json" id="model-data">([\s\S]*?)<\/script>\s*/);
must('model-data found', !!mesh);
if (mesh) {
  fs.writeFileSync(path.join(outDir, 'model.json'), mesh[1].trim());
  html = html.replace(mesh[0], '');
  // getModel() was a synchronous read of that <script>; now it reads whatever the
  // preload delivered. Everything that needs it runs on slide 4 at the earliest.
  const oldGet = `function getModel(){ if(modelData) return modelData; const node=document.getElementById('model-data'); if(!node) return null; modelData=JSON.parse(node.textContent); return modelData; }`;
  must('getModel() matched', html.includes(oldGet));
  html = html.replace(oldGet, `function getModel(){ return modelData||(modelData=window.__cyModel||null); }`);

  // ...and a 3D slide reached before the mesh lands must not cache the failure:
  // init3D() memoises per kind, so one early miss would kill that viewer for good.
  const oldInit = `const kind=sl.dataset['3d']; if(kind in viewers) return viewers[kind]; viewers[kind]=null;`;
  must('init3D() guard matched', html.includes(oldInit));
  html = html.replace(oldInit, `const kind=sl.dataset['3d']; if(kind in viewers) return viewers[kind];
    if(!getModel()){
      (window.__cyModelReady||Promise.resolve(null)).then(function(){
        // the mesh never arrived: fall back to the still, the way the catch below would
        if(!getModel()){ sl.classList.add('no3d'); viewers[kind]=null; return; }
        if(!sl.classList.contains('current')) return;
        const v=init3D(sl); if(v){ if(kind==='showcase') v.reset(); v.start(); }
      });
      return null;
    }
    viewers[kind]=null;`);
}

/* ---------- 3. web-appropriate failure copy ---------- */
const oldFail = 'הסרטון לא נטען בדפדפן הזה. נסו שוב, או פתחו את הגרסה ללא אינטרנט ב-Chrome.';
must('video failure copy matched', html.includes(oldFail));
html = html.split(oldFail).join('הסרטון לא נטען. בדקו את החיבור לאינטרנט ונסו שוב.');

/* ---------- 4. the wordmark, as a favicon and for the boot screen ---------- */
const mark = html.match(/<img class="mark white" src="(data:image\/webp;base64,([A-Za-z0-9+/=]+))"/);
must('wordmark found', !!mark);
if (mark) fs.writeFileSync(path.join(outDir, 'favicon.webp'), Buffer.from(mark[2], 'base64'));
const markUri = mark ? mark[1] : '';

/* ---------- 5. head: link preview, mesh preload, mobile CSS ---------- */
const head = `
<link rel="canonical" href="${ORIGIN}/">
<link rel="icon" type="image/webp" href="favicon.webp">
<link rel="preload" href="model.json" as="fetch" type="application/json">
<meta name="theme-color" content="#050D1B">
<meta name="color-scheme" content="dark">
<meta property="og:type" content="website">
<meta property="og:locale" content="he_IL">
<meta property="og:site_name" content="Cyphix">
<meta property="og:url" content="${ORIGIN}/">
<meta property="og:title" content="Cyphix — t:invent">
<meta property="og:description" content="ECG רב-לידי ברצועה לבישה. מצגת לתוכנית t:invent, הטכניון.">
<meta property="og:image" content="${ORIGIN}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="675">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Cyphix — t:invent">
<meta name="twitter:description" content="ECG רב-לידי ברצועה לבישה. מצגת לתוכנית t:invent, הטכניון.">
<meta name="twitter:image" content="${ORIGIN}/og.png">
<script>/* start the mesh download while the rest of the document is still streaming */
window.__cyModelReady=fetch('model.json').then(function(r){return r.ok?r.json():null;})
  .then(function(d){ window.__cyModel=d; return d; }).catch(function(){ return null; });</script>
<style>
/* ===== boot screen: the document is one file, so the first slide cannot paint early ===== */
#boot{position:fixed;inset:0;z-index:300;display:grid;place-items:center;
  background:radial-gradient(1200px 800px at 50% 25%,#15305A 0%,#0B1A30 48%,#050D1B 100%)}
#boot .in{display:grid;gap:22px;justify-items:center}
#boot img{height:26px;opacity:.92}
#boot .bar{width:132px;height:2px;border-radius:2px;background:rgba(169,184,205,.22);overflow:hidden}
#boot .bar i{display:block;width:40%;height:100%;background:#F2574C;animation:boot-run 1.25s ease-in-out infinite}
@keyframes boot-run{0%{transform:translateX(-110%)}100%{transform:translateX(360%)}}
body.booted #boot{opacity:0;pointer-events:none;transition:opacity .45s ease}
@media (prefers-reduced-motion:reduce){#boot .bar i{animation-duration:2.4s}}

/* ===== mobile: a 1920x1080 stage letterboxes to ~220 px tall in portrait ===== */
#rotate{position:fixed;inset:0;z-index:200;display:none;place-items:center;
  background:radial-gradient(1200px 800px at 50% 20%,#15305A 0%,#0B1A30 48%,#050D1B 100%);
  color:#EEF2F8;font-family:var(--sans);text-align:center;
  padding:calc(24px + env(safe-area-inset-top,0px)) 24px calc(24px + env(safe-area-inset-bottom,0px))}
body.ask-rotate #rotate{display:grid}
body.ask-rotate #viewport,body.ask-rotate #ui,body.ask-rotate #hint{visibility:hidden}
#rotate .box{max-width:min(420px,88vw);display:grid;gap:18px;justify-items:center}
#rotate .mk{height:22px;opacity:.75;margin-bottom:6px}
#rotate .rot{width:104px;height:88px;color:#F2574C}
#rotate .rot .ph{transform-origin:24px 27px;animation:rt-tip 2.8s var(--ease) infinite}
#rotate h2{font-size:26px;font-weight:600;line-height:1.25;letter-spacing:-.01em}
#rotate p{font-size:16px;line-height:1.55;color:#A9B8CD;margin:0}
#rotate .anyway{appearance:none;background:none;border:0;padding:12px 16px;margin-top:2px;
  color:#A9B8CD;font:inherit;font-size:15px;text-decoration:underline;text-underline-offset:4px;cursor:pointer}
@keyframes rt-tip{0%,18%{transform:rotate(0)}40%,62%{transform:rotate(-90deg)}84%,100%{transform:rotate(0)}}
@media (prefers-reduced-motion:reduce){#rotate .rot .ph{animation:none;transform:rotate(-90deg)}}
/* phone landscape: browser chrome eats the height, so shrink ours.
   Never touch #ui's transform - it carries both the centering and the slide-in. */
@media (orientation:landscape) and (max-height:520px){
  #ui button{width:42px;height:38px}
  #ui svg{width:20px;height:20px}
  #hint{font-size:12px;padding:6px 13px}
}
</style>
`;
must('head close tag present', html.includes('</head>'));
html = html.replace('</head>', head + '</head>');

/* ---------- 6. boot screen markup, as early in the body as possible ---------- */
must('body open tag present', html.includes('<body>'));
html = html.replace('<body>', `<body>
<div id="boot" aria-hidden="true"><div class="in"><img src="${markUri}" alt="Cyphix"><div class="bar"><i></i></div></div></div>`);

/* ---------- 7. portrait guard + mobile behaviour, after the deck's own scripts ---------- */
const tail = `
<div id="rotate" role="dialog" aria-label="סובבו את המכשיר">
  <div class="box">
    <img class="mk" src="favicon.webp" alt="Cyphix">
    <svg class="rot" viewBox="0 0 48 40" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <g class="arc" stroke="#A9B8CD" opacity=".55">
        <path d="M6.5 14.5a19 19 0 0 1 35 0"/><path d="M6.8 8.4v6.4h6.4"/>
      </g>
      <g class="ph"><rect x="18" y="16" width="12" height="22" rx="3"/><path d="M21.8 34.9h4.4"/></g>
    </svg>
    <h2>סובבו את המכשיר לרוחב</h2>
    <p>המצגת בנויה בפורמט רחב. לרוחב היא נפתחת על כל המסך — החלקה או נגיעה מעבירות שקף.</p>
    <button class="anyway" type="button">להציג בכל זאת</button>
  </div>
</div>
<script>(function(){
  "use strict";
  /* the deck's controller has run by now: the first slide is live */
  requestAnimationFrame(function(){ document.body.classList.add('booted'); });

  var ro=document.getElementById('rotate'), forced=false;
  var touch=matchMedia('(hover:none) and (pointer:coarse)').matches;
  function small(){ return Math.min(innerWidth,innerHeight)<=820; }
  function portrait(){ return innerHeight>innerWidth; }
  function sync(){
    document.body.classList.toggle('ask-rotate', touch&&small()&&portrait()&&!forced);
    if(!portrait()) forced=false;                 // rotating back to portrait asks again
  }
  ro.querySelector('.anyway').addEventListener('click',function(){ forced=true; sync(); });
  addEventListener('resize',sync);
  addEventListener('orientationchange',function(){ setTimeout(sync,250); });
  sync();

  /* the keyboard hint means nothing on a phone */
  if(touch){ var h=document.getElementById('hint');
    if(h) h.textContent='החלקה או נגיעה למעבר שקף · הסרגל התחתון לרשימת השקפים'; }

  /* Android Chrome can hold landscape while presenting full-screen; iOS ignores this */
  document.addEventListener('fullscreenchange',function(){
    try{ if(document.fullscreenElement&&screen.orientation&&screen.orientation.lock)
      screen.orientation.lock('landscape').catch(function(){}); }catch(e){}
  });
})();</script>
`;
must('body close tag present', html.includes('</body>'));
html = html.replace('</body>', tail + '</body>');

html = html.replace(/<\/html>\s*$/, '</html>\n<!-- v1.0.0 - Cyphix t:invent deck, web build: streamed media, external mesh, portrait guard -->\n');

fs.writeFileSync(outPath, html);
const after = Buffer.byteLength(html);
const mb = n => (n / 1048576).toFixed(2) + ' MB';
console.log('source        ' + mb(before));
console.log('video embeds  -' + mb(dropped));
console.log('mesh          ' + (mesh ? '-' + mb(mesh[1].length) + ' -> model.json' : 'n/a'));
console.log('index.html    ' + mb(after));
console.log('origin        ' + ORIGIN);
console.log('checks        ' + report.filter(r => r[1]).length + '/' + report.length + ' passed');
report.filter(r => !r[1]).forEach(r => console.log('   FAIL: ' + r[0]));

// v1.0.0 - builds the deployable deck out of the offline single-file export
