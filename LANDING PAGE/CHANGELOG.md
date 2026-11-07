# Changelog — CYPHIX Landing

## v0.38.27 — 2026-11-07 — "For investors" first in Explore

**Why.** The user: in Explore, "For investors" should come first, then the rest.

**What changed.** The Explore list now opens on **For investors** (the page was titled
"Investors" in the menu), followed by One strap. Any watch., Technology and Visualizations, in their
old order. The list is one source (`config/nav.ts`), so the order holds in both places:
- the wide bar's menu;
- the phone's drawer.

Checked in WebKit at 1440 wide and on iPhone 13.

## v0.38.26 — 2026-11-07 — the Explore pages, from the challenge submission

**Why.** The user sent their Future Health Digital Innovation Challenge submission (16 slides) and
asked to add what the Explore pages were missing. Two instructions came with it:
- The home page stays exactly as it is ("it's perfect").
- The submission's pyramid of whom it is for goes on the Investors page.

**/investors, added:**
- **Who it's for, most urgent first:** the four-tier pyramid.
  1. Undiagnosed transient symptoms.
  2. Active rhythm management.
  3. Post-discharge monitoring.
  4. Prevention and longevity.

  Beside it, the intended outcome for patients, clinicians and health systems, and the aim:
  cut the time to diagnosis for elusive arrhythmias from months to days.
- **How success will be measured:**
  - **Clinical-grade signal:** against a standard ECG machine, measured as lead-by-lead agreement
    and the share of recordings a blinded cardiologist rates diagnostic.
  - **Earlier detection:** in the 20–50-patient feasibility study.
  - Also tracked: first recordings made without help.
- **The timeline in months:** now, months 9–13, month 13 on, by month ~51. Under it sit
  stakeholders, integration (web view and PDF first, HL7 FHIR later), the regulatory path (expected
  FDA Class II, likely 510(k)) and sustainability (fitting remote-monitoring reimbursement).
- **Risks and safeguards:** the submission's seven-row table. On a phone it becomes a list.
- **The team's capabilities:**
  - Elio: B.Sc. EE at Tel Aviv University; four years and more in hardware and chip design; built
    the prototype end to end.
  - Tamir: physician, a Technion graduate and a paediatrics resident; supported the proof of
    concept; translates clinical needs.
- **Touched:** "What has been done" (clinical) now says requirements were developed with
  cardiologists and a first patient study is agreed. "Ten wearable prototypes" and "the data to
  train its model" join the milestones.

**/technology, added:**
- **Six views, not one.** A drawn diagram of the frontal plane: a watch's one lead against the six
  limb leads at their standard angles, with the inferior wall (II, III, aVF) shaded. It is anatomy,
  not a reading.
- **The three noise sources** the array handles: motion, loose contact, muscle.
- **After the recording:**
  - **The clinician's portal,** available from the first day.
  - **The AI baseline, marked "In development".** It is worded as the submission's own safeguards:
    it supports the clinician and never replaces them, a clinician reads every recording, and
    Cyphix never tells a patient they are fine.
- **The hardware:**
  - the working prototype;
  - the final form;
  - sourcing;
  - safety and standards: "designed toward" IEC 60601-1, ISO 10993 and ISO 13485, a direction,
    not a claim of compliance.
- **See it working:** the no-login web demo and the prototype video, as links only, not embedded,
  so YouTube sets no cookies.

**Left out on purpose:**
- **Sheba,** named as the secured study site in the submission. No partner has been named on the
  site since v0.35.0, and that waits for the user's word.
- **Samsung,** which the user removed from the site.
- **"Tnufa" on the home page.** It stays where it already was, on Investors.
- **No round amount.**

**A first for the site: AI.** The submission's AI Heart ID is described here, as in development.
The product itself still displays data and does not interpret (the standing rule). The site's
wording keeps to the submission's own limits, and the user can withdraw it.

Checked in WebKit, at 1440 wide and on iPhone 13: both pages hold no sideways overflow and no
errors. axe-core (WCAG 2.1 A/AA) finds no violations on either page. The home page is unchanged.

## v0.38.25 — 2026-11-07 — the wheel on a shorter laptop window

**Why.** The user, on the computer at 100 % zoom: "the scrolling disappears in this part. It must
not happen." Their screenshot showed "Who it's for" as a plain list. The screen is scaled by
Windows (about 1.7 device pixels per CSS pixel), so at 100 % the browser has under 500 px below the
bar. The wheel held only from 500 px, so it switched itself off.

**What changed.** Side by side, the wheel now holds from 420 px under the bar instead of 500.
Measured, the held stage itself (the heading, the wheel and the phone image) needs about 380 px,
so 500 was far more than it needs.

Checked in Chrome at:

| Window | Room under the bar |
|---|---|
| 1142 × 560 | 488 px |
| 1280 × 520 | 448 px |
| 1280 × 495 | 423 px |
| 1920 × 560 | 488 px |

At every one of these the wheel holds and the stage fits, with the heading and the phone image
whole. WebKit holds at 1280 × 520 and 1440 × 900. Taller windows are unchanged.

## v0.38.24 — 2026-11-07 — no city

**Why.** The user: "Take my city off the site, it's not relevant."

**What changed.** "Kiryat Ono, Israel" is gone from both places it stood:
- **"Request the deck":** the pin mark and the line it revealed are removed. The contact line is
  the e-mail mark alone.
- **The footer's Contact column:** the city line is removed.

No other page named the city. The legal pages say only that their courts are in Tel Aviv-Jaffa,
which is the governing-law clause, not an address.

Checked in WebKit on iPhone 13 and at 1440 wide: the city is in no text on the page, one mark
remains, no errors.

## v0.38.23 — 2026-11-07 — legal pages and an accessibility pass

**Why.** The user: "add to my site everything it needs so it isn't exposed to lawsuits (cookies or
terms, I don't know, tell me)". They do not know this field, so the work started from what the
site actually does, not from a template.

**The audit first.** All five pages were loaded live and scrolled, and the form was touched.
- **No cookies, no browser storage, no analytics or trackers.** Fonts are self-hosted.
- **One outside request:** the Cyphix server's captcha policy.
- **The server, read in `CYPHIX_SERVER/src/routes/contact.ts`:** the form stores name, e-mail,
  organisation, message, IP address and user agent, on Render and Neon in Frankfurt, and sends two
  e-mails through Resend.

So **no cookie banner**: there is nothing to consent to, and a banner would only cost the page.
What a site like this does need is below.

**What changed.**
- **/privacy, a privacy policy** written from that audit:
  - what is collected and why;
  - "no cookies or trackers";
  - each processor by name (Vercel, Render, Neon, Resend, Google, Cloudflare if Turnstile is on);
  - transfers abroad;
  - rights under Israel's Protection of Privacy Law and GDPR;
  - retention;
  - children;
  - contact.
- **/terms, terms of use.** These are the protections that matter most for this site:
  - not medical advice;
  - a device in development that is not cleared by the FDA, a notified body or the Israeli
    Ministry of Health;
  - emergency: call 101;
  - **not an offer of securities**, since the site announces a seed round;
  - forward-looking statements;
  - generated imagery;
  - intellectual property and the pending patent;
  - no confidentiality without an NDA;
  - limitation of liability;
  - Israeli law, Tel Aviv-Jaffa courts.
- **/accessibility, the accessibility statement Israeli law requires** (Service Accessibility
  Regulations 2013, reg. 35): the standard (WCAG 2.1 AA, covering IS 5568), what was done, the known
  limitations as they are, how it was checked, and the coordinator (Elio El Hassrouny, by e-mail).
  No accessibility overlay plugin, deliberately: those do not make a site accessible, and they have
  drawn lawsuits of their own.
- **Notice at collection:** the form's note now links the privacy policy.
- **The footer** links Privacy, Terms and Accessibility on every page.

**The accessibility audit** (axe-core, WCAG 2.1 A/AA, every page, desktop and iPhone):
- **Fixed:** the Technology page's step numbers and the Investors page's "next" label were coral on
  white at 3.4:1. Small coral text now uses `--coral-ink` (#c73a30, 5.2:1).
- **Fixed:** the wheel's out-of-frame rows are now `visibility: hidden`, not only transparent.
- **Fixed:** the hero's unlit light layer is hidden. Checkers measured the hero's text against it
  (a false failure).
- **Remaining by design, and stated:** the faded rows of "Who it's for" are below 4.5:1 while out of
  focus. They show in full ink for anyone whose device asks for more contrast.
- The three new pages pass clean.

**A draft, not legal advice.** The texts are written to fit the site as it is, but a lawyer should
review them, especially:
- the company's legal name and number once it is incorporated;
- whether the seed-round announcement is acceptable under Israeli securities law;
- the accessibility coordinator's phone number, which the regulations ask for and the user does not
  want published yet.

## v0.38.22 — 2026-11-07 — on a phone, the man on the band's right

**Why.** The user: "You put him in the middle when the reference clearly has him more on the right
of the band. Why?" Then: "On the computer I wouldn't touch it, it's good. On the phone he's in the
middle, why?" v0.38.21 centred him on a phone against the user's own mock-up.

**What changed (phones only).**
- **The man sits right of the middle,** his centre at 66 % of the screen, as in the mock-up.
- **70 % was tried first** but showed a sliver of his white shoe beside the navy card; at 66 % the
  card covers it.
- **The band clips its sides** (`overflow-x: clip`), so his chair may run to the screen's edge, as in
  the mock-up, without the page gaining width. It does not clip its top, so his head still rises
  above the band.
- **Untouched, as the user said:** the computer (64 % side by side) and every width over 719 px.

Checked in WebKit on iPhone 13, iPhone SE and iPhone 15 Pro Max: centred at 66 % on each, no
sideways overflow. A desktop width check at 1440 is unchanged.

## v0.38.21 — 2026-11-07 — the solution band's scene

**Why.** The user wanted to try a scene in place of the empty grey band under "Universal Fit.
Clinical Power.", and would drop it if it read as too busy. They sent a phone mock-up and two images
through ChatGPT share links: a room, and a man in an armchair already cut out. The brief: blur the
room, put the man on it, and let his head rise a little above the band, as in the mock-up.

**What changed.**
- **The band shows the room, blurred** (`solution-room.webp`). The blur is baked into the file
  (Gaussian, radius 9), not applied live, so the browser does no work for it. 16 KB.
- **The man stands in front** (`solution-man.webp`, the user's cut-out trimmed to its outline, 884 ×
  1000 with alpha, 95 KB). He is 118 % of the band's height, standing on its lower edge, so his head
  rises above the band's top into the white of the section above. The navy card, as before, rises
  over his legs.
- **Where he sits:**
  - **On a phone:** centred; the band is 250 px, and the card rises 96 px over him, as in the
    mock-up.
  - **Side by side (1024 px and up):** right of the middle, at 64 %. There the section above ends
    on the physician's photograph at the left, and his head should rise into the white beside it,
    not over the photograph.
- **No shadow under him.** A drop shadow drew a grey haze around his head on the white, so it was
  removed.

Checked in WebKit at:
- iPhone 13;
- 820 × 1180;
- 1000 × 700;
- 1280 × 720;
- 1440 × 900.

At every size the head rises 40–78 px above the band and never over the photograph or the text
above. Nothing reaches past the screen's sides, and there are no errors. Both images are
generated, sidecars in `assets/photos/`.

## v0.38.20 — 2026-11-07 — "Who it's for" on a phone, once and for all

**Why.** The user, on the iPhone, after v0.38.17: "Who it's for flickers again, why? Fix it once
and for all."

**What went wrong, three times.** From v0.38.9 to v0.38.17 the rows were placed from the scroll
position: in script, then in the browser's own scroll timeline, then with that timeline's range
measured more carefully. Every version passed in Chrome and in WebKit on Windows. None of them can
reproduce what an iPhone does while the page coasts and Safari's bars slide, and on the phone the
computed place kept jumping. The flaw was not in a number but in the approach: anything that
computes where the rows are can disagree with where the page is.

**What changed: nothing computes the rows' place any more.** Stacked (a phone, a narrow window),
the rows are ordinary content and scroll with the page itself, at the finger's own pace, so they
cannot jump. The wheel's look stays as a window they pass through:
- "Who it's for" holds at the top of the screen (CSS sticky).
- The app's phone image holds at the bottom.
- Each sits on the page's white, with a soft fade toward the rows.
- One row at a time passes between them, upright and full in the middle and fading toward the
  edges.

The tilt and the fade are the only things script still sets. They are read from where each row
really is on screen, so a late frame can only shade a row a touch off, never move it. When the
section ends, the heading and the image let go and the page carries on. The wide screen's held,
notched wheel is unchanged.

Checked in WebKit (iPhone 13 profile) and at 960 × 1000, walking the section 6 px a frame: in no
frame did a row move other than with the page (0 frames off by more than 3 px), and no sideways
overflow. The scroll timeline and its keyframes are gone.

## v0.38.19 — 2026-11-07 — the footer's marks across the row, not the wordmark

**Why.** The user: "I asked for the Instagram, LinkedIn… marks to take the whole width, not my
logo." v0.38.18 read the request as the wordmark and stretched CYPHIX across the row. That was
wrong.

**What changed (phones).**
- **The wordmark is back to its own size** (106 × 22).
- **The e-mail, Instagram and LinkedIn marks span the row.** Each takes a third of the width and is
  centred in it, with the glyph at 34 px instead of 20 and a 72 px tap area.

Checked in WebKit:
- **iPhone 13:** the row runs 20–370 px of 390, with the marks centred at 77, 195 and 313.
- **iPhone SE:** the row runs 20–300 px of 320.
- **Wide screen:** unchanged; the footer shows no marks there.

## v0.38.18 — 2026-11-07 — no phone number; the contact line as marks; the footer's wordmark

**Why.** Three requests from the user:
- **No phone at all.** "I don't need my phone exposed to everyone on the internet until there is a
  company phone." The number was the user's own.
- **"Request the deck":** the e-mail, phone and place stood there in full. Now there are marks
  only, and a tap reveals what is behind one. On a phone the marks sit side by side.
- **The footer, on a phone:** drop "Clinical Depth. Wearable Ease." and enlarge the wordmark to the
  row's full width, centred. The e-mail joins Instagram and LinkedIn at the bottom.

**What changed.**
- **The phone is gone everywhere:**
  - the wide bar's phone mark and its pop-up number;
  - the footer's Contact column;
  - the phone marks at the footer's foot;
  - the contact line.
- **The contact line** is two marks, an envelope and a pin. A tap shows the e-mail (a link that
  writes to it) or "Kiryat Ono, Israel".
  - On a wide screen the line shows beside its mark.
  - On a phone the marks sit side by side and the line shows under them.
  - Only one line shows at a time; a second tap hides it.
- **The footer:**
  - "Clinical Depth. Wearable Ease." is removed on every screen.
  - On a phone the CYPHIX wordmark spans the row (350 px of 390) and is centred.
  - Under it, centred, are the e-mail, Instagram and LinkedIn marks.

Checked in WebKit (iPhone 13 profile) and Chrome, phone and 1440 wide:
- no number in the page's text;
- the marks reveal and hide;
- the footer's wordmark spans the row;
- no errors.

**Not changed:** the investors' one-pager PDF (`CYPHIX_ONE_PAGER/`) still prints the number. It is a
separate document, left for the user's call.

## v0.38.17 — 2026-11-07 — two iPhone bugs, reproduced in WebKit

**Why.** The user, on the iPhone, rightly angry that v0.38.16 was not checked where it runs: the
menu "opens from the right, then jumps back"; and "Who it's for" scrolls perfectly but flickers:
"it starts well, jumps to the last row, then to the first, and only then settles". Both had been
checked only in Chrome. They are now reproduced and verified in WebKit (Safari's engine, via
Playwright, iPhone 13 profile).

**The drawer's jump.** On opening, the drawer moved focus to its close cross while the panel was
still off the screen's edge. Focus scrolls the nearest scrollable box to reveal what it focuses,
and the layer clipping the drawer (`overflow: hidden`) is scrollable: WebKit scrolled it 78 px
sideways, then 17, then 3, then back. Now the cross is focused with `preventScroll`, and the layer
clips with `overflow: clip`, which cannot be scrolled at all. WebKit, frame by frame: the panel
slides 271, 167, 118, 100, 93, 90 px and stops, with no sideways offset.

**The wheel's jump.** The browser draws the wheel from the scroll position, between two scroll
positions the hook gives it. v0.38.14 measured them from the screen (`getBoundingClientRect` +
`scrollY`) on every scroll. On an iPhone, while Safari's bars slide away or the page coasts, those
two readings disagree for a frame. A range too early shows the wheel at its end (the last row), a
range too late at its start (the first), until the next frame corrects it: exactly what the user
saw. Now the range comes from the layout alone (the wrapper's offset in the page), measured on
load, resize and layout change, never while scrolling. And while the wheel follows the scroll, it
no longer re-renders the rows at each step. WebKit, a scroll walked at 4, 12 and 30 px a frame:
one range throughout, rows moving exactly with the scroll, no jump.

Real iPhone momentum and Safari's bars cannot be reproduced on Windows; the user's phone remains
the final check.

## v0.38.16 — 2026-11-07 — the drawer over the bar; no sideways pan

**Why.** The user, on the iPhone: the scroll is now perfect, but the page "moves to the side and
scrolls sideways"; and the menu should open over the top bar too, as Gmail's does.

**The sideways pan** was v0.38.14's drawer. Closed, it waited just past the screen's right edge,
hung from the bar. A hidden box still counts as page width, and iPhone Safari lets the finger pan
to it even though the page clips its sides (`overflow-x: clip` on the body does not stop the
viewport's own pan there).

**What changed.**
- **The drawer is a fixed layer over the whole screen** (above the bar), which clips its own
  edges. The closed panel waits inside that layer, so the page never gains width.
- **It opens over the bar**, the full height of the screen, about 300 px wide, from the right. Its
  head has the bar's height, with "Explore" and a close cross where the menu button was. The page
  behind dims; a tap on it, on a page, on the cross, or Escape closes it.
- Focus moves into the drawer when it opens and back to the menu button when it closes.

Checked in headless Chrome at 390 × 760 on all five pages: no element, shown or hidden, reaches
past the screen's sides; the drawer opens over the bar and closes from the cross and the dimmed
page; no errors.

## v0.38.15 — 2026-11-07 — Request the deck, square

**Why.** The user: in "Request the deck", make the rectangles' corners sharper, like the top of the
landing page. The hero's chip ("In development · Not for sale") and the form's own panel are
square; the fields inside the panel were rounded (14 px) and the send button 10 px, so the form
read softer than the rest of the page.

**What changed.** The form's fields and its send button are square (radius 0), with the button's
focus ring square too. Only this section: the button on the pages behind Explore keeps its corners.

## v0.38.14 — 2026-11-07 — two corrections: the phone's menu, and the wheel back

**Why.** The user, on v0.38.12 and v0.38.13: "you didn't understand me at all." Both were wrong.
- **The menu.** v0.38.13 put Product, Stage and Team in a full-width panel and turned the phone mark
  into the number. What was asked: those links do not belong on a phone at all; the menu opens a
  little from the side, not over the whole screen, and holds what Explore held. The phone,
  Instagram and LinkedIn are marks (the phone too, not its number), at the bottom of the page.
- **The wheel.** v0.38.12 took the held wheel away on a phone. What was asked: the scroll should
  feel natural, "as if there is no scroll effect", but the wheel's look must stay. It also took the
  wheel away from a desktop window narrow enough to lay out in one column (a browser beside an
  editor), which the user saw: "you removed it on the computer too".

**What changed.**
- **The phone's menu (up to 719 px)** is a drawer about 300 px wide that slides in from the right,
  under the bar, with the four pages behind Explore and nothing else. The page beside it dims a
  little; a tap there, on a page, or Escape closes it. The section links are gone from the phone.
- **The phone, Instagram and LinkedIn marks** stand in the footer under "Clinical Depth. Wearable
  Ease." on a phone; a tap on the phone mark calls. The wide bar keeps its own marks, unchanged.
- **Stacked (a phone, a narrow window), "Who it's for" holds its wheel again**, but it is not
  notched there: it moves one pixel for one pixel with the scroll. The hold lasts exactly the
  wheel's own travel (two rows of 230 px), so the rows move at the finger's speed. The browser
  draws it from the scroll position itself (CSS scroll timeline, keyframes `wheel-0/1/2`), so it
  cannot lag; where there is no scroll timeline, the hook writes each row's place every scroll frame
  with no glide.
- **The wide screen is untouched:** its notched wheel and its bar are as they were.

Checked in headless Chrome: at 390 × 700 and 960 × 1000 the wheel holds, and 115 px of scroll moves
the rows about 114 px; at 1440 × 900 the notched wheel is unchanged; the drawer opens from the right
with the four pages only; the marks show in the footer on the phone only; no errors.

## v0.38.13 — 2026-11-07 — a menu button on the phone

**Why.** The user: on a phone, put a menu button (three lines) on the right in place of "Explore",
and move the Instagram and LinkedIn marks and the rest down to the bottom, "because it's less
important".

**What changed (phones, up to 719 px; the wide bar is unchanged).**
- **The bar is the wordmark and the menu button**, at the right edge. "Explore" and the phone,
  Instagram and LinkedIn marks leave the bar.
- **One panel under the bar**, its full width: the section links (Product, Stage, Team) large; the
  pages behind Explore under a small "Explore" label, each with its line; and at the panel's foot,
  on a pale band, the phone number (a tap calls) with Instagram and LinkedIn.
- The three lines turn into a cross while it is open. A tap on a link, outside the panel, or Escape
  closes it. Over a dark stage it turns dark with the bar.

Checked in headless Chrome at 390 × 760 (home and /technology): the button is 44 × 44 at the right
edge, the panel opens and a link closes it, no errors. At 1440 the bar is as it was.

## v0.38.12 — 2026-11-07 — the phone scrolls at its own pace

**Why.** The user, on an iPhone: scrolling "Who it's for" with the finger "doesn't feel natural and
isn't as fast as the rest of the page… it feels like it sinks the page". v0.38.11 made the wheel
smooth, but the wheel itself was the problem: it held the section for about 2.7 screens of scroll
while the page stood still, so the finger moved and nothing went by. No glide fixes that; a held
stage on a phone reads as the page getting stuck.

**What changed.**
- **Stacked (a phone, a portrait tablet), "Who it's for" never holds.** It is a plain section, about
  one screen and a half tall, and it scrolls exactly like the rest of the page.
- **The wheel stays, done by the browser.** Each row comes up from the bottom tilted back and faint,
  stands upright and full in the middle of the screen, and tilts away as it leaves at the top. It
  is a CSS scroll-driven animation (`animation-timeline: view()`), drawn on the graphics chip from
  the scroll itself, with no script in between, so it can never lag the finger. Where the browser
  has no scroll timeline, or the visitor asks for reduced motion, the rows read plainly.
- **The finger-following code is retired** (`smooth`, the glide, `data-wheel-i`): nothing uses it.
- **The wide screen is unchanged:** the held, notched wheel stays.

Checked in headless Chrome at 390 × 700: the section is 980 px of ordinary page (it was held), the
rows turn as they pass, no errors; at 1440 × 900 the held wheel is as it was. How it feels under the
finger needs the user's iPhone.

## v0.38.11 — 2026-11-07 — the phone's wheel, smooth

**Why.** The user, on an iPhone: "In 'Who it's for' the text's roll feels choppy, as if it ran on
200-year-old hardware. Why isn't it just smooth?"

Two causes:
- **The mask.** The rows sat under a fading mask (`mask-image`), so the phone repainted the whole
  wheel on every frame.
- **The scroll events.** v0.38.9 placed the rows only when a scroll event came. A phone sends those
  unevenly during a swipe, so the wheel stepped from one to the next.

**What changed.**
- **No mask on a phone.** The wheel clips at its edge, and its rows fade by their own opacity.
- **Each row its own layer** (`will-change: transform, opacity`, `backface-visibility: hidden`), so
  moving it is the graphics chip's work, not a repaint. The wide screen's notched wheel gets the
  layers too.
- **A short glide.** The drawn position glides toward the scroll's over about 0.08 s, drawn every
  frame until it settles. It moves at the finger's pace, evenly, and comes to rest exactly on the
  scroll's position.

**Checked.**
- Typecheck and build pass.
- At 390 × 700, a finger-like scroll in 120 small steps: row 2's place runs 1.00 → 0.84 → 0.61 →
  0.36 → 0.11 → −0.14 → … → −1.00, with no jumps, and settles at the scroll's own position. No
  page errors.
- The feel on the user's iPhone is the real test.


## v0.38.10 — 2026-11-07 — phones: no announcement line

**Why.** The user: "On the phone, let's drop the blue bar at the top of the page."

**What changed.** Under 720 px, on every page, the blue announcement line ("Now raising our seed
round | Request the deck") is hidden, so the page opens on the white bar. Tablets and desktops keep
it. The deck request is still at the foot of every page.

**Checked.** Typecheck and build pass. At 390 × 760 the line is hidden; at 1440 × 900 it shows.


## v0.38.9 — 2026-11-07 — phones: no held opening; the wheel follows the finger

**Why.** The user, on an iPhone, on v0.38.8: "No, now it's small and not good. Maybe on such
screens don't have the transition effect, and just a screen below? Maybe that's the problem?" Then,
on "Who it's for": "Here, the scroll should follow the pace of the finger (phone only). And why
isn't the phone centred?"

The user was right about the cause. Holding the opening on a phone meant fitting the copy, the hand
and the tablet into one short window, and the hand shrank to fit (v0.38.8).

**What changed.**
- **The opening on a phone or a portrait screen** (anything not `min-width: 1024px` or
  `min-aspect-ratio: 5/4`):
  - Nothing holds. The band is in its own phone layout again, the forearm at full size.
  - The clinician's screen ("Catch the Invisible.", its line, the live tablet) is a section of its
    own under it, in the day's light.
  - `useHeroScene(enabled)` stays off there.
  - Wide screens keep the held scene, unchanged.
- **The wheel follows the finger** on a phone.
  - The rows' places are written every frame from the scroll (`--d`, `--ad`, opacity), with no
    transition, so the wheel turns exactly as far as the finger moves and can rest between two
    rows like a picker.
  - On a wide screen it still turns a notch at a time.
- **The phone image is centred when stacked.** It was capped in width but left-aligned; now
  `margin-inline: auto`, with its caption centred too.

**Checked.**
- Typecheck and build pass.
- 390 × 700 (phone): the opening plain, the scene as a section, the wheel at four scroll points
  including between two rows, the image centred.
- 1440 × 900: the held opening and the notched wheel unchanged.
- No page errors.


## v0.38.8 — 2026-11-07 — the phone pass, second round

**Why.** The user, on an iPhone, after v0.38.7: "Still, still the scrolling doesn't work for me.
You moved the doctor's picture too far left." The screenshot showed the opening: no white band any
more, but the hand cut off at the band's lower edge.

**What changed.**
- **The hand.**
  - On a stacked layout the hero's copy and the forearm image (347 px) together ran taller than
    the window under the bar, with Safari's bars shown. The band cut the hand.
  - The hero's rows are now the copy and the rest of the space, and the forearm shrinks to fit that
    rest (`max-height: 100%`).
  - The tablet scales with the window's height (`min(54vw, 46svh)`), so both stand whole on any
    phone.
- **The physician.** v0.38.7's 72 % moved the photograph too far. The narrow screens' focus is now
  56 %, between it and the desktop's 14 %.
- **The scroll (the wheel).**
  - v0.38.7 held the wheel only where 640 px stood under the bar. An iPhone with Safari's bars shown
    has about 600, so it never held there.
  - It now holds from 540 px.
  - On a phone the wheel is a little shorter (`clamp(250px, 40svh, 360px)`), the phone image under
    it at most 300 px wide, and the text 16 px.
  - The fade at the wheel's edges is thinner there (7 %), so a long row's first and last lines stay
    whole.
  - An iPhone SE now holds too.

**Checked.**
- Typecheck and build pass.
- Headless Chrome at 390 × 660 and 390 × 740 (an iPhone with Safari's bars shown) and 375 × 667:
  the hero whole, the physician in frame, each notch of the wheel. No page errors.
- Only the user's iPhone shows Safari's own toolbar behaviour.


## v0.38.7 — 2026-11-07 — the phone pass

**Why.** The user, on an iPhone: "Now it's perfect! On the phone there are a few small bugs:
- in the first part of the site, something white hides the whole lower part;
- in the doctor's picture the doctor is completely out of the frame; it needs moving a bit left;
- the 'who it's for' scroll effect, the same on the phone too, okay?"

**What changed.**
- **The white band.** The opening's held stage was `100svh` tall, the small viewport with Safari's
  bars shown. When the bars hid, the window grew taller than the stage and the page's white showed
  under it.
  - The stage now fills the large viewport (`100lvh`).
  - The hero inside it keeps the small one, so the hand still stands on its lower edge above the
    toolbar, with the slate continuing below.
  - The held "Who it's for" stage uses the large viewport too.
- **The physician.** On stacked layouts (a phone, a portrait tablet) the photograph is cropped
  narrower, and its focus moves from 14 % to 72 % across: the physician is in the frame with the
  laptop beside him.
  - The focus is now a CSS variable (`--focus`), so the narrow screens can override it.
  - Desktop is unchanged.
- **The wheel on a phone.** Stacked, the heading, a slightly shorter wheel (`clamp(280px, 44svh,
  380px)`) and the phone image under it hold together. A notch is 230 px there, since a row runs
  to six or eight lines.
  - It holds where the screen has 640 px under the bar, measured on the layout viewport, which
    stays still while Safari's bars move.
  - A short phone (an iPhone SE, 667 px) reads the three rows plainly.

**Checked.**
- Typecheck and build pass.
- Headless Chrome at 390 × 844, 430 × 932 and 375 × 667: the hero, the photograph, and each notch
  of the wheel. No page errors.
- Headless Chrome has no moving toolbar, so the white band's fix still needs the user's iPhone to
  confirm it.


## v0.38.6 — 2026-11-07 — "Who it's for" on a wheel

**Why.** The user, on v0.38.5: "Nice, I liked it, but the scroll is still too fast, and the text
takes the full height. Can you add to your perfect effect that the texts that don't matter right
now leave the frame or are pushed back, like a wheel effect? And reverse the order, from the end
to the beginning: clinics first, then clinicians, then patients."

**What changed.**
- **Order:** clinics & health systems, clinicians, patients. The plain list on a phone follows
  the same order.
- **Slower:** 0.9 of a screen of scroll for each row (2.7 screens for the three). v0.38.4 gave
  each 0.65.
- **A wheel.** While held, the rows sit in a frame about half the window tall, a picker-style
  wheel:
  - the row in view in the middle, at full size;
  - its neighbours a notch away (150 px), tilted back 26°, 10 % smaller and at 30 %;
  - the third out of the frame.
  - The frame fades at its top and bottom edges.
  - The wheel turns a notch at a time, each change a 0.8 s turn, so it never stops between two
    rows.
- **Where it holds:** the two columns side by side (≥ 1024 px or a landscape window), with at least
  500 px under the bar. On a phone nothing holds and the three read plainly.
- With reduced motion the rows slide and fade without the tilt.

**Checked.**
- Typecheck and build pass.
- 1440 × 900 and 1366 × 657, each of the three notches; 390 × 760 plain.
- No page errors.


## v0.38.5 — 2026-11-07 — "Who it's for": no gap under the heading

**Why.** The user: "Look at the gap you made between the heading and the screen."

The heading stood outside the held stage, and the stage, a full window tall, centred its content.
So when the section arrived there was an empty band of about 200 px between "Who it's for" and the
rows. That was true of v0.38.0's tabs, and of v0.38.4's rows too.

**What changed.**
- The heading now holds with its rows, inside the stage. The two stand together in the middle of
  the window, separated by the page's usual spacing.
- On a short window that spacing gives a little first, so the whole still fits and holds: the
  heading's margin is `clamp(28px, 4vh, 64px)` and the gap between rows is `clamp(24px, 4.5vh, 40px)`.

**Checked.**
- Typecheck and build pass.
- 1440 × 900 and 1366 × 657 hold, the heading directly above the rows; 390 × 760 reads plainly.
- No page errors.


## v0.38.4 — 2026-11-07 — "Who it's for": back to its rows

**Why.** The user, on v0.38.0–v0.38.2's tabs: "The change between them on scroll is too fast, I
miss it myself. 'For patients / For clinicians / For clinics & health systems' is really small too;
maybe put who it's for next to the SVG and not above the line? Something in the design doesn't
work for me, it's very confusing and messy. Go back to the previous design, just the scroll between
them or something."

**What changed.**
- **The rows are back:** the line icon, the audience in bold beside it ("For patients:"), the user's
  full text, and the phone beside them. This is v0.37.10's look.
- **The scroll moves through them.**
  - All three stay in view. The row in view is in full ink and the other two rest faded (28 %),
    with a 0.6 s fade.
  - The reader sees what comes and can't miss a step.
  - Each step has about two-thirds of a screen of scroll (1.95 screens for the three; v0.38.0 gave
    each half a screen).
- **The section holds only where the three rows fit the window under the bar.** Elsewhere (a phone,
  a short landscape window) nothing holds and all three read plainly in full ink.
- Retired: the tabs, their hairlines, the slides, the points and the tab jump.

**Checked.**
- Typecheck and build pass.
- 1440 × 900 and 1366 × 657 hold, each step lighting its row; 960 × 600 and 390 × 760 read plainly.
- No page errors.


## v0.38.3 — 2026-11-07 — the team, as a team

**Why.** The user passed on advice about the team section. The black-and-white-to-colour hover
works. But the line under "The team." ("An electrical and electronics engineer, with a physician
as clinical advisor.") sounds modest, almost like an academic project. It should speak of the
synergy between advanced hardware and clinical medicine. Investors invest in people first, so a
short line of context under each person helps. The user added: no "ex" (they still work there).

**What changed.**
- The line under the heading: "Bridging deep-tech hardware engineering with frontline clinical
  expertise."
- Under the founder's name and roles, a line of context: "Bringing deep expertise in advanced
  hardware architecture and wearable systems."
  - No employer is named and nothing reads "ex-". The suggested line names no company, and the
    user removed "ex-Samsung R&D" in v0.37.3.
- The advisor's entry is unchanged: the advice suggested no line for him.
- New style `.person-bio`: 15 px, in the page's third ink, under the roles.

**Checked.** Typecheck and build pass; the team at 1440 and 390 wide.


## v0.38.2 — 2026-11-07 — "Who it's for": the full texts back

**Why.** The user: "Bring back the full texts, but not as points, in the 'Who it's for' part you
changed earlier, as they were written."

**What changed.** The stepped tabs from v0.38.0 stay. Under each audience's line, the user's
paragraph is back in full, word for word, in place of the three points:
- **Patients:** "Peace of mind for those who need it most." Designed specifically for high-risk
  individuals and those suffering from undiagnosed transient symptoms, empowering them to capture
  clinical data exactly when it strikes.
- **Clinicians:** "Diagnostic certainty." Receive pristine 6-lead morphology, transmitted
  instantly and presented in the standard clinical format you trust.
- **Clinics & health systems:** "Proactive care that drives down costs." By capturing the
  elusive events that standard monitoring misses, Cyphix ends the expensive diagnostic odyssey and
  prevents unnecessary ER admissions.

The paragraph fades in just after its line, as the points did.

**Checked.** Typecheck and build pass. Each step at 1440 × 900, 960 × 600 and 390 × 760; the tab
click still lands. No page errors.


## v0.38.1 — 2026-11-07 — the timeline, in an investor's terms

**Why.** The user passed on advice about "Where we are". The design works; the words should read
like a company raising a seed round: drop "Tnufa", sharpen the technical terms, and name the
clinical partner in the next step.

**What changed.**
- **The line under the heading:** "From a validated prototype to a clinical-grade wearable,
  backed by leading institutions."
- **The milestones**, in order:
  1. Working Hardware Prototype
  2. AI & Algorithmic Validation
  3. Patent-Pending Core Tech
  4. Backed by the Israel Innovation Authority
- **The next step:** "Wearable form factor & clinical study".

**Kept out, pending the user.** The advice names the hospital ("clinical study at Sheba Medical
Center"). The site has kept Sheba's name off on purpose since v0.35.0 (the user's rule: no
partner names). A hospital's name on a public page can also need its consent. The next step reads
"clinical study" until the user confirms.

**Checked.** Typecheck and build pass; the timeline at 1440 and 390 wide.


## v0.38.0 — 2026-11-07 — "Who it's for", one audience at a time

**Why.** The user, on v0.37.10's three long rows: "It looks a bit long now. Let's do it in points:
just 'For patients' with points below that change, and on scroll it changes automatically. Make it
professional, smooth and clean, with gentle effects like Apple's site." Then a correction to the
clinics copy: "Proactive care that drives down costs. By capturing the elusive events that standard
monitoring misses, Cyphix ends the expensive diagnostic odyssey and prevents unnecessary ER
admissions."

**What changed.**
- **The stage holds.** The section's stage holds under the bar for 1.5 screens of scroll, a step
  each half screen (new hook `lib/useScrollSteps`).
- **Three tabs:** for patients, for clinicians, for clinics & health systems.
  - A hairline under each tab fills as the visitor reads on, and the tab in view is darker.
  - A tab is also a button: it scrolls smoothly to its audience.
- **Below the tabs**, the audience's icon, its line, and three short points, cut from the user's
  words:
  - **Patients**: "Peace of mind for those who need it most." For high-risk individuals; for
    undiagnosed, transient symptoms; clinical data, captured the moment it strikes.
  - **Clinicians**: "Diagnostic certainty." Pristine 6-lead morphology; transmitted instantly; in
    the standard clinical format you trust.
  - **Clinics & health systems**: "Proactive care that drives down costs." Captures the elusive
    events standard monitoring misses; ends the expensive diagnostic odyssey; prevents unnecessary
    ER admissions (the user's corrected copy).
- **The change between audiences** is a short fade with 12 px of rise. The points follow one after
  another, 80 ms apart. Nothing else moves.
- The app's limb-lead phone stands beside the steps throughout.
- Portrait phones and tablets stack the steps over the phone; a landscape window under 1024 px
  keeps two columns. With reduced motion the steps cross-fade without moving.
- The old rows' styles are retired; `.row-icon` stays for the Investors page.

**Checked.**
- Typecheck and build pass.
- Headless Chrome at 1440 × 900, 960 × 600, 768 × 1024 and 390 × 760, each step: everything on
  screen.
- A click on the third tab lands on the third audience. No page errors.


## v0.37.10 — 2026-11-07 — "Who it's for", rewritten

**Why.** The user sent the section's new copy, the three rows as they should read now.

**What changed.** The rows, word for word, each with its lead in bold:
- **For patients:** "Peace of mind for those who need it most. Designed specifically for
  high-risk individuals and those suffering from undiagnosed transient symptoms, empowering them
  to capture clinical data exactly when it strikes."
- **For clinicians:** "Diagnostic certainty. Receive pristine 6-lead morphology, transmitted
  instantly and presented in the standard clinical format you trust."
- **For clinics & health systems:** "Proactive care that drives down costs. By detecting elusive
  events early, Cyphix prevents expensive ER admissions and eliminates the logistical overhead of
  traditional Holter monitoring."

The icons and the phone beside them are unchanged.

**Checked.** Typecheck and build pass; the section at 1440 and 390 wide.


## v0.37.9 — 2026-11-07 — "Universal Fit. Clinical Power."

**Why.** The user: in the lower blue rectangle, in place of "Our solution", use the following
headline and body.

**What changed.** The navy card over the grey band now reads, word for word:
- **Universal Fit. Clinical Power.**
- "Cyphix is designed to fit your lifestyle, not disrupt it. Forget cumbersome wires and clinical
  setups. Our 6-lead module seamlessly integrates with the watch you already own—smart or
  analog—or works beautifully as a standalone bracelet."

The section keeps its anchor (`#solution`), so the bar's "Product" link still lands on it.

**Checked.** Typecheck and build pass; the card at 1440 and 390 wide.


## v0.37.8 — 2026-11-07 — the need names the blind spot

**Why.** The user passed on advice about the section with the physician's photograph. The photo
and the first two sentences of the paragraph work. The headline, "1 in 3 deaths worldwide is
cardiovascular", is a generic WHO statistic: it says heart disease is common, not which problem
Cyphix solves (missed transient events). Two rewrites were offered. Option 1, "the diagnostic gap",
was the one recommended, and it is the one shipped (the user's standing rule: decide, don't ask).

**What changed.**
- Headline: "The Cardiac Diagnostic Blind Spot."
- Paragraph: "Symptoms are often transient. By the time a patient reaches care, their ECG is
  usually back to normal. Cyphix captures clinical-grade morphology at the exact moment of
  symptom onset, giving cardiologists the definitive data they need to intervene."
- The "1 in 3" statistic stays on the Investors page, with its WHO source.

**Checked.** Typecheck and build pass; the section at 1440 wide.


## v0.37.7 — 2026-11-07 — the IP fact, for an international reader

**Why.** The user passed on this advice about the blue facts band. "Tnufa" means nothing to an
investor or a judge in Abu Dhabi, the US or Europe: it is an internal Israeli term, and noise. What
interests them is that a national body examined the company and backed it. So: drop Tnufa, say
"Backed by", and add "IP". The suggested wording: "Patent-Pending IP • Backed by the Israel
Innovation Authority".

**What changed.** The band's third fact now reads "Patent-Pending IP · Backed by the Israel
Innovation Authority". It uses the site's own separator (·). "Tnufa" stays on two other pages, in
their own context, until the user says otherwise:
- the Stage milestone "Israel Innovation Authority · Tnufa programme";
- the Investors page's "Funded by the Israel Innovation Authority (Tnufa)…".

**Checked.** Typecheck and build pass; the band at 1440 wide.


## v0.37.6 — 2026-11-07 — "Catch the Invisible."; the haze fixed

**Why.** Two notes from the user:

1. **A bug.** "If I scroll down to the iPad and then back up there's a bug: it turns murky and
   hazy, like a blur."
2. **The tablet scene's words.** "In the iPad part, instead of what's there now and what I told
   you, write this:
   Headline: Catch the Invisible.
   Subheading: Transient symptoms disappear quickly. Cyphix records clinical-grade morphology at
   symptom onset, ensuring your clinician never misses a critical event."

**What changed.**
- **The haze.** Since v0.37.3 the day's light has sat outside the scene. Its opacity was set only
  while the scene was shown, so a fast scroll back up hid the scene with the light still half-on
  over the hero. The light is now set on every frame.
  - Checked: jumping straight back to the top from 30 %, 55 % and 90 % of the scene leaves the
    light at 0 and the hero fully opaque.
- **The words.** The scene reads "Catch the Invisible." with the user's subheading, word for word.
  The "in your hands" → "on your hand" swap is retired, with its styles. The headline may now wrap
  to two lines.
- **The hold.** The held stage is shorter: 1.7 screens of scroll instead of 2.4. Each fade keeps
  the same scroll distance; only the swap's stretch is gone.

**Checked.**
- Typecheck and build pass.
- 1440 × 900, 960 × 600 and 390 × 760, the scene and the way back up.
- No page errors.


## v0.37.5 — 2026-11-07 — the slide withdrawn; the opening fits at every zoom

**Why.** The user: "Sorry, no. When I zoom in or out it still changes the hand's height and the
size of the text. If it can't be done, say so and we'll go back to the original version without
it. I just want smooth access for everyone."

It can't be done without a cost. The browser's zoom is there so people can make the text bigger.
A page that keeps its text the same size at every zoom refuses exactly the readers who need it
(WCAG 1.4.4, resize text), the opposite of "access for everyone". The top bar zooms either way,
so the slide also kept changing size beneath it. So v0.37.3–v0.37.4's slide is gone. The opening
uses the page's own sizing again and follows the zoom like the rest of the page.

**What changed.**
- **The user's original problem is fixed at its cause.** At 100 % zoom the transition began
  before the hero's lower edge was on screen. The held stage had a 560 px floor, so on a short
  window it was taller than the screen. That floor is gone: the stage is exactly the window under
  the bar, and a short stage takes its space from the copy's padding first.
- **Landscape windows under 1024 px** (a laptop at 150 % or 175 % zoom) keep the opening side by
  side. The stacked tablet layout is for portrait screens, and in a wide, short window it pushed
  the hand below the screen. That was true of the original version too.
- Everything else in v0.37.x stays: the new line, the quiet fades, the team, no captions.

**Checked.**
- Typecheck and build pass.
- Headless Chrome at:
  - 1440 × 900 (100 %), 1152 × 720 (125 %), 960 × 600 (150 %) and 823 × 514 (175 %);
  - 1536 × 730, 1150 × 540 and 1024 × 768;
  - 768 × 1024 and 390 × 760.
- At each, the hero is whole on screen, hand included, before the scene starts, and the scene
  fits. No page errors.


## v0.37.4 — 2026-11-07 — the opening's new line; the slide no smaller

**Why.** Two notes from the user:
1. **The line.** "In the opening, put this sentence in place of the current one: A clinical-grade
   6-lead ECG integrated into your everyday watch strap. Capture transient symptoms the exact moment
   they strike, and share pristine data directly with your clinician."
2. **v0.37.3's slide.** "Now everything looks worse and smaller." The user was right. The slide was
   shrunk to fit the stage's height, and on a laptop's window, wide but short (1536 × 730 at
   125 %), that meant about 80 % size, with every type and picture smaller than the page around
   it.

**What changed.**
- The hero's line is the user's sentence, word for word.
- The slide's top 215 px are empty slate (the copy starts below them). On a short window, up to
  180 px of that is now cropped rather than the whole slide shrunk: the scale is
  `min(width / 1440, height / 648)`, no longer `min(width / 1440, height / 828)`. A 1536 × 730
  window now shows the slide at full size, and a 1150 × 540 one at 0.72 instead of 0.56.
- The tablet scene is centred in the stage, so on a short window it crops evenly around the tablet
  and its line.

**Checked.**
- Typecheck and build pass.
- 1536 × 730, 1150 × 540 and 1440 × 900, the hero and the scene: nothing cut but the empty slate.
- No page errors.


## v0.37.3 — 2026-11-07 — the opening as a slide; the team; no concept captions

**Why.** Three notes from the user:

1. **The opening at 100 % zoom.** The transition started before the user had seen the hero's
   lower part: "can the opening screen always keep the same proportions to the screen size, like
   a slide, so whatever my zoom it always shows the same parts?"
2. **The team.** "Remove ex-Samsung R&D and write that I'm an electrical and electronics engineer,
   and for Tamir don't write External."
3. **The captions.** "Wherever it says Concept imagery, remove it. It's obvious; no need to push
   it everywhere."

**What changed.**
- **The slide.** On any window wider than tall, both scenes of the opening are laid out once at
  1440 × 828 (a 1440 × 900 window under the bar) and scaled as a whole to the stage.
  - The slide is anchored to the stage's lower edge, so the hand still rises from the band.
  - Every zoom and window shows the same composition.
  - Inside it, the page's width-based sizes take their 1440 px values, and on a landscape window
    under 1024 px (150 % zoom) the tablet and phone rules are undone.
  - The day's light now fills the whole stage behind the scene's slide.
  - The fades start later (12 % of the travel instead of 6 %), so the whole hero holds first.
  - Portrait phones and tablets keep their own layout.
- **The team.** Elio: "Founder & CEO · Electrical & Electronics Engineer". Tamir: "Clinical
  Advisor". The team's line and the Investors page's team link no longer mention Samsung either:
  "An electrical and electronics engineer, with a physician as clinical advisor."
- **The captions.** The "Concept imagery" captions are gone from the hero, the need, the
  investors' door image and /visualizations. The 3D page's "Concept rendering…" notes are gone
  too. The footer's small print still says once, for the whole site, that images are concept
  imagery. "Illustrative recording." on the ECG screen stays: that one is about the signal, not
  the picture.

**Checked.**
- Typecheck and build pass.
- The opening and its scene in headless Chrome at:
  - 1440 × 900 (100 %), 1152 × 720 (125 %), 960 × 600 (150 %) and 2150 × 1343 (67 %);
  - 1920 × 950, 1366 × 657 and 1024 × 768;
  - 390 × 760 and 768 × 1024.
- The landscape ones show the same composition. No page errors.


## v0.37.2 — 2026-11-07 — the opening's transition, quiet

**Why.** The user, on v0.37.1 (the hand lowering away, the tablet gliding into the scene): "now
the effect feels childish, not like a medical startup. It needs something gentle."

**What changed.** The transition is now fades in turns. Nothing moves except the line, by 8 px:
1. the hero's copy, hand and tablet fade out on the slate;
2. the day's light fades in;
3. the clinician's screen fades in, already writing;
4. "The moment, in your hands." fades in.

The beats follow one another, so nothing is ever seen through anything else. A single cross-fade
was tried first and dropped: mid-way it showed the two tablets and the hand as a double exposure.
The swap to "on your hand." is unchanged.

**Checked.** Typecheck and build pass. Frames at 1440 × 900 and 390 × 760 through every beat; no
page errors.


## v0.37.1 — 2026-11-06 — the opening's transition, without the white circle

**Why.** The user, on v0.37.0's transition: the white circle "hurts the eye and feels a bit like
2005 effects". It was a soft-edged circle of light opening out of the tablet, the same effect as
the 3D journey's night-to-day. Here, on the slate band, it read as a glare.

**What changed.**
- No mask or overlay over the scene any more. The transition is now the product moving:
  - the hand lowers out of the band whole (not see-through over the tablet), and the copy fades;
  - the tablet itself glides from its place in the hero to its place beside the new line,
    growing;
  - the background changes from slate to the day's light behind the tablet, and its shadow
    arrives with the light.
- "The moment, in your hands." then rises in. The swap to "on your hand." is unchanged.
- Technically, the scene's tablet is drawn from the hero tablet's measured place and size to its
  own (one transform per frame). The hand-over between the two tablets happens with the hand
  already gone, so it is unseen.

**Checked.** Typecheck and build pass. Frames at 1440 × 900 and 390 × 760 through every beat; no
page errors.


## v0.37.0 — 2026-11-06 — the opening as a scene; the watches to Explore

**Why.** Six requests from the user, in one sitting:

1. Take "Request the deck" out of the hero completely. The link in the announcement line and the
   form at the foot of the page stay.
2. Turn the opening into a scroll scene. On the first scroll the hero holds and is replaced by the
   scene from the end of the 3D journey: the clinician's tablet. The tablet's traces are already on
   screen, not drawn from an empty one. Its line reads "The moment, in your hands." Scrolling on
   changes it to "on your hand.", "so that it's clear it was replaced", and only then does the page
   scroll down.
3. The facts band's middle item didn't look like the two beside it. It now has a line icon (a
   globe) and the same type size. The figure is still $4.53B.
4. "Who it's for" uses the user's sharper image of the app's limb-lead screen on the phone (from
   ChatGPT, 1719 × 871), at the same size on the page. /technology shows the same image.
5. The version number in the footer no longer has a capsule around it.
6. The four watches are "not relevant at this stage". "Our solution" keeps its grey band, now
   empty. The watches move to a new page behind "Explore", **/visualizations**, still with the
   hover effect.

**How.**
- `Hero.tsx` and `lib/useHeroScene.ts`:
  - the slate band sits on a sticky stage inside a wrapper 2.4 screens tall;
  - light opens out of the hero's tablet, as it does from the watch in the journey, and the
    tablet and its line rise into it;
  - the swap is a switch, not a scrub. The old words leave upward and the new ones rise in coral
    and are underlined, so the change is unmistakable and never stops half-way. Scrolling back
    undoes it.
- `HeroTablet` gains `full`: the monitor starts a pass in, so the screen already holds its traces.
- With reduced motion, the tablet stays still and the swap is a plain cross-fade.
- The stills are now `WearStills.tsx`, used only by the new page.

**Checked.**
- Typecheck and build pass.
- Headless Chrome at 1440 × 900, 1280 × 640, 1024 × 768 and 390 × 760: every beat of the
  scene, the band, the phone, the new page and the Explore menu. No page errors.
- It has not yet been tried on a real phone's scroll.


## v0.36.0 — 2026-11-05 — cyphix.co

**Why.** The user bought **cyphix.co** at GoDaddy: "host the landing page there".

**What changed.**
- `cyphix.co` and `www.cyphix.co` were added to the Vercel project `cyphix-landing`.
- The user changed the domain's DNS records at GoDaddy, step by step:
  - `A @` now points to `76.76.21.21`, replacing GoDaddy's parking record;
  - `CNAME www` now points to `cname.vercel-dns.com`.
- The nameservers stay with GoDaddy.
- Every page's share card (`og:url`, `og:image`) now points to `https://cyphix.co`.
- The old address, cyphix-landing.vercel.app, keeps working.

**Checked.**
- `cyphix.co` resolves to 76.76.21.21 on Google, Cloudflare and GoDaddy's own nameserver.
- `www` resolves to Vercel.
- Both serve the site once Vercel's certificate is issued.

## v0.35.0 — 2026-10-25 — Explore: the journey, the technology, the investors

**Why.** The user:

> "Let's move this to the bar at the top, a section where a menu of
> categories drops down. Also a technology category that explains Cyphix's
> innovation (you have it in the investor deck, right? the electrode that
> filters noise and all that), and an investors section on the market and
> exactly what the need is. That way the home page stays clean and doesn't
> take ages to scroll."

**What changed.**

- **"Explore" in the bar**, after Product · Stage · Team.
  - A click opens a panel from the bar's lower edge with three pages, each
    with a title and a line. The page you are on is marked in coral.
  - It closes the way the phone's number does: a second click, a click
    elsewhere, or Escape. Both now share one rule, `lib/usePopover`.
  - On tablets and phones the section links leave the bar but "Explore"
    stays; its panel spans the bar's width.
- **The home page is short again.** The 3D journey left it (5,426 px tall at
  1440, down from about 13,700 with the journey's 900vh stage). The home page no longer downloads three.js.
- **/one-strap: "One strap. Any watch."** The journey of v0.33.0, unchanged,
  on a page of its own: it opens on its stage and ends on "Request the deck".
- **/technology: "Six views of the heart. From a strap."**
  - **How it works, in three steps**, each over its picture: wear it and
    measure (the working prototype); a smart array, weighted (the
    prototype's band, LL 1 · RLD · LL 2); six leads to the cardiologist (the
    app's limb-lead view).
  - **"Noise, solved in hardware."** Each contact point is an array of
    elements with its own ADC, weighted in real time by the quality of its
    contact; patent filed in Israel. Beside it, the deck's two strips (one
    electrode raw; the same lead weighted across the array), labelled
    illustrative.
- **/investors: "The ECG that stays with the patient."**
  - The figures on the navy band: 17.9M deaths a year (WHO), $4.53B, $2.76B.
  - The need ("doesn't stop at the clinic door").
  - Today's compromise in three columns, by category, not competitor.
  - The business model: who pays, for what, how.
  - What has been done, beside the working prototype.
  - What comes next, on the milestones' line, with "Now" in coral.
- **Every page** shares the bar, "Request the deck" and the footer. Each one
  ends with links to the other pages.
- **Each page is its own document** (`technology.html` and its siblings,
  served as `/technology` by `cleanUrls`), with its own title, description
  and share text.
- **The footer** maps every page. Its small print now allows for the working
  prototype's photographs.

**What stays off the public pages, on purpose** (see PRODUCT.md):
- **The medical centre the deck names for a trial.** There is no public
  agreement.
- **The deck's 2026 market figures ($4.97B / $3.03B).** The site keeps
  $4.53B / $2.76B so it does not contradict itself.
- **The deck's sample ECG report.** It carries an interpretation line.
- **A prototype screen with a Hebrew label over the trace.** It was
  replaced by the deck's clean strips rather than edited.

**Checked** (headless Chrome), at 1440 × 900 and 390 × 844:
- All three new pages, top to bottom.
- "Explore" opens from the bar's lower edge, marks the current page, and
  its links navigate.
- The 3D page renders its stage.
- The home page has no 3D section and does not request three.js.
- No sideways scroll on any page.

## v0.34.0 — 2026-10-25 — the number behind the phone's mark

**Why.** The user: "At the top there's no need to show my number straight
away. Just the phone icon beside the Instagram one, and when you click it
the number appears."

**What changed.**
- **Three marks at the bar's right end:** the phone, Instagram and LinkedIn,
  the same size and stroke.
- **A click on the phone opens a small panel** under it, its top on the
  bar's lower edge, holding the number as a call link.
- **It closes** on a second click, a click elsewhere, or Escape (which
  returns focus to the mark). The button says whether it is open
  (`aria-expanded`).
- **The panel follows the bar:** white over the page, the navy of the stage
  over the dark scene.
- **The phone's mark now shows on every width.** The number used to hide
  below 1100 px.
- **The number is unchanged elsewhere:** in "Request the deck" and in the
  footer.

**Checked** (headless Chrome) at 1440, 390 and 360 px wide:
- closed and open, on the white bar and the dark one;
- the panel's top sits exactly on the bar's lower edge;
- a click elsewhere closes it;
- no sideways scroll.

## v0.33.0 — 2026-10-25 — reset: the journey the user called beautiful

**Why.** The user, on v0.32.0:

> "No, I don't like it at all. Not this, not the iPad, not the
> transformation between the watches. It doesn't match the rest of the
> page's design, it doesn't look professional."

They were right, and the cause is in v0.29.0, not v0.32.0.
- v0.29.0 swapped the section's design for a centred, Apple-style one: an
  eyebrow, a centred headline, grey copy with brighter phrases, the product
  under it.
- Nothing else on the page is set that way. The page sets its headings left
  in its own type.
- Four versions then reworked only the transitions inside that foreign
  layout. None could fix it.

**What changed: back to v0.27.0, the one version the user called "really
beautiful".**
- The same copy, left-aligned in the page's type, with the product large on
  the right and the chapters along the foot.
- The product moves physically:
  - the smartwatch unclips and rises out;
  - the strap closes into a bracelet;
  - the analog comes down and clicks in;
  - the Cyphix watch rises in as the others leave.
- Day opens out of the watch, with the clinician's tablet.
- `lib/strapScene.ts` is back; `lib/strapStory.ts` is removed.

**Only the user's own notes on v0.27.0 are applied on top of it:**
- **Nothing is drawn over the product.** The "Six leads" chapter (the lead
  axes over the analog dial) is withdrawn with its overlay and its camera
  move. The user rejected "all the lines on the product". The journey has
  four chapters.
- **No white pool under the product.** The floor glow ("a white circle that
  looks like a shadow, ugly") is withdrawn.
- **Smoother:** each move has more scroll than in v0.27.0 (about 20 % more
  for the unclip, the rise, the bracelet and the analog's fall). The time
  the six leads held went to the moves and to a hold on each watch.
- **The clinician's tablet writes live** like a monitor (the user's request,
  v0.28–v0.31). It is out of the layout until it rises, so it starts from an
  empty strip.

**Checked** (headless Chrome, software WebGL), every chapter at 1440 × 900
and 390 × 844:
- no white pool and no lines;
- the copy left, the product right (under the copy on the phone);
- the day scene with the tablet;
- no sideways scroll.

## v0.32.0 — 2026-10-24 — the clinician's screen, lit out of the dark

**Why.** The user: "The transition from the watches to the iPad is ugly."

The white page slid up over the dark stage like a sheet, a different
language from the light going out between the watches, and a hard white
edge crossing the screen.

**What changed.**
- **The clinician's screen is the fifth way, lit the same way as the
  watches.**
  - The Cyphix watch's light goes out and it fades into the navy with its
    copy.
  - The tablet is then lit out of the dark on the same stage, its white
    screen glowing, under "The moment, in their hands." in the stage's
    light-on-dark type.
- **The monitor starts from an empty strip** the moment the tablet appears:
  it is out of the layout while dark, so it has nothing to show until then.
- **The "rendered live" note** steps aside while the tablet is up.
- **Then the page simply scrolls on** into "Request the deck".
- **Sizes:** the section is 760svh (6.6 screens of travel). The tablet is
  still sized to the room under its copy.
- **Withdrawn:** the white sheet and its styles, and the bar's mid-section
  switch to light (the bar now turns light as the section leaves, as
  elsewhere).

**Checked** (headless Chrome, software WebGL), at 1440 × 900 and 390 × 844:
- The Cyphix watch dims and fades, then a beat of empty navy, then the
  tablet comes up with the copy.
- On the phone the tablet is near the full width.
- No sideways scroll.

## v0.31.0 — 2026-10-24 — lit out of the dark, on the navy

**Why.** The user, on v0.30.0, from a phone:

> "The iPad looks better now. Why did you put such a big dot at the start
> of every signal? And on the phone the iPad is really small, look. About
> the scenes: I still don't like the transitions that much."

Then:

> "The screen there also went black, not dark blue like the original you
> made. The dark blue from before was prettier."

**The transitions: the product no longer moves across the screen.**
- **In place:** it stands large and centred under the copy and turns slowly
  with the scroll.
- **Between the ways to wear it,** its light goes out: the studio
  environment, the key and the rim, even the glow of a watch's screen.
  - As the last of it goes, the product also fades into the stage, so it
    never shows as a dark cut-out against the navy.
  - The copy fades with it.
  - The next way is then lit out of the dark, its copy with it.
- **One product at a time:** two products are never on screen together
  (v0.29.0's dissolve did that), and nothing slides (v0.30.0's column did
  that).
- **The first product** is lit as the section scrolls in.
- **The end:** the white page still scrolls up over the stage, with the
  clinician's screen.
- **The scene module** is back to one dressed copy of the model, which
  swaps unseen while the light is out: `render(way, turn, light)`.
- **The section** is 700svh (six screens of travel).

**The stage is the original dark navy again.**
- `#0a0d13 → #111725`.
- The blue glow, now centred behind the product.
- The faint warm glow at the foot.

**The monitor's pen is a small tip.** 2.4 units, no halo (it was 4.2 with an
11-unit halo).

**The clinician's tablet fits the room under its copy.**
- The page sizes it once the copy is laid out: up to 92 % of the width,
  up to 880 px, and as tall as the room left.
- On a phone that is its whole width. It was sized by a fixed desktop
  allowance, which left it about 200 px wide on an iPhone.

**Checked** (headless Chrome, software WebGL):
- The dip frame by frame at 1440 × 900: the product dims and fades into
  the navy, a beat of empty stage, then the next comes up. No silhouette.
- Every way and the end on 390 × 844: the tablet near the full width.
- No sideways scroll.

## v0.30.0 — 2026-10-24 — only the scroll; the tablet beats

**Why.** The user, on v0.29.0:

> "I don't like the transitions at all, it looks unprofessional. And below,
> on the iPad, the waves don't look like a signal with a real BPM. It looks
> like you're just drawing a line, with no real rhythm of the beats."

The dissolve held two different poses of the product on screen at once for
a moment, a ghost. On a product page, the professional pattern is no effect
at all: the page scrolls, and pauses on each product.

**What changed: the dark moment is plain scroll.**
- **The column:** the four ways to wear it (smartwatch, bracelet, analog,
  Cyphix watch) stand in a column a screen apart. They are four dressed
  copies of the model, cloned before dressing.
- **The camera** moves down past them at exactly the scroll's speed, so it
  reads as the page itself scrolling.
- **Holds:** 0.7 of a screen on each, with its copy (centred eyebrow,
  headline, a line with brighter key phrases).
- **Moves:** one screen between products. The copy moves with its product
  as if part of the page.
- **Turning:** each product turns slowly as it passes, 0.32 rad per screen.
- **The end:** the white page slides up the same way, with "The moment, in
  their hands." and the clinician's tablet. The bar turns light as it
  arrives.
- **The section** is 850svh: 7.5 screens of travel, the progress measured
  in stage heights.
- **Withdrawn:** the dissolve veil, the copy's fades and drift, the rise,
  the push-in and the sunrise mask.

**What changed: the clinician's tablet writes like a monitor.**
- **Real time on the strip's own time base:** a 10 s strip in 10 s, beats at
  the recording's own RR intervals, 75 a minute. It is driven by the
  recording's samples (`tabletScreen` now exports each lead's `ys`, the
  `TRACE` time base and the `BEATS`), not a wipe.
- **A pen at the head of each lead** rides the trace, so each QRS is seen
  being written.
- **A heart beside the rate** beats on every R peak and settles over a
  quarter second.
- **The loop:** from the second pass the last strip stays ahead of the pen,
  past a small gap.
- **When it runs:** it starts from an empty strip each time the screen comes
  into view and stops when it leaves.
- **Script, not SMIL.** The hero's tablet stays still.
- **Still the same illustrative recording,** labelled, and nothing reads it.

**Checked** (headless Chrome, software WebGL):
- Holds and moves at 1440 × 900 and 390 × 844: the outgoing product and copy
  leave above as the next arrive from below, with no overlap and no ghost.
- The monitor at 1.5, 4, 7.5, 11.5 and 14 s: two beats written by 1.5 s (as
  at 75 BPM), the pens at the head, the heart large on a beat, and the
  erase gap from the second pass.
- The scene is ready 2.5 s after load, at the top.
- Scrolling the whole section, the longest block is 69 ms.

## v0.29.0 — 2026-10-24 — the dark moment, calm

**Why.** The user, on v0.28.0:

> "No, no, wait. We've drifted far from what I meant: all the lines on the
> product, and scenes that are too much. Look at what they did here
> (apple.com/iphone-duo), take ideas from it and do it on my page. Clean.
> Professional. Moving and elegant."

Then, while it was being built:

> "I will say I actually like the dark background you made, where the whole
> screen suddenly goes dark for a moment and it's part of the experience,
> and not clicks I have to press myself between the variations."

**What Apple's page does,** read from 40 captures down its length:
- light and quiet;
- one idea per screen: a small eyebrow, a short huge headline, and a
  paragraph in grey with its key phrases darker;
- the product large, rising into view under the headline;
- nothing drawn over the product;
- changes of pose by a dissolve, not by machinery.

A click-driven "Take a closer look." viewer was built first, then withdrawn
before shipping on the second message. The scroll carries the story, and the
screen goes dark for it.

**What changed.**
- **The stage:** still pinned while the section scrolls (720vh, was 900vh),
  now black, and calm.
- **Centred copy, in the manner of a product page:** an eyebrow, a large
  headline, and a line whose key phrases are set brighter. Each line eases
  out upward and the next eases in from below.
- **The product is large and centred under the copy,** live from the 3D
  model (`lib/strapStory.ts`, replacing `lib/strapScene.ts`).
- **The chapters:**
  1. **"Catch the moment."** The smartwatch rises into place from below.
  2. **"It lives in the strap."** It turns slowly; the camera moves gently in
     towards the module.
  3. **"One strap."** The bracelet.
  4. **"Any watch."** The analog watch.
  5. **"Or ours."** The Cyphix watch.
  6. **"The moment, in their hands."**
     - The day rises from below, white like the page.
     - The clinician's tablet rises into it, its traces writing live (kept
       from v0.28.0).
     - The bar turns light.
  - Each configuration arrives with a soft 0.7 s dissolve over the last
    frame of the one before. Within a chapter the product turns slowly with
    the scroll.
- **Withdrawn:**
  - the six-lead axes and hour marks over the analog dial, and its
    dissolving face (`setDialClean` removed from `studio.ts`);
  - the night macro;
  - the slide-out, the crane, the camera's fall and its moving backdrop;
  - the chapter bars and the scrim.
- **Kept:**
  - the idle prebuild, every shader compiled up front;
  - the glide (0.15 s), and the snap on jumps;
  - the 1.5x pixel cap;
  - the stills fallback (now the four renders under the opening headline).

**Checked** (headless Chrome, software WebGL):
- Frames across the story at 1440 × 900 and 390 × 844: the copy and the
  product never overlap, and the ending's text and tablet each have their
  own room.
- No sideways scroll.
- The scene is ready at the top, about 4 s after load.
- Scrolling the whole section, the longest block is 91 ms.
- The main bundle holds no three.js (181 kB).

## v0.28.0 — 2026-10-24 — the journey refined; Instagram and LinkedIn

**Why.** The user on v0.27.0: "It's really beautiful!" Then four asks:
- "smoother transitions";
- "when you stretch the lines on the analog watch, remove the watch's own
  lines, it's too busy already";
- "all the transitions are almost the same; maybe a scene as if the camera
  goes down, falls or something; and remove the white circle that looks
  like a shadow, it's ugly";
- "in the final scene with the iPad, let's make the ECG signals be created
  live, in a gentle loop, not too fast."

Then: "up beside the phone, put the Instagram logo and link to it, and the
LinkedIn logo and link to it."

**A camera language per change.** Before, every change was a part lifted
up or down. Now:
- **The smartwatch unclips and slides out sideways,** away from the copy.
- **The camera cranes up over the bracelet,** looking down on it. It then
  drops with the analog as the analog falls in from above.
- **An orbit and a push-in** bring the analog face square on (as before).
- **The camera falls** from the strap to the Cyphix watch waiting just below.
  - The strap and the analog stay where they are and leave the frame above.
  - The fall is 0.12 m: one part leaves the frame as the other enters, so
    the frame is never empty.
  - The stage's glows sit on their own layer, which moves up with the fall,
    so the drop reads as the camera's own.
- **Morning rises from below** with a soft straight edge (the story began
  with "By morning").

**Withdrawn: both white circles.**
- The cool pool of light under the product (the floor glow, since v0.8.0).
- v0.27.0's circle of light opening out of the watch, which read as a white
  disc.

**A clean dial for the six leads.**
- The analog's printed markings dissolve to a clean face. Its hands fade with
  them. A second, unmarked dial texture is mixed in the dial's shader
  (`setDialClean`).
- In their place, the twelve hours light up in coral on the dial itself.
- The lead axes then grow over the clean face; their opposite poles are grey
  dashes.
- Everything returns as the camera pulls away.

**Smoother.**
- **Camera moves** use smootherstep: no start or stop jolt.
- **Copy:**
  - each line eases out upward and the next eases in from below, over longer
    fades (0.026 of the scene, was 0.016);
  - the glide is 0.15 s (was 0.12).
- **A jump, a link or a reload landing mid-scene** now snaps straight to it
  instead of fast-forwarding through the journey.

**Live traces on the clinician's tablet.**
- **How they draw:** `HeroTablet live` writes the six traces like a monitor's
  pen, a 10 s strip in 10 s, real time and unhurried, looping. From the
  second pass on, the last strip stays on screen ahead of the pen, past a
  small gap. It is declarative SMIL; no script runs.
- **Where:** they restart from an empty strip each time the chapter arrives.
  The hero's tablet stays still.
- **The canon:** this is the one sanctioned exception to "no simulated live
  signals", at the user's explicit request (PRODUCT.md). The recording stays
  the same illustrative one, labelled, and nothing reads it.

**Instagram and LinkedIn in the bar.**
- **Where:** beside the phone, as line glyphs in the page's own icon stroke
  and colours (not the brands' colours). The tap boxes are 40 × 40, and the
  last glyph's edge meets the page's right edge.
- **Links:** `instagram.com/cyphix.co/` (the share link's tracking
  parameters dropped) and `linkedin.com/company/cyphixmedical/`. They open in
  a new tab with `noopener noreferrer`.
- **Smaller screens:** when the phone number hides (1100 px and below), the
  two icons stay.

**Checked** (headless Chrome, software WebGL):
- Frames across every transition at 1440 × 900 and 390 × 844.
- The live tablet at 1.5, 4, 7.5, 11.5 and 14 s: the strip writes, then
  loops with the gap.
- The bar at 1440, 1280, 820, 390 and 360: the hrefs, targets and boxes are
  right, with no sideways scroll.
- The scene is ready 2 s after load, at the top.
- Scrolling the whole journey, the longest block is 103 ms.
- The main bundle still holds no three.js (184 kB).

## v0.27.0 — 2026-10-24 — the closing scene becomes a journey

**Why.** The user, after v0.26.0:

> "There's an improvement, but not enough. I really want to create emotion at
> this point. I need to tell a story, not just rotating watches. Maybe
> changing scenes, really going on a journey with the product, and making it
> a bit bigger, like Apple does with their products… a clean, modern
> journey. Give me a special idea I didn't think of."

The idea comes from a fact. The six limb leads point along twelve directions,
30° apart: the hexaxial reference that doctors draw them on, and the axis
wheel in the CYPHIX app. Those are the twelve hours of a watch face:

- I at 3, II at 5, aVF at 6, III at 7, aVR at 10, aVL at 2.

Every watch face already has the shape of a 6-lead ECG. The user approved
building it ("build it and I'll tell you").

**What changed: five chapters on one sticky stage (900vh, was 560vh).**
1. **The moment** (night).
   - A close-up of the module's electrodes in a dark room. A sweep of light
     crosses the polished steel (the studio environment turns as it comes
     up).
   - Copy: "A flutter. Then nothing." / "By morning, it's gone." (the Need
     section's own words: the ECG may be normal by the time care is reached).
2. **The strap.**
   - The camera pulls back first, then the product turns to a three-quarter
     front: "Unless it was on the wrist."
   - The product now fills about 88 % of the stage height (was 72 %).
   - Then the user's four ways to wear it, in the team's order, with the
     same moves as before.
3. **Six leads.**
   - The camera comes round to the analog face, straight on.
   - The twelve hours light up one after another. The six lead axes then
     grow from the centre past the case, coral, each named at its pole, with
     their opposite poles dashed and a faint warm glow behind.
   - Copy: "Every watch face has twelve directions." / "A 6-lead ECG reads
     the heart along them."
   - The axes are an SVG overlay, placed each frame on the dial's projected
     centre and radius (`StrapScene.dial()`). Their labels are in pixels, so
     the type stays sharp.
4. **Ours.** The analog and the strap rise out as the Cyphix watch rises in
   from below, so the stage is never empty.
5. **Your clinician** (day).
   - Light opens out of the watch, a soft circle that grows until the stage
     is day.
   - The CYPHIX app on the tablet rises into it: the hero's own tablet, its
     illustrative recording labelled, with the same axis wheel as chapter 3.
   - Copy: "The moment, in your clinician's hands." / "Recorded when it
     happens, sent straight to the clinician."
   - The bar turns light with the stage.

**Supporting changes.**
- **Chapter indicator:** five chapters (bars only on phones).
- **Readable copy:** a scrim keeps the copy's side of the night stage dark,
  so the product can pass behind the words.
- **Phones and portrait tablets** (narrower than 1.15:1) get the vertical
  layout: copy on top, product and tablet below.
- **HeroTablet:** gives its clip a unique id per instance, since the tablet
  now appears twice.
- **Kept from v0.26.0:** the idle prebuild, every shader compiled up front,
  and the glide.
- **Nothing simulates a live signal or reads one:** the axes are geometry.

**Also: the footer's bottom band is white.** The user: "the background of the
bottom bar must be white like the other bars; it looks bluish."
- `.foot-band` `--mist-2` → `var(--paper)`.
- A hairline parts it from the white glass area above.
- The small print is 8.3:1 and the badge 6.2:1.

**Checked** (headless Chrome, software WebGL):
- Frames at 1440 × 900 and 390 × 844, across every chapter.
- No sideways scroll.
- The scene is ready about 3 s after load, while still at the top.
- Scrolling the whole journey, the longest block is 97 ms.
- No page errors.

## v0.26.0 — 2026-10-24 — the 3D scene scrolls smoothly

**Why.** The user, about "One strap. Any watch.":

> "first of all it sometimes gets stuck (maybe don't wait until we reach it
> for it to load), but something there is still not smooth and doesn't flow
> with the scroll."

Four causes, all in how the scene was loaded and driven:

1. **Late build, on the visitor's way in.** The scene started loading only
   1.5 screens before the section. The build then ran as long tasks right as
   the visitor arrived: the GLB, the materials, the bracelet bend and the
   studio light.
2. **A shader compile on each watch's first appearance.** three.js compiles a
   material the first time its object is drawn. The analog and the Cyphix
   watch are hidden until their moment, so each froze the page mid-scroll as
   it came into view. That is the "sometimes gets stuck".
3. **A frame behind the text.** The scroll handler set the progress inside one
   animation frame, and the scene drew in the next. The copy moved with the
   scroll; the model trailed it by a frame.
4. **Jumps, not motion.** Progress was the raw scroll position. Each
   mouse-wheel step (about 100 px of a 5,000 px scene) moved the model in one
   jump.

**What changed.**
- **Built ahead of time.** Once the page has loaded and the browser is idle,
  the scene is built. Nearing the section still triggers it if that comes
  first. A data-saver connection waits for the section.
- **The build is split into short steps,** so it never holds the page in one
  long task.
- **Ready before the visitor arrives:**
  - `renderer.compileAsync` compiles every part's shaders with every part
    shown;
  - one frame with everything in it uploads the textures.
  - Nothing compiles or uploads mid-scroll any more.
- **One frame loop draws the model and the copy together** (`render(p)`, no
  second frame).
- **The scene glides to the scroll position:** an exponential catch-up of
  0.12 s. A wheel step becomes motion, and the model stays attached to the
  scroll.
  - Off screen, or before the model is ready, it jumps instead: a link that
    lands past the section doesn't play the scene in the background.
- **Progress uses the pinned stage's own height,** not the window's. On a
  phone, the address bar hiding changes the window and used to nudge the
  scene.
- **Each frame is cheaper:**
  - the canvas resolution is capped at 1.5x (on a 2x screen, 44 % fewer
    pixels, still sharp with antialiasing);
  - an unchanged resize no longer resets the canvas (a phone fires resize as
    its address bar hides, and setting a canvas's size clears it).
- The four states, the timings, the copy and the stills fallback are
  unchanged.

**Checked** (headless Chrome, software WebGL, so times are inflated; the
comparison is what counts):

| | Live v0.25.0 | v0.26.0 |
|---|---|---|
| Scene ready while the visitor is still at the top | no | yes, ~3 s after load |
| Longest block, scrolling through the scene | 2.6 s on entry | 0.12 s |
| Blocks at the watches' first appearance | 0.67 s and 0.73 s | none |

- The scene at 0.1, 0.5, 0.75 and 0.97 matches the live version frame for
  frame.
- Phone (390): the scene is built at the top, the canvas is at 1.5x
  (585 × 1266), there is no sideways scroll, and there are no page errors.

## v0.25.0 — 2026-10-24 — a more natural hand in the hero

**Why.** The user sent a new image: "let's use this hand, it looks more
natural." It is the same forearm, strap and module, with the three black
electrodes. The hand is relaxed and open, not held stiff with the fingers
straight up.

**What changed.**
- `src/assets/photos/hero-wrist.webp` is replaced and its sidecar rewritten.
- **The same processing as the previous forearm:**
  - the matte's haze removed;
  - turned 90° counter-clockwise so the hand points up.
- **Placed so nothing else can move:**
  - The new image came at exactly the old scale: the band is 156 px vs 155
    and the forearm 329 px wide vs 328.
  - It is set on the same 670 × 1464 canvas, so the strap and the forearm
    fall on the same pixels (band rows 987–1141 vs 986–1141; forearm
    285–614 vs 286–614).
  - The relaxed fingertips end 47 rows lower than the straight ones did,
    about 19 px at 1440.
- No CSS change. The alt text says the hand is relaxed and open.

**Checked.**
- The hero, the hand's box, the tablet and its screen are identical to the
  live v0.24.5, to the pixel, at 1440, 1280, 820 and 390.
- No sideways scroll.

## v0.24.5 — 2026-10-24 — white behind the hands

**Why.** The user, on the red: "honestly it really hurts the eye. Let's try a
white background for a moment, we haven't tried that."

**What changed.**
- `.foot-upper` background: `var(--paper)` (white).
- The glass is white at 55 % with `blur(9px)`. The hands read through it in
  their own colour, softened, the heart clear.
- **The red trial's `brightness(0.75)` on the image is removed,** in the
  fallback as well.
- **The text is back on the dark inks,** as in v0.23.1: headings in navy,
  links in ink, the tagline in ink-2.
- **The wordmark is red again,** as in the bar, and the focus ring is the
  page's coral.
- The footer's top hairline separates it from the white Request the deck
  section above. The layout, the image crop and the pale small-print band are
  unchanged.

**Checked.**
- Real contrast, measured on the rendered pixels behind every footer line.
  Worst cases: 1440: 5.8:1 · 1280: 6.2 · 820: 5.2 · 390: 6.2.

## v0.24.4 — 2026-10-24 — trial: the logo's red behind the hands

**Why.** The user: "a last attempt, let's try red like the logo, and then I'll
decide what's most beautiful." It is a trial beside the grey (v0.24.3) and
the navy (v0.24.1). Whichever the user picks stays.

**What changed.**
- `.foot-upper` background: `var(--red)` (#c7362c, the wordmark's red).
- The glass is tinted with the same red, at 62 % with `blur(9px)`. The open
  area stays exactly the logo's red.
- **The hands a shade deeper** (`brightness(0.75)` on the image, also in the
  no-backdrop-filter fallback). Skin is close to red, so on red the lightest
  skin was what limited the white text. Darkening the hands holds the text
  above 4.5:1 without drowning them in tint.
- The text, the wordmark and the focus ring stay white. The layout, the image
  crop and the pale small-print band are unchanged.

**Checked.**
- Real contrast, measured on the rendered pixels behind every footer line.
  Worst cases: 1440: 4.8:1 · 1280: 4.75 · 820: 4.8 · 390: 4.8.

## v0.24.3 — 2026-10-24 — the grey goes behind the hands

**Why.** The user: "no, no, I meant that the background behind the hands
should be grey."

v0.24.2 read "the very bottom strip" as the small-print band and turned that
grey. That was wrong. The user meant the area behind the heart-hands, which is
the lowest large block of the page.

**What changed.**
- **The small-print band is back to v0.24.1:** `--mist-2`, the note in
  `--blue`, the badge in `--ink-3` with its `--rule` border.
- **Behind the hands, the hero's grey:** `.foot-upper` is `var(--slate)`.
- **The glass is tinted with the same grey,** at 58 % with `blur(9px)`. The
  open area stays exactly the hero's grey, and the hands read through it,
  softened, as the forearm does on the hero's grey.
- The text, the wordmark and the focus ring stay white. The layout and the
  image are unchanged.

**Checked.**
- Real contrast, measured on the rendered pixels behind every footer line.
  Worst cases: 1440: 5.1:1 · 1280: 5.0 · 820: 5.1 · 390: 5.1.
- The small print on the pale band: 7.6:1. The badge: 5.7:1.
- No sideways scroll at 1440 or 390.

## v0.24.2 — 2026-10-24 — the bottom band in the hero's grey

**Why.** The user: "let's make the very bottom strip grey, like at the top of
the page." The grey at the top is the hero's slate (`--slate`, #363a43).

**What changed.**
- `.foot-band` (the small print and the version badge): `--mist-2` →
  `var(--slate)`, the same grey as the hero.
- Its text takes the hero lede's colour, `--sky`, so it reads on the grey the
  way the hero's paragraph does. The note was `--blue`. The badge is sky too,
  with a sky hairline border at 35 %.
- Nothing else moved: the navy glass area above, the layout and the copy.

**Checked.**
- The band and the hero compute to the same `rgb(54, 58, 67)`.
- Note and badge contrast on the grey: 6.1:1.
- No sideways scroll at 1440 or 390.

## v0.24.1 — 2026-10-24 — the footer on the page's dark navy

**Why.** The user: "it looks light blue, not dark like on my site."

v0.24.0 read "the blue at the top of my page" as the announcement bar's
`--blue` (#1d4f8b). That was the wrong blue. The user meant the dark navy of
the band right under the hero (the facts band, `--navy` #0f2f56), which the
solution card also uses.

**What changed.**
- `.foot-upper` background: `var(--navy)`.
- The glass is tinted with the same navy, at 55 % with `blur(9px)`. The open
  area stays exactly the facts band's navy. The hands read through it,
  softened, the heart still clear. The darker colour needs less tint for the
  text to hold, so the hands show a little more than at v0.24.0's 62 %.
- The text, the wordmark and the focus ring stay white. The layout, the image,
  its crop and the legal band are unchanged.

**Checked.**
- Real contrast, measured on the rendered pixels behind every footer line.
  Worst cases: 1440: 5.5:1 · 1280: 5.3 · 820: 5.4 · 390: 5.4.

## v0.24.0 — 2026-10-24 — the page's blue behind the heart-hands

**Why.** The user was unsure the heart-hands image matched the page's vibe,
then proposed: "maybe behind the hands making the heart we put the blue
background, like at the top of my page."

The top of the page is the announcement bar in the brand blue (`--blue`,
#1d4f8b). The footer's light blue-grey gradient is replaced by that blue. The
image has a transparent background, so the blue sits directly behind the
hands. The footer now ties back to the page's opening colour, not a new pastel.

**What changed.**
- `.foot-upper` background: `var(--blue)`.
- **The glass is tinted with the same blue,** at 62 % with `blur(9px)`. The
  open area stays exactly the announcement bar's blue. The hands read through
  it, softened, the heart still clear. The previous white 55 % pane would have
  washed the blue to pastel.
- **White text, as on the announcement bar.** This covers the headings, links,
  tagline and the wordmark. The red wordmark on blue vibrates and fails
  contrast. The focus ring is white in this area, since the coral one fails on
  blue.
- The layout, the height, the image and its crop are unchanged. The legal band
  below is unchanged.

**Checked.**
- Real contrast, measured on the rendered pixels behind every footer line. At
  a 55 % tint the worst case was 4.2:1 over the lightest skin, so the tint went
  to 62 %. Worst cases: 1440: 4.7:1 · 1280: 4.7 · 820: 4.7 · 390: 4.7.
- No sideways scroll at 1440 or 390.

## v0.23.2 — 2026-10-24 — the Request the deck panel without rounded corners

**Why.** The user: "the details rectangle in the Request the deck section,
let's make it without rounded corners so it matches the design of the rest
of the page."

The page's other rectangles are square: the full-bleed photo with its navy
card, the solution image, the bands. The form panel was the one large shape
with a 28 px radius, so it read like a different kit.

**What changed.**
- `.contact-panel` `border-radius: 28px` → `0`.
- Nothing else moved: the same padding, shadow, fields, button and layout.
  The fields and the button keep their small radii, like every other button
  on the page.

## v0.23.1 — 2026-10-24 — the footer's glass is the area itself, not a card

**Why.** The user: "But you added another layer, a rectangle. I don't want
that, that's your mistake! I just want the text itself on the glass
background, over that whole rectangle there, and make it a bit bigger so the
heart in the hands shows."

v0.23.0 put the columns on a rounded card floating over the image, which is a
new layer. The user wanted the footer's own area to be the glass.

**What changed.**
- **No card.** `.foot-top` is back to its plain grid and padding. The text
  sits straight on the background.
- **The whole upper footer is the glass.**
  - The heart-hands image fills it (`object-fit: cover`, heart centred).
  - A full-area pane over it: white at 55 %,
    `backdrop-filter: blur(9px) saturate(1.4)`.
  - The image reads through it, softened, the heart clearly a heart.
  - Without backdrop-filter, the image is blurred directly under a white
    tint.
- **Taller,** so the whole heart fits: at least `clamp(360px, 36vw, 540px)`
  (518 px at 1440), with the columns centred in it.
- **Darker inks on the glass,** so the text holds over the hands: the column
  headings in navy and the links in ink. The tagline and the legal band are
  unchanged.

**Checked.**
- Real contrast, measured on the rendered pixels behind every footer line at
  1440, 1280, 820 and 390: the worst case is 5.2:1, and every line passes
  4.5:1.
- The design detector still flags "Company" and "Investors" at 2.6–3.2:1.
  It measures against the raw image and does not see the glass pane above it,
  so the pixel measurement is the one that holds.
- There is no sideways scroll.

## v0.23.0 — 2026-10-24 — the glass moves to the footer; "Request the deck" restored

**Why.** The user, on v0.22.0: "Let's try one rectangle below, where I
suggested" (the footer). Then: "I understood the problem: you also changed
its structure, that's why it doesn't look good. Put the previous structure
back."

They were right about v0.22.0. It didn't only add an image and glass; it
rebuilt the section:
- a tall image band pushed the content down;
- the form lost its own card;
- the heading, the details and the form were merged onto one sheet.

The request was an effect, not a new layout.

**What changed.**
- **"Request the deck" is back to v0.21.0 exactly.** `ContactForm.tsx` and
  the section's styles (the section, the form panel, the inputs) are restored
  from that commit.
- **The footer keeps its layout and gains the effect.**
  - Nothing moves: the wordmark and tagline on the left, Company, Investors
    and Contact, then the legal band with the badge.
  - The upper part sits on a soft medical-blue gradient with the user's
    heart-hands image behind it, blurred 2 px and faded out before the legal
    band.
  - The columns sit on one frosted-glass rectangle: white at 60 %,
    `backdrop-filter: blur(12px) saturate(1.4)`, a white hairline and a soft
    shadow. The heart shows through it, softly.
  - The rectangle grows outward into the gutter by its own padding, so the
    columns keep their place.
  - Without backdrop-filter, the rectangle is near-opaque white.

**Checked.**
- In headless Chrome at 1440, 820 and 390, "Request the deck" matches
  v0.21.0 (white form card, the same inputs).
- The footer's columns read on the glass, and there is no sideways scroll.
- The design detector reports no findings.

## v0.22.0 — 2026-10-24 — "Request the deck" on frosted glass

**Why.** The user sent a ChatGPT image (two hands making a heart, one wrist
wearing the Cyphix strap). They asked for it behind "Request the deck":
- with a colour behind it, "maybe grey or something medical";
- the image a little blurred;
- the whole section on top of it, "like frosted glass, as if seeing the image
  through glass, like Apple";
- "integrate it smartly, keep the page's clean look".

They also offered the footer. The section was chosen over the footer for two
reasons: the footer is small text on white, where an image would hurt
legibility; and the form is the page's closing action, so the glass has a job
there as the form's own surface.

**What changed.**
- **A soft medical-blue stage.** The section has a gradient from #c9d6e6 to
  #f6f8fb (the footer is white). The image sits in its top band:
  - `contact-hands.webp`, 1600 × 800 with a transparent background;
  - `object-fit: cover` with the heart centred;
  - blurred 2.5 px;
  - masked so the forearms fade out at the bottom instead of ending on a hard
    line.
- **The section rises over it on frosted glass.** The heading, the contact
  details and the form share one sheet:
  - white at 58 %;
  - `backdrop-filter: blur(26px) saturate(1.5)`;
  - a white hairline border and an inner top highlight;
  - a soft navy shadow;
  - a 32 px radius.

  The heart stays readable above the sheet, and the thumbs and forearms melt
  into it below, seen through the glass. Browsers without backdrop-filter get
  a near-opaque white sheet.
- **One glass surface, no card inside a card.** The form's own white card is
  gone; the form sits straight on the glass. Its inputs are translucent white
  with a hairline border; focus stays solid white with the ink ring.

**Checked.**
- In headless Chrome at 1440, 1280, 820 and 390:
  - the heart is visible above the sheet;
  - the text on the glass reads (ink on near-white);
  - no sideways scroll.
- The design detector reports no findings.

## v0.21.0 — 2026-10-24 — the team in black and white, colour on hover

**Why.** The user: "In The team, on desktop, can our photos be grey-white,
and only when the mouse goes over them does the colour show?"

**What changed.**
- On a device with a hovering pointer (`hover: hover` and `pointer: fine`, a
  desktop or laptop), both portraits rest in black and white
  (`grayscale(1)`).
- The portrait under the pointer fades into colour over 0.7 s, with the same
  easing as its existing slight zoom. The other portrait stays grey.
- Touch screens have no hover, so phones and tablets keep the portraits in
  colour rather than hiding it for good.

**Checked.** In headless Chrome:
- at 1440 both portraits are `grayscale(1)` at rest, and hovering the first
  turns only that one to `grayscale(0)`;
- at 390 with touch, there is no filter;
- the design detector reports no findings.

## v0.20.1 — 2026-10-24 — the tablet: full size again, a touch to the left

**Why.** The user: "Actually, put it back to the previous size, and move the
iPad a little, little to the left, really a touch."

**What changed.**
- **v0.19.0's `scale(0.92)` is gone.** The tablet is back to its full width:
  403 px at 1440, 358 px at 1280.
- **It moves a touch left** with `translateX(-min(1.1vw, 18px))`: 16 px at
  1440, 14 at 1280, 9 at 820 and 4 at 390.

Only the tablet changed. A transform moves nothing in the layout, so the
hand's box is unchanged at every width.

**Checked.** In headless Chrome at 1920, 1440, 1280, 1024, 820 and 390 px:
- the hand is unchanged;
- at 1024 the tablet stays 72 px clear of the copy;
- there is no sideways scroll.

## v0.20.0 — 2026-10-24 — one "Request the deck" fewer

**Why.** The user: "The REQUEST THE DECK button appears three times. Why? In
the white bar I think it's unnecessary."

The first screen showed it three times, one under the other: the
announcement's link, the white bar's button, and the hero's button.

**What changed.**
- **The white bar's button is gone,** with its styles (the margin rule at
  1100 px and the phone sizing). The bar holds the wordmark, the section links
  and, on wide screens, the phone number.
- **The announcement's link is back on phones.** It was hidden under 420 px
  only because the bar's button sat right below it. With "Now raising our seed
  round" it fits on one line from 365 px, so it now hides only under 375 px.
- The hero's button, the form and the footer link are unchanged.

**Checked.**
- At 1440, 1024, 390 and 360 px, the first screen offers the announcement's
  link and the hero's button (only the hero's at 360).
- The announcement stays on one line, the hand doesn't move, and there is no
  sideways scroll.
- The design detector reports no findings.

## v0.19.0 — 2026-10-24 — the tablet's screen drawn live; the tablet a touch smaller

**Why.** The user: "Is the iPad screen a screenshot of what you made, or is it
actually drawn on the site? It still looks a bit low quality. Why?" Then:
"you could even make the iPad a tiny bit smaller."

It was a screenshot. v0.18.0 drew the screen in HTML but shipped it as a
raster:
- rendered at 2×;
- composed with the frame;
- shrunk to a 1000 px WebP;
- shrunk again by the browser to about 400 px.

The ECG lines are thin, so each step softened them, and lossy compression
smeared them further.

**What changed.**
- **The screen is live SVG.**
  - `HeroTablet.tsx` draws the CYPHIX recording view as one SVG, 1330 × 888
    units, with every element at the position measured from v0.18.0's layout.
    `lib/tabletScreen.ts` holds the same recording, built once at import.
  - The SVG sits under the user's frame (`tablet-frame.webp`, cropped to the
    device), whose bezel covers its edges and rounds its corners.
  - Lines, text and the wordmark (`Logo.tsx` now exports `WORDMARK_PATH`) are
    vectors, sharp at any size, zoom or pixel density.
  - The traces are simplified (Ramer–Douglas–Peucker, 0.12 units) so the path
    data stays small.
  - The traces are a little heavier (2.2 and 3.2 units, from 1.5 and 2.2), so
    they read at the tablet's real size.
- **The tablet is a touch smaller,** `scale(0.92)` from its right edge, the
  edge under the hand. It shrinks toward the hand and nothing in the layout
  moves: the hand's box is unchanged at every width.
- `tools/tablet/` and `hero-system.webp` are removed; the component is the
  source now.

**Checked.**
- In headless Chrome at 1440, 1280, 820 and 390 px wide, the hand's box is
  unchanged and there is no sideways scroll.
- A 3× close-up at 1440 shows crisp traces, type and wordmark.
- The design detector reports no findings.

## v0.18.0 — 2026-10-24 — the hero tablet, built rather than generated

**Why.** The user sent an empty tablet frame and asked: "Inside it, build my
page yourself, with my real logo and the waves that show there's ischemia, as
there are now. Just that we make it, so it's clear and in good quality."
They then swapped in a second frame: "actually, use this frame."

The generated tablets had soft, invented lettering (a near-miss of the
wordmark) and traces drawn by an image model.

**What changed.**
- **The screen is drawn** (`tools/tablet/screen.html`, 1330 × 888, rendered at
  2× in headless Chrome). It is the CYPHIX recording view:
  - the real wordmark (the 2026-10-10 artwork, `#1E293B` as in the app), and
    the date;
  - "Limb leads · 10 s · 320 Hz", the 12.5 mm/s and 10 mm/mV controls;
  - six leads on 1 mm / 5 mm paper, each with a 1 mV calibration pulse;
  - the frontal-plane axis wheel with its −30° to +90° sector, heart rate and
    rhythm;
  - "Illustrative recording." in the corner.
- **The ischemia is real ECG.**
  - Leads I and II are modelled with ST elevation in II and a reciprocal
    depression in I.
  - III, aVR, aVL and aVF are derived from them by Einthoven's and
    Goldberger's relations, so the elevation shows in II, III and aVF (marked
    in red, as before) and the reciprocal change in aVL.
  - The axis (51°) and the rate (75 bpm) are computed from the trace, not
    typed.
- **The frame is the user's.** The screen goes behind its transparent
  opening, and the bezel covers the edges and corners. `tools/tablet/compose.py`
  writes `hero-system.webp` (1000 × 690). The tools reproduce the shipped image
  to a mean difference of 0.2/255.
- **Only the image changed.** No CSS rule changed: the tablet keeps its width,
  left edge and centre, and the hand doesn't move.
- **The announcement** (v0.17.1, shipped earlier today) reads "Now raising our
  seed round".

**Checked.** In headless Chrome at four widths, the tablet's x, width and
centre are unchanged, as are the hand's box and the hero's height, and there
is no sideways scroll.

## v0.17.1 — 2026-10-24 — the stage, not the amount

**Why.** The user: "Why does the top say 'Now raising a $1.9M seed round'? We
only need our stage, not the number. The 1.9 million is really unnecessary."

**What changed.** The announcement now reads "Now raising our seed round |
Request the deck". The amount appeared nowhere else on the page: the market
section that held the ask was removed in v0.14.0, and `og.jpg` carries no
figure. `PRODUCT.md` keeps the ask as background truth.

## v0.17.0 — 2026-10-24 — black electrodes, and the hand a touch higher

**Why.** The user sent the same forearm with the module's electrodes in black
("maybe that's prettier") and asked: "raise the hand a tiny bit more too."

**What changed.**
- **The forearm image is the user's new one.** It went through the same
  pipeline as the first:
  - the haze removed;
  - turned counter-clockwise;
  - cropped to the subject;
  - set 8 px in from the left, right and top.

  It lines up with the old image at 99.4 % overlap, so the hand's place and
  scale are unchanged; only the electrodes differ.
- **The hand is a touch higher.** It shows 1464 of the 1768 rows, 60 more
  than v0.13.4, at the same scale:
  - the height factor goes from 0.7939 to 0.8279;
  - tablets go from 381 to 397 px, phones from 333 to 347 px.

  The hand rises 24 px at 1440, 18 at 1280, 16 at 820 and 14 at 390. Its x and
  width are unchanged.
- **On stacked layouts nothing else moves.**
  - The fingertips reach 8 px (tablets) and 4 px (phones) into the copy's
    bottom padding.
  - The media's top padding goes to 0.
  - The tablet's top margin grows to 24 px.

  The band's height and the tablet's box are unchanged.
- The alt text says "three black electrodes".

**Checked.** In headless Chrome at four widths:
- the tablet's box and the hero's height are unchanged to the pixel;
- only the hand's top moved;
- there is no sideways scroll.

## v0.16.0 — 2026-10-24 — the user's new tablet in the hero

**Why.** The user sent a new ChatGPT image: "use this iPad."

**What changed.**
- **The image.** The share link's preview image is only a 1200 × 630 card
  with a grey background and white side bars, so I didn't use it. The
  original, 1536 × 1024 with a transparent surround, came from the page's
  direct file link. It is cut to the device and saved as `hero-system.webp`
  (1000 × 647).
- **Only the image changed.**
  - No CSS rule changed: the tablet keeps its width, its left edge and its
    centre.
  - It is a little taller than the last one (aspect 1.55 against 1.78), so it
    gains height evenly above and below.
  - The hand is untouched.

**Checked.** In headless Chrome at four widths:
- the tablet's x, width and vertical centre are unchanged, for example
  802 / 403 / 543 at 1440;
- the hand's box is unchanged;
- there is no sideways scroll.

## v0.15.0 — 2026-10-24 — "How it works" removed

**Why.** The user: "Take out the How it works part as well."

**What changed.**
- **The section is gone.** `HowItWorks.tsx` is deleted, with its module render
  (`render-module.webp`, now unused) and that render's frame style.
- **Everything that pointed at it went too:**
  - "How it works" in the top nav, which now reads Product · Stage · Team;
  - the footer link;
  - "See how it works ↓" at the foot of the "Our solution" card, with its
    style.

  The card now ends on its paragraph.
- **The list-row styles stay.** "Who it's for" shares them.

The page now runs: hero, facts band, "1 in 3", "Our solution", "Who it's for",
"Where we are", "The team", the "One strap. Any watch." scene, and "Request
the deck".

**Checked.**
- At 1440 and 390:
  - no `#how` remains;
  - "Our solution" leads straight into "Who it's for";
  - no sideways scroll.
- The design detector reports no findings.

## v0.14.0 — 2026-10-23 — two sections out; the page made for phones

**Why.** The user: "Take down 'Why Cyphix' and 'Built for a $4.53B market',
both of them. Then add mobile support, so it looks normal on a small screen
too."

**What changed.**
- **"Why Cyphix" and "Built for a $4.53B market" are removed.**
  `Compare.tsx` and `Market.tsx` are deleted, along with their styles,
  including the phone layouts of the table and the market chart. The footer's
  "Market" and "Why Cyphix" links are gone too.
  - The figures stay as product truth in `PRODUCT.md`.
  - The announcement still names the $1.9M round.
  - The facts band still shows $4.53B.
- **The phone pass.** I audited the page at 360 × 740, 375 × 667 and
  390 × 844 with motion on (the live strap scene included), and fixed what
  didn't hold:
  - **The announcement** wrapped onto two lines at 360 and 375. Under 420 px
    it now keeps to "Now raising a $1.9M seed round". Its link repeated the
    bar's button directly below it, so it is hidden there.
  - **The bar's button** was a desktop button, 224 px wide next to an 82 px
    logo. On phones it is 40 px tall, 12 px type, with tighter tracking.
  - **The hero** starts higher: top padding 64 → 44 px, the chip's gap
    32 → 24 px, the lede's margins 24/40 → 20/32. The tablet and the hand
    start to show on the first screen.
  - **The chip** goes from 11.5 to 12 px.
  - **Tap areas.**
    - The footer links were 19 px tall; they are now 35 px.
    - "See how it works" grows from 26 to 42 px.
    - The bar and footer logos grow to 45 px or more.
    - The contact e-mail and phone keep their hairline underline, with an
      invisible area that extends the touch target to 47 px.
- **Desktop is unchanged** apart from the two removed sections.

**Checked.**
- At 360, 375 and 390 with motion on:
  - nothing runs past the screen's edge;
  - no text is under 12 px apart from the version badge;
  - every link is at least 32 px tall, the contact links through their
    invisible area;
  - the strap scene plays through all four states.
- At 1440 the page flows from "Who it's for" to "Where we are" to "The team".
- The design detector reports no findings.

## v0.13.4 — 2026-10-23 — the hand, a touch higher

**Why.** The user: "raise the hand a tiny bit."

The forearm's lower end is a hard cut that sits on the band's bottom edge.
Shifting the image up would have shown that cut floating above the edge.

**What changed.**
- **A little more forearm, at the same scale.**
  - `hero-wrist.webp` is cut from the v0.11.0 original (670 × 1768) to its
    upper 1404 rows instead of 1344.
  - The CSS keeps the same scale: the height factor goes from 0.76 to 0.7939,
    365 to 381 px on tablets and 319 to 333 px on phones.
  - The hand rises 25 px at 1440, 19 at 1280, 16 at 820 and 14 at 390. Its
    width and x are unchanged.
- **Nothing else moves.** On tablets and phones the extra height comes out of
  the media's top padding (24 to 8 or 10 px), and the tablet gets the same top
  margin. The band's height and the tablet's box are unchanged.

**Checked.** In headless Chrome at four widths:
- the tablet's box and the hero's height are unchanged to the pixel;
- only the hand's top moved;
- there is no sideways scroll.

## v0.13.3 — 2026-10-23 — the hand, a touch to the right

**Why.** The user: "now move the hand a tiny bit to the right."

**What changed.** The hand's shift to the left is about a quarter smaller:
- desktop: from `min(7vw, 110px)` to `min(5.3vw, 84px)`, so the hand moves
  24 px right at 1440 and 21 px at 1280;
- tablets: from 8vw to 6vw, 17 px at 820;
- phones: from 10vw to 7.5vw, 10 px at 390.

Only the hand moved.

**Checked.** In headless Chrome at four widths, the tablet's box is unchanged
to the pixel, the arm meets the band's bottom edge, and there is no sideways
scroll.

## v0.13.2 — 2026-10-23 — only the hand moves

**Why.** The user: "You move the hand and the iPad! I asked only for the hand."

v0.13.1 was wrong. To move the hand it re-placed the whole pair, so the tablet
moved left about 110 px along with the hand. The user had asked for the hand
alone.

**What changed.**
- **The tablet is back exactly where v0.13.0 had it,** at the same size and
  margins. Checked by its box at four widths: (802, 430, 403 × 227) at 1440,
  (731, 347, 358 × 202) at 1280, (178, 658) at 820 and (38, 690) at 390.
- **Only the hand moves,** with a `translateX` on `.hero-arm` that changes
  nothing else in the layout:
  - desktop: `min(7vw, 110px)`, 101 px at 1440 and 89 px at 1280;
  - tablets: 8vw, 66 px at 820;
  - phones: 10vw, 39 px at 390.
- The hand now covers more of the tablet's right side, and the traces on the
  left stay clear.

**Checked.** In headless Chrome at 1440 × 900, 1280 × 720, 820 × 1180 and
390 × 844:
- the tablet's box matches v0.13.0 to the pixel;
- the arm meets the band's bottom edge;
- there is no sideways scroll.

## v0.13.1 — 2026-10-23 — the hand, clearly further left

**Why.** The user: "move the hand further left. It doesn't look like you
moved it at all."

They were right.
- v0.12.1 and v0.13.0 moved the hand by making the tablet overlap it more.
  The tablet and the hand were centred as a pair, so the hand moved only half
  of each change.
- v0.13.0 also made the tablet larger, which cancelled most of what was left.
  The hand moved 28 px at 1440, which is not visible.

**What changed.**
- **On desktop the pair is placed, not centred.**
  - The tablet starts 2vw left of the media column, still at least 40 px clear
    of the copy. On laptops narrower than 1200 px it starts at the column's
    edge.
  - It is `min(26.5vw, 460px)` wide.
  - The hand overlaps its right side by `min(7.3vw, 126px)`.
- **The hand is 113 px further left at 1440 × 900** (from x = 1081 to 968), and
  120 px further left at 1280 × 720. At 1920 the pair ends at the content's
  right edge, under the header's button.
- **On tablets and phones the pair stays centred.** The overlap grew from
  −13 % to −17 % on tablets and from −15 % to −19 % on phones.

**Checked.**
- In headless Chrome at 1920, 1440, 1280, 1100, 1024, 820 and 390 px wide:
  - no sideways scroll;
  - the arm meets the band's bottom edge;
  - the tablet is at least 40 px from the copy.
- The design detector reports no findings.

## v0.13.0 — 2026-10-23 — no sensors section; the user's physician beside "1 in 3"; the new tablet

**Why.** The user asked for four changes:
- "Let's delete the More than an ECG section."
- "Where it says 1 in 3, put this image in the rectangle": a ChatGPT image of
  a physician reviewing a CYPHIX recording on a laptop.
- "Instead of the iPad there now, use this": a new ChatGPT tablet image.
- "Move the hand a little more to the left."

**What changed.**
- **"More than an ECG" is gone.** The section, its charts and their data
  (`Sensors.tsx`, `lib/vitals.ts`) are removed, along with their styles and
  the footer's "Sensors" link. The sensors themselves remain product truth in
  `PRODUCT.md`.
- **The "1 in 3" frame holds the user's image.**
  - The "home" photo slot now holds `home-clinician.webp`. It replaces the
    coral "1 in 3" figure on navy, which only ever stood in until a photo
    arrived.
  - The frame crops the photo at `object-position: 14% 50%`, so the laptop and
    its CYPHIX logo stay in frame on a phone. `Photo` gained an optional
    `focus` for this.
  - "Concept imagery" sits on a small ink chip, so it reads over the white
    coat.
- **The hero's tablet is the user's new image.**
  - `hero-system.webp` is now 1000 × 563, wider than before. It is cut to the
    device, without a shadow.
  - At 28vw it shows at about the old one's height.
- **The hand sits further left, over the tablet's right side.**
  - The tablet's overlap is −20 % of the column (−13 % on tablets, −15 % on
    phones), so the palm covers the side panel and the traces stay clear.
  - At 1440 × 900 the arm starts 28 px further left than in v0.12.1.

**Checked.**
- In headless Chrome at 1440 × 900, 1280 × 720, 820 × 1180 and 390 × 844:
  - no sideways scroll;
  - the arm meets the band's bottom edge;
  - `#sensors` is gone;
  - the laptop stays in frame at every size.
- The design detector reports no findings.

## v0.12.1 — 2026-10-23 — the hand over the tablet's edge, no grey behind it

**Why.** The user: "move the hand a little to the left, so it comes up a bit
onto the iPad's right side, and remove the grey background you made behind
the iPad."

The grey was the tablet's drop shadow. On the slate band it read as a haze
around the device rather than as depth. The image itself is cut clean.

**What changed.**
- **The drop shadow is gone.** The tablet sits flat on the slate, as on
  AliveCor.
- **The hand overlaps the tablet's right side.**
  - The tablet's negative margin went from −4 % to −11 % of the column, −9 %
    on phones.
  - The pair stays centred, so the hand moves left and the palm and thumb
    cover the tablet's side panel.
  - The ECG traces stay clear.

**Checked.** In headless Chrome at 1440 × 900, 1280 × 720, 820 × 1180 and
390 × 844: no sideways scroll, and the arm still meets the band's bottom edge.

## v0.12.0 — 2026-10-23 — the hand at its first size, the system beside it, the user's watches, the vitals as charts

**Why.** The user, on v0.11.1, asked for four changes:
- "Now it's too big. You only had to move the hand down a little from where
  it was. Look at AliveCor's proportions again."
- "Next to the hand, as they do there, add this image that shows my system"
  (a ChatGPT image of the CYPHIX app on an iPad).
- "Where the four watches are, use this instead" (a ChatGPT image of the four
  ways to wear it). Hovering over a watch should make it grow a little more
  than the others, with an animation that is easy on the eye.
- "More than an ECG: I don't want to see the modules there. I want graphs of
  the other measurements, something beautiful."

v0.11.1 had cut the lower quarter of the forearm and then sized what was left
to the band, which also made the hand bigger. The cut was right; the scaling
was not.

**What changed.**
- **The hero hand is back at its v0.11.0 size, lower.**
  - The arm is sized as the whole forearm was in v0.11.0 (band − 56 px), times
    the 76 % that remains after the cut. The hand is as large as it was there,
    and its fingertips sit about 230 px below the band's top at 1440 × 900.
  - That is AliveCor's proportion: their device top sits about a third of the
    way down their hero.
- **The system stands behind the hand, on the left, as AliveCor stands its
  tablet.**
  - The user's iPad image (`src/assets/photos/hero-system.webp`), cut to the
    device, sits a little below the band's middle, with a soft drop shadow.
  - The thumb overlaps its edge only.
  - "Concept imagery" moved to the free corner on the left.
  - The image mirrors the team's own web app: limb leads, heart rate,
    frontal-plane axis and regularity, which are the measurements the app
    displays.
- **Our solution shows the user's four watches.**
  - The strip is cut into one image per watch (`wear-*.webp`), with a shared
    top and bottom so their scale stays as in the source.
  - Under a pointer, the watch grows (×1.12, with a soft shadow) and the other
    three step back (×0.96, slightly dimmed). It eases over 0.7 s.
  - The effect runs only where there is hover and motion is welcome.
  - The `group` photo slot is gone. Its Gemini prompt (§3) is marked as
    supplied.
- **More than an ECG shows the data instead of the parts.**
  - **A 6-lead strip** at paper scale (25 mm/s, 10 mm/mV, 1 mm and 5 mm
    squares, a 1 mV calibration pulse per row). Leads I and II are modelled;
    III, aVR, aVL and aVF are derived from them by Einthoven's and
    Goldberger's relations, as a real limb-lead recording is.
  - **A day of heart rate** in coral, every five minutes, from about 55 bpm at
    night to an early-evening peak near 140.
  - **A night of skin temperature** in sky blue, from 22:00 to 08:00.
  - All three come from fixed anchors and a seeded noise source
    (`src/lib/vitals.ts`), so every visitor sees the same figures.
  - The section says plainly: "Illustrative data, drawn for this page: not a
    recording." There is no verdict anywhere.
  - Each plot draws in once, left to right, as the section arrives. Nothing
    loops or streams.
  - The module renders `sensors-wrist` and `sensors-outer` and their pins are
    removed.

**Checked.**
- In headless Chrome at 1440 × 900, 1280 × 720, 820 × 1180 and 390 × 844:
  - no sideways scroll;
  - the arm meets the band's bottom edge;
  - the tablet and the arm fit inside the gutters;
  - the strip's rows don't overlap;
  - the hovered watch grows and the others step back.
- The design detector reports no findings.

## v0.11.1 — 2026-10-23 — the forearm alone, lower in the band

**Why.** The user: "the hand reaches too high; cut some of its bottom. And
remove the watch: it doesn't look natural there, and it's further down the
page anyway."

**What changed.**
- **The forearm is shorter.** The lower quarter is cropped away
  (`hero-wrist.webp` is now 670 × 1344), and the image is sized to the band's
  height minus 150 px, so the fingertips sit well below the band's top. The hand
  is larger than before; the module and a little forearm stay above the bottom
  edge.
- **The render and its two-line key are out of the hero.** The figure shows
  only the forearm, with the note "Concept imagery". The render still shows
  under "Our solution" and in the closing scene, and it stands in for the hero
  photo only when no photo is supplied.

## v0.11.0 — 2026-10-23 — the hero: the user's wrist, hand raised, beside the render

**Why.** The user sent their own image for the hero, made in ChatGPT and
shared by link: a forearm wearing the Cyphix strap, with the module on the
inside of the wrist showing its three outer electrodes. They asked:
- "make it look like the hand is facing up, not at an angle";
- "next to it, add the current rendering of the product, so they understand
  this is the back part".

**What changed.**
- **The image.** It was downloaded from the share link's `og:image`
  (1774 × 887 PNG with a transparent background) and prepared:
  - the matte's faint haze removed (it showed as specks on dark backgrounds);
  - the subject made opaque (it came in at 99 %);
  - turned 90° so the hand points straight up;
  - cropped with the forearm's cut on the bottom edge;
  - saved as `src/assets/photos/hero-wrist.webp` (670 × 1768, 132 kB), with a
    provenance sidecar.

  It fills the `hero` slot in `src/config/photos.ts`.
- **The hero's right side is a pair.**
  - The forearm rises from the slate band's lower edge, sized to the band's
    height at every width. On a phone it is 420 px tall.
  - Beside it sits `render-hero` (the strap on a smartwatch), with a two-line
    key: "On top: your watch. / Underneath, against the wrist: the Cyphix
    module."
  - The note reads "Concept imagery and rendering".
- **The Gemini hero prompt** (`gemini/PROMPTS.md` §1) is marked as supplied.

**Checked.** In headless Chrome at 1440 × 900, 1280 × 720, 820 × 1180 and
390 × 844: no sideways scroll, and the forearm's bottom meets the band's bottom
edge exactly.

## v0.10.1 — 2026-10-23 — the bracelet is an oval you could wear

**Why.** The user, looking at v0.10.0 on their phone: "does that look like
something you can put on your hand? Why did you close it in a straight line?
Look at the reference and match it. It looks like half an arch."

They were right. v0.10.0 closed the strap by sweeping a link between its two
cut ends. The slate strap is shaped to hold a flat watch: near where the watch
sits it runs almost straight. A link continuing that line closed the loop into
a "D", with a long straight front.

**The reference.** The team's own closed band, `woven_band_band` in the OBJ.
It is the strap worn without a watch: an oval about 71 × 49 mm outside,
rounded across the front like a wrist.

**What changed.**
- **The strap bends to that oval as it closes.** `bendToBracelet` in `studio.ts`
  turns the woven band's centreline into a table, its radius every 5° from the
  loop centre. It measures the slate strap's own centreline by casting rays to
  its inner and outer faces at every degree, then moves each point of the
  strap, the link and the RA electrode along the radius by the difference
  between the two. The band keeps its thickness.
- **It is a GPU morph tied to the closing.** The link grows from both cut ends
  while the strap curls into the oval, and both run backwards before the
  analog watch clicks in.
- **The bend fades out before the module** (112° to 140°), so the module and
  its hinges don't move.
- **The bent strap's normals come from the bent surface.** Turning the
  original normals left a dark crease where the curvature changes fastest.
- **The spring-bar levers hide while the strap is closed;** they only matter
  with a watch in the strap.
- `scene-strap.webp` and `gemini/refs/ref-3-strap-closed-bracelet.png` are
  re-rendered.

## v0.10.0 — 2026-10-23 — four ways to wear it; More than an ECG

**Why.** The user liked v0.9.0 ("perfect") and caught a miss: the product
comes in four configurations, not three:
- on a smartwatch;
- the strap on its own, which must be **closed like a bracelet**, "don't leave
  it open with adapters";
- on an analog watch, "turning an analog watch into a smart one";
- the **Cyphix watch**, "the screen itself is ours too".

They also asked whether to add the other sensors, "FULL VITALS": the 6-lead limb
ECG, temperature, and PPG for continuous pulse. They weren't sure it was needed.
Decided: yes, as one quiet section, because every one of those sensors is
already in their 3D model.

**What was wrong in v0.9.** The team's OBJ always held all four
configurations side by side:
- the smartwatch on the slate strap;
- a closed band;
- the analog watch on a green strap;
- `contour_*`, a complete Cyphix watch in black titanium, with an ink band, the
  electrodes in the band, and its own PPG and temperature sensors.

The v0.8 conversion kept only the strap, the smartwatch and the analog head,
and it moved the smartwatch's lug housings onto the strap. That is why the
strap on its own looked like an open band with adapters.

**What changed.**
- **The model.** `public/models/cyphix.glb` now carries the fourth assembly,
  `contour`, the team's own Cyphix watch, on the same origin. It is 1.6 MB, up
  from 0.93 MB, because the Contour's case is a dense, unwelded surface.
- **The studio** (`src/lib/studio.ts`):
  - Each watch keeps its own lug housings.
  - Without a watch, the strap closes with a band swept between its two cut
    ends. The cut's size and tilt are read from the strap mesh, and the band
    leaves each end along the strap's own direction, so the joins are smooth.
  - The Contour gets its own face: the wordmark, the time, and the labels
    ECG / HR / TEMP, with no values.
  - Its display is rebuilt as a clean panel. The simplifier had folded some
    of its wedges, which culled away and broke the AO pass. Its coplanar
    cover glass is dropped; the display's clearcoat stands in for it.
- **The scene** (`src/lib/strapScene.ts`, 560vh) runs in the team's order:
  1. On the smartwatch, the strap turns.
  2. The watch lifts out, and the strap closes into a bracelet: the band grows
     from both cut ends and meets in the middle.
  3. It opens again. The analog watch clicks in: "the same strap makes it a
     smart one".
  4. The strap and the analog watch rise out together, and the Cyphix watch
     comes down: "Or ours."
- **The renders.** There are four scene stills (`scene-cyphix.webp` is new),
  used both in "Our solution" (2 × 2 on phones) and in the reduced-motion
  fallback.
- **"More than an ECG."** A new dark band after "How it works" shows the
  module's wrist side and outer face, rendered from the model, with numbered
  pins at each part's projected centre:
  1. 6-lead ECG electrodes, on both faces and on the strap;
  2. the PPG optical sensor, for continuous heart rate;
  3. the skin-temperature sensor.
- **Copy.** "Our solution", "Wear it", the scene steps and the footer map now
  name the four ways to wear it.
- **Gemini.** Prompt 3 is now four wrists: smartwatch, closed bracelet, analog,
  and the Cyphix watch. Refs 3–5 are re-rendered: `ref-3-strap-closed-bracelet`,
  `ref-4-…`, and the new `ref-5-cyphix-watch`.

**Not done.** The Impeccable finish review stays deferred until the Gemini
photos are in, as planned in v0.9.0. DESIGN.md is still at v0.8.

## v0.9.0 — 2026-10-23 — AliveCor's grammar, for Cyphix; four Gemini photo slots

**Why.** While v0.8 was in review, the user (in Hebrew) pointed at
https://alivecor.com/: "do it like that but for my product. Where a
visualisation image is needed, write me a prompt for Gemini's image model and
we'll put the image there."

**What follows AliveCor.** The structure and component language, played in
Cyphix's own colours and words:
- **Top of the page:** a navy announcement bar ("Now raising a $1.9M seed round |
  Request the deck"), then a white sticky bar with the wordmark, four links, the
  phone number and a solid uppercase button.
- **Hero:** a slate band with a notice chip ("In development · Not for sale"), a
  two-line headline (second line coral) and the product on the right.
- **Facts band:** navy, with line icons and the $4.53B market.
- **"1 in 3" split:** photograph left, statement right.
- **"Our solution":** a full-bleed photograph under a navy card.
- **"How it works" and "Who it's for":** list rows with line icons beside an image,
  each under a heading with a hairline rule.
- **"Why Cyphix":** the comparison on a pale band.
- **Kept from earlier versions:** the stage line, the market band, the team, the
  user's "One strap. Any watch." scene and the form.
- **Footer:** link columns over a pale legal band.

**The photographs.** `gemini/PROMPTS.md` holds the four prompts, with a slot, a
file name, an aspect ratio and the reference images to attach for each:
- hero wrist;
- home moment;
- three people, three watches, one strap;
- clinic.

`gemini/refs/` holds the 3D-model renders Gemini must match. Until the photos
arrive, every slot shows a real asset in its place (a render, the app screen,
or the "1 in 3" figure), so the page is complete today. Wiring a photo in is
one line in `src/config/photos.ts`. Generated people are labelled "Concept
imagery" and are never presented as customers.

**Not claimed, unlike the reference:** AliveCor shows user counts, publication
counts and "doctor-recommended". Cyphix has none of these, so the facts band
uses only what the one-pager states.

**Review state.** Not yet through the finish review. That runs once the
photographs are in, because they change three of the page's biggest surfaces.

## v0.8.0 — 2026-10-23 — the 3D model leads: "One strap. Any watch."

**Why.** On v0.7 the user wrote (in Hebrew): "I still don't like it at all! It still
looks unprofessional." They asked whether we had their 3D modelling materials, and
described the scene they wanted near the end: the watch rotates as you scroll,
becomes only the strap, then an analog watch, so "one strap on any watch" is
understood. v0.7 fixed the motion problem but kept the one-pager's flat concept
renders, and those renders were the weakest thing on the page.

**The model.** `Downloads/cyphix-ecg-straps (1).obj` (three-d-stage export,
2026-09-27) holds four assemblies side by side:
- the smartwatch with the Cyphix strap and module;
- the strap alone;
- an analog watch on the same strap;
- a "Contour" watch.

The strap, smartwatch and analog parts were split by name and bounding box and
moved onto one origin; the analog sits 0.224 m along x in the export, so it is
shifted back by that much. They got PBR materials named after the export's own
(aluminium, brushed titanium, polished steel electrodes, slate silicone,
sapphire), plus a static CYPHIX 6-lead screen on the display. The result is
`public/models/cyphix.glb`: 930 KB with meshopt, 70k triangles. Every product
image on the page is now rendered from it with three.js in one studio light.

**What changed.**
- **Hero:** copy left, the strap on the smartwatch right (`render-hero.webp`), a
  three-quarter view showing the CYPHIX screen and the module's electrodes, on a
  white studio glow with a floor shadow.
- **Product:** the strap from behind (`render-module.webp`), with leader-line
  callouts on the module's electrodes, the watch and the band. The exploded
  concept render is retired.
- **The user's scene** (`OneStrap.tsx`, `lib/strapScene.ts`), between Team and the
  form. A 400vh section holds a sticky dark stage, and the GLB renders live in
  WebGL, driven only by scroll:
  - the strap turns to show the electrodes;
  - the smartwatch lifts out and fades ("One strap.");
  - the analog watch drops into the same strap ("Any watch.").

  The copy fades per phase, a three-step indicator sits underneath, and the
  header turns dark over the stage. three.js loads in its own lazy chunk
  (151 kB gzip) only when the section is near, so the first load is unchanged.
  Reduced motion, or no WebGL, shows the three states as stills.
- **Share card:** `og.jpg` rebuilt on the new render.

**The product studio (finish-review round).** The reviewer judged the first
renders as "a CAD viewport, not a studio product shot". They also flagged the
watch's ghosted fade as "a CG ghost". `src/lib/studio.ts` now dresses the model
the same way for the stills and the live scene:
- **Environment:** a photographer's set baked to PMREM, with an overhead
  softbox, key and rim strips, a kicker and a warm bounce.
- **Materials:** silicone with sheen; clearcoated aluminium; mirror-polished
  electrodes; clearcoat glass over the screen.
- **Screen and dial:** the real CYPHIX wordmark on the watch screen (the first
  pass drew a generic "CYPHIX" in Arial), and an analog dial with indices and a
  seconds sub-dial.
- **Lug adapters:** they move from the watch to the strap, so the strap alone
  ends in finished adapters, not cut slabs, and the analog watch clips into
  those same adapters.

A second review round made the electrodes bright polished stainless against a
satin titanium module, with a front-high fill so they catch light. It added an
object-space silicone grain to the band. The light plates' shadow became a true
contact shadow: height-limited, lighter, and rendered as its own layer under the
product so it never darkens the band.

The stills add a GTAO pass and a soft contact shadow. In the scene nothing
fades any more. The smartwatch unclips and rises out of frame, opaque; the
analog comes down and clicks in. The copy windows run back to back, so the
stage is never without a line.

**State at commit.**
- **Deployment:** not deployed. Production stays on v0.7.0.
- **Finish review:** three rounds. Wordmark, analog dial, band ends, physical
  exit, copy windows, tall stages, the seed reference, DESIGN.md and the shadow
  regression are all resolved.
- **Still partial:** on the light renders the electrode faces read as even grey.
  Strip lights for their reflection angle were being placed when the user
  pointed at alivecor.com as the style to follow, and that became v0.9.

**Removed:** `watch-front.webp`, `watch-module.webp`, `exploded.webp` and their
sidecars. Every new raster carries a provenance sidecar that names the model,
the angle, the light and the studio.

## v0.7.0 — 2026-10-22 — the professional rebuild: a still company page

**Why.** On seeing v0.6.1 live, the user wrote: "its cute but over
simulation and doesn't seem like a professional company did it". They were
right. v0.6.0 opened inside a dark live-sweeping 6-lead display that zoomed
into the watch over 330svh of scroll-jacking. A second simulated Lead II
strip ran under the need, and the counters, strike-throughs, timeline and
callouts all drew themselves. That reads as a tech demo, not a medtech
company. The v0.6.0 entry called the scene the page's "memorable moment";
for an investor arriving cold it was noise in front of the facts.

**What it is now.** The PDF one-pager, played straight as a company homepage
at the craft level of the Withings ScanWatch, Neko Health and Apple Watch
pages (recorded in PRODUCT.md as a standing "Professional canon" commitment):
- **Hero:** "Clinical Depth. / Wearable Ease." centred, the one-pager lede, the
  red "Request the deck" and a "How it works" link. Below sit the real module
  and watch renders with the one-pager's four leader-line callouts. The pair's
  size follows the viewport's height, so most of the product shows above the
  fold on a laptop.
- **Need:** one band. "1 in 3 deaths…" sits beside the need line and the
  trade-off, with a three-way comparison under it (Smartwatch ECG · Holter
  and clinic ECG · Cyphix). Every cell restates the one-pager. On phones each
  capability becomes its own block.
- **Product:** the exploded concept render on the page's ground, annotated
  with the hero's leader-line device (module, strap, watch). On phones it is
  cropped to the module and strap. Beside the real app's limb-lead screen:
  "Sent straight to the clinician."
- **Stage, Market, Team, Request the deck:** the same facts, now still.
  - The stage line marks done and next with its dots alone.
  - The market discs stand on a floor shadow, as in the one-pager.
  - The team is set as portrait-and-name rows. The founder's standing photo is
    zoomed to head-and-shoulders so both portraits frame alike.
- **Footer:** a company footer (map, contact, small print, badge).
- **Link-preview card:** `public/og.jpg` plus `og:image` and twitter meta, so a
  pasted link shows the headline and the product.

**Motion.** One arrival on load: the headline rises, the renders settle and
the callouts draw once. After that the page holds still apart from hover
feedback. Reduced motion shows the final frame.

**Removed:** `HeroScene`, `EcgTrace`, `ecgModel`, `heroScene`, `CountUp`,
`Reveal`, `Leads`, the scroll-progress line, and the `framer-motion`
dependency. The JS bundle drops from 298 kB to 166 kB, measured against the
live v0.6.1. The footer no longer says traces are synthetic, because the page
draws none; the only traces are inside the renders and the app screenshot.

**Built with Impeccable.** The direction contract is in
`.impeccable/surfaces/src-app-tsx.md`. The build was captured at 1440, 1280×720
and 390 and checked with `impeccable detect`.

The finish reviewer judged that it "now reads as a restrained medtech company
homepage" and kept the hero as built. It returned eight fixes for the
sections below the hero, all applied:
- a dead product tile;
- one layout repeated five times;
- duplicated stage facts;
- two uncited accent uses;
- an empty team column;
- tracking below the -0.04em floor;
- a wrap on phones;
- DESIGN.md.

DESIGN.md and `.impeccable/design.json` were re-derived from the build by the
documenter.

## v0.6.1 — 2026-10-21 — deployed; the thank-you stops promising an e-mail

**Deployed for the first time:** **https://cyphix-landing.vercel.app**. The
Vercel project is `cyphix-landing` in `elio123elio1234-5098s-projects`, and
this folder is linked to it (`.vercel/`, ignored). Redeploy with
`vercel deploy --prod --yes --scope elio123elio1234-5098s-projects`.

**Why the copy changed.** v0.4.0–v0.6.0 thanked the sender with "a
confirmation is on its way to <e-mail>". The production server's `/healthz`
reports `"email":"off"`: the Resend key was never pasted into Render. So no
confirmation is sent, and the team is not mailed either. The promise was
false on the day the page went public, so it is gone. The sent state now
reads "Your request is in. We will reply to <e-mail> within a few days."

**Checked live.**
- The page, the bundle (`"0.6.1"`) and the favicon serve.
- A phone-size capture of the live site shows no overflow.
- A CORS preflight for `POST /api/v1/leads` from the new origin answers
  204 and allows it; no lead was written.
- `GET /auth/captcha` is still refused from this origin. That is harmless
  while the server's captcha is off. If Turnstile is ever switched on, add
  this origin to the server's CORS for that route, or the form cannot get
  the site key.

**Where leads go today:** the web cockpit's `/admin/leads`
(cyphixweb.vercel.app). No e-mail arrives until `RESEND_API_KEY` is set on
Render.

## v0.6.0 — 2026-10-20 — the investor redesign: "out of the screen"

**Why.** The user asked for a professional, venture-style home page for
investors, "minimalistic as in my one-pager", with the CYPHIX wordmark in
red, and the design and motion carrying it. The v0.3–v0.5 page was a
"design base": a WebGL aurora, a hand photo and a recreated report card,
with placeholder sections. None of that was the one-pager's world, and
the content spoke to clinics, not investors. This version replaces the
look entirely and keeps what worked: the lead form, the API wiring and
the wordmark.

Built with the **Impeccable** design skill (`npx impeccable install`,
project scope in `Coredex_App/.claude`). Its process ran in this order:
`PRODUCT.md` from a short product interview, a structural roll, and a
direction contract in `.impeccable/surfaces/src-app-tsx.md`. Of the dealt
structures, the user picked **"Out of the screen"**.

**What**

- **The hero is the device.** You land inside a dark CYPHIX display with
  six live limb leads (I, II, III, aVR, aVL, aVF) and the headline
  "Clinical Depth. / Wearable Ease." under them. Scrolling zooms out until
  that live display *is* the screen of the frontal watch render. The watch
  then steps right while the module render arrives on its left, and the
  one-pager's four callouts (Strap, Cyphix module, Your watch, 6-lead ECG)
  draw in. The geometry is pure arithmetic in `src/lib/heroScene.ts`: one
  uniform scale plus a clip-path crop, so the canvas never re-allocates
  mid-zoom. The display rect was measured off the render
  (56, 296, 486 × 538 px, radius ≈ 108).
- **The traces are honest.** `src/lib/ecgModel.ts` projects one synthetic
  cardiac dipole onto leads I and II, then derives III, aVR, aVL and aVF
  with Einthoven's and Goldberger's equations. Every trace is labelled
  illustrative (on the display, in the plate caption and in the footer).
  No copy interprets a signal.
- **Sections in the one-pager's order:**
  - **The need:** "1 in 3" in coral, and a full-bleed Lead II strip on a
    faint coral millimetre grid.
  - **The trade-off:** "Wearable ease ~~or~~ and clinical depth": the
    "or" is struck through and becomes "and" on view.
  - **Six leads:** the real app's limb-lead screen, drifting against the
    scroll, beside "Adhesive patches / Wires / Professional setup" being
    struck through one by one.
  - **Where we are:** the exploded render, then the four milestones on a
    line that draws to a pulsing "Next" dot.
  - **Market:** TAM/SAM as the one-pager's nested circles (equal-area
    ratio, √(2.76/4.53)), with leader lines and count-up figures, and the
    **$1.9M** seed ask beside them.
  - **The team:** both portraits.
  - **Request the deck:** the form, plus direct e-mail, phone and city.
- **The world.**
  - Ground `#F1F3F6` with soft coral and blue light.
  - Navy `#0B1A30`, coral `#F2574C`, and red `#C7362C` for the wordmark
    and the one action (white on red is 5.3:1).
  - **Sora** + **Geist Mono**, the one-pager's own faces, self-hosted as
    variable woff2 (34 KB + 23 KB), so the page makes no Google request.
  - Selection, caret, focus ring and scrollbar are themed. A coral
    scroll hairline runs under the bar, and the favicon is the red C.
- **Investor form.** Name, work e-mail, fund or company, message. The lead
  contract has no investor type yet, so the form posts `orgType: "other"`
  with the fund in `organization` (see "Not done").
- **Assets** were taken from the user's own materials:
  - From the one-pager PDF: the module render, the app screen.
  - From the investor-site reference bundle (`One-pager design
    variations.zip`): the frontal watch, the exploded view, both
    portraits.
  - All converted to WebP; the largest is 70 KB.
- **Reduced motion:** the display stands still, and the device pair
  becomes a plain figure. Every reveal starts from visible content.
- Removed: `Hero`, `WristVisual`, `EcgReportCard`, `ScaleToFit`,
  `Sections` and `hand-wrist.png`.

**Verified, and what that means.** `tsc --noEmit` and `vite build` are
clean (98 KB gzipped JS, 6 KB CSS). Headless Chrome ran two capture
rounds at 1440×900, 1280×720 and 390×844 @2x, covering the hero, five
points of the zoom and every section. It found no horizontal overflow and
no page errors. The only console error is the pre-existing CORS refusal
of `GET /auth/captcha` from localhost; the form already tolerates it.
None of this proves how the zoom *feels* on a real trackpad or phone.

**Finish review.** The Impeccable finish reviewer ran against the
screenshots and the direction contract. Its agents were installed
mid-session and do not register until a new session, so it ran as a
general-purpose agent that loaded the reviewer's own definition. It
returned "fix" with 8 items:
- the mobile end plate left a dead band below the pair;
- at 1280×720 the hero headline was smaller than the next heading;
- mono type was used beyond its roles;
- the mobile market chart had orphaned dots;
- the strip label collided with the trace;
- a "·" was left alone at the start of a wrapped line;
- the traces lost their "illustrative" label during the zoom;
- the heading-left / body-right template repeated six times.

All 8 were fixed in two rounds, and the four follow-ups were resolved.
Its last pass left one item: the founder's role line overflowed on
phones. That was fixed after the review budget ran out (the credential
gets its own line on a phone) and checked by a recapture, but the
reviewer did not score it again. `DESIGN.md` + `.impeccable/design.json`
describe the system as built, written by the Impeccable documenter.
Shipped images carry their origin in `*.webp.json` sidecars. The
detector's "overused font" note on Geist Mono is ignored for that one
value, because it is the one-pager's own face.

**Not done / follow-ups**

- **Not deployed.** No Vercel project exists for this page; `vercel --prod`
  is the user's call.
- An `investor` value for `LeadOrgType` needs a shared + server change.
- Hebrew / RTL (LAUNCH_PLAN L4) is still open.
- The Turnstile policy probe is CORS-refused from origins other than the
  server's allow-list; once deployed, check it from the real domain.

## v0.5.0 — 2026-10-10 — the new CYPHIX wordmark

**Why.** The brand changed; the header and the footer were still drawing
the 2024 lettering. `Logo.tsx` now carries the 2026-10-10 artwork,
mirroring `@cyphix/shared` v1.34.0 `brand/wordmark.ts` (this app builds
standalone and does not resolve the shared package, so the mirror is the
arrangement — an edit belongs in both).

`.brand-logo` sizes by **height** (22px), so the header and footer rows do
not move; the new mark is simply ~16 % wider on the same line, its aspect
being 4.81 against the old crop's 4.14.

**Not deployed.** This page has not been put on Vercel since v0.4.0 — the
version badge will not show the change until someone ships it.

## v0.4.0 — 2026-10-09 — "Request access" is a real form (LAUNCH_PLAN 5.4, L1)

**Why:** every CTA on the page said "Request access" and scrolled to a footer
with no form, no address and no phone (hole L1 in the launch plan). The
server now has a door for exactly this (`POST /api/v1/leads`, v0.23.0).

**What**

- New `ContactForm` section (`#contact`) between the closing CTA and the
  footer: full name, work e-mail, "I am" (clinic / hospital / private
  practice / patient / other), organization (optional), message (optional).
  Posts a lead with `source: "landing"`; the server thanks the sender by
  e-mail and tells the team. A "sent" state replaces the form; errors are
  said plainly (a bad field, too many requests, no connection).
- Bot protection is the server's decision: the form asks `GET /auth/captcha`
  and renders Cloudflare's Turnstile widget only when the policy names a
  provider. Nothing is loaded otherwise — the page stays dependency-free.
- The API base is `https://cyphix-api.onrender.com` by default
  (`VITE_API_BASE_URL` overrides it). The server answers this route from
  any origin, so the page can live on whatever domain it is deployed to.
- The footer is `#footer` now; `#contact` is the form.
- The form says what it is for: access requests, no medical details.

**Not done:** Hebrew / RTL (L4), the sign-in and store links (L2), legal
links (L3) — separate items in the launch plan.

## v0.3.1 — 2026-08-24 — Fit fix: clip overflow + true centering

**Why:** v0.3.0 looked right in a raw browser window but broke when viewed
through the published Artifact (and on mid-width windows): the headline was
clipped and the report card ran off the right edge. Root cause — `transform:
scale()` shrinks a block *visually* but it still occupies its full natural
width (1112px) in layout. On any box narrower than that, the block overflowed,
widened the document, and broke centering. My earlier checks only used a raw
`file://` window, which hid the bug — that was the miss.

**Fix**

- The scale wrapper now `overflow: hidden`s the clipped layout width and
  centers with an explicit `translateX` (origin top-left) instead of auto
  margins (which can't center a child wider than its container).
- Added `overflow-x: hidden` on `html` as a belt-and-suspenders guard.
- Verified with automated checks at 1920, 1440, 1280, 1100, 1000, 900,
  a tall auto-height-iframe simulation, and mobile: **zero horizontal
  overflow, card never cut, composition centered, hero fits the fold** at
  every one.

## v0.3.0 — 2026-08-24 — Scale-to-fit hero (fits any screen)

**Why:** on a smaller laptop the hero was oversized — the headline filled the
screen and the wrist→ECG images fell below the fold. The ask: it should fit the
screen width on any laptop, "headline on top and the images below it," visible
together — exactly how the handoff reference scaled its whole block to fit.

**Changes**

- New `ScaleToFit` wrapper. The entire hero (headline + subhead + CTAs + the
  wrist→arrow→report composition + disclaimer) is one fixed-width block that
  **scales down uniformly to fit both the viewport width and the remaining
  height**, capped at 1:1 so big screens stay crisp. Verified fitting the fold
  at 1280×800, 1366×768, 1440×900, 1536×864 with zero horizontal overflow.
- Below 820px it steps aside: the composition stacks (hand → down-arrow →
  card) with the normal responsive layout.
- The showcase is now a tight, fixed composition (hand 520 · arrow 110 ·
  card 450) instead of a loose flex row that drifted apart on wide screens.

## v0.2.0 — 2026-08-24 — Clean light redesign (reference-matched)

**Why:** v0.1.0 opened on a dark-navy hero with a WebGL "aurora." The reference
is a **white, clean** section, and that dark treatment read as heavy and
overdone — the opposite of the brief. Corrected.

**Changes**

- Hero is now **white**, matching the reference: navy headline, gray subhead,
  the pink→magenta gradient on the "6-lead ECG report" keyword only.
- **Removed the WebGL background** entirely (`MeshBackground` deleted) — no more
  "smoke." Animations are now only subtle fade/rise reveals, the ECG print-in,
  and the arrow's signal flow.
- All sections lightened to a cohesive white / `#f7f9fc` system; report card
  keeps the reference's soft shadow (dropped the teal glow) and the floaty bob.
- Buttons: navy solid primary + light ghost secondary.
- **Fixed** a real mobile bug: `.showcase-hand`'s `flex-basis: 560px` was
  becoming a 560px *height* in the stacked column layout, leaving ~400px of dead
  space between the hand and the card. Reset to `flex: 0 0 auto` on mobile.

**Verified:** `tsc --noEmit` + `vite build` pass; screenshotted clean at desktop
(1440) and mobile (390) with zero horizontal overflow and the gap gone.

## v0.1.0 — 2026-08-24 — Design base

First cut of the investor landing page. **Design over content:** the layout and
motion are the deliverable; real copy is injected in a later pass.

**Why this shape**

- The opening follows the handoff reference (`Wrist to ECG.dc.html`): the hero is
  the wrist → signal arrow → 6-lead ECG report story, with the exact report card
  (patient meta, six lead traces on grid paper, AI-ECG conclusion) recreated.
- Reference art is a light section; we open on **deep navy** instead so the brand
  color leads and a WebGL aurora has room to breathe — premium, not "vibe-coding."
  The white report card floats on the navy with a soft glow.

**What's in it**

- Hero: eyebrow chip, headline with the pink→magenta gradient keyword, subhead,
  two CTAs, and the animated wrist→ECG showcase (staged entrance; leads print in
  row-by-row; arrow signal flows).
- WebGL: a hand-written GLSL aurora (`MeshBackground`) — fbm + domain warp, DPR
  capped at 1.5, pauses off-screen / hidden / on reduced-motion, CSS fallback.
- Scroll-aware fixed header (transparent on the dark hero → light glass on scroll)
  with the real Cyphix wordmark (extracted from the brand SVG, recolorable).
- Placeholder scaffolding below the hero (stats strip, three feature cards, closing
  CTA, footer) so the page reads as complete. Copy is intentionally light.
- Fully responsive: on mobile the showcase stacks and the arrow rotates to point
  down; type scales with `clamp()`; targets stay large.

**Verified:** `tsc --noEmit` + `vite build` pass (well-formed + bundles). Motion
and layout still need a human eye on real devices.
