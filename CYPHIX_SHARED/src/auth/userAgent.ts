/* ==================================================================
   User-agent → words. What the server knows about a signed-in device
   is the `User-Agent` header its requests carried (`SessionView.userAgent`,
   server v0.12.0). A sessions list that printed that string raw would
   show a patient "okhttp/4.12.0" or "CYPHIX/17 CFNetwork/1498.700.2
   Darwin/23.6.0" and ask them whether it is theirs.

   This reduces it to two facts — which PLATFORM and which CLIENT — and
   nothing else. The words themselves ("iPhone · CYPHIX app") are the
   locale's job; the classification is here so the web and the phone
   cannot disagree about what one string means.

   Pure string work. A string it does not recognise is `unknown`, never
   a guess: a wrong label on a sessions list is a security lie.
   ================================================================== */

export type ClientPlatform = 'ios' | 'android' | 'windows' | 'mac' | 'linux' | 'unknown';

/** `app` is the CYPHIX phone app (React Native's own fetch: no "Mozilla",
    an okhttp or CFNetwork signature). `browser` is a browser this could
    not name. */
export type ClientKind = 'app' | 'chrome' | 'safari' | 'firefox' | 'edge' | 'browser' | 'unknown';

export interface ClientDescription {
  platform: ClientPlatform;
  client: ClientKind;
}

export function describeUserAgent(userAgent: string | null | undefined): ClientDescription {
  const ua = (userAgent ?? '').trim();
  if (!ua) return { platform: 'unknown', client: 'unknown' };

  /* The phone app first: its requests never say "Mozilla". Android's
     networking stack signs as okhttp; iOS's as CFNetwork/Darwin. */
  if (/okhttp/i.test(ua)) return { platform: 'android', client: 'app' };
  if (!/Mozilla/i.test(ua) && /CFNetwork|Darwin/i.test(ua)) {
    return { platform: 'ios', client: 'app' };
  }
  if (/Expo|ReactNative/i.test(ua)) {
    return { platform: /Android/i.test(ua) ? 'android' : 'ios', client: 'app' };
  }

  let platform: ClientPlatform = 'unknown';
  if (/iPhone|iPad|iPod/i.test(ua)) platform = 'ios';
  else if (/Android/i.test(ua)) platform = 'android';
  else if (/Windows/i.test(ua)) platform = 'windows';
  else if (/Macintosh|Mac OS X/i.test(ua)) platform = 'mac';
  else if (/Linux|X11/i.test(ua)) platform = 'linux';

  /* Order matters: Edge and Chrome both say "Chrome", Chrome and Safari
     both say "Safari". The most specific token is checked first. */
  let client: ClientKind = 'unknown';
  if (/Edg\//i.test(ua)) client = 'edge';
  else if (/Firefox\//i.test(ua) || /FxiOS\//i.test(ua)) client = 'firefox';
  else if (/Chrome\//i.test(ua) || /CriOS\//i.test(ua)) client = 'chrome';
  else if (/Safari\//i.test(ua) && /Version\//i.test(ua)) client = 'safari';
  else if (/Mozilla/i.test(ua)) client = 'browser';

  return { platform, client };
}

// v1.0.0 — describeUserAgent: a session's User-Agent → { platform, client } (server v0.12.0).
