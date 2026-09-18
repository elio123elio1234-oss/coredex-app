/* Re-encode PNGs losslessly: adaptive per-scanline filtering, max deflate, and
   drop the alpha channel when nothing uses it.

   WHY: System.Drawing's PNG encoder takes no compression settings and picks a
   poor filter, so the 1024 px icon came out LARGER than the 1254 px artwork it
   was scaled down from (1.8 MB). Pixels are not touched here - only the
   container - and a file is rewritten only if it actually got smaller.

   Dropping alpha is not just a saving: iOS REJECTS an alpha channel on the app
   icon, so an opaque RGBA icon.png is a submission failure waiting to happen.

   pngjs is a TRANSITIVE dependency (via Expo's image tooling), not a declared
   one, so its absence is reported and shrugged off rather than thrown - the
   icons are already correct by the time this runs.

   Run from the project root:  node scripts/recompress-png.js <files...>      */
const { createRequire } = require('module');
const path = require('path');
const fs = require('fs');

let PNG;
try {
  // Resolve from the working directory, not from scripts/, so node_modules is found.
  PNG = createRequire(path.join(process.cwd(), 'noop.js'))('pngjs').PNG;
} catch {
  console.log('  (skipped the lossless re-encode: pngjs is not installed)');
  process.exit(0);
}

let before = 0;
let after = 0;

for (const file of process.argv.slice(2)) {
  const raw = fs.readFileSync(file);
  const png = PNG.sync.read(raw);

  // Does any pixel actually use alpha? An opaque RGBA file spends a quarter of
  // its bytes on a channel that reads 255 everywhere.
  let opaque = true;
  for (let i = 3; i < png.data.length; i += 4) {
    if (png.data[i] !== 255) {
      opaque = false;
      break;
    }
  }

  const buf = PNG.sync.write(png, {
    deflateLevel: 9,
    filterType: -1, // -1 = try every filter per scanline and keep the best
    colorType: opaque ? 2 : 6, // 2 = RGB, 6 = RGBA
  });

  before += raw.length;
  const keep = buf.length < raw.length;
  after += keep ? buf.length : raw.length;
  if (keep) fs.writeFileSync(file, buf);

  const name = file.split(/[\\/]/).pop();
  console.log(
    `  ${name.padEnd(30)} ${(raw.length / 1024).toFixed(0).padStart(5)} KB -> ` +
      `${(buf.length / 1024).toFixed(0).padStart(5)} KB  ${opaque ? 'RGB ' : 'RGBA'}` +
      `${keep ? '' : '  (kept the original, no gain)'}`,
  );
}

console.log(`  total ${(before / 1024).toFixed(0)} KB -> ${(after / 1024).toFixed(0)} KB`);

// v1.0.0 - Lossless PNG re-encode + alpha drop, because System.Drawing's encoder
//          made the scaled-down icon bigger than its own source.
