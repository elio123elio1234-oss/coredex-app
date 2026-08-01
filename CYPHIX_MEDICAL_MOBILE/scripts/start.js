/* ==================================================================
   npm start — launch Expo bound to this machine's REAL LAN address.

   WHY THIS EXISTS. Expo's own LAN detection failed on this dev machine:
   `expo start` (and even `expo start --host lan`) advertised
   `hostUri: 127.0.0.1`, so the printed QR encoded `exp://127.0.0.1:8081`.
   A phone scanning that points at ITSELF — it can never reach the dev
   server, and phone scanners report the useless localhost URL as
   unreadable ("no usable data found"), which looks like a broken QR
   rather than a wrong address.

   The machine has two IPv4 addresses (a real Wi-Fi one and a VirtualBox
   host-only adapter), and picking the wrong one fails the same way. So we
   pick the interface ourselves, print it, and hand it to Expo through
   REACT_NATIVE_PACKAGER_HOSTNAME — the documented override that Expo
   honours unconditionally.

   Detected fresh on every run, so switching Wi-Fi networks just works.
   Override manually if the guess is ever wrong:
     $env:REACT_NATIVE_PACKAGER_HOSTNAME = "192.168.1.42"; npx expo start
   ================================================================== */

const { spawn } = require('node:child_process');
const os = require('node:os');

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
  candidates.sort((a, b) => Number(/wi-?fi|wlan/i.test(b.name)) - Number(/wi-?fi|wlan/i.test(a.name)));
  return candidates[0] ?? null;
}

const forced = process.env.REACT_NATIVE_PACKAGER_HOSTNAME;
const found = forced ? { name: 'REACT_NATIVE_PACKAGER_HOSTNAME', address: forced } : findLanAddress();

if (!found) {
  console.error(
    '\n  Could not find a LAN address on this machine.\n' +
      '  Connect to Wi-Fi, or set it yourself:\n' +
      '    $env:REACT_NATIVE_PACKAGER_HOSTNAME = "<your ip>"; npx expo start\n',
  );
  process.exit(1);
}

console.log(`\n  Dev server host: ${found.address}  (${found.name})`);
console.log(`  Your phone must be on the same network. QR will be exp://${found.address}:8081\n`);

/* Run Expo's CLI script with this same Node binary rather than going through
   `npx`: on Windows npx is a .cmd, and Node refuses to spawn .cmd/.bat without
   a shell (EINVAL) since the 2024 argument-injection fix. Resolving the JS
   entry avoids both the shell and its quoting rules. */
const expoCli = require.resolve('expo/bin/cli');

const child = spawn(process.execPath, [expoCli, 'start', '--host', 'lan', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, REACT_NATIVE_PACKAGER_HOSTNAME: found.address },
});
child.on('exit', (code) => process.exit(code ?? 0));

// v1.0.0 — Forces the real LAN host so the printed QR is scannable.
