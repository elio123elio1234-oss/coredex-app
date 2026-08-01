/* ==================================================================
   npm start — launch Expo bound to this machine's REAL LAN address, on a
   port we KNOW is free, and print a QR for the address the server
   actually ended up on.

   ── Problem 1: the host ──
   Expo's own LAN detection failed on this dev machine: `expo start` (and
   even `expo start --host lan`) advertised `hostUri: 127.0.0.1`, so the
   printed QR encoded `exp://127.0.0.1:8081`. A phone scanning that points
   at ITSELF — it can never reach the dev server, and phone scanners
   report the useless localhost URL as unreadable ("no usable data
   found"), which looks like a broken QR rather than a wrong address.

   The machine has two IPv4 addresses (a real Wi-Fi one and a VirtualBox
   host-only adapter), and picking the wrong one fails the same way. So we
   pick the interface ourselves and hand it to Expo through
   REACT_NATIVE_PACKAGER_HOSTNAME — the documented override Expo honours
   unconditionally.

   ── Problem 2: the port (this is the one that kept biting) ──
   v1.0.0 PRINTED `exp://<ip>:8081` before Expo had bound anything. When a
   Metro from an earlier session was still holding 8081 — which survives
   closing the terminal, and closing the laptop lid — Expo asked "use port
   8082 instead?", moved, and every URL and QR this script had already
   advertised pointed at a port with nothing behind it. It looked like a
   broken QR; it was a correct QR for the wrong port.

   Two changes, and the failure cannot recur:
     1. A stale Expo/Metro on the wanted port is KILLED before we start,
        so the port stays stable across sessions. Only processes that look
        like Expo/Metro/this project are touched; anything else on 8081 is
        left alone and we move to the next free port instead.
     2. NOTHING is printed until the server answers. The host, port and QR
        all come from the running server's own manifest, so what you scan
        is what is listening — by construction.

   Detected fresh on every run, so switching Wi-Fi networks just works.
   Override manually if the guess is ever wrong:
     $env:REACT_NATIVE_PACKAGER_HOSTNAME = "192.168.1.42"; npm start
   ================================================================== */

const { spawn, execFileSync } = require('node:child_process');
const net = require('node:net');
const os = require('node:os');
const qrcode = require('qrcode-terminal');

/** Expo's default. Kept stable on purpose — a moving port is what broke QRs. */
const WANTED_PORT = 8081;
/** How long to wait for Metro to answer before giving up on printing a QR. */
const READY_TIMEOUT_MS = 90_000;

/** Adapters that exist but never carry phone traffic. */
const VIRTUAL_ADAPTER = /virtual|vmware|hyper-v|vethernet|wsl|loopback|bluetooth|docker|tailscale/i;
/** VirtualBox host-only, and link-local addresses handed out when DHCP fails. */
const UNUSABLE_ADDRESS = /^(192\.168\.56\.|169\.254\.)/;

function findLanAddress() {
  const candidates = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    if (VIRTUAL_ADAPTER.test(name)) continue;
    for (const a of addrs ?? []) {
      if (a.family !== 'IPv4' || a.internal) continue;
      if (UNUSABLE_ADDRESS.test(a.address)) continue;
      candidates.push({ name, address: a.address });
    }
  }
  // Prefer Wi-Fi when several remain — that's the network a phone is on.
  candidates.sort(
    (a, b) => Number(/wi-?fi|wlan/i.test(b.name)) - Number(/wi-?fi|wlan/i.test(a.name)),
  );
  return candidates[0] ?? null;
}

/* ── Port housekeeping ─────────────────────────────────────────────── */

/**
 * ★ Bind with NO host, so Node takes the dual-stack wildcard (`::`).
 *
 * `listen(port, '0.0.0.0')` looks like the careful version and is the
 * broken one: Metro listens on `::`, and an IPv4-only probe binds
 * 0.0.0.0 right next to it and reports the port FREE. We then handed
 * Expo a port it could not have, Expo asked to move, and — in
 * non-interactive mode — silently gave up. That false positive is what
 * this whole function exists to avoid.
 */
function isPortFree(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', () => resolve(false));
    srv.once('listening', () => srv.close(() => resolve(true)));
    srv.listen(port);
  });
}

function run(cmd, args) {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
}

/** PIDs listening on `port`, best effort, per platform. */
function listenerPids(port) {
  const pids = new Set();
  if (process.platform === 'win32') {
    for (const line of run('netstat', ['-ano', '-p', 'tcp']).split(/\r?\n/)) {
      // "  TCP    0.0.0.0:8081   0.0.0.0:0   LISTENING   10944"
      const m = line.match(/^\s*TCP\s+\S+:(\d+)\s+\S+\s+LISTENING\s+(\d+)\s*$/i);
      if (m && Number(m[1]) === port) pids.add(Number(m[2]));
    }
  } else {
    for (const p of run('lsof', ['-ti', `tcp:${port}`, '-sTCP:LISTEN']).split(/\s+/)) {
      if (p) pids.add(Number(p));
    }
  }
  pids.delete(process.pid);
  return [...pids].filter(Number.isFinite);
}

/** The command line of a PID, so we only ever kill something we recognise. */
function commandLineOf(pid) {
  if (process.platform === 'win32') {
    // PowerShell rather than the removed-in-Win11 `wmic`.
    return run('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      `(Get-CimInstance Win32_Process -Filter "ProcessId=${pid}").CommandLine`,
    ]).trim();
  }
  return run('ps', ['-o', 'command=', '-p', String(pid)]).trim();
}

/** ONLY an Expo/Metro dev server is ours to reclaim. */
const RECLAIMABLE = /expo[\\/](bin[\\/])?cli|expo-cli|metro|react-native[\\/]cli/i;

function killPid(pid) {
  if (process.platform === 'win32') run('taskkill', ['/PID', String(pid), '/F', '/T']);
  else {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      /* already gone */
    }
  }
}

/**
 * Return a port we can actually bind: the wanted one if it is free or held
 * by a stale dev server of ours, otherwise the next free port above it.
 */
async function resolvePort(wanted) {
  if (await isPortFree(wanted)) return wanted;

  const pids = listenerPids(wanted);
  const stale = pids.filter((pid) => RECLAIMABLE.test(commandLineOf(pid)));

  if (stale.length > 0 && stale.length === pids.length) {
    console.log(
      `  Port ${wanted} was held by a dev server from an earlier session ` +
        `(pid ${stale.join(', ')}) — reclaiming it.`,
    );
    stale.forEach(killPid);
    // The socket needs a moment to leave TIME_WAIT after the kill.
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 250));
      if (await isPortFree(wanted)) return wanted;
    }
  }

  for (let port = wanted + 1; port < wanted + 20; port++) {
    if (await isPortFree(port)) {
      console.log(
        `  Port ${wanted} is held by something that is not ours ` +
          `(pid ${pids.join(', ') || 'unknown'}) — using ${port} instead.`,
      );
      return port;
    }
  }
  throw new Error(`No free port in ${wanted}–${wanted + 20}.`);
}

/* ── Wait for the server, then advertise what it REALLY is ─────────── */

async function fetchManifest(port) {
  const res = await fetch(`http://127.0.0.1:${port}`, {
    headers: { 'expo-platform': 'ios', accept: 'application/expo+json,application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * Wait for OUR server, then print what IT says it is.
 *
 * ★ The `hostUri` must carry the address we launched with. Without that
 * check this function once attached to a dev server left over from an
 * earlier session — on an earlier Wi-Fi network — and cheerfully printed
 * a QR for an IP this machine no longer had. A QR is only worth printing
 * if we can prove which process answered.
 */
async function announceWhenReady(port, expected) {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  let hostUri = null;
  let lastSeen = null;

  while (Date.now() < deadline) {
    try {
      const manifest = await fetchManifest(port);
      const uri = manifest?.extra?.expoClient?.hostUri;
      if (typeof uri === 'string') {
        lastSeen = uri;
        if (uri.split(':')[0] === expected) {
          hostUri = uri;
          break;
        }
      }
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  if (!hostUri) {
    console.error(
      `\n  ✖ No QR printed — could not confirm our own dev server on port ${port}.` +
        (lastSeen
          ? `\n    Something answered, but it advertises ${lastSeen} instead of ` +
            `${expected} — that is another server, probably from an earlier session.` +
            `\n    Close every other terminal running Expo and try again.`
          : `\n    The server never answered. Check the Metro output above for the error.`) +
        '\n',
    );
    return;
  }

  const url = `exp://${hostUri}`;
  console.log(`\n  ✔ Dev server is up: ${url}`);
  console.log('    Scan with the iPhone camera (Expo Go), same Wi-Fi as this machine.');
  console.log('    In Expo Go you can also type the URL above by hand.\n');
  qrcode.generate(url, { small: true });
  console.log('');
}

/* ── Go ────────────────────────────────────────────────────────────── */

async function main() {
  const forced = process.env.REACT_NATIVE_PACKAGER_HOSTNAME;
  const found = forced
    ? { name: 'REACT_NATIVE_PACKAGER_HOSTNAME', address: forced }
    : findLanAddress();

  if (!found) {
    console.error(
      '\n  Could not find a LAN address on this machine.\n' +
        '  Connect to Wi-Fi, or set it yourself:\n' +
        '    $env:REACT_NATIVE_PACKAGER_HOSTNAME = "<your ip>"; npm start\n',
    );
    process.exit(1);
  }

  console.log(`\n  Dev server host: ${found.address}  (${found.name})`);

  const port = await resolvePort(WANTED_PORT);

  /* Run Expo's CLI script with this same Node binary rather than going through
     `npx`: on Windows npx is a .cmd, and Node refuses to spawn .cmd/.bat without
     a shell (EINVAL) since the 2024 argument-injection fix. Resolving the JS
     entry avoids both the shell and its quoting rules. */
  const expoCli = require.resolve('expo/bin/cli');
  const args = ['start', '--host', 'lan', '--port', String(port), ...process.argv.slice(2)];

  const child = spawn(process.execPath, [expoCli, ...args], {
    stdio: 'inherit',
    env: { ...process.env, REACT_NATIVE_PACKAGER_HOSTNAME: found.address },
  });

  // Printed only once the server answers — see the header.
  void announceWhenReady(port, found.address);

  const bye = () => child.kill();
  process.on('SIGINT', bye);
  process.on('SIGTERM', bye);
  child.on('exit', (code) => process.exit(code ?? 0));
}

main().catch((err) => {
  console.error(`\n  ${err.message}\n`);
  process.exit(1);
});

// v2.0.0 — Reclaims a stale dev server's port, and prints the URL + QR only
//          after the server answers, from ITS manifest — never a guess.
