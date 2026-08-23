# CHANGELOG - CYPHIX Medical Mobile

## v0.64.0 - 2026-08-23 - the fingerprint keeps its name and loses the lecture

> *"The whole 'one beat average' thing, three unnecessary lines!! Why the
> rambling — the first line, 'your heart's fingerprint', is enough, that's it.
> If you tap on it, an explanation opens from the bottom like the other
> things."*

Both halves are right, and v0.62.0 had got one of them.

Its argument was that the figure needed a **title**, because nothing about one
clean ECG trace says it is an average of many recordings rather than your last
one. That still holds — **the title stays.** What it then did was answer the
question the title raises **in place**, permanently, for every reader on every
visit.

That is the v0.44.0 mistake in a smaller font. A **title** is navigation: read
every visit, costs one glance. An **explanation** is read once, ever — and
putting it under the title charges every future visit for a question that was
answered on the first one. At 13.5 pt on a phone it also was not "a line": it
wrapped to three.

### The heading is a control now

Tap it and a `BottomSheet` comes up — the pattern this app already uses in
three places (every Values tile, every interval row, every finding).

And because a sheet is opened **deliberately**, nobody is charged for reading
it and nobody is charged for skipping it — so the explanation is finally
allowed to be **complete** instead of compressed into one clause:

- **what it is** — one heartbeat, averaged from every recording you have made,
  not your last one;
- **why averaging is the whole point** — what repeats in every recording is
  your heart; what does not (a shaky hand, a loose electrode, the room's
  electricity) cancels itself out, so the shape gets cleaner and more truly
  yours with every study;
- **what it is for** — every new study is compared against it, and the
  *"usually"* figures below are what **your** baseline says is normal for you,
  not what is normal for people in general.

That third point was never on the screen in any form, and it is the one that
makes the whole panel underneath legible.

### One layout note

The tap target is the **width of the words**, not the column. A full-width
invisible button sitting directly above the ECG would swallow the start of a
horizontal drag on the sheet below it — and that drag is the gesture the
caliper lives on.

### Not verified

Typechecks and bundles. The tap target, the sheet's height and whether the
first screenful still fits after a two-line heading became one all need a
phone. `🔬` in PARITY.

## v0.63.0 - 2026-08-23 - the app can tell you an update is waiting, instead of making you guess

> *"I opened and closed twice and it is still stuck on 61. Why?"*

Because the app has had `expo-updates` installed, configured and delivering
since day one — and **nothing in it has ever called the library.** That leaves
its defaults in charge, and they are:

| default | meaning |
|---|---|
| `checkAutomatically: ON_LOAD` | check the server on every **cold** launch |
| `fallbackToCacheTimeout: 0` | never make the user wait for that check |

Together: the app launches instantly on the bundle it already has, downloads
the new one **in the background**, and applies it on the **next** cold launch.
So every published update costs **two** cold launches — and the second one
only helps if the first stayed open long enough for the download to finish.

The publish was fine (`eas channel:view production` named the new group, at
the same runtime that had delivered v0.61.0 an hour earlier) and the phone was
fine. What was missing is that **three completely different situations look
identical from the phone**:

1. still downloading,
2. downloaded and waiting for a relaunch,
3. never published at all.

The reported bug was **(2)**, and no screen in this app could show it. That is
the actual defect — not the two-launch cycle, which is a reasonable default,
but that the app had nothing to say about it.

### What changed

`useOtaUpdate` + one row in **Settings → About**:

- names the state — checking · downloading · **ready** · up to date · couldn't
  check · not applicable in a dev build;
- checks **on resume** as well as on cold launch. `expo-updates` only checks on
  a cold launch, which is how a phone that never gets fully killed can sit for
  days on a stale bundle;
- when the update is already on the device, the row **becomes the relaunch** —
  one tap instead of a second launch nobody knew to make.

### ★ It never reloads by itself

`reloadAsync()` tears down the JS context. On a device that may be holding an
unsaved recording — or streaming one right now — an automatic reload is data
loss with a friendly name, and it would fire at whatever moment Expo's CDN
happened to answer. So the reload is always a **tap**, on the one screen where
nothing is being recorded, and the library's passive apply-on-next-launch is
left exactly as it was.

### Still not verified

Typechecks and bundles. The interesting states (**ready**, and the resume
check) cannot be produced on this machine at all — they need a real installed
build with an update behind it, which is precisely the situation that has to
be trusted least. `🔬` in PARITY.

## v0.62.0 - 2026-08-23 - the fingerprint has a name, and the six leads this device will never record are gone

> *"In the INSIGHTS tab you can hide V1–V6 completely (because there won't be
> any) — right now it's grey, it can go entirely. But it needs some
> explanation or a title with a cool name about what I'm looking at — nobody
> will understand that this is a BASELINE or an average beat over time if it
> isn't written above it, right?"*

Right, on both counts.

### 1. V1–V6 are hidden — behind a flag, not deleted

`LeadCoverageGrid` was built to print all **twelve** leads with the six
un-measured ones drawn empty, and the reasoning was deliberate: a table
listing only what exists shows six confident leads and says nothing about the
**shape** of the record — a reader would have to already know that a limb-lead
device cannot produce V1. Printing the empty cells says *"this is a six-lead
identity, and the other six are not missing data, they are un-measured
territory."*

That is a good argument addressed to a clinician and the wrong one for the
person whose heart it is. On a patient's screen six permanently grey cells are
not territory — they are **six things that look broken**, on a device that is
never going to fill them.

`PRECORDIAL_LEADS_ENABLED` is a **flag and not a deletion** because the seam
is real: nothing in the grid knows how many leads the hardware has, it renders
the coverage rows the identity produced. When a 12-lead device ships, flip the
constant and the six cells return — empty at first, then filling in on their
own as studies arrive. The filter is on *"has no studies"* rather than *"is
precordial"*, deliberately: a limb lead that somehow produced nothing is
exactly as unhelpful to show as V1, and hard-coding the six names would put
the lead set in two places.

### 2. The curve finally has a name

**"Your heart's fingerprint"**, and one line under it: *"One beat, averaged
from all your recordings — every new study is compared against it."*

**This is not a reversal of v0.44.0.** That release stripped a confidence
ring, three figures, a three-line explainer, a legend row and every
explanatory paragraph off this screen, after *"look how much this rambles, and
it is stressful to look at"*. Those were a **tutorial** — they described things
the reader could already see, at greater length than the things themselves.
What was missing after them is the line that was never there: **the figure's
title.**

A chart with no title is not minimal, it is anonymous. And this chart is not
self-evident in the one way that matters most: **nothing about a single clean
ECG trace says it is the average of many recordings rather than the last one.**
Every number under it — the match percentage, *"usually 128"*, the whole
timeline — means something different depending on which of those two the
reader believes they are looking at. So the title passes this screen's own
rule (*"if a line does not change what the reader does next, it is not on the
screen"*) on the strongest grounds available: without it, the reader misreads
everything below it.

"Fingerprint" is the metaphor the feature already runs on — this panel **is**
the ECG ID — and it carries both facts a bare trace cannot: unique to this
person, and **built up** rather than captured.

### 3. The lead row is labelled too

*"Leads · how many recordings back each one."* Six cells reading "I 12 · II 12
· III 12" are a picker **and** a per-lead evidence count, and neither is
legible from the cells: a bare figure under a lead name could just as easily
be a measurement.

The two new lines are roughly paid for by the row of cells that left — which
matters, because everything from the trace down to the plain reading is sized
to exactly **one viewport**, and a heading that pushes the reading below the
fold would cost more than it explains.

### Not verified

Typechecks. Nobody has looked at it on a phone: the first-screen arithmetic
(two lines added, one grid row removed) is the kind of thing that passes every
check and still lands wrong on a small handset. `🔬` in PARITY until someone
opens the tab.

## v0.61.0 - 2026-08-23 - the six-lead trace opens the report, and the report looks like CYPHIX again

Four corrections to v0.60.0 — three of them the user's, one of them mine —
plus a fifth clipping bug found the same way as the previous four: by
rendering the awkward case and looking at it.

> *"I wanted you to take INSPIRATION from there, not do it 1:1. First of all
> the six-lead report is the most important thing, that is page 1. Second,
> that thick band at the top is ugly — do it without the background, where
> the rate and the heart line are. The heart axis line is too thick. Think
> about how you integrate this into MY design language."*

### 1. The six-lead sheet is page 1 again

v0.60.0 moved it to page 2 on the reasoning that every clinical document
opens with a summary. The user's answer is the stronger argument on this
product, and not only because it is theirs: **every number on the
measurements page is a claim ABOUT the signal**, produced by this app's own
delineator, and the trace is the only page in the document a second reader
can check independently. A report that opens with its derived summary asks to
be believed; one that opens with the trace asks to be read. The measurements
page follows at 3, where a reader arrives having already seen what was
measured.

### 2. The masthead loses its slab

Reported as ugly, and it was: a 44 mm plum-to-navy card carrying the rate and
the trace, 3 mm below a 26 mm navy letterhead. Two dark bands stacked at the
top of a sheet is a poster, not a clinical page — and the second one was
carrying the number the page exists for.

The rate is now set straight on the paper in the wordmark's navy, over a
hairline, with the trace beneath it **in the same navy as the six-lead
sheets** — it is the same signal, and giving it a second colour on a second
page implied it was a second thing. The chips became outlined pills on white.

The gradient-clipped headline went with the band. `background-clip: text`
existed only to make light rose type legible on plum; it is the most fragile
declaration in this stylesheet — an engine without it renders the number
**invisible**, which is why it needed an `@supports` guard at all. Deleting a
load-bearing guard is only safe because the thing it was guarding is gone.

### 3. The axis needle: 1.1 mm → 0.45 mm

Not merely heavy — measurably wrong. One viewBox unit is one millimetre in
that figure, so the needle was drawn **thicker than the sector boundary it is
meant to be read against**, with a 3 mm dot on the end, on a figure whose
entire job is to report an ANGLE. A fat needle covers several degrees of the
thing it is reporting. It is now a hairline vector with a small head, and the
hub dropped from 1.1 mm to 0.7 mm.

### 4. The chrome goes back to CYPHIX

The rule, in one sentence:

> **The measurements page keeps the redesign's SECTIONING** — a hue per family
> of measurement, the tinted tiles, the reference bands, the axis and quality
> cards. **Everything that is CHROME goes back to CYPHIX** — letterhead,
> section rules, table headers, figure panels, footers: white stock, the
> wordmark's navy, the report's blue.

Chrome is where a document says whose it is, so it is the last thing that
should borrow another product's colour — and this report already had an
identity. The sectioning survives because it is the part that was doing work:
it lets a reader find the rate versus the intervals versus the axis at a
glance, and no amount of navy does that job. The **lighter weights** v0.60.0
introduced were right and are kept (a hairline under section headings instead
of a 0.45 mm blue rule; a washed table header instead of a solid navy bar).
Only the hues came home. Violet now appears in exactly one place — the axis
card — where it *means* something.

The statistics page was also renamed from *"Measurements & Statistics"* to
*"Clinical tables & variability"*: it sat one page after a page titled
*"Measurements"*, and two adjacent letterheads differing by two words is not
a title, it is a typo the reader has to rule out.

### 5. ★ My own regression: page 4 ended two-fifths of the way down

v0.60.0 removed the empty blind-spots section — correctly, it was a heading
over 34 mm of white — and gave its 41 mm to nothing. Rendering showed the
result: a last page that stops early reads as a document that was cut off.

What fills it is the one thing this report has never said and should have:
**how the signal was processed.** Every trace on these pages is
baseline-corrected with a double median filter, notch-filtered at 50 Hz with
a zero-phase filter, and smoothed before it is drawn *or measured* — and four
of the six leads are **derived from two recorded channels** by the Einthoven
and Goldberger equations, not picked up by six electrodes. A reader measuring
an interval off page 1 is entitled to know both.

It is provenance, never a finding — it describes what the software did, never
what the heart did — so it belongs on a report that stopped interpreting in
v0.59.0. The copy deliberately does **not** restate the filter's window
lengths: those are local constants in `reportFilter.ts`, not exports, and a
printed medical document is the worst possible place for a number that can go
stale in silence. The notch frequency is interpolated from the shared
`NOTCH_HZ`.

### 6. A fifth clipping bug, same family, found the same way

A four-line device subtitle printed **outside** the letterhead — grey type on
white paper, straight across the blue keyline and into the first section
heading. `.lh-r` is 7 pt at line-height 1.55, so four lines want 17 mm in a
13 mm space, and `.lh` was the one block in this report with no
`overflow: hidden`: the one that is full-bleed and negative-margined never
got it. Leading tightened to 1.3 so the longest real subtitle now *fits*
rather than merely gets cut.

The harness's `procBody` stub is deliberately the same **length** as the copy
that ships. A stub three lines shorter renders a block that looks comfortable
here and overflows on the phone — which is the exact class of bug this
harness exists to catch, and the exact way it missed four of them.

### Still not verified

Four A4 pages were rendered and read again, in two of the nine cases. Still
not checked: a real **printer**; **WKWebView / Android WebView**, which is
what `expo-print` actually uses; and **Hebrew**, which the report has never
been checked in — it sets no `dir` at all.

## v0.60.0 - 2026-08-22 - the report opens with the page you can actually read

The design language from v0.59.0's Values screen now runs through the printed
report, from the *Clinical data export to PDF* handoff. And rendering the
document — for the first time, rather than asserting on it — found four
clipping bugs that had been shipping for months.

### 1. A measurements page, and it opens the report

A plum-to-navy band carrying the rate and the study's own lead II across it,
one hue per family of measurement, every interval drawn against its reference
band, an axis card, a steadiness ring, and all six leads' P/Q/R/S/T as bar
charts.

**The ECG sheets moved to page 2.** Every clinical document opens with a
summary; this one opened with two full pages of trace, so a patient scrolled
past twenty seconds of waveform before reaching a single number they could
read. The trace is not diminished by being on page 2 — it is still the full
recording at 25 mm/s · 10 mm/mV with the calibration pulse, and it is still the
only part of this document a ruler may be laid on. The new page carries **no
grid, no calibration and no axis**, deliberately: it is scaled to fit a band,
and those are the things that invite a ruler.

**Two things the handoff asked for were not built**, both at the user's
instruction and both for the same reason:

- the per-interval call-outs — *"within range"* in green, *"2 ms below range"*
  in amber;
- the green **"Normal axis"** pill (it is the section's violet at every
  classification).

Those are statements *about* a measurement, and this report stopped making
those in v0.59.0. The shaded band and the marker stay: a reader can see where
the marker sits without being told what it means.

**System fonts, not the handoff's three Google families.** This document is
built *on the phone*, at the moment somebody taps Export — so a `<link>` to
fonts.googleapis.com is a network request inside an export that has to work on
a plane, and it hands a third party the user's IP every time a medical report
is printed. Offline it silently falls back to a different typeface than the one
that was approved. Weight, letterspacing and case rebuild the hierarchy
instead.

**Every `oklch()` was converted to hex offline.** `oklch()` landed in Safari
15.4 and Chrome 111; `expo-print` hands this HTML to whatever WebView the phone
has. A colour function an engine cannot parse does not degrade — it drops the
declaration, so the letterhead would have printed white and the tiles
transparent, on exactly the older devices least likely to be tested on. The
oklch original is kept in a comment beside each hex so the conversion can be
re-derived rather than trusted.

### 2. ★ Four clipping bugs, all pre-existing, all found by looking

`verify-pdf.ts` has been passing for months on a report that was **printing
three of six leads** in its amplitude table. aVR — the lead that catches
swapped arm electrodes, the commonest technical fault in a limb recording — did
not print at all. Also being cut off, silently, on every report anyone has ever
exported:

| what | how much was lost |
|---|---|
| Amplitude table (statistics page) | leads III (half), aVR, aVL, aVF |
| Both measurement tables | the last row of each — QTc (Fridericia), signal quality |
| Interval reference bars | the fifth bar, QTc (Fridericia) |
| Identification grid | its second row — leads, device, beats, quality |
| Median beat panel | the sixth beat, aVF |
| Signal-quality table (reference page) | its last row, RR range |

**One cause wearing four faces.** `assertFits` validates the heights the
*builder declares* and cannot see what a browser did inside one:

- an `<svg>` is an **inline** element, so it sits on a text baseline and
  reserves descender space beneath itself — about 1.2 mm per row here. Five
  13 mm bars declared as 65 mm laid out at ~71 mm.
- a ruled table row's height is a **line box** (font-size × 1.2), not the font
  size. And the tallest type in those rows is the 8.6 pt result cell, not the
  7.8 pt rule.

Both make a block taller than its arithmetic, and `.blk { overflow: hidden }`
throws the excess away without a word. The verifier now writes its HTML out —
`PDF_OUT=./out npx tsx scripts/verify-pdf.ts` — because the only thing that
catches this class of bug is a human looking at the sheet.

The statistics page's amplitude table is **removed** rather than repaired: the
new measurements page does the same job properly (all six leads, every number,
a chart each), and two tables of one dataset with one of them truncated is
worse than one that is complete. Its millimetres went to the blocks above it
that were also clipping.

### 3. The rest of the report follows

The letterhead is the hero's gradient rather than flat navy; section headings
became the redesign's letterspaced kicker over a hairline (a 0.45 mm blue rule
under every heading was louder than the figures it introduced); ruled-table
headers went from a solid navy bar to a soft wash. **Paddings were left alone
everywhere on purpose** — see above for what a millimetre of cell padding does
to a fixed-height block.

### 4. Two v0.59.0 leftovers

- The disclaimer opened with *"This is a screening result, not a diagnosis"* on
  a report that no longer screens. A legal sentence describing a section the
  document does not have is worse than none: it tells the reader to go looking
  for a verdict.
- The reference page still printed **"WHAT THIS TEST CANNOT SEE"** over 34 mm of
  white space, because the blind-spot list comes from the screening engine. A
  section that promises blind spots and lists none is worse than no section —
  there always are: this is six limb leads and it never sees the front wall.

### What this release does prove, unusually

Four A4 pages were rendered and read, not just built. That is more than any
previous report change can claim, and it is exactly how the four bugs above
surfaced. It is still not a printer, and it is still not Hebrew — the report has
never been checked RTL, and that stays open.

## v0.59.0 - 2026-08-22 - this build measures, it does not decode - and VALUES looks like it

Three changes the user asked for, and a fourth that fell out of the first one.

### 1. Findings is off, everywhere it was

*"I don't want the FINDINGS tab right now - my app doesn't decode anything, it
only shows measurements."*

That sentence is about the **product**, not about one tab, and the tab was not
the only place the product was decoding. So it is one constant -
`INTERPRETATION_ENABLED` in `config/featureFlags.ts`, currently `false` - read
by all four surfaces that made the claim:

| where | what stopped |
|---|---|
| `StudyViewerScreen` | the third segment and its pane; `useScreening` no longer runs at all |
| `HistoryScreen` | the *Clear / Attention / Urgent* pill on every row |
| `digestFromRecording` | the background pass that computed that pill for every study |
| `pdf/document.ts` | the report's interpretation pages |

**Nothing was deleted.** `screenLimbEcg`, all 43 rules, `EcgScreeningSheet`, the
"why" sheets and `interpretationPages` are untouched and still correct. Flip the
constant and all four come back together - which is the only way "right now"
means what it says.

Two of those four are worth their own paragraph.

**The PDF mattered most, and it is why the flag is not just a UI switch.** A
document leaves the phone, gets emailed, gets filed, and is read months later by
someone who cannot ask what the app was showing that day. A report carrying a
verdict the app itself no longer offers would be the last copy of that claim
still in circulation. The report now falls into the path a **simulated**
recording has always taken - never screened, since v1.0.0 - so this is a
well-worn shape rather than a new one: no interpretation page, and the
identification grid printed on the statistics page instead. The page arithmetic
did not change, because `interpPages` was already `0` on that path.

**The History pill was not in the request.** It was found while doing the rest,
raised, and removed on the user's answer. It came from the same screening
engine, so a build that "only shows measurements" could not go on printing a
coloured verdict beside every study - it simply was not in the tab that had been
named. Skipping it in the digest is also a real saving: 43 rules over six leads,
per study, for every study in the history, on the JS thread, the first time the
list is opened.

**A patient now lands on Values.** They used to land on Findings - the answer
first. With no answer to give, the landing tab is the screen that was redesigned
for exactly that reader. A clinician still lands on the trace.

### 2. The dock's second slot: "My Tests" -> "Insights"

Same glyph, new word, new destination. It opens the **ECG ID**, which used to
live behind a `Studies | Insights` sub-tab inside History. History is one list
again.

That deletion is quietly the best part of this release. The hide-don't-unmount
machinery that kept both History panes alive - `display: none`, a lazily mounted
pane whose controls outlived their own tab, an `active` prop that existed only to
stop a hidden pane's haptics firing into the visible one - is **gone with the
sub-tab**. It cost five consecutive releases of touch bugs (v0.58.2 through
v0.58.7) and every one of them was a symptom of a pane that was hidden rather
than unmounted. A tab screen is unmounted by the navigator when you leave it, so
there is nothing left to defend against.

`TestsScreen` (the test-choice carousel) is **kept in the tree and deliberately
unrouted**. A test is started from the HOME button, which is the control that has
always started one.

### 3. The VALUES tab, redesigned

Reported as *"very old-fashioned"*, and it was: it was `EcgAnalysisSheet` - the
web report's printed measurement form, ported to the phone almost line for line
- being read on a phone by a patient rather than on paper by a cardiologist.
Five bordered boxes of grey label/value pairs, a table you had to drag sideways
to finish reading, and nothing on it saying which numbers mattered.

Rebuilt from the design handoff: the rate as a hero card with the study's own
lead II under it, sections told apart by colour on translucent cards over a
fixed glow field, and **every value tappable** for one sentence saying what the
quantity is.

`EcgAnalysisSheet` is not deleted either - it is still what the report preview
and the PDF lay their measurements out from, where a printed form is exactly the
right answer.

**★ The rule that survived the repaint.** Colour on that screen SECTIONS, it
never GRADES. The rhythm tile is amber when the rhythm is regular; the
steadiness ring is mint at 12 % and at 98 %; the reference band is one flat tint
at any value. Nothing takes its colour from whether a measurement is inside or
outside a range - that would be an interpretation, drawn as styling, in the one
direction this app may not go. It is the easiest rule here to break by accident,
so the reason is written in each of the three files that would have to change.

Two deliberate departures from the handoff, both in `PARITY.md`:

- **The cards are translucent gradients, not blur views.** Eight `BlurView`s in
  one scroller is the most expensive thing a phone can composite while a list
  moves. What the blur is *for* is that a card takes a hint of the colour behind
  it - and behind it is a smooth radial field, which a 26 px blur barely changes.
  `GlassSurface` stays where it earns itself: the header, sheets, the dock.
- **The hero number is flat crimson, not gradient-filled text.** RN has no
  `background-clip: text`. The alternatives are a masked view - a native
  dependency, which would turn this from a 1-minute OTA into a 40-minute rebuild
  - or SVG text, which gives up tabular figures and the metrics that keep "82"
  and "BPM" on one baseline. The handoff's gradient ends ~90 % crimson anyway.

The CTA is named **Export Report** (the handoff said "View Report") and makes the
same preview-or-share choice the ⋯ menu does, so it cannot dead-end on a build
that received this over the air.

### What this release does NOT prove

Per root `CLAUDE.md` §6.4: it typechecks, both platforms bundle, and
`expo-doctor` passes. That means the code is well-formed. It does not mean the
Values screen works - tap targets, the glow field staying still under a moving
scroll, the hero trace's `onLayout` width, and whether seven amplitude columns
fit 390 pt **in Hebrew** are all things only a phone can answer. The five checks
are listed in `PARITY.md` under Open verification debt, and every new row there
is `🔬` until someone has touched it.

## v0.58.7 - 2026-08-15 - the builder has no touch handler at all while you are on Studies

*"The touch stops working on this bar when you go to STUDIES and then come back
to INSIGHTS — it's like the bar stops existing."*

### The fifth round, and the first one that is not a new candidate

Four fixes have been shipped for this exact route — drag the green bar, leave
for Studies, come back, it no longer answers. Each named a real mechanism and
each was correct on its own terms:

| | cause | fix |
|---|---|---|
| v0.58.2 | a new gesture object reaching `GestureDetector` mid-drag | build it once |
| v0.58.4 | `onLayout` writing a width of zero from a hidden pane | reject zero |
| v0.58.5 | pointer samples queued into a saturated JS thread | decide in the worklet |
| v0.58.6 | (belt) the detector might be stale on return | remount it on return |

And it came back after every one of them.

### What the previous round wrote down but did not act on

v0.58.6's own note contains the answer:

> *The caliper already had this property for free — its detector unmounts
> entirely when `measurable` goes false, so it is mounted fresh on every return
> by construction.*

That observation is right, and it is the whole thing. `BeatSignature`'s caliper
crosses the **identical** hide/show boundary, in the **same pane**, gated by the
**same `active` prop**, and has **never once** been reported dead. Its gesture
memo returns `null` off show and it renders the bare sheet:

```ts
if (!gesture) return sheet;
return <GestureDetector gesture={gesture}>{sheet}</GestureDetector>;
```

So while Insights is hidden, the caliper has **no gesture handler in the tree at
all**.

v0.58.6 then implemented the weaker half of its own observation: it kept the
builder's detector mounted for the entire hidden period and *rebuilt* it on the
way back, from a `useEffect`, one tick **after** the pane was already visible.
Those are not the same property, and the difference is the bug.

### Why that difference is the bug

The builder was the **only** control in this app keeping a live
`GestureDetector` inside a `display: none` subtree — attached to a native view
that History hides, that Fabric marks hidden, and that Yoga lays out at zero.
Every fix since v0.58.2 has been an attempt to *repair that handler after the
fact*: give it a new gesture object, give it back its width, stop queueing
pointer samples into it, remount it on return. Five rounds of restoring
something that did not have to be there.

So it is not there. The detector is now mounted by `enabled`, exactly as the
caliper's is:

- **off show** — absent from the tree; nothing attached, nothing to orphan;
- **on show** — constructed fresh in the **same commit that reveals the pane**,
  over a freshly-mounted track whose `onLayout` therefore reports a real,
  visible width.

Nothing crosses the boundary because nothing exists at the boundary to cross it.
`visitId` and its keyed remount are removed — one effect-tick late, racing
RNGH's own re-attach, and leaving the handler live throughout the hidden period,
which is the very thing that had to stop.

**Why this one is different from its four predecessors.** Each of those was a
mechanism I named and could not observe from Windows, which is a bad loop with
the phone as sole adjudicator. This is the observed behaviour of a working
control in the same pane behind the same prop — the builder was simply the only
one doing it the other way.

⚠️ *"Built once" (v0.58.2) still holds:* `gesture` memoises on `settle` alone, so
no re-render of the panel can touch it, and `enabled` changes only on a tab tap —
which nobody performs with a finger on the track.

⚠️ Verified only as far as this machine allows (§6.4): `tsc --noEmit` clean, both
platforms bundle. It stays `🔬` until it has been dragged on the phone.

**Rule: a gesture handler must not be left mounted inside a pane hidden with
`display: none`. Mount it with the pane, not across it.**

## v0.58.6 - 2026-08-14 - the builder is rebuilt from scratch every time you come back to it

*"But WHY does it work on Insights, then I go to Studies and back to Insights
and it stops working again — why, why?"* … *"FIX IT!!!"*

### This one is a belt, and it is deliberately not a diagnosis

The green bar has been reported dead three times, always on the same route:
drag it, leave the tab, come back. Each round found a **real** cause and
shipped a **correct** fix:

| | cause | fix |
|---|---|---|
| v0.58.2 | a new gesture object reached `GestureDetector` mid-drag | build it once, over a stable callback |
| v0.58.4 | `onLayout` accepted a width of zero | a zero is never a measurement |
| v0.58.5 | every pointer sample queued into a saturated JS thread | decide the notch on the UI thread |

And after every one of them, it came back.

What those three share is not a mechanism — it is a **shape**. Something is
carried across the hide/show boundary in a state that nothing on a Windows
machine can observe, and I have now spent three releases naming candidates one
at a time and asking the phone to adjudicate. That is a bad loop to be in, and
the user was right to stop asking for another theory.

So the question changes from *"which piece of state is it?"* to *"why is
anything allowed to survive the trip at all?"*. Coming back on show now
**remounts the detector with a gesture object of its own**: a fresh native
handler, a fresh `onLayout` measurement, no half-finished interaction, no
inherited width — whichever of them it actually was.

⚠️ This does **not** weaken "the gesture is built once" (v0.58.2). That rule
forbids reconfiguring a handler *during* a drag. `enabled` can only change when
the reader taps a tab, and nobody taps a tab with a finger on the track: one
rebuild per visit, never one mid-interaction.

The caliper already had this property for free — its detector unmounts entirely
when `measurable` goes false (v0.58.5), so it is mounted fresh on every return
by construction. This makes the builder behave the same way **on purpose rather
than by accident**.

⚠️ Unverified from this machine, per §6.4: it typechecks and bundles. Whether
the round trip is finally clean is a question only the phone can answer.

---

## v0.58.5 - 2026-08-14 - the builder decides on the UI thread, so the buzz cannot outlive the tab

*"On the Insights tab, playing with the green bar is perfect. Then I go back to
the Studies tab and I STILL FEEL the vibration from the Insights tab! And then
when I go back to Insights it doesn't work again!"*

### The theory I did not ship

The obvious reading is that the hidden Insights pane is still catching touches
— it is kept mounted and hidden with `display: none`, and that decision has
already caused one regression (v0.58.4's zero width). So it was the first place
I looked, and this time I read the platform source before acting on it:

```objc
// react-native/React/Fabric/Mounting/UIView+ComponentViewProtocol.mm
self.hidden = layoutMetrics.displayType == DisplayType::None;
```

A hidden `UIView` is never returned by `hitTest:`, so a `display: none` pane
cannot receive a touch at all. **Nothing was being stolen.** Shipping the
"obvious" fix would have changed the pane strategy, introduced whatever that
costs, and left the real defect in place — which is precisely what v0.58.3 did.

### What it actually was: a queue, and the buzz was the tail of a drag already finished

Two causes, compounding.

**`useEcgIdentity` returned a bare object literal.** So `view` was a new
reference on every render — and `EcgIdentityPanel` lists `view` in five
`useMemo` dependency arrays, one of which is `buildBaselineSequence` over every
template in the history. The panel was re-fusing the entire baseline on *every
render*, including every render the drag itself caused. It is memoised now: the
fusion runs when its inputs change, which is the only time its answer can
differ.

**`BeatBuilder` sent every pointer sample across the thread boundary.** 60–120
`runOnJS` calls a second, each of which discovered *in JS* that the finger was
still on the same notch, and returned. This file's header has always said the
tick fires once per study crossed — that was true of the haptic and false of
the plumbing. With JS saturated by the fusion above, `runOnJS` **queues**: the
buzz ran behind the finger, went on firing after the tab had changed, and the
next drag started behind a thread still retiring the previous one. All three
symptoms, one mechanism.

The crossing test now runs **in the gesture worklet**, against shared values.
JS is entered once per notch — about eleven times in a full sweep instead of
several hundred.

### And a mute, because a queue can never be proved empty

The panel takes `active`, the builder takes `enabled`, and a crossing retired
after the reader has left the tab is **dropped rather than buzzed**. The
caliper is gated the same way (`measurable={active}`) — it fires the strongest
haptic in the app. Coming back on show resyncs the worklet's guard from the
prop, or a crossing dropped while muted would swallow the first drag back to
that notch.

⚠️ Splitting that guard across two threads created a hazard that did not exist
while it was a single ref: copying `value` back into the worklet mid-drag
*rewinds* it, because JS is a notch behind by construction — and the next
sample would then re-report a notch already reported, as a double thump. The
sync ignores an echo of the control's own commit and copies only a value it did
not ask for.

### Still true from v0.58.4

Keeping both panes mounted is still the right call — it is what stopped the
flicker — but the ledger of what that costs is now two entries long, and
neither was obvious: Yoga lays a hidden pane out at **zero** (so any `onLayout`
inside one must reject zero), and every control in a hidden pane **still
exists** and can still be reached by work that was already in flight.

---

## v0.58.4 - 2026-08-14 - a refresh circle we draw ourselves, and the builder gets its width back

*"There is NO loading. No, there isn't, look. And the bug with the green bar
in the average beat not sliding is back — you didn't really fix it."*

Both correct, and in each case the previous attempt was aimed at the wrong
layer.

### The refresh spinner: I shipped a prop I had only half-read

v0.58.3 added `progressViewOffset`. I checked that the prop reaches the iOS
native view and stopped there. What I did not read is *what the native code
does with it*:

```objc
// Setting the UIRefreshControl's frame breaks integration with ContentInset
// from the superview if it is a UIScrollView.
if (_progressViewOffset == 0.f) return;
...
CGPoint converted = [self convertPoint:rawOffset fromView:target];
self.frame = CGRectOffset(self.frame, 0, converted.y);
```

It rewrites the control's frame from `layoutSubviews`, through a coordinate
conversion that *converges* rather than computes — and the same file warns
that doing this breaks the control's own inset integration. It changed nothing
on the phone, which is exactly what was reported.

So the `RefreshControl` now keeps only the job it is good at — the pull
gesture and the `refreshing` state — and its indicator is left where it has
always been: behind the glass, invisible, harmless. **What the reader sees is
a badge this screen draws itself**, at a position this screen owns. One
indicator, both platforms, no native quirk anywhere in the path.

### The builder's drag: my own flicker fix armed the second cause

The gesture fix in v0.58.2 was real, but there was a **second** cause and it
was not a gesture problem at all: `onLayout` accepted a width of **zero**.

`move` cannot compute a ratio without a track width, so it returns and the
control is simply dead. And something does write zero — **v0.58.1**, where
History began keeping both tabs mounted and hiding the inactive one with
`display: none`. Yoga lays a hidden subtree out at zero, so every trip to
Studies blanked this width, and coming back left the drag dead until some
later layout pass happened to write a real number. That is precisely the
"it came back" the report describes.

A zero is never a measurement. The track's width does not change while the
panel lives, so the last real one is always the right one to keep.

Worth stating plainly: the fix for one report (v0.58.1's flicker) created the
regression in another. That is the cost of keeping a subtree alive instead of
rebuilding it, and it is the second thing on this screen that `display: none`
has changed the meaning of.

Verified: `tsc --noEmit`, `expo export` both platforms. 🔬 — pull down in
Studies for the circle; drag the green bar after switching Insights →
Studies → Insights, which is the exact path that used to kill it.

## v0.58.3 - 2026-08-14 - the refresh spinner comes out from behind the glass

*"In Studies, when you pull down and it loads and refreshes, there is no
refresh circle — it visually looks like it gets stuck at a height and then
releases after a few seconds, when it's clearly refreshing."*

The diagnosis was in the report: *"it's clearly refreshing."* The sync was
running and the pull was holding. The only part that was missing was the one
that says so.

A refresh indicator is positioned at the top of the **scroll view** — and
since v0.58.0 the top of the scroll view is behind a frosted header about
180 pt tall. The spinner had been spinning there the whole time, perfectly,
invisibly. A regression the glass header introduced, and one nothing on this
machine could have caught: a hidden spinner typechecks and bundles exactly
like a visible one.

`progressViewOffset={headerH}` moves it into the space the pull opens up.

⚠️ **Verified in the RN 0.81.5 source rather than assumed**, because this prop
has a reputation for being Android-only:

- the iOS spec declares it — `PullToRefreshViewNativeComponent`,
  `progressViewOffset?: WithDefault<Float, 0>`;
- `RefreshControl.js` strips only `enabled` / `colors` /
  `progressBackgroundColor` / `size` on iOS and spreads everything else to the
  native view, so it is forwarded;
- `RCTRefreshControl.m` implements `setProgressViewOffset:` by offsetting the
  control's frame, converting from the scroll view parent's coordinate space.

It works on both platforms.

Verified: `tsc --noEmit`, `expo export` both platforms. 🔬 — pull down in
Studies and the circle should now appear just under the frosted bar.

## v0.58.2 - 2026-08-14 - the beat builder stops losing your finger mid-drag

*"In Insights, the slide feature — where I drag to see the average beat built
up over time — sometimes just doesn't work. It's like it loses touch."*

### The gesture object was being rebuilt in the middle of the drag

This is v0.57.1's re-render storm wearing different clothes, and it is worth
spelling out because the mechanism is not obvious:

1. `EcgIdentityPanel` passed `onChange` as an inline arrow → a new function
   on every render.
2. `BeatBuilder`'s `move` is a `useCallback` on `onChange` → new too.
3. The gesture was a `useMemo` on `move` → **new gesture object**.
4. Crossing a notch calls `onChange`, which re-renders the panel.

So every notch the finger crossed handed `GestureDetector` a brand-new
gesture, which **reconfigures the native handler in the middle of the
interaction it is tracking** — and a reconfigured handler can drop it.

The control was never "sometimes" broken. It failed whenever the timing of a
reconfiguration landed inside a drag, which is precisely the intermittency
that got reported.

`BeatBuilder` now builds its gesture **once** and closes over a single stable
callback that reads the live `move` out of a ref, so a careless caller can no
longer reach the detector at all. The caller was fixed too (`onBuiltChange`,
keyed on the sequence *length* rather than the array): defending in one place
is a fix, defending in both is a rule.

### Two smaller faults found in the same read

- **`failOffsetY` was ±12 pt.** That is the tolerance for how far the finger
  may drift vertically *before* the pan claims the touch — and a thumb
  starting a horizontal drag on a 28 pt track is never purely horizontal. Too
  tight, and an ordinary diagonal start fails the pan and scrolls the page
  instead, which is the other half of "sometimes it doesn't work". Now ±16,
  still small enough that a deliberate vertical scroll hands the page back.
- **The redraw guard never followed the prop.** `last` is what stops a redraw
  per frame, but it only ever tracked the finger. When the value changed from
  outside — the reset link, a lead switch, a rebuilt identity — it went stale,
  and the first drag back to that same notch did nothing at all.

`shouldCancelWhenOutside(false)` is now stated rather than inherited: the
track is 28 pt tall, a dragging finger leaves it, and that default is not
something the next edit should have to know by heart.

Verified: `tsc --noEmit`, `expo export` both platforms. 🔬 — an intermittent
gesture is the definition of something no check here can confirm; the test is
a dozen drags, including ones that start diagonally and ones that start right
after tapping the reset link.

## v0.58.1 - 2026-08-14 - the newest study gets room to breathe, and the tabs stop rebuilding the screen

*"1) The newest recording sits right up against the top bar — it looks
unprofessional and ugly. 2) There is still some flicker when you first enter
History, then it runs smooth; and going to Insights and back to Studies
flickers a little again until it all comes up."*

### Air under the glass

`paddingTop: headerH` put the first card exactly on the bar's edge — so the
one row a reader looks at first was the one row with no room around it.
`CONTENT_TOP_GAP` (14 pt) fixes it, and it is a **resting** gap only: the card
still slides under the glass the moment the list moves, which is the whole
point of a frosted header.

### The tabs were rebuilding the screen

`showTabs && tab === 'insights' ? <Insights/> : <list/>` **unmounts** a pane
every time the reader switches. A remount replays everything that makes a
first paint expensive: every row's entrance animation, every visible trace's
sweep, the cell window, the scroll position. The "flicker until it all comes
up" was not a rendering artefact — it was the screen being built again, on
purpose, every time.

Both panes stay mounted now and hide each other with `display: none`, which
Yoga drops from layout entirely: the inactive tab is not measured and not
drawn, but keeps its state, its scroll position and its animations.

Insights is still **mounted lazily** on its first visit. It runs the identity
backfill over the whole history, and paying for that on a tab nobody has
opened would be the opposite trade.

### The first-entry jolt was my own constant

The bar's height has to be measured — it grows a count line, an "analysing n
of m" clause, a tab row and an error banner — but the first frame paints
before any measurement exists, and the placeholder I left there
(`HEADER_H_GUESS = 148`) was wrong by roughly 35 pt on a notched phone. The
list therefore painted high and then visibly dropped into place.

The estimate is now built from the same blocks the bar is
(`estimateHeaderH`: safe-area inset + title + count + tabs + padding), so it
lands within a point or two of the truth and the correction is invisible.

### Also

`activeTab` derives from `tab` **and** `showTabs`. The switch disappears while
the list is loading, erroring or empty, and a stale `insights` selection would
otherwise hide both panes and leave a blank screen.

Verified: `tsc --noEmit`, `expo export` both platforms. 🔬 — the two things
this entry is about are a gap you have to look at and a flicker you have to
catch, neither of which any check on this machine can see.

## v0.58.0 - 2026-08-14 - history gets a frosted header, and the studies pass underneath it

*"Can the top bar — where the Scan History title and the Studies / Insights
buttons are — get the glass effect like the tab bar at the bottom, so you see
the waves behind it as if you're looking through glass?"*

Yes. And it is the same material and the same rules the study viewer's header
and the dock already use: `GlassSurface`, so a phone with Liquid Glass gets
Liquid Glass and everything else gets a real blur (never the flat translucent
rectangle Android renders without `dimezisBlurView`).

### A floating header moves where the space lives

A bar that floats is not part of the layout, so the space it occupies has to
come from somewhere else: every scroller now carries the header's height on
its **content inset**. That is the same inversion `scrollsUnderDock` made at
the bottom of the screen in v2.3.0, so it arrives as its third axis —
`PatientShell.bleedTop`.

Without it the shell's own safe-area padding would push the list down and the
glass would have nothing but empty page behind it, which is exactly the
failure the dock's row already warns about: *"a scrolling screen that stops at
a hard edge defeats the whole point of a frosted bar, which is to have
something passing underneath it to refract."*

### The height is measured, because it is not one height

The bar grows a count line, an "analysing n of m" clause during the digest
backfill, a tab row that only exists once there are studies, and an
import-error banner. Any constant would be wrong in at least one of those
states, so it is an `onLayout` on the inner view **plus the glass's own
padding added back** — the study viewer already paid for that addition; without
it the first card hides behind the tabs.

### Anything "between the header and the list" has to go inside the glass

The import error used to be a sibling of the list. As a sibling it gets pushed
down by the header clearance, and then the list pads for the header *again*
below it — a header-sized hole in the page. It now lives inside the bar, which
is where it belonged anyway (it is about the Import button two rows up), and
is part of what `onLayout` measures.

### Small things

- The hairline under the bar is **earned**: it appears once ~6 pt has scrolled
  under it, because an edge drawn over an unscrolled page divides nothing from
  nothing. Insights reports its scroll offset too, so the rule holds on both
  tabs rather than only the one that happened to be a `FlatList`.
- Tint sits between the dock's (0.38 / 0.55) and the study viewer header's
  (0.74): denser than the dock because a 30 pt title has to stay readable with
  cards travelling under it, lighter than the viewer's because this was asked
  for as *the dock's* glass. Liquid Glass takes the lower pair — the same
  split the dock makes, for the same reason it makes it.

Verified: `tsc --noEmit`, `expo export` both platforms, `expo-doctor`. 🔬 —
and this one genuinely needs a device: `GLASS_MATERIAL` in Settings › About
says which material actually resolved, and that is the first thing to read if
the bar looks flat rather than frosted.

## v0.57.1 - 2026-08-14 - the sweep stops costing a frame: static paper, a sliding curtain

*"The animation works, but something in your design is broken — it slows the
whole History tab down drastically, you can't scroll there at all, it lags."*

Correct, and worth writing down properly because it was not a missing
optimisation. It was **the wrong mechanism**, chosen twice over.

### 1. A dashed stroke is a geometry rebuild, not an effect

v0.57.0 revealed the trace with `strokeDasharray` plus an animated
`strokeDashoffset`. That *looks* like the cheap, standard way to animate a
line drawing itself, and for one short path it is. It is not what it costs
here: to render a dashed stroke the engine must walk the path, measure its
length, and construct the dash geometry — and it must **redo that every time
the offset changes**. That is every frame, for a ~700-point polyline, on
every visible row at once.

Running it on the UI thread did not rescue it. That only decided *where* the
dropped frames landed; the work was still per-frame, still O(points), and
still multiplied by the number of rows.

**Now the SVG is drawn once and never touched again.** Above it sits a plain
`Animated.View` in the card's own colour — a curtain — sliding off to the
right on a `translateX`. A native view transform is the cheapest thing this
runtime can animate: no measurement, no geometry, no rasterisation, no SVG
involvement at all. The pen dot is a second small view riding the curtain's
edge.

One deliberate consequence: the curtain covers the second-tick hairlines as
well as the trace, so the whole strip writes on together like paper leaving a
printer. Clipping only the trace would put per-frame work back inside the
SVG, which is the thing being fixed.

Trace resolution also dropped from 1.0 to **0.6 points per pixel** — ~700
points became ~420. That is detail a 44 pt strip cannot show, and it was
being paid for on every row that scrolled into existence.

### 2. A re-render storm, from a trap this repo already documents

Every viewability event called `setState`, which re-rendered **every mounted
row** — and `StudyCard` was not memoised, and was being handed a freshly
built `{ samples, sampleRate }` object and a freshly minted `onPress` closure
on every render. So each of those re-renders was a real one, for every card.

`PARITY.md` has recorded this exact inline-object/memo trap since the
`StudyViewerScreen` flicker. I walked into it a second time.

`StudyCard` is now `memo`ised and every prop is a primitive or a stable
reference: `id` plus one shared `onOpen` instead of a per-row closure, the
digest's own `Float32Array` instead of a wrapper object, memoised labels. A
viewability tick now re-renders exactly the one row whose `animate` flipped.

### 3. The safety timer was the bug (found by reasoning, not reported)

v0.57.0 revealed a trace on a 1.2 s timer if the row had not been reported
visible — a net for a case that probably never happens. It was actively
harmful: **FlatList mounts rows a screen or more before they are seen**, so
the timer drew them off-screen, and then *reaching* them set `animate`,
blanked the strip and re-drew it. A flash, caused by the safety net.

There is no timer now. Only visibility starts a sweep, a `swept` latch means
nothing can restart one, and the viewability threshold dropped to **30 %** so
a row peeking in at the bottom of the screen still qualifies — with the timer
gone, that threshold is the only thing that ever puts a waveform on the page.

Verified: `tsc --noEmit`, `expo export` both platforms. 🔬 — the whole point
of this entry is that the previous version also typechecked and bundled
cleanly (§6.4). The measurement that matters is a thumb on a list.

## v0.57.0 - 2026-08-14 - the trace writes itself, in the brand navy, with no capsule around the verdict

*"Something is off with the colours in History. First, I don't want the finding
sitting inside a coloured capsule — it looks cheap. Second, the ECG traces are
lovely, but (1) make the blue the dark medical navy of my logo, and (2) add an
animation as if the wave is being created live — and the ones you can't see,
say further down, should only run when you scroll to them. That would be
brilliant!"*

### The verdict leaves its capsule

"Cheap" is the right diagnosis. A filled coloured lozenge is an **app badge**,
and a clinical conclusion is not a badge — this project already argued exactly
that at page scale in v0.50.0, where the PDF's verdict became a ruled
statement block instead of a card, because "a rounded box with a coloured fill
is an app component photographed onto paper". The row was still doing the
thing the report had stopped doing.

It is now a dot in the level's colour and the words in the level's ink, with
nothing behind them — and a size up (14 pt, was 12) now that no capsule is
squeezing it.

⚠️ **The dot is not what StudyCard v1 rejected.** That objection was to *"two
8 px dots distinguished only by hue"* — colour carrying the meaning alone,
with the words hidden behind a hover a phone does not have. Here the words sit
beside the dot and say the same thing; the dot only makes a column of rows
scannable.

**SIMULATION deliberately keeps its chip.** It is not a finding — it is a
warning that the trace did not come from a heart (mobile CLAUDE.md §4), and a
safety label is allowed to shout where a conclusion is not. The inconsistency
is the message.

### The trace is the brand's navy

`#0D2041` — the wordmark's own lettering — replacing `accentLive` (`#2F6BD8`).
That token means "a live UI element" and is a generic product blue; a stored
clinical trace is neither live nor generic. `brandNavy` already carries its
dark-theme translation (`#9FB4D8`), so nothing extra had to be decided to keep
the trace legible on the dark surface.

### ★ The trace sweeps on, when you reach it

`strokeDasharray` plus an animated `strokeDashoffset`, driven on the **UI
thread** by Reanimated, so a screenful of them costs the JS thread nothing —
which matters on the one screen that is also running the digest backfill.

Three decisions worth recording:

- **Constant speed** (`Easing.linear`). A monitor's stylus does not
  accelerate; an eased sweep reads as a UI wipe rather than an instrument.
- **~1.1 s, not the recording's own 4 s.** A list where each row takes four
  seconds to become readable is a list you have to wait for.
- **A pen dot rides the writing edge** and fades through the last tenth, so
  the stylus lifts off the page instead of vanishing mid-stroke. Its vertical
  position is precomputed on the JS thread and read by the worklet — deriving
  it per frame would put the signal back on the thread this whole design keeps
  it off.

It fires from **FlatList viewability**, not on mount: rows below the fold draw
as they are scrolled to. A mounted row draws once and then holds still —
re-drawing under every passing thumb would turn an instrument into a fidget
toy. (A row FlatList recycles far off-screen and later remounts draws again;
that reads as "it just arrived" and is left alone.)

Two implementation notes for whoever touches this next: the seen-ids live in a
**ref with a counter**, not a state `Set` — this is written from a scroll
callback, and rebuilding a Set into state on every viewability event would
re-render the list mid-flick. And `onViewableItemsChanged` and its config are
**ref-stable**, because React Native throws *"Changing onViewableItemsChanged
on the fly is not supported"* if that prop's identity changes between renders.

Verified: `tsc --noEmit`, `expo export` both platforms. 🔬 on device — an
animation is exactly the class of thing that typechecks perfectly and stutters
in the hand (§6.4): the sweep during a fast flick, with the digest backfill
running, in both themes.

## v0.56.0 - 2026-08-14 - the report knows whose it is, wears the brand, and shows itself first

*"The PDF does not look like a professional medical report (except the page
with the waves) - not colourful enough, there are things a doctor does not
need, it gives no added value. I also want to see the report inside the app
before exporting - like a preview."*

⚠️ **NATIVE REBUILD REQUIRED.** This change adds `react-native-webview`
(13.15.0, the SDK 54 pin), so `app.json` goes 0.34.0 → **0.35.0**. To ship:
`eas build --platform ios --profile production` then `eas submit --platform
ios --latest`. Per §5A.2, do **not** `eas update` until the 0.35.0 binary is
installed — updates now target the new runtime. v0.53–v0.55 were published
OTA to runtime 0.34.0 *before* this bump, so the phone already has them.

### The bug that mattered more than colour: the report named nobody

`buildRecordingHtml` has accepted `patientName` and a `ScreeningContext`
since v0.48 — and no caller ever passed them. Three consequences: the
letterhead carried no patient line, the identification grid printed
"Patient —", and the PDF's screening ran without sex/age, so **the paper
could disagree with the Findings tab it was exported from** (sex moves the
long-QT threshold by 10 ms). `useReportContext` now attaches both, under the
same "provably theirs" subject-match guard the screen uses
(`patientContext.ts`, one copy since v0.53.0). A clinician exporting someone
else's study gets an anonymous, conservatively-thresholded report — never a
mislabelled one.

### The colour pass — a lab report in the issuer's colour

The user chose the bolder direction, knowing v0.49 removed green-as-identity
and v0.50 removed the app idioms. Both rulings stand; what changed is that
"documentary" no longer means "grayscale":

- a **full-bleed navy letterhead band** with the white wordmark on every
  page — negative margins with matching padding, so the band's flow height
  is exactly the 16 mm `HEADER_H` always reserved and the `assertFits`
  arithmetic is untouched;
- **blue section rules** and a blue footer keyline with brand page numbers;
- **BRAND header rows and a soft blue zebra** on every ruled table;
- **blue panels** under every figure (hexaxial, Poincaré, tachogram, median
  beats) — the figures are the added value, and a panel says so;
- the **verdict statement sits on its level's tint** (brand wash for clear,
  red wash for urgent);
- the identification grid is a tinted band with the brand's heavy left edge.

Still no pills, no rounded cards, and green survives only as the reference
band — the document idiom v0.50 established is intact, in colour.

### Content: cut what serves nobody, print what was missing

- The layperson **"how to read the ECG sheet" tutorial is gone** — it was
  addressed to the wrong reader on a clinical document, and its fourth
  sentence ("a longer recording continues on the next sheet") has been FALSE
  since v0.49 removed pagination.
- The **signal-quality table finally prints**: SQI, analysed window, beats
  analysed, RR range, ectopy burden — labels that were declared in v0.48 and
  never rendered. It is the first thing a clinician uses to decide how much
  to trust every number before it.
- A **simulated recording now carries the identification grid** on its
  statistics page. It used to have none at all — the grid lived only on the
  interpretation page, which simulated studies rightly do not get.
- Dead labels removed from the copy contract (`sheetOf`, evidence/confidence
  /poincare/tachogram titles, `mPBefore`, the how-to list).

### The export has a face, and the report shows itself first

- **ExportOverlay**: the whole DSP chain, 43 rules and the print engine run
  on the JS thread — seconds on a long recording — and it used to be
  fire-and-forget: the sheet closed and nothing happened until the share
  sheet appeared. Now a blocking scrim says "Preparing the report…".
- **ReportPreviewScreen**: renders the *exact* HTML `printToFileAsync`
  receives, in a WebView with an A4-width viewport and pinch zoom. One
  source of truth, previewed and printed — a third hand-maintained copy of
  four pages of layout was rejected on the grounds that every figure already
  exists twice. The ⋯ menu now leads with "View report"; **Share PDF** is the
  preview's one action.
- **`OptionalWebView`**: the WebView resolves behind a require guard (the
  `cyphix-ble` pattern). On a binary without the module — a 0.34.0 install
  receiving future OTAs — the same menu item falls back to the direct share.
  A preview is a luxury; the export never breaks for its sake.

### Shipping this one: the `ascAppId` trap

The rebuild itself was uneventful (build **8**, runtime **0.35.0**, from
commit `284acab` — credentials already on EAS, no interactive step). The
*submission* was not: `eas submit --non-interactive` failed immediately with

```
Set ascAppId in the submit profile (eas.json) or re-run this command in interactive mode.
```

Every previous submission was made interactively, where EAS asks App Store
Connect which app this is and resolves the id itself — so the id had never
been written down anywhere. `eas.json`'s `submit.production` was an empty
object.

The id is **6798398407**, recovered from `eas submit:list --platform ios`
(it prints `ASC App ID` for every past submission — worth knowing, because
that is the only place it was recorded). It now lives in `eas.json` under
`submit.production.ios.ascAppId`, so a script — or an agent — can submit
without a human at the terminal. The rationale sits in `IPHONE_SETUP.md`
§E.3 rather than beside the setting, because `eas.json` is schema-validated
and rejects comments (CLAUDE.md §5A.5).

⚠️ **`APP_VERSION` is deliberately NOT bumped for that fix.** The badge's
whole job is to say which bundle is on the phone; the binary was already
built from 0.56.0, and printing 0.56.1 for a change that alters no shipped
code would make the badge lie until the next OTA.

### Verified

`tsc --noEmit` · `expo export` both platforms · `expo-doctor` · **and
`npx tsx scripts/verify-pdf.ts`** — the v0.48 "nine cases" harness, now a
committed script: build never throws (assertFits holds), footer page counts
match rendered pages, letterhead on every page, ID grid everywhere including
simulated, quality table present, patient name present exactly when passed,
no unsized SVGs / NaN / unresolved placeholders. All nine pass. That proves
the arithmetic; the printed sheet and the preview stay 🔬 until touched on a
device.

## v0.55.0 - 2026-08-14 - a control may not sit on its own label, and the privacy line stops lying

*"The Settings tab is a real mess - the texts climb on top of the tiles. Not
professional, not user friendly."*

### One root cause, not many small ones

`SettingsRow` caps its inline control slot at 52 % of the row - added in
v1.2.0 to stop a long chip from bullying the label column, and right for
anything that can shrink. But Yoga's default `flexShrink` is **0** and RN
views default `overflow: visible`, so a control **wider than the slot** - the
three-segment Theme control is ~200 pt of intrinsic width against a ~161 pt
slot on a 390 pt phone - kept its natural width, was pinned to the row's end
by `alignItems: 'flex-end'`, and painted **leftward over its own label**.
Under Hebrew the same bug drew a different picture: the cross-axis alignment
never flipped with `rtl`, so the overflow spilled toward the card's outer
edge instead.

Clamping harder just moves the collision. The honest fix is the pattern the
language and background pickers used all along: **a control wider than half
the row gets the whole row, under its label.**

- `SettingsRow` gains `layout="stack"`. Opted in: Theme, Care connection, the
  role-chip group (four 44 pt chips crammed into a 161 pt column), and
  About's three long values - build label, session diagnostic, compliance -
  which used to wrap 4-6 lines beside two-word labels and read as a wall.
- The inline control slot's cross-axis now flips with `rtl`.
- `SegmentedControl` may shrink as a last resort (`flexShrink` on track and
  options, font fit floor 0.8): degradation is now compression, never
  overpainting.
- `SettingsChip` is a **View around a Text**, not a rounded Text:
  `borderRadius: 999` + `overflow: 'hidden'` on a bare wrapping text node
  clips the first and last glyphs of every line - which is exactly what
  "Secure On-Device Processing" was doing.
- `SettingsSection`'s 48 pt art centres against its heading instead of
  hanging below a one-line title; the background swatch row wraps instead of
  overflowing a longer language silently; the full-width pickers take the row
  rhythm so the next divider underlines the group.

### The privacy sentence was false

Privacy & Security still said: *"Your ECG never leaves this device. There is
no server today."* That stopped being true when the backend and the sync
engine shipped - recordings sync to the CYPHIX server, encrypted, by design.
The row now says exactly that. A stale privacy promise is not a nicety; it is
a false statement on the one screen that must never make one.

### Also

- Settings sections land with the house `FadeUpView` stagger, completing the
  set (History v0.53.0, Profile v0.54.0).
- PARITY housekeeping: the preview-as-role row in the Settings table was
  stale (shipped v0.28.0), the notifications row predated Reminders, and the
  app-lock switch had shipped with no ledger row at all.

Verified: `tsc --noEmit`, `expo export` both platforms, `expo-doctor`. 🔬 on
device: the Theme row in English AND Hebrew on a 390 pt phone, About in both
themes, the role chips, the swatch wrap.

## v0.54.0 - 2026-08-14 - the numbers on the card are finally yours to correct

*"The Profile tab is ancient - personal details cannot be edited."*

Correct, and the finding worth writing down is WHY it was true: the server
route (`PATCH /patients/:id/card`), the shared contract (`PatientCardPatch`)
and the mobile mutation (`useUpdatePatientCardMutation`) have all existed since
v0.39.0. Nothing needed building on the server or in shared. The editing UI was
simply never made, and no PARITY row recorded the gap - which is itself the
lesson: work that ships without its ledger row can stay half-finished
invisibly.

### PersonalDetails - a pushed editor for the editable half of the card

Reached from the **Details** and **Emergency contact** section headers on
Profile (the same Edit affordance the list sections already had). A pushed
screen, not a sheet - the Reminders precedent: two sliders, a blood-group grid
and a three-field form are a panel of settings, and a panel pushes. Built from
`SettingsSection`/`SettingsRow` for continuity, and the **onboarding step
bodies are reused** - `MeasureSlider` + `UnitToggle` for height and weight, the
eight-cell blood grid with its first-class "I don't know", the contact fields
with relation chips - through the existing `authPalette(dark)`, so the patient
meets the same controls here that they met at sign-up.

What it deliberately does NOT edit: name, date of birth, sex, phone. Those are
identity - part of the medical record, contractually excluded from the patch
(`healthCatalogue.ts` says why) - and the screen SHOWS them with one sentence
saying the clinic corrects them, rather than hiding them and leaving the
patient to wonder where they went.

Honesty rules of the save:

- **The patch is a diff.** Only touched fields are sent; echoing the card back
  would revert anything edited elsewhere since the screen loaded. Sliders
  track *touched* separately from *different*, so the 170 cm fallback under an
  empty card can never be written into the record by opening the screen and
  pressing Save.
- **A half-typed emergency contact blocks saving.** The server requires
  name + phone + relation; silently saving the height while dropping the
  half-typed contact is the "appeared to work" failure a medical record must
  never produce. The screen says what is missing instead.
- **Failure keeps the draft.** The screen stays open with an inline error -
  same rule as the list editor.

### Bug fix: the medication editor ate doses

`ProfileScreen` seeded the list editor with `{display, code}` - no dose - and
sent back `{name, code, system}` - still no dose - while the server **replaces
the whole array**. Net effect: opening the Medications editor and pressing Save
wiped "10 mg, mornings" off every medicine on the card. The dose is now
rejoined by name on the way out. Dose *editing* remains out of scope; this fix
is preservation.

### Empty is not invisible

Emergency contact and Care team sections were conditionally rendered - a
patient with no emergency contact saw no section and therefore had no way to
add one, which contradicted the Section component's own header comment
("including the ones that are currently empty, which are precisely the ones a
patient most needs to be able to fill in"). Both always render now with honest
empty sentences; Emergency gets the Edit affordance, Care team stays read-only
because the clinic assigns itself.

### Also

- Profile header and sections land with the house `FadeUpView` stagger,
  matching History's new first-visit behaviour.

Verified: `tsc --noEmit`, `expo export` both platforms, `expo-doctor`. 🔬 on
device: slider feel, Hebrew RTL entry in the contact fields, demo mode showing
no Edit anywhere, airplane-mode save failure keeping the draft.

## v0.53.0 - 2026-08-14 - history answers before you ask: a verdict and a real wave on every row

*"The first thing a patient sees is a list of dates… in Kardia you see a
screenshot of the recording itself, which is more intuitive. Only when I open a
study and press Findings do I see whether the signal is fine or not. Maybe the
insights first? The whole History tab feels unintuitive and dated."*

The complaint is correct, and the fix is not cosmetic - the list was
structurally unable to answer the patient's question. `listRecordings` returns
metadata only, by design, and PARITY.md carried a row explaining why a verdict
dot was deliberately NOT built: re-running 43 rules per row means decoding
every waveform to draw a list, and the 6-rule shortcut from the cached summary
was rejected because it could disagree with the detail screen.

### The verdict, computed once and cached - `studyDigestCache`

The answer to "too expensive per visit" was never "don't"; it was "once". A
recording is immutable, so its verdict and its preview are immutable too. A new
device-side cache (`services/db/studyDigestCache.ts`, modelled line-for-line on
`templateCache`: one heavy entry, a version gate, PINNED filters, staged writes
flushed in batches, pruned on delete) stores per study: the **full 43-rule
screening level**, ~4 s of filtered lead II (min/max-pair downsampled, the
`buildEcgPath` argument), the measured bpm, and the screening context it was
computed under. `useStudyDigests` backfills it the way `useEcgIdentity`
backfills templates - after interactions, one study at a time, a real macrotask
yield between studies, `subscribe: false` so waveforms are released, visible
"analysing n of m" progress in the header.

The honesty rules bind on a pill exactly as they bind on a screen:

- A **simulated** study is never screened - its digest carries `null` and the
  row shows the SIMULATION chip where the verdict would go.
- Patient sex/age reach the engine **only when the study provably belongs to
  the active patient**. That rule used to live inside `useScreening`; it now
  has three consumers, so it moved to its own file (`patientContext.ts`) and
  everyone imports it - three hand copies of a safety rule is how one drifts.
  Each digest records its `ctxKey`, so a card that loads after the list (or a
  corrected birth date) invalidates the affected rows exactly once.

### The preview - answering StudyCard's own argument

StudyCard v1's header argued a waveform thumbnail would be "an unreadable
squiggle that nonetheless looks like clinical information". Half held: 10 s in
40 pt IS unreadable, and the row's clinical statement is the PILL, not the
picture. Half did not: a **four-second window at a fixed time scale** is the
preview Kardia ships on every row, and it lets a reader recognise "the noisy
one" / "the fast one" before any number. `EcgMiniPreview` deliberately does not
look like ECG paper - no grid, no calibration pulse, second-ticks only - so
recognition and measurement stay different things; `EcgStripSvg` remains the
only component allowed to look like paper. Both slots render fixed-size
placeholders until the digest lands: a card must not change height as
knowledge arrives.

A side effect worth naming: imported CSVs store `bpm: null` in their summary
(the importer never analysed them), so their rows showed "-" forever. The
digest measured the rate anyway; the row now borrows it.

### Findings first

The study viewer's segmented control now reads **Findings | ECG | Values**, and
a patient LANDS on Findings; a clinician still lands on ECG (they open the
viewer for the trace). The order is the same for every role - a control whose
segments move between roles cannot be learned. This reverses v5.0.0's
documented trailing-edge decision, at the user's request: the answer first,
the evidence after.

### Also

- History rows land with a short first-visit stagger (`FadeUpView`, capped at
  8 × 45 ms) - the house animation, not a new idiom.
- Save-time digesting was considered and skipped: the backfill computes a
  fresh capture's digest within one History visit, and the auto-save path -
  the code that must never lose a recording - stays untouched.

Verified: `tsc --noEmit` clean, `expo export` both platforms, `expo-doctor`
clean. That proves well-formed, not working (§6.4): the rows, the stagger, the
backfill's scroll behaviour and the RTL/dark variants are 🔬 until touched on a
device.

## v0.52.0 - 2026-08-14 - the caliper hits hard, says what it found, and gets out of the way

*"The line that runs over the wave should vibrate as hard as possible, and when
I lift my finger the green line should disappear, and while it's there it should
write the wave's value nicely."*

Three linked changes. Each one corrects a decision that was right when it was
made and stopped being right afterwards - worth saying plainly, because the
reasoning that produced them is still in the file and would otherwise look like
it had simply been overruled.

### The tick is as hard as the platform goes

`Heavy` is the strongest **single** event either platform exposes through
`expo-haptics`. The only louder thing in the API is `notificationAsync`, and
that is a multi-thump *pattern* meaning success / warning / error - wrong here
by meaning, and impossible to fire at scrubbing rate.

What it replaces is `selectionAsync`: the **lightest** event iOS defines, tuned
for a picker wheel spinning under a thumb resting on glass. Semantically it was
the right family (this is scrubbing through discrete positions, not an impact)
and in the hand it was not there at all.

`MIN_TICK_MS` (45 ms) is not a compromise on "as hard as possible" - it is what
makes it possible. A small square is 1 mm on a ~40 mm sheet, so an unhurried
sweep crosses about forty of them a second, and a Heavy impact every 25 ms is
more than the taptic engine can reproduce. Past that rate the thumps stop being
separate events and merge into one flat rumble, which is **weaker** in the hand
than a slower train of distinct hits. The throttle applies to the buzz only: the
line and its reading still move on every square, so the picture never lags the
finger.

### It says what it is sitting on

A paper chip at the top edge of the sheet, beside the caliper and never centred
on it, carrying **ms from R**, the **baseline's mV**, and - when a study is laid
over the signature - **that study's mV**, in the colour it is drawn in. The pair
is the comparison; quoting one without the other makes the reader hold the
second in their head while dragging.

The rule this was kept off the sheet for is still true. History's calipers
learned it in v0.16.0: a readout floating on the trace covers the deflections
whose position it reports. That is exactly why the chip sits at the top edge, on
paper, beside the line - not under the finger. What changed is that **v0.44.0
deleted the chrome strip the caliper reported into, and did not move the
numbers**. From that release until this one, dragging along your own ECG
produced a green line that told you nothing.

### It vanishes when you lift

Persisting was right only while the readout lived elsewhere **and stayed up**:
you parked the line, then read the figures at leisure, and the alternative would
have had you holding a finger over the very point you were trying to read. With
the number travelling with the line, a parked caliper is just a green mark left
on someone's own trace.

The tap went with it - a tap fires on **release**, and the caliper is now gone
on release, so tapping could only ever flash a line that erased itself. A
**180 ms hold** replaces it: press and the line appears where the finger is,
slide and it follows, lift and it is gone. 180 rather than 0 so that a finger
passing through on its way to scrolling the page does not drop a caliper - the
same defect `onBegin` caused in v2.0.0, arrived at from the other direction.

The lead name steps aside while the caliper is out. Two chips at the top edge is
the clutter this screen was stripped for, and nobody measuring a beat is
wondering which lead they are on.

### A bug found while reading it

The panel held the caliper reading in a `caliper` state that **nothing has
rendered since v0.44.0** removed the readout strip. Every millimetre the finger
moved therefore re-rendered the entire Insights tree - the timeline, the readout
table, the goal rings, all of it - to store a value that was thrown away. The
gesture is gated on a `measurable` prop now instead of on someone subscribing to
the reading, and the state is gone.

### Not verified on a device

Typechecks and bundles. Haptic strength is by definition something only a hand
can judge, and the hold-vs-scroll arbitration is exactly the kind of gesture
behaviour a bundle cannot check - `PARITY.md` keeps these rows marked.

## v0.51.0 - 2026-08-14 - drag your ID together again, and feel it this time

*"You took away the progress bar I could play with to see how my ID gets built
over time, and that's a shame because it was cool with the vibration (and the
vibration needs strengthening). Can it come back?"*

### The builder is back, and cutting it was over-applying a good rule

v0.44.0 removed it alongside the legend row and the three-line explainer, on the
argument that all three were explanations nobody had asked for. Half of that was
right, and the half that was wrong is worth stating precisely:

**The legend and the explainer TOLD the reader something. The builder lets them
DO something** - and the thing they do is the only demonstration anywhere in the
app of the claim the entire feature rests on, that averaging many recordings
cancels what is not the heart. Written down, a reader has to take that on faith.
Given the control, they watch it happen in about two seconds and the argument
makes itself. That is the opposite of the pile-on the redesign was aimed at.

It sits **under the trace and above the lead buttons**: a control has to be
adjacent to the thing it changes, and what it changes is the curve directly
above it. Putting it below the lead buttons would separate the two.

It does not break the one-viewport promise. That block already reserves the full
remaining window height and its content sat roughly 130 pt short of it on a
modern handset, so the builder is absorbed by slack that was there anyway -
nothing else on the first screen moved.

While a **partial** baseline is drawn, the latest-study overlay hides itself.
Laying one recording over "the first three studies" invites reading a comparison
against something that is not this person's baseline.

### The haptic was weak for a reason, and the reason is fixable

The old tick was `selectionAsync` - the picker-wheel event. Semantically correct
(this is scrubbing through discrete items, not an impact) and in practice too
faint: it is the **lightest event iOS defines**, tuned for a wheel spinning under
a thumb resting on glass. Through a case, one-handed, with the finger already
moving, it is easy to miss entirely. A control whose feedback you cannot feel is
a control you have to watch, which defeats the point of putting the sensation
there at all.

Now:

- **Medium** impact per study crossed.
- **Heavy** at either END of the timeline - an end-stop, so the finger finds the
  first and the last study without looking, the way a picker's rubber-band tells
  you the list is over. Tapping "show all" gets the same weight, because landing
  on the last notch is exactly what it does.
- `MIN_TICK_MS` (32 ms) so a fast flick cannot merge the ticks into one
  continuous rumble - at 120 Hz on a ProMotion display an impact every 8 ms is
  more than the taptic engine can reproduce, and they blur into the featureless
  vibration this was rebuilt to stop being. It throttles the **buzz** only: the
  value still updates on every crossing, so the picture never lags the finger.

The caption also went 11.5 -> 13.5 pt, and the track and notches up 2 pt. Same
brief as the rest of Insights: no text on this screen may need good eyes.

### Not verified on a device

Typechecks and bundles. Haptic strength is by definition something only a hand
can judge, and so is whether the first screen still ends where it should now
that there is one more control on it - `PARITY.md` keeps these rows marked.

## v0.50.0 - 2026-08-13 - the report stops being the app on paper, and the tabs stop touching

*"The PDF does not look like a professional medical report (except page 1 with
the graphs). And the three tabs at the top are really cramped - think how to
arrange that professionally."*

### The tabs were cramped because the labels were

A segmented control divides its width **evenly**, so three labels of very
different lengths always look wrong however the type is tuned. "Waveform /
Measurements / Interpretation" put 72 pt in the first slot and ~105 pt in the
next two, on ~120 pt segments - and shrink-to-fit was papering over it, which
is why they fitted and *touched*: type squeezed to the edge of its box has no
breathing room left by definition.

The viewer's tabs are now **ECG / Values / Findings**. Near enough the same
length to read as one composed control, and simply the better words: they are
what a clinical report calls those three sections. The gutter went 4 -> 10 pt.
Shrink-to-fit stays only as a safety net for a long word in a language nobody
measured. The end-of-exam report's *two*-tab control keeps the long names - it
has the room, and nothing there was cramped.

### The report was the app, photographed onto A4

That is the whole diagnosis. Pages 2-4 were built out of app idioms - rounded
cards, soft coloured fills, chips, six 30 pt stat tiles - and an app rendered
onto paper does not become a document.

What makes a sheet read as a clinical report is boring and specific, and all of
it is now there:

- **An identification grid** at the top of page 2: whose, when, on what, how
  many beats, what signal quality. A reader pulling the sheet out of a folder
  answers those before anything else, and should not have to read a sentence to
  do it.
- **The verdict is a statement block, not a card** - a heavy left rule in the
  level's colour, a kicker, the conclusion. The same shape a pathology report
  puts its impression in, because a conclusion is something the issuer stands
  behind rather than a widget.
- **Six stat tiles became two ruled tables** with reference ranges and **H/L
  flags**. Tiles are a dashboard; a clinician reads a column, and the eye runs
  down the flag column first and stops on the letters. Blank when in range - a
  column of ticks makes the exceptions harder to see, not easier.
- **Section headers** are uppercase, letterspaced, on a full-column rule. That
  one selector does more to make the sheet read as a document than anything
  else in the stylesheet.
- Radii, soft fills and chip pills are gone. Figures align on the decimal
  (`tabular-nums` on the body).

### Re-verified

Nine cases in Node: 4 pages, 0 unsized SVGs, 0 percentage dimensions, 0
unresolved placeholders, 0 inconsistent page numbers, 0 NaN, 8 identification
cells and the H/L flags present in the output.

**OTA**: TypeScript only, so `app.json` stays at 0.34.0.

## v0.49.0 - 2026-08-13 - the report stops wasting paper and starts showing its work

*"Why is there a blank page after every page? Why is there half a page of ECG
for the remaining leads? Why are you not using my logo and writing it in plain
text? A whole page for that one line - are you serious? Green is not my brand
colour. It is ugly and does not look like a report a doctor would be impressed
by. Add the average beats from the ECG ID tab."*

Six complaints, six causes. Two of them were bugs shipped in v0.48.0.

### The blank page was one millimetre

`.pg` was `height: 297mm` inside a 297 mm page. WebKit lays print out in CSS
pixels: 297 mm is 1122.52 px, which it rounds **up** to 1123 - so the box was
half a pixel taller than the page holding it. The engine then honoured
`page-break-after: always` on a box that had **already overflowed**, and half a
pixel of nothing became a sheet of paper. After every single page.

`PAGE_BOX_H` is 296 now, and `:last-child` breaks with `avoid` rather than
`auto`.

### The half page of ECG is gone

The recording no longer paginates at all. 186 mm at 25 mm/s holds 7.1 s, so a
10 s capture used to become two sheets - and the second was six leads stopping
a third of the way across. That was the ugly half of a trade nobody had asked
for.

One sheet now, with the window stated against the total in the caption.
Compressing 10 s into 186 mm would mean 18.6 mm/s, and rescaling the time axis
is banned for a good reason (`ecgPath.ts`): every interval measured off the
paper would be wrong by a quarter. CSV and EDF export still carry every sample.

### The logo is the logo

`pdf/logo.ts` carries the wordmark as plain SVG - path data copied verbatim
from `components/atoms/BrandLogo`, which cannot be imported here because it
renders through `react-native-svg` into native views. 34 mm on every
letterhead.

### The ruler is on the paper

A label per second along the time axis, +/-0.5 and +/-1 mV against the
baseline, and the calibration pulse named. A grid without numbers asks the
reader to remember that a large square is 200 ms and 0.5 mV - which every
clinician knows, and which is exactly the recall a document should not spend.

### Green is not the brand

And it should never have been the verdict colour. `clear` is the wordmark's own
navy `#0D2041` now. Green survives **only** as the reference band on an
interval bar and the normal sector on the dial, where it is not identity but
the universal chart convention for "inside the expected range".

### A whole page for one line - and the fix is not "make it smaller"

The interpretation page carried a ring, a headline and one finding on 297 mm of
paper. The emptiness was the symptom. The disease was that **"no abnormal
finding" is a claim with no content unless the reader knows what was looked
for.**

`screenLimbEcg` now returns a per-rule **audit**, and the page prints all 43
checks in three columns, grouped by the category a reader triages by, each
marked present / ruled out / could not be evaluated. A clinician wants the
negative list at least as much as the positive one: *"atrial fibrillation: not
present"* is a clinical statement, and a report that omits it is asking to be
trusted rather than read.

### The representative beat, all six leads

From `buildBeatTemplates` - the **same** function the ECG ID tab uses, so the
beat on paper and the beat on that screen are one computation rather than two
derivations that will one day disagree.

Real ECG machines print exactly this panel beside the rhythm strip, and the
reason is clinical: a median beat is what a reader inspects when asking about a
Q wave or an ST segment. A ten-second strip shows rhythm, not morphology.

### Re-verified

Nine cases in Node: **4 pages** (was 5), 0 unsized SVGs, 0 percentage
dimensions, 0 unresolved placeholders, 0 inconsistent page numbers, 0 NaN, and
43 audit rows plus 6 median beats present in the output.

**OTA**: TypeScript only, so `app.json` stays at 0.34.0.

## v0.48.0 - 2026-08-13 - the report is a real document now, and it cannot tear across a page

*"The PDF is not laid out for the page. The graphs stretch across two pages.
The tables are colourless and dated. It is ugly. I need a report with graphs,
with circles, with statistics on every measurement, six leads filling the whole
first page, in my brand colours, perfect, with no errors and no overflow
between pages. Do not be stingy. Add illustrations too."*

### The stretching was a missing constraint, not a styling mistake

Every strip was `<svg width="100%">` with a viewBox and **no height**. The
height was therefore INFERRED from an aspect ratio against whatever column the
print engine had decided on - and `.page` had no height ceiling at all. Any
growth above it (a long device name wrapping the letterhead is enough) pushed
the sixth lead past 297 mm, and the engine did the only thing it can: started a
new page in the middle of a lead.

Every box is now a number in millimetres, and **`assertFits()` throws while
building** if a page's blocks exceed the body. A torn report is worse than a
failed export precisely because it looks fine on the phone that made it:
`printToFileAsync` reports success, the file opens, and the damage is a lead
sliced in half in a document somebody treats a patient from.

> WARNING - a second silent shear, found while fixing the first.
> `printToFileAsync`'s default paper size **follows the device locale**. A phone
> set to US English gets Letter - 6 mm narrower and 18 mm shorter than the
> geometry every page is built to. A4 is now passed explicitly, in points, with
> zero margins.

### The document

| page | what is on it |
|---|---|
| **1...n** | **The ECG, full page.** Six leads at 40 mm each - 240 of the 256 mm body. 25 mm/s, 10 mm/mV, a 1 mV calibration pulse at the left of every lead, R-peak ticks along lead II. 186 mm of column holds 7.1 s, so a 10 s capture is two consecutive sheets - what a six-channel machine does, rather than truncating. |
| **n+1** | **Interpretation.** The verdict as a **donut whose fill is the fraction of checks that ran**, then every finding with its evidence chips, its margin bar, and its **published criterion** printed underneath. Findings paginate; nothing is dropped. |
| **n+2** | **Statistics.** Six stat tiles, all five intervals as bars against their reference bands, and three real figures: the **hexaxial dial** (the axis is an angle, so it is drawn as a compass), a **Poincare plot** with its SD1/SD2 ellipse, and the **RR tachogram**. Amplitudes as a striped table with a signed mini-bar per lead. |
| **n+3** | **Reference.** **Einthoven's triangle drawn**, with which leads see which wall - and which walls are not recorded at all. The blind spots, how to read the sheet, the disclaimer. |

Each figure was chosen because it answers something a table cannot. A Poincare
plot separates a regular rhythm, ordinary respiratory variation and atrial
fibrillation by the *shape* of the cloud, faster than any summary statistic
does. The triangle is what makes the word "inferior" mean something to a reader
who has never been told that leads have directions - and it shows the blind
spots by having no arrow pointing at the front wall.

### A simulated recording gets no interpretation page

The same rule the app obeys, and it binds harder in a PDF: a document leaves the
phone and is read by someone with no way to know the trace came from a bench
generator rather than a heart.

### Verified the only way a PDF can be

A PDF cannot be diffed, so the document builder was **split away from
`expo-print`** into `pdf/document.ts` - it imports nothing native and can
therefore be built in Node. Nine cases (normal, simulated, 3 s, 30 s, brady,
tachy, low voltage, left axis, irregular), every one with deliberately
over-long labels and a 78-character device name:

- **0** SVGs without an explicit millimetre width and height
- **0** percentage dimensions anywhere
- **0** unresolved `{n}` / `{total}` placeholders
- **0** inconsistent page numbers ("Page 4 of 5" is checked against the real count)
- **0** `NaN` / `undefined` / `Infinity` in the output
- the overflow guard confirmed to **fire** when handed an over-tall page

This proves the ARITHMETIC, not that the printed sheet is beautiful. That still
needs a human looking at paper, so it stays marked for device verification.

**OTA**: TypeScript only, so `app.json` stays at 0.34.0.

## v0.47.0 - 2026-08-13 - the interpretation explains itself, and stops shouting about a hair past a line

*"What is this? It is not informative. Why did it decide that? Why are there no
illustrations of why? I look at it and I have no idea what you are talking
about. As a healthy person I see this and I get stressed."*

Every word of that was fair. One part of it was not a design complaint at all.

### The amber was four per cent of a threshold

The screen said `Largest QRS +0.48 mV / Threshold 0.50 mV` and turned the
verdict amber. A healthy person read a colour and two numbers they could not
place, and concluded something was wrong with their heart.

The engine had **no way to express degree**. A finding a hair past its line
drew identically to one 200 % past it. Every rule now returns a `margin`
(0 = exactly on the line, 1 = unambiguous); below 0.15 a finding is
`borderline` — still listed, still explained, still in the report, and it **no
longer raises the verdict**.

> ⚠️ **That fix, alone, shipped a worse bug than the one it fixed.** Validation
> caught a QTc of 515 ms — three per cent past the torsades threshold — being
> demoted to borderline and returning a **green** verdict. Silencing an urgent
> finding is not a milder version of over-calling a benign one; it is the
> opposite error, and the two do not cost the same. The demotion is now
> deliberately asymmetric: `attention` findings can be demoted, `urgent` ones
> never can.

### "Why?" on every finding

Each card opens a sheet that answers with **the patient's own recording**:

1. **What we measured** — their representative beat drawn, with the segment
   the rule looked at shaded. A rhythm finding gets a five-second strip with
   the beats ticked instead, because a pause is invisible inside one complex.
2. **From your recording** — their number on a bar against the typical band.
   Seeing 0.48 sit one pixel outside a green band says "barely" without anyone
   writing the word.
3. **Why this happens** — the cause in ordinary language, ordinary explanation
   first, because it is also the likelier one and reading it first is what
   stops panic.
4. **What it means** — the consequence, and the published criterion behind the
   threshold.

A stock diagram of a heart would explain the concept and prove nothing. The
question is not "what is a QT interval", it is "why did you flag **mine**".

### 43 rules, 43 files

The engine was one 900-line function with 43 inline calls. It is now
`shared/ecg/screening/<category>/<disease>.ts` — each a declarative object
carrying its threshold, its citation, the evidence it produces, its margin,
and what to draw. Adding a disease is: write the file, add the line to the
registry. `RULE_COUNT` is derived from the array, so the "43 checks"
denominator cannot go stale.

### The tabs were truncating

"Measurem… Interpretat…". Three segments on a 390 pt screen give ~120 pt each,
and both labels are over 100 pt at 14 pt bold. `SegmentedTabs` now shrinks type
to fit above two options — per label and per language, so Hebrew's shorter
words are not shrunk to match English's longer ones.

### Redesigned at patient scale

The statistics used `MetricTile` — the **report's** dense bordered table atom,
six to a screen. That reads as a spreadsheet, which was the "looks dated, not
professional" half of the feedback. They are `StatCard` now: 30 pt value, inset
card, a progress track where the number is a fraction of something. Section
headings went to 19 pt. Findings are large tappable cards, and the raw figures
moved into the Why sheet — where a doctor still has them and a frightened
person does not meet them first.

### Validation

| | before | after |
|---|---|---|
| 3 000 synthetic healthy adults returning "no abnormal finding" | 87.0 % | **90.4 %** |
| …returning urgent | 0.00 % | **0.00 %** |
| threshold regression cases passing | 20/20 | **20/20** |

The 43-file split did not change a single result.

### Still open, and both are real

- **The history verdict dot is not built.** The list endpoint returns metadata
  only, by design — re-deriving 43 rules per row would mean decoding every
  waveform to draw a list, which is exactly what `RecordingSummary` exists to
  prevent. Doing it properly means caching the level **on write**, alongside
  the summary, which is a shared-type and server change. Deriving a dot from
  the cached summary alone would use roughly 6 of the 43 rules and would
  therefore disagree with the detail screen — two verdicts for one recording is
  worse than no dot.
- **The PDF has no interpretation page yet.** The existing report (real ECG
  paper at 25 mm/s · 10 mm/mV, calibration pulse, two A4 sheets, measurement
  table) is unchanged and still shares through the ⋯ menu.

**OTA**: TypeScript only, so `app.json` stays at 0.34.0.

## v0.46.0 - 2026-08-13 - the ECG finally says what it thinks it is looking at

*"For every measurement, interpret it for different heart diseases. Write
algorithms for the kinds of heart disease that can be extracted from 6 limb
leads. Show it to the patient in calming colour with gentle animation.
Something a patient looks at and says okay I'm healthy, or the opposite, okay
I need to go to A&E."*

The study viewer could show what was recorded and what could be measured from
it, and then stopped - exactly where the person whose heart it is starts
caring. There is now a third tab.

### Where the line was crossed, and why there

This codebase says twice, in writing, that it does not interpret.
`ecgAnalysis.ts`: *"It does not diagnose, and it must never start to."*
`tokens.ts`: *"painting a difference red interprets it - in the one direction
we may not go."*

Both are still true and neither was edited to make room for this. The reading
lives in a new module, `CYPHIX_SHARED/src/ecg/ecgScreening.ts`, which imports
the measurements and is never imported by them:

    ecgAnalysis   ->  "PR is 236 ms."                       a fact, falsifiable
    ecgScreening  ->  "236 ms is a first-degree AV block."  a reading, arguable

Delete the screening file and the measurement layer is untouched. That
separation is not tidiness - it is what keeps the numbers checkable by someone
who disagrees with the reading.

Two words were added to `ecgAnalysis.ts`: `export` on `delineateBeat` and on
its type, so screening can locate a J point without forking the slope-collapse
delineation. No maths and no constant changed. The web app's own copy was
regenerated from shared, so the two files remain identical.

### What it detects

43 rules over the six limb leads, each with a published threshold cited at its
definition:

| | |
|---|---|
| **Rhythm** | atrial fibrillation, flutter, SVT, wide-complex tachycardia, ectopy burden, pauses |
| **Conduction** | AV block 1st / 2nd / complete, IVCD, bundle-branch patterns, anterior and posterior fascicular block |
| **Recovery** | long QT, very long QT, short QT, T-wave inversion |
| **Blood supply** | ST elevation and depression, pathological Q waves - inferior and lateral |
| **Chambers** | LVH by Lewis index and R in aVL, right atrial enlargement |
| **Other** | peaked T waves, low voltage, electrical alternans, swapped electrodes |

Fascicular block is worth naming separately: it is one of the very few
diagnoses that is a **pure limb-lead finding**, because the hemiblocks change
the frontal axis and nothing else.

### The three defects found by running it

The first version returned "no abnormal finding" on **1 of 40** healthy
subjects. None of these would have been found by reading the code.

**1. Bazett.** `qtLongSevere` - an *urgent* finding - fired on **3.6 % of 3 000
synthetic healthy adults**. One emergency alarm per 28 well people. Not a
coding error: QT/vRR systematically over-corrects above ~90 bpm, so a perfectly
ordinary 390 ms QT at 98 bpm emerges as a QTc of 500 ms, which is the torsades
threshold. The correction is now chosen **by rate** - Bazett inside 60-100 bpm
where it is accurate, Fridericia outside it - and the urgent finding requires
both to agree. Reports still print both, unchanged.

**2. Electrical alternans** fired on 1 subject in 7. It was measuring noise: on
ten beats, ordinary amplitude jitter splits into "even" and "odd" groups that
differ by 15 % often, and a short run of noisy differences flips sign 80 % of
the time by chance. It now requires the alternation to exceed the scatter
*within* each alternating group.

**3. Lead reversal** fired on ordinary marked **right axis deviation**. A
frontal vector at +120 degrees inverts lead I on its own, P wave included, so
"lead I is upside down" cannot distinguish a swapped cable from a rightward
heart. aVR can: it faces the right shoulder, so its P wave is negative at every
physiological axis (-0.09 mV at +45 degrees, still -0.01 mV at +110) and flips
**positive** when the arm electrodes are swapped (+0.73 mV). One sign.

After the fixes: **87.0 %** of 3 000 healthy adults return "no abnormal
finding" and **0.00 %** return urgent. What still fires does so at its published
population rate - LVH voltage criteria ~5 %, PR > 200 ms ~2 % - which is
epidemiology rather than a bug.

### Three things the type shapes enforce, not the copy

- **Every finding carries the arithmetic that fired it.** "QTc 512 ms" sits
  under the name. A verdict a reader cannot check must be either believed
  whole or ignored whole, and both are the wrong relationship to have with a
  medical screen.
- **Every screen carries what six limb leads cannot see** - the anterior wall
  above all - and it renders on a *clear* result too, most importantly there. A
  green mark with nothing beside it is read as "my heart is fine" when what it
  says is "nothing these leads can observe is wrong".
- **A rule that could not be evaluated is counted, not skipped.** "No abnormal
  finding" always arrives with "41 of 43 checks ran". Six of 43 is a recording
  that mostly could not be read, and without the denominator both draw the same
  green mark.

### A simulated recording gets no verdict at all

Not a caveat under one - no verdict. `useScreening` returns null and the tab
says what the recording is instead.

This is not defensive: the bench simulator's T wave sits at a **fixed offset**
from the QRS, so its QT does not shorten with rate and every simulated strip
measures a QTc near 280 ms. Screened, roughly 90 % of them would report a short
QT interval. The engine is right and the signal is not a heart. Mobile
`CLAUDE.md` §4 already required this; what is new is the measurement of how
badly it would otherwise have read.

*(That is a defect in the simulator, not in this feature, and it is worth
fixing on its own - a demo recording that reads "no abnormal finding, 43 of 43
checks ran" would be a truer demonstration than one flagging a short QT. It is
deliberately not fixed in this release: the simulator is shared frozen code and
changing its waveform changes the web app's demo too.)*

### The screen itself

Answer first, then the evidence for it - the reverse of how a clinical report
is built, because the reader has one question and will not scroll past three
sections of context to reach it. A breathing mark in the level's colour (two
pulse rings at 3 s, slower than a resting heart: a ring at heart rate reads as
a monitor and raises the pulse of whoever is watching it), the verdict, the
action, the checks-run line. Findings stagger in below it.

Patient sex moves the long-QT limit by 10 ms and is passed **only** when the
study provably belongs to the active patient. A clinician opening someone
else's record would otherwise have them screened against the wrong threshold,
silently.

**OTA**: TypeScript only, so `app.json` stays at 0.34.0 (mobile `CLAUDE.md`
§5A.2).

## v0.45.0 - 2026-08-12 - the app stops spending its session to ask if the server is there

*"Sometimes I'm in the app and it suddenly switches to the login screen and
disconnects me on its own."*

This is the third release to go after that sentence, and the honest thing to
write down is that **the first two were both correct and neither could reach
it.** `tokenStore` v2.1.0 stopped a Keychain that would not answer from reading
as a server that refused. v2.2.0 fixed two more real causes: the
`WHEN_UNLOCKED` accessibility default that made the enclave unwritable while
the screen was locked, and an empty token read beside a live principal. Every
one of those was a genuine way to lose a session, and every one of them is
still fixed.

The cause that survived all of it was never in this app. It is in the server,
and it could not have been found or fixed from here.

### What was actually happening

`rotateRefreshToken` retired the token it was handed and issued a successor in
the same breath. From that instant the old token was a trap: if the reply did
not reach the enclave, the phone went on holding a token the server had already
killed. On a phone there are four ordinary ways for that to happen — the socket
drops after the server committed, the body is unreadable through a captive
portal, the app is suspended between the response and the enclave write, iOS
refuses the Keychain write while the screen is locked.

The next refresh presented that token. The server's reuse detection called it
theft and **revoked the whole family**. There was no recovery: 401 on
everything, `sessionExpired`, the door — minutes after the event that caused it,
with nothing on screen connecting the two. The fix is `CYPHIX_SERVER` v0.5.0 and
migration `0003_refresh_grace.sql`; the reasoning is in that changelog.

### What this app changes

The server fix removes the failure. This one removes most of the *exposure* to
it, because the app was making the dangerous move far more often than it needed
to.

`revalidate()` was `refreshSession()` and nothing else — so **every caller of it
rotated the refresh token.** `AuthGate` calls it on every return from the
background, and again on a 4 s→60 s backoff for as long as the app believes it
is offline. The app was therefore spending its most fragile credential over and
over, and doing it most eagerly on exactly the flaky network that loses a
rotation's reply. Switch to Messages and back: a rotation. Walk through a
tunnel: a rotation every few seconds.

It now asks with the access token it already holds — `GET /auth/me`, which
proves the same two things the caller actually wants (the server is reachable,
this session is still recognised) and costs nothing if it fails. A rotation
happens only when the probe cannot answer: no access token at all (a cold
start), or a 401 because the ~15-minute access token aged out. That is **one
rotation per ~15 minutes of use instead of one per foreground, and none at all
while offline.**

Every unexpected reply degrades to the old behaviour rather than to a guess: a
403, a 404, an unreadable 200 all fall through to the full refresh. And a 401
from the probe is explicitly **not** a rejection — it says an access token
expired, which is ordinary and says nothing about the session.

Nothing about revocation is weakened. A server that answers and refuses still
ends the session, on the same path, immediately.

### What is not claimed

Both halves typecheck and both bundles build; the server's rotation logic is
covered by a 17-case behaviour matrix (ordinary rotation, retransmission,
reuse-after-successor-used, replay outside the window, pre-migration rows).
None of that is a phone. The bug is intermittent by nature — it needs a lost
reply — so the only real confirmation is **days of ordinary use without being
thrown to the sign-in screen**, and the row stays `🔬` until then. If it does
happen again, Settings › About now carries `sessionDiagnostic()`, and the line
it prints is the first thing to read.

## v0.44.0 - 2026-08-12 - Insights is the ECG first, and almost nothing else

*"I don't like the Insights design - it feels like you just piled more
information on me instead of minimalism. In the end a patient doesn't know what
that 'agree' in the green circle is, and I don't care about it either."*

Fair, and v0.42.0 earned it. Asked to make the screen useful for a patient, the
last release answered by **adding** - a verdict band, three figures, a three-line
explainer. That is how a screen gets fuller while getting no clearer.

### What is gone

The confidence ring (`82 - agree`), the three figures, the three-line explainer,
the caliper readout strip, the step-by-step beat builder, the legend row, the
standalone baseline numbers, every explanatory paragraph under the chart, and
"Changes since you started".

The rule the screen now holds to is stricter than "prose is one line or it is
deleted": **if a line does not change what the reader does next, it is not on
the screen.**

### What is first

The ECG. The trace and the lead buttons are sized to **one viewport**, measured
from the window and the dock rather than guessed, so the recording is never
half-visible and nobody has to scroll to find out what it said.

### The sheet is paper again

Reported as *"the rounded rectangle with no outline and no shadow behind it
doesn't look professional"*. Both halves of that are right: a sheet needs a
ground of its own, an edge, and somewhere to sit. It now has paper, a hairline
border and a low soft shadow.

This is **not** the white card v0.33.0 removed. What was wrong then was a white
sheet inside a white *card* on a grey page - three nested rectangles. What was
wrong after it is the opposite extreme: a grid floating with no edge at all,
which reads as a texture rather than as a recording. The grid keeps the brand's
navy tint rather than going clinical pink - pink reads as a hospital printout,
and this is the patient's app.

The shadow is on the wrapper View, never the Svg: a native SVG view casts none
on either platform and ignores `elevation` on Android, so it would have looked
framed in the simulator and flat on a phone.

### Every measurement, every time

*"I always want to see that recording's averages against the current average -
not only the ones that disagree, but tell them apart by colour."*

Heart rate, PR, QRS, QTc and axis, each beside what that person usually holds,
with colour as the only difference. It also fixes a defect that was there from
the start: showing only the rows that **moved** made the screen's content depend
on whether anything was wrong, so the layout jumped between recordings, the eye
could not learn where to look, and an empty space was ambiguous between
"everything agreed" and "nothing could be measured".

### A weekly goal

Seven rings in "When you measure", against the number of reminder times already
set. There is deliberately **no second setting**: a goal and a reminder schedule
are one intention said twice, and two places to state it is two places for them
to disagree - after which the app is telling someone they missed a target they
never set.

It never scolds. An empty day is an empty ring in the ordinary border colour -
not red, not amber, no "missed" - and days later in the week than today carry no
count at all, because a Thursday reading 0/3 on a Tuesday is reporting a miss
that has not happened. There is no reward state either: "you did four instead of
three" is not better care, and implying it is would push people toward measuring
for the app rather than for themselves.

### The plain reading moved, and lost its tick

*"Put it under the V1-6 buttons, without that check mark, make it feel native
and not like an attendance system."*

Exactly right, for a reason worth keeping: a green check is a **pass mark**, and
this layer does not get to pass anything. The tinted band around it made it a
status widget sitting on the page instead of the page speaking. It is now a large
plain sentence under the lead buttons - which is also the right order for the
argument: the picture, then what it says.

### Type

Up throughout - section headers 13.5 -> 15, body 14 -> 16, hints 11.5 -> 13.5,
the disclaimer 10.5 -> 12.5. The brief is explicit and it is the right one: this
app is aimed at an older reader, and no text on the screen may need good eyes.

### Not verified on a device

Typechecks and bundles on both platforms. The whole change is layout, which is
precisely what `tsc` cannot check - `PARITY.md` keeps these rows marked.

## v0.43.0 - 2026-08-12 - compare any study against your own typical heartbeat

*"When comparing old ECG studies, there should also be an option to bring the
patient's representative beat and put it on the ECG graph, and compare it
against a specific measurement."*

The viewer could already ghost one **study** behind another. It could not
compare a strip against the **patient**. That is the more useful comparison and
the reference was already built: comparing against one prior study compares
against that study's noise as well, while the ECG ID is the signal that survived
every clean recording they have. It was one screen away and unreachable from the
place people actually look at waveforms.

### How one beat becomes a 30-second ghost

    foreground   -.,--------.,--------.,----------.,--
    R peaks       ^         ^          ^           ^
    identity      |         |          |           |    one template,
                  '---------'----------'-----------'    drawn at each

It is **stamped at every R peak of the strip it is laid over**. So alignment is
exact by construction - there is no beat-shift to accumulate error and no
fiducial warp to distort intervals. The three alignment modes are not offered
for it, and not because they were awkward: they exist to reconcile two
independent timelines, and this ghost has none of its own.

### The rhythm is the strip's, and the screen says so

An RR measured off the ghost is the strip's own RR read twice. It carries
**shape** - P, QRS, ST, T - and the trace underneath carries time. What replaces
the mode picker is exactly that sentence, because a ghost that silently supplied
its own rhythm would be the most misleading thing in this application.

Above about **130 bpm** the beats are closer together than the 700 ms template is
long, so each stamp is necessarily cut short at the T wave. That is stated too:
across 45-100 bpm the ghost tracks the strip to within **0.04 mV**, and at
140 bpm that becomes **0.30 mV**, entirely in the truncated region. A reader
comparing T waves there would be shown a difference the *drawing* invented.

### Two bugs the measurement caught that reasoning did not

1. **The stamp must remove the template's own isoelectric before adding the
   strip's.** Without it the whole ghost floats by whatever the template's PR
   window holds - 0.13 mV on the test cohort, larger than the wander the
   levelling exists to cancel. For templates this app builds that value is
   already ~0, which is exactly why it has to be explicit: invisible on our own
   data, load-bearing for anything imported, and an invariant that is true only
   by luck breaks silently.
2. **The gaps between beats must HOLD the neighbouring stamp's edge**, not be
   written at the strip's measured level. Those are different numbers - the PR
   window this levels on still contains part of the P wave at an ordinary PR
   interval, a bias that cancels *inside* a stamp and does not cancel in a gap
   filled independently. The result was a 0.13 mV **step** at every beat-window
   edge: a visible staircase, and 0.998 -> 0.972 correlation with the trace
   underneath. Holding the edge cannot step, by construction.

Measured after both fixes, ghost vs the strip it was laid over:

| bpm | 45 | 60 | 75 | 100 | 140 | 175 |
|---|---|---|---|---|---|---|
| overall r | 0.985 | 0.994 | 0.997 | 0.998 | 0.967 | 0.987 |
| max deviation in-beat (mV) | 0.038 | 0.038 | 0.035 | 0.028 | 0.303 | 0.162 |

### Cost

The identity is built **only when the comparison is selected** - `useEcgIdentity`
gained an `enabled` gate. A cold pass re-analyses the whole history, which is the
point on the Insights tab and would be seconds of unasked work in the viewer.

### Not verified on a device

Typechecks, both bundles, 18/18 `expo-doctor`, and the stamping is exercised
across six heart rates above. Nobody has laid the ghost over a real strip on a
phone; `PARITY.md` keeps the row as needs-device-verify.

## v0.42.0 — 2026-08-12 — Insights, rewritten for the person whose heart it is

*"Design the Insights tab in a more modern way — it feels dated, with old colour
choices, and isn't very practical. Add useful, nice information for a patient who
understands nothing about ECG."*

Three complaints, one defect: **the screen was built for a clinician.** It opened
with `ECG ID / BASELINE ESTABLISHED · 24 STUDIES` in letterspaced small caps,
then a ring reading 82, then a waveform, then percentages and Latin. Every one of
those is addressed to someone who already knows what the feature is.

### The order inverted

| before | after |
|---|---|
| ECG ID · small-caps state · ring | **"Your last recording looks like you"** — and *"24 of your 26 look like your usual ones"* |
| the waveform | 72 bpm · 26 recordings · 4 months tracked |
| percentages | the waveform |
| Latin | ① ② ③ what the waveform *is* |

Nothing was deleted. The ring, the state line, the coverage grid, the deviation
chips, the drift table and every clinical figure are all still there, lower down,
where someone looking for them will look. Insights is now two screens stacked in
one column: the patient's, then the clinician's.

### The "dated" feeling was the section headers

They were 11 px, letterspaced, uppercase, in the **faintest** text colour. That
was a deliberate choice — "the register an instrument labels its panels in" —
and on a phone, six of them down one grey column, it fails: the labels are quiet
to the point of unreadable, the eye gets no structure, and the page reads as a
wall of grey. They are now legible sentence-case in the secondary colour — still
quieter than the data they introduce, which was the real requirement, no longer
quieter than the background.

Gaps went 10 → 14 for a related reason: de-carding in v0.33.0 removed every box,
which was right, but boxes had been doing the **spacing** as well as the framing.

### The palette did not change — it was barely being spent

Almost everything on the screen was one of three greys. `signalSoft` and
`attentionSoft` exist to carry meaning and were essentially unused. The verdict
band is a soft tint of whichever one applies; the explainer's numbered pips are
another. ⚠️ Still **no cards** — a tinted, borderless band reads as *the page
saying something*, where a white rectangle on grey reads as an object pasted onto
it, which is what the v0.33.0 device report was actually about.

### ⚠️ The verdict is measured against the patient, not against a threshold

New `CYPHIX_SHARED/src/ecg/ecgIdentitySummary.ts`. The obvious implementation of
"does this recording look like your usual ones" is to ask whether it carries a
marked deviation — **and that is precisely how v0.41.0's alert banner was built,
which told a real user their heart differed on 26 studies out of 26.** The
per-study thresholds are calibrated for a clinician weighing one study; promoting
them to a verdict addressed to the patient is the defect.

So nothing in that file has an absolute threshold. A study is compared with the
median and robust σ of **this patient's own** scores. By construction the quiet
state is quiet — half of anyone's studies sit at or above their own median — and
the sentence can only turn when a recording is unusual *for them*.

Two rules the copy holds to, both already got wrong once in this codebase:

- **It never grades.** "Looks like your usual ones" is a distance from a
  baseline. "Looks healthy" is a diagnosis, and one word of reassurance would
  change what this product legally is.
- **It never implies a universal yardstick.** No "a healthy 95 %" — that would
  describe a computation that does not happen.

### Not verified on a device

Typechecks and bundles on both platforms. Nobody has looked at the new layout on
a phone; `PARITY.md` keeps these rows 🔬. Layout is exactly the class of thing
`tsc` cannot check.

## v0.41.1 — 2026-08-12 — the alert banner is gone; it had been on since day one

*"Get rid of this line, it gives me no added value."*

It read: **"The same difference on 26 studies in a row: Shape · Amplitude. Worth
showing your doctor."**

Twenty-six of twenty-six. That is not a finding about a heart — it is a broken
rule announcing itself.

### What went wrong

`raiseAlert` counted backwards through the history while the same deviation
**kind** kept appearing. But `morphology` and `amplitude` fire against the local
baseline on very nearly *every* study, so the run never terminated: the banner
had been true since the patient's first recording, and would have stayed true
forever.

### Why the fix is removal and not a tuning pass

★ **A persistence rule cannot rescue per-study thresholds that fire
constantly.** It inherits their false-positive rate however many repeats it
demands. Demanding three, or five, or ten would have changed the number in the
sentence and nothing else. And an alarm that has been on since day one is not
merely useless — it is worse than absent, because it occupies the space a real
one would have needed.

Removed: the line, the `IdentityAlert` model behind it, and its copy. Not left
computed-but-unrendered — a wrong field that nothing consumes is a landmine for
whoever picks it up next believing it works.

Anything reintroduced here has to rest on a residual whose **quiet state is
genuinely quiet**, demonstrated on real serial data *before* a sentence is
printed above a patient's ECG. The per-study deviation chips are untouched and
stay: they are checkable arithmetic about one recording, which is a materially
different claim from "something is happening to you".

### ⚠️ Why the tests I wrote for it passed

Both of them — same widening on the last two studies → `marked`, on the last one
only → `watch` — passed, and the rule was still broken. The synthetic cohorts are
clean enough that only ~11 of 24 studies carry any deviation at all, so the
backward run terminated there. Real serial data does not look like that. A
generated cohort can prove a rule's arithmetic and cannot prove its **base
rate**, and a rule whose whole job is counting how often something repeats lives
or dies on exactly that.

## v0.41.0 — 2026-08-12 — one study can no longer own your ECG ID

*"It looks like one measurement carries a lot of weight and the rest barely
affect it… look at the picture, one study captured most of the volume of the
patient's ID."*

The reading was correct. What made it hard to see is that **one picture had four
independent causes**, and only two of them were in the weighting.

### ① The chart was throwing the data away — and this was most of the picture

`similarity` is stretched from a correlation floor so that the last two decimal
places, where serial ECGs actually differ, are visible at all. That floor was
**0.90**. Meanwhile `SimilarityTimeline` drew a **80–100** axis it had chosen for
itself, in a different file, with nobody owning the pair.

Work the arithmetic through and the chart's *entire visible range* was
**r ∈ [0.971, 1.000]**. A study matching its baseline at 0.96 — an excellent
serial match — was drawn as exactly the same 6 px stub as one at 0.80. A normal
history could only ever render as one tall bar in a row of identical dashes.

| true r | similarity | bar |
|---|---|---|
| 0.930 | 51 % | 6 px — floor |
| 0.950 | 65 % | 6 px — floor |
| 0.970 | 79 % | 6 px — floor |
| 0.990 | 93 % | 48 px |

`SIMILARITY_FLOOR` and `SIMILARITY_AXIS_FLOOR` are now exported together from
`ecgIdentity.ts`, and the chart takes both its scale and its axis labels from
them. A chart that picks its own floor for a score computed elsewhere is
asserting something about that score's distribution it has no way to know.

### ② The agreement weight was a winner-take-all amplifier

`consensus = clamp01((r − 0.8) / 0.2)` — a linear ramp off a fixed constant with
a hard zero. It turns a 0.05 difference in correlation into a **10×** difference
in weight, and deletes everything below 0.80 outright. The enrollment boost was
never the culprit: at 2:1 across five studies it could not have been.

Replaced by a **one-sided Tukey biweight** on a robust z-score against the
cohort's *own* spread, so the point at which down-weighting begins is measured
rather than chosen — plus a **hard per-study cap** (`weightCap`, a third of the
total at most). The cap is the structural guarantee: whatever the agreement
maths concludes, an identity may not rest on one recording.

`nEff` — Kish's effective sample size, `(Σw)²/Σw²` — is now computed and shown
when it materially disagrees with the study count. It is the only field that can
reveal concentration; a contributor count cannot, and a mean agreement cannot.

### ③ Electrode placement was being scored as cardiac morphology

The screen was reporting `Shape · 3 leads` while the two **measured** leads sat
silent, alongside an amplitude change on exactly those two. That is not a heart
finding — it is a signature.

III, aVR, aVL and aVF are *linear combinations* of I and II. Correlation is
gain-invariant, so pads placed a couple of centimetres differently leave I and II
correlating ~0.99 while `III = II − I`, a **difference** of two channels whose
gains moved apart, genuinely changes shape. Those studies were being struck as
outliers, and the baseline was quietly becoming "the sessions where the pads
happened to match".

New `CYPHIX_SHARED/src/ecg/leadCalibration.ts` fits that linear remap out before
agreement is judged. ⚠️ **Its safety argument is the whole file, and it is
this:** a placement change and a real frontal-axis change are *not separable*
from the waveform. So the remap is used **only** to answer "is this the same beat
shape" — the question that decides whether a study may shape the baseline, where
placement is a nuisance. It never touches what the deviations report: the axis is
still measured independently by the DSP and reported in degrees, the amplitude in
mV, both from the untouched trace. Removing the nuisance from the *weighting*
while leaving it in the *reporting* is the design. The panel says so on any study
where it fired, because a corrected number handed over silently is worse than an
uncorrected one.

It is also self-limiting: an implausible or unhelpful fit is refused, and the
identity then behaves exactly as if the file did not exist.

### ④ There was no time in the model at all

A study from two years ago weighed the same as yesterday's. Worse, a slowly
changing heart was **guaranteed** to fall below the agreement floor and be
labelled an outlier — the baseline locked onto the past and called the present
noise. The one thing the feature exists to do, it structurally could not do.

"The first studies define you" and "the baseline must follow slow change" are
both right and cannot both be true of one number. So there are now two:

- **anchor** — the enrollment cohort (target raised 5 → **10**), no time decay.
- **tracker** — time-weighted toward now (180-day half-life). This is the ECG ID
  the screen draws and what a new study is scored against.
- **drift** — the distance between them, as a **per-year rate**. A trend, drawn
  as data, never as an alert. A living person drifts; alarming about it teaches
  the reader to dismiss the screen.

Scoring also moved to a **local** leave-one-out baseline: every *other* study,
weighted by how close in time it is. Leave-one-out stops a study being graded
against its own reflection; making it local stops slow drift retroactively
condemning old recordings — a study from two years ago is now compared with the
heart of two years ago, which is the only comparison that was ever meaningful.

### ⑤ And one study is never an alert

`IdentityAlert`: a single threshold crossing is `watch`; the **same kind** of
difference on two consecutive studies is `marked`. That squares a per-study
false-positive rate at a cost of at most one measurement's delay on anything
real — a real change is still there tomorrow.

### What was measured

Synthetic **vectorcardiogram** cohorts (each wave with its own axis — a
single-dipole model makes every lead a scaled copy and hides the whole problem),
24 studies of one stable heart, sweeping how much the electrode placement varied
between sessions. `nEff`, higher is better:

| placement spread | ×1 | ×2 | ×2.5 | ×3 | ×4 |
|---|---|---|---|---|---|
| old | 22.2 | 18.7 | 13.1 | 9.2 | 6.8 |
| **new** | 22.1 | 19.6 | **16.2** | **13.8** | **20.2** |

They agree while the data is clean and separate exactly where a real history
sits. Also verified: one genuinely different study (axis −50°, QRS 94 → 132 ms)
in an otherwise stable cohort is the *only* one struck and scores lowest;
a cohort drifting at a known +7 ms/yr QRS reports +8.9 ms/yr as drift with no
per-study alarm; the same widening on the last two studies is `marked` and on the
last one only is `watch`.

⚠️ **The "one study held 54 % of the weight, nEff 2.5" figure quoted while
diagnosing this is a MODEL, not a measurement of the patient's data** — it is the
old formula run over a correlation distribution consistent with the screenshot.
What was measured directly is the table above. The code comments say so too; a
number that came from a model must not be allowed to harden into a fact.

### Not yet verified on a device

Typechecks and bundles; the maths is exercised by the cohorts above. Nobody has
opened Insights on a phone with a real history since the change — `PARITY.md`
keeps these rows 🔬.

## v0.40.5 - 2026-08-12 - a locked screen no longer signs you out

*"Sometimes I'm in the app and suddenly, on its own, it goes to the login page —
literally while I'm signed in."*

One root cause, two routes out of it, and **neither was visible from a typecheck,
a bundle or `expo-doctor`.**

### The cause

`expo-secure-store` defaults to **`WHEN_UNLOCKED`**, and nothing in this app had
ever set `keychainAccessible`. That attribute makes the keychain item unreadable
**and unwritable** while the screen is locked. Combine it with rotating refresh
tokens and it is a spontaneous sign-out generator:

**① The read.** A refresh runs while the device is locked → the read comes back
empty → the exchange reads that as "there is no token" → `rejected` → the door.

**② The write — far worse.** The refresh *succeeds*. The server rotates the old
token out. The write of the new one fails because the screen is locked, and
`storeSession` swallowed that in an empty `catch`. The enclave now holds a token
**the server has already revoked** — and the next refresh presents it. The server
correctly treats a replayed rotated-out token as theft, kills the entire family,
and answers 401.

One swallowed write; total logout, minutes later, with nothing on screen
connecting the two.

Our own rotation policy — which is right, and is what makes a stolen token
survivable — is what turns a silent write failure into a total sign-out. An empty
`catch` was never acceptable there.

### The fix

Every keychain call now passes **`AFTER_FIRST_UNLOCK`**: still device-bound, still
hardware-encrypted, still unreadable on a phone that has not been unlocked since
boot. It gives up only "locked *right this second*", which is the exact window
that was breaking this. Accessibility is fixed at write time, so it heals itself
on the first refresh after the update.

> ⚠️ **I applied this fix wrong the first time and caught it on review.** The pass
> covered every keychain *read* and missed the refresh-token **write** — that is,
> it fixed the mild cause and left the dangerous one exactly as it was. Worth
> recording, because the write is the one that matters and it is the one that
> looks least like a security setting.

Two more, because one attribute should not be the only thing standing between a
locked screen and a logout:

- the token write is **retried once and recorded** when it still fails. With
  rotation, silently keeping a revoked token is the worst available outcome, so
  it may not be swallowed;
- an empty token read **beside a live principal** is now `offline`, not
  `rejected`. The two are written together and cleared together, so that
  combination is a failed read and never a revocation.

### A logout can now explain itself

`noteSessionEvent` records the last thing that happened to the session — in
**AsyncStorage deliberately**, so it survives the sign-out that clears the
enclave, which is precisely the moment anyone would want to read it.

Settings › About appends it: `no stored session · last: refresh refused by server
(401) @ 14:02`. No credential, no secret — what happened and when.

`tsc --noEmit` clean. **OTA** — TypeScript only, `app.json` stays at 0.34.0.


## v0.40.4 - 2026-08-12 - the connection line loses its capsule

From the phone, after v0.40.3 landed and the session behaviour was confirmed
working: *"while it's connecting the text is enough — it doesn't need the capsule
around it. What's there, just without the capsule, is perfect."*

Right, and it is the third and last step of the same walk:

| | |
|---|---|
| v0.40.0 | a coloured toast — `successSoft` plate, hairline border, status dot, sliding down from off-screen |
| v0.40.1 | a monochrome glass capsule, the dock's own material |
| **v0.40.4** | **nothing. The words alone.** |

The capsule was drawing a box around two words in order to announce that they
were worth putting in a box. Once the text is legible, the frame around it is
pure decoration — and decoration on a status line is exactly what makes chrome
read as bolted on rather than part of the app.

### The animation had to change with it

Not a second opinion — a consequence. A **container** can settle: scale up a few
per cent and it reads as a small object arriving. **Bare words cannot.** Scaling
text reads as a zoom, which would be the loudest thing this line is capable of
doing. So it is opacity only.

Everything else is untouched: same words, same spinner, same outline glyph, the
same fixed 14 pt slot so swapping one for the other cannot shift the label
sideways, and the same silence when all is well.

`tsc --noEmit` clean. **OTA** — TypeScript only, `app.json` stays at 0.34.0.


## v0.40.3 - 2026-08-12 - a force-quit no longer lands on the sign-in screen

Reported: force-quit from the app switcher, reopen, straight to login.

**This is a bug v0.40.2 shipped, and it is the same bug v0.40.0 set out to kill,
recreated one layer up by the fix for it.**

### What I did wrong

v0.40.2 added a migration path. A device with a refresh token but no persisted
principal — every install that was already signed in before v0.40.0 — resolves
who it belongs to with one refresh.

I put that refresh **inside `restore()`**. Which is to say: I made restore await
the network again, the precise thing v0.40.0 exists to have stopped.

`AuthGate`'s 4 s ceiling then raced it. Against a Render container that takes
~50 s to wake, that race is not close — the ceiling fires, `user` is still null
because the thunk is still pending, and the gate shows the door to somebody
holding a perfectly valid credential. Deterministic on a cold server, which is
exactly what a force-quit produces.

### The lesson, which is why the ceiling was *wrong* and not merely too short

4 000 ms was chosen to bound a **disk read**. Putting a network call behind a
timeout sized for storage is not a tuning mistake — it is two different waits
sharing one number, and the second one inherits a bound that was never about it.

They are two numbers with two reasons now: `RESTORE_TIMEOUT_MS` still bounds the
enclave, and `RECOVERY_TIMEOUT_MS` (20 s) bounds the lookup.

### How it is built now

`restore()` is a pure disk read again and never touches the network. It reports
`hasStoredSession` instead; the slice latches `recovering`; and the **gate** holds
the splash and drives the refresh — because a wait that has to be bounded belongs
where the bound lives.

It costs at most one launch per install: the refresh writes the principal, and
every launch after it takes the instant path.

### A diagnostic, so this stops being guesswork

Two rounds were spent guessing at one phone's state from a Windows machine, and
each guess cost a release. **Settings › About now prints what the enclave holds** —
`token + principal`, `token only — will recover on next launch`, `no stored
session`, `token + EXPIRED principal`, `enclave unreadable`.

"It sent me to the sign-in screen" has four indistinguishable causes and only the
device can say which. A fact about the device, never advice, and it names no
secret: whether a token exists, not what it is. Same reasoning that put the
resolved glass material on that screen.

`tsc --noEmit` clean; both bundles export. **OTA** — TypeScript only, `app.json`
stays at 0.34.0.


## v0.40.2 - 2026-08-12 - no Face ID on every launch, and offline recovers on its own

Three reports from the phone. Two were my bugs; the third was a design call I got
wrong and the counter-example given was the right one.

### 1. It asked for Face ID on every entry

v0.40.0's lock gated every cold start. That is what "require unlock" literally
means, and it is not what anyone wants from a health app.

**Dexcom was named as the counter-example, and it is the correct one.** A CGM
showing live glucose does not ask for a face each time you open it. MyChart does
not by default either. Nothing in HIPAA or the MDR requires a per-launch
biometric on a patient's own phone — and the reason is structural: **the OS lock
screen already is that check.** You unlocked the phone to reach the app at all,
so a launch prompt re-asks a question the device just answered, and a lock that
fires on every entry is a lock people switch off within a day. A switched-off
lock protects nothing.

It now guards only the gap the OS cannot cover: an **already-unlocked phone,
handed to someone, with the app still resident**. Five minutes after the app goes
to the background — up from 60 s, which is shorter than fetching a code out of
Messages and so fired during completely ordinary use.

Renamed **"Lock when unattended"**, and the description now says outright that
opening the app does not ask.

The honest cost, written down rather than glossed: a cold start on an unlocked
phone somebody else is holding is not gated. If that becomes the threat worth
covering, the changelog and the code both say exactly where the line goes back.

> ⚠️ **The version actually asked for — "Face ID only after 30 days" — is not
> implementable, and pretending otherwise would have been worse than saying so.**
> After 30 days the refresh token is *dead*. No gesture can revive it, because
> only the server can issue new tokens and it wants the password to do that.
> Biometrics can gate a session that still exists; they cannot resurrect one.

### 2. Offline never recovered without restarting the app

Real, and mine. **Nothing was watching for the network coming back.** The boot
revalidation runs once per account, the sync engine refreshes on foreground, and
neither of those fires when the radio quietly reconnects under an app that is
already open.

Two halves, and both were needed:

- **`httpBaseQuery` now reports reachability from every request**, in both
  directions. It is the only layer that actually knows. `@react-native-community/netinfo`
  is a *native* module and so cannot reach an installed build over the air
  (§5A.1) — and it answers the wrong question anyway: "the radio has an IP
  address" is not "CYPHIX is reachable", as any captive portal demonstrates. A
  4xx counts as *reached*: a 403 is the server being present and telling us
  something true.
- **`AuthGate` knocks on a backoff** (4 s → 8 → 15 → 30 → 60) while offline,
  because an app sitting on a screen that already has its data makes no requests
  for the transport to report from. Backoff rather than a fixed interval because
  the common offline case is a tunnel (seconds) and the other is a flight
  (hours), and one number cannot serve both.

`sessionMode` therefore moves in **both** directions now, and the strip is back to
reading one true signal instead of two stale ones.

### 3. It still sometimes went to the login screen — a migration bug I shipped

Before v0.40.0 the enclave held a refresh token and **nothing else**; the
principal was whatever the server had just said and was never written down. So
every phone that was already signed in when the update landed had a perfectly
valid token, no principal, and `readPrincipal()` → `null` → the door.

It looked intermittent because it happened **exactly once per install**, and
signing in again repaired it — the worst kind of bug report to receive, because
the fix erases the evidence.

`restore()` now falls back to a single refresh when a token exists with no
principal. That writes the principal and never runs again: self-healing, and the
only place `restore` is allowed to touch the network.

**A second cause, same class of mistake one layer down:** `readRefreshToken`
swallowed a SecureStore failure into `null`, which read as "there is no token"
and therefore as `rejected` — so a transient Keychain error signed the patient
out. An enclave that will not *answer* is not a server that *refused*. That is the
exact distinction this whole release was about, and I had left it unfixed
underneath the fix.

`tsc --noEmit` clean; both bundles export. **OTA** — TypeScript only, `app.json`
stays at 0.34.0.


## v0.40.1 - 2026-08-12 - the connection notice is glass, and says nothing when all is well

Reported from the phone about v0.40.0: *"the Connected capsule that pops up at the
top is really ugly — make something more delicate that feels native, not vibe
coded."* Three separate faults, and the first is the one worth keeping.

### "Connected" should never have existed

Reconnecting is not an achievement. A green success badge for it is a UI
congratulating itself for doing its job — and worse, it appeared **after**
everything was already fine, which makes it a new interruption caused by the
absence of a problem.

The honest confirmation is that the notice which *was* there is now gone. So the
capsule simply dissolves, and `connLive` is deleted from both locales rather than
left orphaned.

### It was a coloured plate next to a glass dock

The app's native feel **is** the material — the dock is Apple Liquid Glass on
iOS 26. A flat `successSoft` / `attentionSoft` rectangle with a hairline border
and a coloured status dot is a web toast, and putting one above a glass bar is
exactly the inconsistency that reads as improvised.

It is `GlassSurface` now: the same atom, with the dock's tint arithmetic **copied
rather than re-tuned** — two surfaces of one material must not be tuned
separately or they drift. And it is **monochrome**. `attention` and `danger` mean
specific things in this app (see the `tokens.ts` note on why `attention` exists
at all) and neither of them is "the wifi".

### It slid down like a notification banner

A banner arrives from off-screen because it comes from elsewhere. This is the app
talking about itself, so it **settles** into place: a spring on scale from 0.94
with opacity, and no translation at all.

It also stays **mounted** at zero opacity rather than using Reanimated's layout
presets, so `offline → connecting` changes the words underneath instead of the
whole capsule leaving and re-entering — the fidget the first version had every
time the sync engine woke up. The glyph sits in a fixed 14 pt box, so swapping an
outline icon for a scaled spinner cannot shift the label sideways by a pixel or
two. That kind of twitch is only ever noticed subconsciously, as cheapness.

`tsc --noEmit` clean; both bundles export. Appearance stays 🔬 until it is looked
at on a handset — the whole point of this release is that a build passing every
check told us nothing about how it looked.

**OTA.** TypeScript only, `app.json` stays at 0.34.0.


## v0.40.0 - 2026-08-12 - you stay signed in, and offline is not signed out

Reported from the phone: *"when I close the app for a while and then go back in,
it takes me straight to the login screen — and only when the server comes up does
it suddenly sign me in. It looks completely unprofessional. Like Instagram: it
doesn't log me out every time there's no internet. But it has to be done
properly, with no security hole."*

Both halves of that were one bug, and the bug was a **type**.

### `SessionUser | null` had two outcomes for three situations

`refreshSession()` answered `null` for *"the server revoked you"* **and** for
*"the request never left the phone"*. Having no way to tell those apart, the
caller had to pick one — and it picked signed-out.

That choice revokes **nothing**. The refresh token stays in the enclave either
way, because nothing was revoked; `tokenStore` was already careful about that and
even said so in a comment. So the bounce to the sign-in screen ended no session,
protected no data, and cost the patient access to the record already sitting on
their own phone. Security theatre, paid for in usability.

The second half was the same file. `restore()` **awaited** that refresh, so a
Render container still waking up meant `AuthGate`'s 4 s ceiling fired first (→
the sign-in screen) and the server's reply landed forty seconds later (→ the app,
apparently out of nowhere). Exactly what was described, in exactly that order.

### Three outcomes, named where nobody can re-flatten them

`RefreshOutcome` in `@cyphix/shared` `auth/session.ts`:

| outcome | meaning | what it does |
|---|---|---|
| `refreshed` | a server issued a new pair | session is live |
| `rejected` | a server **answered and refused** — revoked, expired, rotated out, family killed on a replay | clears the enclave, signs out. **The only thing that ends a session.** |
| `offline` | no answer came back | changes nothing at all |

A **5xx is `offline`, not `rejected`** — and that distinction is not academic
here: a sleeping Render service answers with a 5xx while it wakes, which is the
common case on this deployment rather than an exotic one.

### Restore no longer touches the network

The principal is now persisted beside the refresh token in the enclave, so
`restore()` is a disk read. It resolves in milliseconds, the app opens on it, and
whether the server still agrees is settled afterwards — behind the rendered app,
and again on every foreground. **A cold start is now the same length with the
server up, asleep, or absent.**

### The security, since that was the actual question

An offline session grants **nothing new**:

- the access token is memory-only, so it is gone after a cold start and every
  request 401s until a real refresh succeeds. The server remains the only
  authority over data; this changes what the client *renders*, never what it is
  *allowed to fetch*;
- what opening early unlocks is the device's own cache — data already on this
  device;
- **revocation is stronger than before, not weaker.** `rejected` clears the
  enclave. The old bounce-to-sign-in left the refresh token sitting in it;
- it is bounded by the refresh token's own lifetime, and the server now **states**
  that lifetime (`refreshExpiresInSec`, CYPHIX_SERVER v0.4.0) rather than the
  client hard-coding 30 days and never learning we had changed it.

### An app lock, which is what actually pays for opening offline

Face ID / fingerprint / device passcode in front of a restored session.
Settings › Account, **off by default**, and offered only where the OS can honour
it — a security switch that silently does nothing is worse than no switch,
because the patient believes in it.

- It goes back up after **60 s** in the background, not instantly. A lock that
  fires every time you fetch an SMS code gets switched off within a day, and
  then protects nothing.
- It renders **before** the navigator mounts, not over it. A lock with the record
  drawn underneath is one screenshot or one slow commit away from not being a
  lock.
- It is a gate on **rendering**, and is described as one. Anyone who can defeat
  the OS's own check can read the cache files directly and never meet it.
- The flag lives in the secure enclave, not `AsyncStorage`: plain storage is a
  file, and a security control a file edit can disable is decoration.

### A line at the top saying which you are looking at

`Connecting…` / `Offline · showing saved data` / `Connected` for a moment, then
silence. **The steady state draws nothing** — a permanent "online" badge stops
being read within a day, and then it is not read on the day it matters either.

It reads both `sessionMode` *and* the sync engine's phase, because `sessionMode`
only ever moves *towards* live: a confirmed session stays confirmed, so on its own
it could never report a phone that connected at boot and walked into a basement
an hour later.

### ⚠️ One hole found while reviewing this, and closed

`sessionMode` was set only by the boot revalidation, which runs once per account.
An app that opened while the server was asleep and reconnected two minutes later
— through any ordinary query's 401 → refresh → retry, which is most of them — had
no way to tell the slice, and would have sat on "Offline · showing saved data"
over data it had just successfully fetched. `sessionConfirmed`, the mirror of the
existing `sessionExpired`, now carries that upward from the transport.

### Verified

`tsc --noEmit` clean on mobile, web and server; `expo export` bundles for iOS and
Android; `expo-doctor` 18/18. That proves the code is **well-formed**, not that it
works — per `CLAUDE.md` §6.4, the cold-start behaviour, the lock and the strip stay
🔬 in `PARITY.md` until someone has closed the app, left it, and reopened it on a
handset.

**OTA.** TypeScript only — `expo-local-authentication` and `expo-secure-store` are
both already in the 0.34.0 binary — so `app.json` stays at 0.34.0 (§5A.2).


## v0.39.2 - 2026-08-09 - sheets open above the dock, and rise in one piece

Reported after v0.39.1: *"the confirm is still hidden underneath, and the
slider coming up from the bottom flickers badly."* Both were still true. The
scroll fix was real and it was not enough, because the last cause of each was
never inside the sheet.

### The button was never going to be reachable there

The floating dock is the tab navigator's `tabBar`. That makes it a **sibling of
the screen**, painted after it — and nothing a screen renders can paint above a
sibling of the screen, because `zIndex` orders siblings *within one parent* and
these have different parents. No value set inside the sheet could have changed
it.

So v0.39.1 moved Save from **off screen** (clipped by the panel's ceiling) to
**behind the dock** (pinned into the ~90 pt the bar occupies). Different cause,
identical result, which is exactly why the second report read the same as the
first.

Two more consequences of the same fact, both live until now and neither
reported yet:

- the scrim did not dim the dock, so a modal left one bright saturated control
  sitting on top of it;
- **the dock stayed tappable through the scrim** — a patient could change tabs
  with an unsaved edit open, leaving the editor mounted and its draft alive on
  a screen they had walked away from.

Overlays are now rendered at the **app root**, above the navigator, through a
small portal (`components/atoms/OverlayPortal.tsx`). Only the elements move:
every hook, `Animated.Value` and piece of state stays in the component that
owns it.

★ **A `Modal` would also have solved it, and is the one thing that must not be
used.** A Modal is its own window, so the blur inside it has nothing to sample
and every glass sheet renders as the flat grey rectangle it was written to
replace (v0.18.0, still in the traps table). A portal keeps the overlay in the
**same window** and changes only its parent. Same window, different parent —
that is the whole trick, and it is why "present in tree" was always the rule
and "inside the screen's own subtree" was never what it meant.

### And the flicker had a third cause: *when*, not *what*

v0.39.1 removed two (an unbounded panel growing as rows mounted, and a second
commit re-seeding the draft). The one left is the one that survives fixing the
first two:

**The slide started in the same commit that mounted the content.** Two dozen
catalogue rows is a hundred-odd native views, and views are created and laid
out **on the UI thread** — the very thread a native-driver animation runs on.
So the first frames of the rise were competing with the mount for that thread
and the sheet arrived in visible steps.

`useNativeDriver: true` does not help here. It is what puts the animation on
the busy thread.

The panel is therefore committed **off screen** first, and rises only once its
content has reported a layout. By then the views exist and the thread is idle.
It costs one frame before the sheet moves and buys every frame after it.

The draft is also seeded **during render** now instead of in an effect, so
opening builds the rows once rather than mounting them and then correcting
them a commit later.

### Worth stating plainly

This is the second release in a row shipped on green typechecks, green bundles
and `expo-doctor` 18/18 for a screen that could not be used. None of those can
see a button rendered underneath another view — and the fix for the first
report was verified exactly as thoroughly as the bug that survived it.

---

## v0.39.1 - 2026-08-09 - the edit sheet scrolls, and Save is pinned

`BottomSheet` rendered its children with no scroll view, inside a panel capped
at 82 % of the window with `overflow: hidden`. Content past that ceiling is not
scrolled to — it is **clipped**. Twenty-three catalogue rows plus a Save button
meant the button was not on screen at all.

`scrollable` (opt-in, since every other sheet is short) and the editor's Save
moved into the sheet's `footer`, a prop that existed for precisely this.

⚠️ **Incomplete**, and v0.39.2 says why: pinning the button to the bottom of a
bottom-anchored panel put it under the dock. It was still unreachable when this
shipped.

---

## v0.39.0 - 2026-08-09 - the medical card can be edited, and it writes to the server

Allergies, medicines and family history are editable from the Profile tab: the
section header carries an Edit control, which opens one sheet over the blurred
card it is editing — not a pushed screen per category, which would be four
screens and four ways to get lost for a job that is over in two taps.

Picks come from a **shared cardiac catalogue** (`CYPHIX_SHARED/src/types/
healthCatalogue.ts`) so the phone, the web and the server agree on what was
meant; free text produces "asprin", "Aspirin " and "ASA" for one substance and
nothing downstream can tell they are the same. **"Something else" is always
available** — a list that cannot express the patient's real answer teaches
people to pick the nearest wrong one, which is then recorded as if it were true.

Server side: `PATCH /api/v1/patients/:id/card` (server v0.3.0), validated,
audited by **field name only** — never values — and verified against the live
database across twelve cases before this shipped.

Two rules the client keeps:

- **Only the edited category is sent.** A client that echoes back every field
  it rendered reverts anything changed elsewhere since it loaded: invisible on
  one device, inevitable with two.
- **Nothing is written until Save**, and a failed save keeps the sheet open
  with the draft intact. Closing on failure would discard what was just typed
  and leave the patient believing it was stored.


## v0.38.1 - 2026-08-09 - ECG ID is monitor green, not teal

Teal lasted one release, and the objection was right in a more interesting way
than "wrong colour": **teal reads as an app; green reads as an instrument.**
Every continuous monitor on the market is green for the same reason.

`signal` is `#00A862` on light, `#3DDC84` on dark.

**Two weights, deliberately.** A green vivid enough to be worth having sits
around 2.6:1 on white - fine for a 0.22 mm trace, unreadable as 12 px type. So
`signal` is strokes, bars, arcs and dots, and `signalInk` is anything that is
words. Darkening a single token until it served both is precisely the mistake
that made `attention` brown, and it was not going to be made twice in two days.

### Two things that had to move with it

**The dark-mode baseline trace went near-white.** The rule this panel follows is
*baseline neutral, compared study in the brand colour* - navy against green on
light, and it reads instantly. Keeping the report's green trace in dark would
have put green against green: two curves the eye has to work to separate, in the
one place whose entire job is showing where they differ. The report keeps its
own palette; this is not the report.

**The ring stopped changing hue with confidence.** It went `accentLive` →
`success` as the baseline matured, which only worked while those were blue and
green. With Insights green throughout they are one colour to the eye and the
distinction would simply have vanished. Confidence is carried by **weight** now
- and that is the better encoding regardless: it reads as the same thing getting
more definite, which is what is actually happening, rather than as a change of
state.

## v0.38.0 - 2026-08-09 - ECG ID in brand teal, and Settings rows stop crushing their labels

### The Settings layout bug

Reported with a screenshot: "On-device processing" wrapping one character per
line down the left edge, with a chip taking the rest of the row.

`SettingsRow` had `control: { flexShrink: 0 }` - "the control keeps its natural
size". That is right for a `Switch` and wrong for everything else. Give it a
long chip ("Secure On-Device Processing") and the control takes the width it
asks for; `flex: 1` on the label column loses to a sibling that refuses to
yield, and the label collapses.

A control may now shrink, and may never take more than half the row. Nothing
with a fixed intrinsic size - a Switch is about 51 pt - notices; only something
that was going to bully the label does.

### The colours

Insights was drawn in `accentLive`, `#2F6BD8`. That token means **live** - the
streaming dot, the running trace - and it is a generic UI blue that was doing a
job it had never been chosen for. It looked like one.

It is the brand **teal** now (`#0AA3B2` light, `#2DD4BF` dark), which the entire
signed-out flow already carries. `accentLive` itself is untouched, so the
report, the viewer and the status dot are exactly as they were - repainting
those was not asked for.

**And `attention` stopped being brown.** `#B45309` was picked so it would clear
4.5:1 as body text on white, and any amber dark enough to do that *is* brown.
The fix was structural rather than chromatic: the accent is now only ever a
stroke, a border, a dot or a soft fill, and deviation text is drawn in the
ordinary text colours. Freed from carrying text contrast, the colour could
finally be the gold it should have been - `#D99A2B` / `#F0B84A`.

A marked deviation is still distinguished by more than colour: it gains a
filled dot as well as the gold rule and heavier fill, so it survives a
colour-blind reader and a greyscale screenshot.

### "Early studies that disagree" is gone

It was defensible in the abstract - the first studies weigh most, so a bad one
bends the reference every later study is judged against. On a real screen it was
not: it asked the reader to judge, from a date and a percentage, whether a
recording from weeks ago had been badly taken. Asked what it was *for*, there
was no good answer.

The model still flags them (`flaggedAtEnrollment`) and the timeline still draws
them in the attention colour, so a divergent early study stays findable exactly
where every other study is looked at. What went is a section that repeated that
in prose - along with its two translation keys, deleted rather than orphaned.

## v0.37.0 - 2026-08-08 - The second ask is on by default, and Reminders fits on one screen

### On by default

Someone who has set reminders at all has already said they want to be caught
when they forget - a reminder they slept through having no consequence is the
exact case they were guarding against. So the second ask now defaults to **on,
an hour later**. It is one tap from Off, and a measurement silences it before it
ever fires, so being wrong about this default costs nothing.

**The subtle part is telling "Off" apart from "not set".** `normalizeSchedule`
now treats them differently:

| stored | means | result |
|---|---|---|
| `null` | the patient chose Off | stays off |
| a number | their chosen delay | kept |
| **missing** | written by a build that had no such field | **takes the default** |

Coercing the third case to `null` is what silently left the follow-up off on
every install that predated it - and that is what had somebody waiting an hour
for a notification that had never been armed.

### One screen

Reminders had grown to four sections, three descriptions, a subtitle and a
footnote: a whole scrolling page to set a notification. It is one card now, and
every cut followed one rule - **a control that explains itself needs no sentence
under it.**

- **`Off` became a segment** of the follow-up control. That single change
  collapsed a switch, its description and the heading they lived under into
  nothing, for identical expressive power.
- **The two armed counts and the test button became one row**, whose *value* is
  the count: `2 + 6 set`.
- Section descriptions, the page subtitle and the footnote are gone - and so are
  **17 translation keys per language**, deleted rather than left orphaned.

What stayed, and why: the permission warning (every control above it is a lie
without it) and the armed count (it is fact rather than intent, and its absence
once cost an hour).

### Verified

The 15 malformed-input cases still produce no invalid dates, and five new cases
confirm the default logic: explicit `null` stays off, 30 and 120 are kept, and a
missing field - from an older build or a brand-new install - takes 60.

## v0.36.0 — 2026-08-08 — See what the phone actually holds, and test it in a minute

An hour was spent waiting for a follow-up that never arrived — and **the app
could not say why**. That is the real defect this release fixes.

The follow-up itself was most likely never armed. Two ordinary things produce
exactly that symptom, and both were in play: the crash rollback put the phone
back on **0.34.0, which has no follow-up at all**, and `normalizeSchedule` in
the 0.35.1 fix resets `followUpMinutes` to `null` on any schedule saved before
it. Primary fires, second ask does not. Neither was discoverable.

### "Check it works"

A section reporting what the **operating system** is holding, read straight from
`getAllScheduledNotificationsAsync`:

```
Daily reminders set      2
Follow-ups set           6
```

Every other reading on that screen described **intent** — the switch, the times,
the next one due — and intent was never what was in doubt. These two numbers
cannot agree with a mistaken belief held anywhere else in the app, and they
would have answered the question in about two seconds.

### "Send a test now"

Fires the **real** primary in 10 seconds and the **real** follow-up 70 seconds
later, through the same content, category and actions. It is not a mock: if the
test works and the scheduled one does not, the difference is timing, not
plumbing.

A feature whose shortest honest interval is thirty minutes is otherwise close to
untestable — which is precisely how an hour gets spent.

### The follow-up now repeats

Three times, ten minutes apart, all carrying the same `due` so **one** Done — or
one measurement — cancels the whole chain rather than only the next one. One
notification on a lock screen is one chance to be looking at the phone; three,
spaced out, survives being in another room.

⚠️ Which forces a **budget**. iOS keeps at most **64 pending notifications** and
silently drops the rest, and 4 slots × 7 days × 3 repeats is 84. Occurrences are
now armed in **time order until the budget is spent**: tonight's reminder
matters, next Tuesday's third repeat does not.

On Android the follow-up gets its own **HIGH-importance channel**, so it arrives
as a heads-up rather than a quiet row. The primary stays `DEFAULT`: it is a
routine nudge at a time the patient chose, and nothing this app produces is
urgent by construction — it does not interpret, so it can never know that
anything is. The follow-up is different, and the difference is **consent**: the
patient switched on a thing whose entire job is to catch a miss.

### What iOS will not let me do yet

Making a notification genuinely *prominent* on the iOS lock screen means the
**Time Sensitive** interruption level, and that needs the
`com.apple.developer.usernotifications.time-sensitive` entitlement — a native
rebuild and a new capability on the App ID. It is a defensible claim for this
feature, unlike the push entitlement stripped in 0.34.0, but it is a rebuild
rather than an over-the-air change. Say the word and it goes in the next binary.

## v0.35.1 — 2026-08-08 — Fixes the v0.35.0 crash

**v0.35.0 crashed the app on every navigation.** Reported from the phone as
"it crashes when I press anywhere". Production was rolled back to the embedded
0.34.0 bundle within minutes of the report; this is the fix.

### What happened

v0.35.0 added `schedule.followUpMinutes`. Every existing install had a schedule
**persisted by v0.34**, which has no such field — and `hydrate` was
`{ ...state, ...payload }`, which replaces a nested object *wholesale*, so the
new field never took its default.

From there it is a chain of four things each of which looked fine:

1. `followUpMinutes` hydrated as `undefined`.
2. `undefined !== null` — so the "is the follow-up switched on?" guard **passed**.
3. `new Date(NaN)` was built from it.
4. **An Invalid Date is truthy**, so it also survived `if (!followUpAt) continue`.

Handing that to the OS scheduler threw, inside a `void (async () => …)()` with
no `catch` — an unhandled rejection. `useReminders` is mounted by the Tests
**tab**, so it re-fired on essentially any navigation.

### Fixed in four places, on purpose

Any one of them alone would have left the next version of this bug alive:

1. **`hydrate` merges nested objects** and puts the schedule through the new
   `normalizeSchedule`. This is the root cause: *what is on disk was written by
   a different program* — an older build of this one — and is untrusted input.
2. **`normalizeSchedule`** (shared) validates types and ranges, so every
   optional-ish field has exactly one absent value and downstream code has one
   thing to test.
3. **The scheduler checks `Number.isFinite(date.getTime())`**, not truthiness,
   and a `safely()` wrapper catches every call into `expo-notifications`.
4. **Every `void (async …)()` in the feature catches.** A reminder that fails
   to arm is a reminder that does not arrive; it must never be an app that dies.

### Verified

Against the exact blob that crashed it, plus fourteen other shapes a disk can
hand back — `null`, a string, missing slot ids, `NaN` times, times outside the
day, `followUpMinutes` as `NaN` / `"60"` / `0` / `-30`, `enabled: "yes"`, nine
slots. None produce an invalid date; the good schedule still produces 19:00 →
20:00. The nine behaviour cases from v0.35.0 all still pass.

### The lesson, which is worth more than the fix

**A persisted shape is untrusted input, and `x !== null` is not a null check
when the value can be `undefined`.** Both are now written into the code at the
places that have to remember them: the `hydrate` reducer, `normalizeSchedule`,
and the guard in the scheduler.

Worth saying plainly: typecheck, both bundles and `expo-doctor` all passed on
v0.35.0. None of them can see a value that only exists on a device that has
been running an older version of the app.

## v0.35.0 — 2026-08-08 — Reminders ask a second time, and carry Snooze / Done

Set a reading for 19:00 and, if nothing is in your history by 20:00, the phone
asks once more.

**The word doing all the work is *if*.** A patient who measured at 19:12 must
not be nudged at 20:00 about the thing they already did — nothing erodes a
reminder faster than being wrong about what you already know. A reading up to
**45 minutes early** counts as well: 18:50 is the evening reading.

### ⚠️ The two kinds are armed differently, and have to be

|  | how | why |
|---|---|---|
| **Primary** | repeating `DAILY` trigger | Fires whether or not this app has run in a month. That guarantee *is* the feature. |
| **Follow-up** | dated one-shots, a week ahead | It is **conditional**, and nothing can evaluate "did they measure?" while the app is closed. |

So the condition is applied when the app *is* open: an occurrence whose window
already contains a recording is simply **never armed**. That is cheaper than
cancelling one later, and it works for a reading taken on another device and
synced here.

The honest cost: follow-ups exist only as far ahead as they were armed. They are
re-armed on every launch **and after every recording**, so a patient would have
to ignore the app for a week to lose them — by which point the primary
reminders, which never stop, are the thing doing the work anyway.

### Snooze / Done

The notification now carries two actions, so it is something to **act on**
rather than only swipe away — which is what was asked for.

- **Remind me in 15 min** re-fires it.
- **Done** cancels that occurrence's second ask.

Neither opens the app: the whole point of "not now" is that it costs nothing.
Done is matched on the slot **and the date it was due**, because the same slot
has a follow-up armed for each of the next seven days and cancelling by slot
alone would silence the rest of the week.

### ⚠️ It also fixes a latent race

`useReminders` is mounted in three places, and Settings + Reminders are on screen
together whenever the editor is pushed. Two concurrent cancel-then-set passes
could interleave and leave duplicates or nothing. Every apply now goes through a
queue that serialises them.

Nobody reported this, and nobody easily could have: it would present as
"sometimes I get two", which is close to impossible to reproduce on purpose.

### The copy stays neutral, by rule

No "you missed", no "you still haven't". The app does not know why a reading did
not happen, and a reminder that scolds is a reminder that gets switched off. It
says the reading is still open and to take it whenever suits.

### Verified

The window logic is where this feature lives or dies, so it was probed rather
than reasoned about: on-time, 10 min early, 44 min early (in), 50 min early
(out), one minute before the follow-up (in), five minutes after (out), nothing
at all, an unrelated lunchtime reading, and a morning reading against an evening
slot. Twelve cases, all as intended. Plus tsc, both bundles and doctor.

**Not yet seen on a device** — and the two things a bundle cannot prove here are
exactly the new ones: whether the action buttons appear on the lock screen, and
whether a follow-up correctly stays silent after a real recording.

## v0.34.2 — 2026-08-08 — The boot splash is the CYPHIX wordmark on white

It was navy with the full lockup. It is now the wordmark on white, matching the
web — and specifically matching **which** web screen, because the web has two
branded loading surfaces and they are not interchangeable:

- `LoadingScreen` — drifting blobs, an orbiting spinner, the full lockup. The
  showy one.
- `AuthGate`'s restore splash — `CyphixWordmark` on the page background with a
  small busy ring, and nothing else.

This is the second, at the user's instruction, and it is the right one for the
job anyway: **this screen exists because a disk read is in flight.** That is a
fraction of a second and it is not an occasion. Reserving the theatrical version
for somewhere it is earned is what keeps it meaning something.

**The wordmark, not the lockup.** `BrandLogo` adds the mark and "MEDICAL", which
is full identification — correct on a report, where the issuer of a clinical
document must be unambiguous, and heavy on a screen that is up for under a
second while the app works out who is signed in.

### Three things that came with it

**The status bar flipped to dark glyphs.** Light ones were right on navy and are
invisible on white — and a typecheck, both bundles and `expo-doctor` all pass
happily with an unreadable clock.

**The splash floor went 1700 → 900 ms.** 1700 existed so the old *entrance
animation* could finish landing; that animation is gone, so the only job left is
not flickering — a screen that appears and vanishes reads as a fault. Leaving
1700 would have been a magic number whose reason had been deleted out from under
it, and it costs three quarters of a second on every cold start.

**The version line stays**, but moved from `muted` to `label`. With OTAs landing
several times a day it is the fastest honest answer to "did my change reach the
phone?" — but `#B3BCC9` at 75 % opacity on white is about `#C6CDD6`, i.e. a line
that is in the render tree and not on the screen.

### For the record, since this is the second time

v0.19.3 went white with a mark-only lockup and was reverted to navy. That revert
is not evidence against white: the objection then was the cropped **mark**, not
the background. This keeps the white and uses the **wordmark**, which is what
the web actually shows.

## v0.34.1 — 2026-08-08 — Reminders is a screen now, not a bottom sheet

Reported from the phone: it works, but it comes up from the bottom, it's small,
and it doesn't feel native.

That was a container problem, not a styling one. **On iOS a settings row with a
chevron pushes a panel.** A bottom sheet is for a quick action or a single pick
— something you glance at and dismiss. A switch, a segmented control, a list of
times and an inline picker crammed into a half-height sheet is a settings panel
wearing the wrong clothes, and it looks improvised because it is.

It is a pushed route now. That also gets it, for free, the things the sheet had
to approximate: the native slide transition, the edge-swipe back gesture, a real
back affordance, and as much height as the content wants.

### It is built from Settings' own parts

`SettingsSection`, `SettingsRow`, the same backdrop, the same top bar, the same
page metrics — **not for code reuse, for continuity**. This screen is reached
from Settings and belongs to it, so a bespoke layout would announce itself as
somewhere else. Looking like the screen you came from is most of what "feels
native" means here; the rest is the OS transition doing its job.

The times are now full settings rows with the time as their value, and the
picker opens beneath the row it belongs to with room around it rather than
squeezed against a sheet's edge.

### One switch instead of two

The master switch (`testReminders`) and the schedule's own `enabled` flag are
still two things in the model — that is what lets a patient silence reminders
for a fortnight without losing the times they chose. But on *this* screen they
cannot usefully differ, and a patient facing two toggles that both say
"reminders" has to work out which is which. One switch drives both.

### Also

- A footnote saying reminders are a note to yourself, and that how often to take
  an ECG is a decision for the patient and their doctor. The same rule as
  everywhere else in this app: it records what was chosen, it does not advise.
- The permission-denied notice moved out of the sheet and sits directly under
  the switch that appears to have done something — which is where someone looks
  when nothing arrives.

## v0.34.0 — 2026-08-08 — Measurement reminders: pick how many a day and when, and the phone asks

⚠️ **Native rebuild, not an OTA.** See the bottom of this entry.

The app could tell you what you had measured and whether anything had changed.
It could not ask you to measure. Now it can: how many times a day, at what
times, and the phone notifies you — every day, whether or not this app has been
opened since.

### Where it went, and why there

**Settings already had the switch.** `testReminders` has existed since v0.2 as a
toggle that stored a boolean and did nothing at all. It is now the real thing,
and the row itself opens the schedule.

The switch and the times stay **two settings**. The switch answers "may this app
remind me at all"; the schedule answers "when". Folding them into one control
would mean a patient who silenced reminders for a fortnight lost the times they
had chosen and had to set them again — so switching off keeps the schedule, and
switching on restores it.

**The Tests tab's badge was the word "Scheduled".** Static, and therefore an
answer to nothing. It now prints the actual next reminder, because that circle
is where a patient looks to ask *when am I meant to do this?* With nothing set
it falls back to the plain word, which is still true — that is the test the app
schedules.

### The editor asks the question a patient can answer

"How many times a day" first — *twice* is a thing a patient (or their doctor)
has an answer to — and the times follow from it, pre-filled with sensible
waking-day anchors that are all editable. Asking for times first means an empty
list and an add button, which is a data-entry form.

The rows are named by **part of the day**, chosen from the time rather than the
index, so a reminder dragged to 07:30 reads "Morning" and not "Reminder 2". At a
glance the list reads as a day.

The time picker is the OS's own — the real iOS wheel, the real Android clock
dialog. A hand-rolled picker is the fastest way to make a settings screen feel
like a website, and this is a control every one of these users has operated a
thousand times to set an alarm.

### How it fires, and the failure it is built to avoid

A repeating **daily trigger**, handed to the operating system. Deliberately not
a background task that re-arms itself: that would be at the mercy of iOS's
background-execution budget, so a patient who had not opened the app in a week
would silently stop being reminded — which is the one failure this feature
cannot have. Four repeating triggers cost nothing and survive a reboot.

**The stored schedule is the truth; the OS's pending notifications are a
projection of it.** Every path that edits the schedule ends in the same
`applySchedule`, and it is re-applied on mount. That last part fixes a bug that
would otherwise have been invisible: a notification's words are baked in when it
is *scheduled*, so a patient switching the app to Hebrew would have kept getting
English reminders until they next happened to edit their times.

Permission is asked when reminders are switched **on** — the moment the patient
has said what it is for — and never re-asked after a settled no, because on iOS
a second request shows no prompt at all and would read as a silent failure. If
it was denied, the sheet says so in words: a schedule that looks armed and never
fires is worse than one that is plainly off.

### The schedule belongs to the patient, not to the phone

The shape lives in **`CYPHIX_SHARED`** (`types/reminder.ts`). It looks like a
device preference, and it is one, but it is also a statement about someone's
care — "three readings a day, morning, midday and evening". It has to survive a
new phone, it has to be legible to the web app, and a clinician who asked for
twice a day should be able to see whether that is what the app is asking for.

Times are stored as **minutes of the local day, never as instants**: a reminder
is a time of day, and pinning it to a date and a timezone would wake a patient
who flew somewhere at 03:00.

**Nothing in it recommends how often to measure.** Four a day is a UI bound, not
advice; there is no "recommended" marker on any option and no streak language
anywhere. How often to take an ECG is a clinical instruction and this app does
not give those — the same rule that governs the rest of the clinical stack.

### ⚠️ The first build of this failed, and the fix is worth knowing

```
Provisioning profile "…AppStore…" doesn't support the Push Notifications
capability / doesn't include the aps-environment entitlement.
```

`expo-notifications` adds `aps-environment` to the iOS entitlements
unconditionally — **and its config plugin is applied by autolinking**, so
deleting it from `app.json`'s `plugins` array does nothing at all. (Verified
rather than assumed: `expo config --type introspect` still reported the
entitlement afterwards.)

The obvious fix is to enable Push Notifications on the App ID and reissue the
profile. That is the wrong fix. This app schedules **local** reminders through
`UNUserNotificationCenter`, which needs no entitlement: nothing calls
`getExpoPushTokenAsync`, no device token is ever created, no server can reach
the phone. Claiming the capability would leave an entitlement list that does not
describe the binary — in an app whose whole argument is that it claims only what
it does — and hands App Store review a fair question with no good answer.

So `plugins/withoutPushEntitlement.js` deletes the key after the library sets
it. It *deletes* rather than blanks, because the library's own guard is
`if (!config.modResults['aps-environment'])` and an empty string would simply be
overwritten on the next run.

★ Worth keeping: **`expo config --type introspect` runs the whole config-plugin
pipeline on Windows.** This entire class of failure — entitlements, Info.plist,
manifest — is now checkable in seconds instead of costing a 30-minute cloud
build to discover.

### ⚠️ Why this one is a rebuild

`expo-notifications` and `@react-native-community/datetimepicker` are **native
modules**. They cannot reach an installed build over the air, so `app.json`'s
`version` moved to **0.34.0** together with `version.ts` — the only situation in
which those two numbers travel together (mobile `CLAUDE.md` §5A.2).

Every OTA after this one must be published while `app.json` still reads 0.34.0,
or it targets a runtime that no installed build has, reaches nobody, and reports
success while doing it.

## v0.33.3 — 2026-08-08 — The ECG sheet is a panel, not a grid running off the screen

Flush to the display was fine while the corners were square. The moment they
were rounded it stopped working: **a curve that ends against the screen edge
does not read as a corner — it reads as the grid spilling off the screen.** A
rounded rectangle has to be seen to be one.

The sheet now stops `SHEET_MARGIN` (10 pt) short on each side. That is half the
page's own 20 pt margin, so it is still visibly wider than everything around it
— it still breaks out of the text column — while being a shape you can read the
edges of. "Almost the full width", which is what was asked for.

## v0.33.2 — 2026-08-08 — The ECG sheet has rounded corners

The full-bleed grid ended in hard 90° corners, which read as a slab rather than
as a panel. Rounded at the app's own radii — `lg` for the signature, `md` for
the shorter rejected-beats sheet, since radius scales with the surface.

**Done as an SVG `ClipPath`, not as `overflow: 'hidden'` plus a `borderRadius`
on the wrapping `View`.** Clipping a native SVG child to a parent's rounded
corners is one of the places iOS and Android have historically disagreed, and a
corner that is round on one platform and square on the other passes typecheck,
both bundles and `expo-doctor` without complaint — the exact class of defect
this project's definition of "verified" exists to keep honest.

Two details that would otherwise bite later:

- the radius converts **points → millimetres through the sheet's own scale**, so
  the curve reads the same whatever width the sheet is handed. A fixed
  millimetre radius would grow and shrink with the device.
- each sheet's clip path gets a `useId` identifier, because react-native-svg
  resolves `url(#…)` per *document* on Android: two sheets sharing an id would
  both clip to whichever one mounted last.

The lead label and the scale caption moved in from 16 pt to 20 pt so they clear
the arc rather than sitting in the part that was just cut away.

## v0.33.1 — 2026-08-08 — The ECG edges stopped being clipped; the timeline is the picker

### The full-bleed trace was being cut, and the lead label with it

Reported from the phone: the edges are shaved and the `I` / `II` / `aVL` label
sitting there is clipped. It was not a padding number being wrong.

**A negative margin cannot escape a ScrollView.** React Native clips a
scroller's children at its own frame, so making a child wider than the scroller
does not overhang — the overhang is simply lost. The shell was applying the
side padding, which made the scroll view 40 pt narrower than the screen, and
the signature's `marginHorizontal: -20` was quietly cut off on both sides. The
lead label lives 16 pt from the edge, i.e. entirely inside the cut.

The fix is to stop the scroller being narrow. `PatientShell` gained
`bleedHorizontal`, which drops its own side padding, plus `shellPaddingH()` so
the screen re-applies *the same number* rather than a copy of it — two 20s that
are meant to be one 20 is how a layout drifts on the first device with a
different notch. History now pads its header, its tabs and its scroll content
itself, and the ECG cancels that padding with a negative margin that finally
has room to go.

### "Latest study" is gone, and the timeline took its job

Asked whether that block was earning its space. It was not — and the reason is
worth stating, because deleting it outright would have lost something.

Its *date* and its *match figure* were the last bar of the chart directly below
it, said again in bigger type. That is the duplication that made it feel like
filler. But its **deviation chips** are the only place in the whole feature
where "has anything changed" is actually answered, so they could not go.

So the two merged. **The timeline is now a picker**: tapping a bar selects that
study and the detail beneath the chart becomes that study — defaulting to the
newest, so the common case is unchanged. The beats that study left out moved in
beside it, since they are evidence about that study and were sitting two
scrolls away in a section of their own.

A bar tap no longer navigates; the detail row does. That also fixes something
the old design got wrong quietly: tapping an old bar used to be a one-way door
out of the screen, so the chart could point at an outlier and then only offer
to change screens about it. Now you can look first.

Net: two sections fewer, nothing lost, and every older study became inspectable
instead of only openable.

## v0.33.0 — 2026-08-08 — Insights has no cards: the ECG runs edge to edge on the page itself

Three separate reports from the phone, one cause underneath all of them: the
ECG was drawn **inside** things instead of being the thing.

### The box resized, and that is why it felt unstable

Height and gain were each derived per lead from that lead's own amplitude. So
every lead drew a different-sized rectangle, and dragging the builder resized
it under the finger while you were using it. Reported exactly as it behaves.

Both are now chosen **once**, from the tallest lead in the whole identity, and
handed into the sheet — one gain, one channel height, every lead. That is what
a real 12-lead sheet does, and it is not only a layout fix: a small lead now
draws as a small trace in the same box, which is **true**, and is information.
A lead scaled to fill its own box is the picture that lies about it.

The gain is still one of the three standard values (10, 5, 2.5 mm/mV) and is
still printed on the sheet. A *fitted* gain would be the same mistake the web
report made with its 17.1 mm/s sweep speed.

### The white rectangles are gone

White ECG paper, inside a white card, on a grey page. Three nested rectangles —
which is precisely how you announce "this is a picture pasted into a layout".
Web dashboards look like that. Instruments do not, and the report of it not
feeling native was right.

There are no cards in Insights now. A section is a small-caps label, its
content, and a full-bleed hairline. The trace is drawn straight onto the app's
own background with the grid as a faint tint of the brand navy.

**The report keeps its paper**, and that is not an inconsistency: `EcgStripSvg`
is a *document* — a printable page, on paper, with real edges, whose grid is
the ruler a clinician measures against. This is a panel on a screen. Same
geometry, same `buildEcgGrid`/`buildEcgPath`, same standard scales; different
surface.

### The ECG got the width, and the text got out of its way

The signature runs **edge to edge**. The bleed is *measured* — screen width
minus content width — rather than a hard-coded `-20`, because the shell's
padding is `max(safe-area, 20)` and changes with the notch and the orientation;
a hard-coded inset leaves a hairline of page down one edge on exactly the
devices nobody tests on.

And the prose behind it was cut to one line per section. `insCoverageBody` was
deleted outright — the dimmed, empty V1–V6 cells already say what it said. What
survived is what the screen genuinely cannot say without words: **what a
difference IS** (a number nobody can interpret is worse than no number), and
the disclaimer.

### Smaller things

- The baseline figures are a plain row of numbers rather than bordered tiles —
  they are five *numbers*, not five controls, and a grid of boxes was the same
  everything-is-a-rectangle problem one level down.
- The compare toggle lost its button chrome; it is a visibility switch for the
  trace beside it, not something competing with the trace.
- `RejectedBeats` now draws at the identity's gain rather than one fitted to
  itself, so every trace in Insights is on one scale and a beat twice as tall
  is drawn twice as tall — which is the whole point of that picture.

## v0.32.0 — 2026-08-08 — ECG ID: drag the beat to measure it, drag the track to build it

v0.31.0 shipped the maths and a page to put it on. Seen on the phone, the page
was the problem: it looked like a landing page rather than an ECG system, and
it was something to look at rather than something to use.

### The green capsule had to go, and so did the red

**Green means "pass".** A baseline existing is not a pass, and this layer is
not permitted to grade anything at all — so a green `ESTABLISHED` capsule next
to a 24 pt headline was a verdict rendered as styling. State is now a
letterspaced small-caps line, which is the register a clinical instrument
labels its own panels in, and there is no status colour on the card.

**Red is worse.** On a medical device red means alarm: something is wrong, act
now. A distance from your own baseline is a *measurement* — the app does not
know whether it is bad and is forbidden from saying so. Reported from the phone
exactly as it fails: the red made people tense before they had read what it
referred to. Every deviation, flag and outlier is now amber (`attention`, a new
token) — "look at this", full stop. `danger` stays where it belongs, on
destructive actions and real failures.

And the chips gained a sentence saying what a difference actually is, because
they were reported as unclear. **A number nobody can interpret is worse than no
number: it worries without informing.**

### Two layout bugs

"Confidence 48 %" printed straight **through** the enrollment ring. A `Text`
inside a flex row does not wrap — it overflows its parent — and that column had
no `flexShrink`. (`MetricTile` carries a comment about this exact failure; it
was not read.) Fixed, and the ring was reworked while it was open: it used to
sit at `5/5` for the rest of the account's life. It now draws **segments while
enrolling** (a countable target of studies) and a **continuous arc for
agreement** once established — two quantities, two shapes.

The **grey band under the content** was the shell reserving the dock's
footprint as padding, so the page ended above the bar and the strip the dock
floats over was bare background. That also left a frosted bar with nothing to
refract, which defeats the point of it. `PatientShell` gained
`scrollsUnderDock`; the clearance moved onto each scroll view's content inset,
and both History tabs now travel behind the glass.

### A caliper you drag along the beat

Tap or drag anywhere on the signature and a line follows your finger, ticking
once per small square — 20 ms at this sweep speed, so the grid becomes
something the hand can feel. It reads out **time from R**, the baseline in
**mV**, and the width of **your own range** at that point, plus the latest
study's value when it is overlaid.

The readout is in the chrome, not on the paper. History's calipers learned that
in v0.16.0: a readout floating on the trace covers the deflections whose
position it reports.

Two gesture details that are the difference between a control and an
interruption: the pan claims horizontal movement and explicitly **fails on
vertical**, handing the page back to the scroll view — without that the card is
a hole you cannot scroll through. And it acts on `onStart`, not `onBegin`, so
resting a thumb while flicking past does not drop a caliper and buzz.

### A track you drag to build the average

One notch per contributing study. Drag right and the baseline assembles study
by study under your finger, one haptic tick each. It is the only control here
that **explains** the feature rather than describing it: told that averaging
many recordings cancels what is not the heart, a reader has to take it on
faith; given this, they watch it happen in about two seconds.

**⚠️ It was written claiming the shaded band tightens as studies are added.
Measuring it said otherwise.** Across six simulated sessions with ordinary
variation the mean tolerance went 0.021 → 0.026 → 0.028 mV and then settled.

That is not a defect, it is the definition: the corridor is a **prediction
interval for the next study**, not the standard error of a mean, so it
converges on this person's real variability instead of shrinking toward zero.
Both things it is built from are population spreads, and neither gets smaller
because you looked more.

The true story is the better one and is what ships. After one study the band is
narrow only because it holds nothing but that recording's own beat-to-beat
noise — **a single measurement wearing the costume of a range**, and the most
over-confident picture this system can draw. Dragging right is watching the app
learn how much you actually vary. The caption says that, and both the shared
function and the component carry a warning not to write the tempting version
again.

### The rejected beats are now shown, not asserted

"3 beats were not used" asked the reader to trust the single decision that most
shapes the whole feature — which beats were allowed to define the template.
Trust is the wrong currency here; the point of the product is that a clinician
can check what it did.

Up to four discarded beats are kept per recording (`TEMPLATE_VERSION` → 2, so
v1 cache entries are recomputed) and drawn on the **accepted beat's own axes and
gain**, each labelled with why it went — it came early (so it started somewhere
other than the usual place) or its shape did not match — and how well it
correlated. One gain for all the traces, deliberately: a rejected beat rescaled
to its own extremes would be drawn the same height as the accepted one, and
"it is twice as tall" is precisely what the picture exists to show.

Both are completely ordinary findings in a healthy recording, and the copy says
so. Amber, never red.

### Smaller things

- The signature's paper is dimmed and has lost its own border. At report weight
  the grid dominated the card, which is most of why the whole thing read as a
  drawing pasted on the screen rather than as data. The geometry is untouched:
  a small square is still a small square, and the scale is still printed.
- Twelve bordered lead boxes read as a form to fill in. Only the **selected**
  cell is drawn as a control now; an un-measured lead has no fill at all,
  because it is not a button.
- Hairline rules and tabular figures throughout; the match figure is neutral
  rather than green, since painting the ordinary case as a pass implies the
  other case is a fail.

## v0.31.0 — 2026-08-08 — History › Insights: your ECG ID, a baseline built from your own studies

History could tell you what you have. It could not tell you whether anything
had **changed** — and that is the question people actually open it with.

It could not, structurally. "Has anything changed?" is a question about every
study at once, and a list is a thing you read one row at a time. Forty rows
contain the answer and cannot show it. So History now has two tabs, and the
second one is a different kind of view.

### What an ECG ID is

Every recording of one person contains the same beat, drawn again and again
with noise on top. Line those beats up on their R peaks and take a per-sample
**median** and the uncorrelated part — mains hum, muscle, electrode movement,
the baseline riding on the breath — collapses while the shape survives. With
~12 beats the noise floor drops by roughly √12 ≈ 3.5×.

This is not our invention. It is the *median beat* / representative complex
that every clinical ECG cart computes, and it is what their automated
measurements are actually taken from. It exists because you can see detail in
it — a small Q wave, a subtle ST shift — that no single noisy beat shows.

Do that per study, fuse the results across studies, and you get something one
recording can never give: a **baseline**. Not "is this normal for a human",
which is what a textbook range answers, but *is this normal for you* — which is
the question that catches a change while it is still small, because a QRS that
widened by 18 ms is still comfortably inside every textbook range.

A clinician already does this by hand: pull up the old traces, lay them on top,
see what moved. All this does is make it happen every time, and keep the
arithmetic visible afterwards.

### The five decisions that make it trustworthy

**1. Not every study may define you.** Simulator output, low-SQI strips and
recordings with too few clean beats are barred, each with a reason printed on
screen. A baseline quietly built from a bad strip is *worse* than no baseline:
it moves the reference, so the good studies then score as deviant and the real
change hides in the noise.

**2. The early studies weigh more — and are watched hardest.** Enrollment is
when the reference is decided, exactly as with a fingerprint, so the first five
studies carry a decaying boost. And *because* they do, an early study that
disagrees with its own cohort is **flagged by name** rather than absorbed.
Without that flag one loose electrode on day one would poison every comparison
that followed, permanently and invisibly.

**3. Studies that disagree are down-weighted, not averaged in.** A second pass
re-weights each study by how well it agrees with the provisional baseline. One
that correlates below the floor contributes nothing — it is still scored, still
shown, it simply does not get to redefine the person.

**4. A study is never scored against a baseline it helped build.** Every match
uses a **leave-one-out** baseline. Skipping this is the classic way a system
like this fools itself: with few studies each one drags the mean toward itself
and then reports an excellent match with largely its own reflection, which
makes outliers the *least* likely thing it ever catches.

**5. The corridor is measured, not chosen.** How far a trace may move before it
counts as having moved comes from this person's own repeatability — the spread
between their studies plus the spread within them — never from a constant
somebody picked. It is drawn as a ±2σ band behind the beat.

### ⚠️ Two real defects, found by running it rather than by reading it

Both of these typechecked, bundled and passed `expo-doctor`. Both were found by
building synthetic cohorts and printing what the algorithm actually decided.

**The provisional baseline had to become a weighted MEDIAN.** With five
consistent studies and one taken with a displaced electrode — bigger complexes,
a flipped frontal axis — the mean-based version excluded **the five** as
outliers and made **the one** the baseline. The minority did not merely survive;
it won, and the patient's identity became the shape of their worst recording.

The mechanism is worth stating because it is not obvious: in the leads where the
bad study's polarity was reversed, the average of the two populations very
nearly *cancelled*. That left a small, noise-shaped residual; the good studies
correlated poorly against it, and the study that dominated what was left
correlated well. **An estimator an outlier can pull cannot be used to find that
outlier.** Median to find the inliers, weighted mean of the inliers to combine
them.

**The amplitude ratio needed an absolute floor.** Leads III and aVL are derived
and often around 0.2 mV, so a 0.07 mV wobble is a 35 % change — and the ratio
test reported `marked` on ordinary session-to-session variation in exactly those
leads while the two measured leads stayed silent. It is now gated on a 0.3 mV
baseline amplitude *and* on three times that lead's own measured tolerance.

A third, smaller correction came from the same runs: the deviation thresholds
are no longer one number applied to three intervals. QRS onset/offset come from
a slope collapse — the firmest landmarks in the delineation — so 10 ms is real.
PR needs **P onset**, the faintest landmark on the trace, and a 25 ms threshold
there fired on delineation jitter between ordinary consecutive studies. A panel
that cries "your PR changed" every other week teaches the reader to ignore it,
which costs more than the one real finding it might catch. QRS [10, 20] ms,
QTc [30, 50], PR [35, 55]; rate is reported but never graded past `watch`,
because it moves with the stairs and the coffee.

### Nothing here interprets

Same rule as `ecgAnalysis.ts`, and it is load-bearing. Every output is a
**distance from a baseline**, carrying the value, the baseline and the delta so
a clinician can check the arithmetic and disagree with it — "QRS +14 ms,
98 → 112". There is no "abnormal", no finding, no advice. Adding one would
change what this product legally is. The screen says in plain words that it is
a comparison with this person's own earlier recordings and not a diagnosis, and
that line is part of the screen rather than boilerplate beside it.

### Twelve leads, built in now rather than retrofitted

Nothing in the stack counts to six. `EcgLeadName` is limb ∪ precordial and an
identity holds a *partial* map keyed by it, so a study carrying V1–V6 extends
the identity into those leads on its own while limb-only studies keep
contributing to the limb leads and are not penalised for what they never had.
The coverage grid prints all twelve with the un-measured ones explicitly empty —
which is how a reader sees that this is a six-lead identity, and is the seam the
12-lead hardware arrives through.

### It is only ever slow once

One template costs a base64 decode, six lead derivations, three filter stages
per lead, a Pan-Tompkins pass and a median stack. Forty of those in one
synchronous burst is a frozen screen — and `await` inside a CPU-bound loop
yields *nothing*, so it has to be a real macrotask. The pass therefore starts
after `runAfterInteractions`, does one study at a time with a yield between
each, releases every waveform the moment it is used (`subscribe: false`, or
forty of them sit in the RTK cache for the rest of the session), and says
"Analysing study 12 of 34" instead of hiding behind a spinner of unknown length.

Templates are then cached on the device, gated on `TEMPLATE_VERSION` so two
generations of the maths can never be averaged into one signature. A recording
is immutable, so its template is too: the second visit reads one file.

### Where the code lives, and why that matters

All of the maths is in **`CYPHIX_SHARED`** — `ecg/beatTemplate.ts`,
`ecg/ecgIdentity.ts`, `ecg/measurementStats.ts` — with zero React, zero DOM and
zero React Native imports. That is deliberate and it is the rule, not a
preference: the web port is now a UI job, and the server can adopt the same
functions unchanged the day this moves off-device. A second implementation of
any of it would be a violation of the Cross-Platform Rule.

**The web does not have this yet**, and its row in `PARITY.md` says so as
`⏳ pending` — this shipped mobile-first at the user's request, and the ledger
is the IOU.

### Also in this release

- **Measurement statistics** (`summariseMeasurementHistory`): totals, per-week
  cadence, longest gap, weeks in a row, days since last, and a 24-bar
  local-hour histogram with the busiest four-hour block lit. It sits beside the
  baseline rather than in a stats corner because it *qualifies* it — six studies
  all taken at 22:00 are a good baseline for late evenings and a poor one for a
  07:00 comparison, and the hours are the only place a reader can see that. No
  targets, no streak game: it counts and divides, it never advises.
- The signature is drawn on the same millimetre paper as the report, at
  **50 mm/s** — the clinical *detail* speed, printed on the sheet. 700 ms at
  25 mm/s is 17.5 mm wide against ~27 mm tall, and a square-gridded sheet of
  that is an unreadable vertical sliver. Gain drops to half-standard only when a
  complex will not fit, and says so. A *fitted* scale was not used and must not
  be: a QRS measured by eye off a 17 mm/s strip reads ~30 % narrow.
- `SegmentedTabs` (already built for the report) carries the switch. Tabs rather
  than a sixth dock item: both views are about the same records, and the reader
  moves between them constantly — flag, open the study, back.

## v0.30.0 — 2026-08-07 — My Tests: one big circle per test, swipe or arrow between them

The Tests tab has been a placeholder since v0.2 — a card saying results would
turn up here one day. It was also the wrong job: finished recordings already
live in **History**. On the web, `/tests` answers a different and more useful
question — *which test am I doing?* — and that is what this tab now is.

### The web's grid does not survive a phone, and the fix is not a smaller grid

The web lays its choices out as `grid-template-columns: repeat(3, 1fr)`. Ported
literally onto a 390 pt screen each photograph becomes a ~112 pt thumbnail, and
that quietly destroys the design's whole premise: **the photograph is the
interface.** An older patient recognises "the watch on the wrist, hand on the
leg" long before they read the words "6 Limb Leads". A thumbnail is not a
photograph, it is an icon — and if these were going to be icons, the web would
have used icons (it tried; see that page's own header comment).

So the phone gives **one circle the whole width** — `min(58 vw, 34 vh, 264)`,
roughly 2.5× the web's phone size — and pages between the tests. Two ways in,
deliberately, because the two failure modes are opposite: a patient who does not
know to swipe never discovers the second test, and a patient with unsteady hands
cannot swipe reliably. So: **swipe, or tap an arrow.** The dots underneath are
the only standing evidence that a second test exists at all, which is the cost
of one card owning the screen and is why they render even while both arrows are
dimmed.

### Two tests, not three

At the user's instruction the phone offers **6 limb leads** or **the full 12**.
The web's third choice — chest-only — is dropped: it is not really a third way
to measure so much as half of the 12-lead test, and three near-identical circles
make the choice slower rather than richer.

### 12-lead is shown, and says honestly that it cannot start yet

The full test's chest half needs the guided camera protocol — the ONNX pose
model and the V1→V6 state machine — which exists only in the web app. The
circle is therefore present with its half-limb/half-chest artwork, badged
*Coming soon*, and says where the test does work.

It is deliberately **not** wired to the limb exam the way the web route is
(`navigate(type === 'chest' ? '/measure/chest' : '/measure/limb')` sends
`12lead` to the limb page). Recording six leads under a label that says twelve
is the one outcome worse than not offering the test at all — root `CLAUDE.md`
§2.3 is about every platform giving the *same* answer, not about every platform
having *a* button. Its "Watch how" stays enabled, because reading what a test
involves is exactly what someone does while waiting to be able to do it.

### The explainer clips actually play now

`ExplainerVideoSheet` is `expo-video` inside this app's own `BottomSheet` — a
sheet rather than the web's centred full-screen card, because that is what a
phone does with something you opened from the page you were reading and will
dismiss back to. The 6-limb tutorial is the web's own `6limb-tutorial.mp4`,
bundled. A test with no clip yet shows its still behind a "coming soon" badge,
exactly as the web does, and will play with no other change the moment a file is
listed in `MEASUREMENT_GUIDE_VIDEO`.

Two things worth knowing about that player:

- **`allowsFullscreen` is off on purpose.** iOS presents fullscreen video with
  AVPlayerViewController, which manages its **own** orientation — and every
  route in this app but the exam is declared `portrait_up` on the stack.
  Handing a second party the orientation API is precisely the bug post-mortem'd
  at the top of `RootNavigator`. The sheet is sized generously instead.
- **The player is only alive while the sheet is open.** `useVideoPlayer` is a
  hook and runs on every render of the component whether or not the sheet is
  showing; it is fed `null` while closed so a 2.7 MB clip is not decoded behind
  the Tests tab from the moment the app launches.

### ⚠️ This release is a REBUILD, not an OTA

`expo-video` is a native module, so §5A.1 puts this on the build path:
`eas build` → `eas submit`, not `eas update`. Accordingly `app.json`'s `version`
was bumped to **0.30.0** alongside `version.ts` — the one situation in which
those two numbers move together (§5A.2). They had drifted apart (0.27.0 vs
0.29.0) exactly as intended by OTA-only releases; this realigns them, and the
new binary starts runtime **0.30.0**. Every OTA after this one must be published
while `app.json` still reads 0.30.0, or it targets a runtime no installed build
has and reaches nobody, with no error.

### Not verified on a device

Typecheck, both bundles and `expo-doctor` are clean, which per §6.4 means the
code is well-formed and nothing more. A carousel is exactly the kind of feature
those checks cannot judge — page snapping, whether the arrows really land on the
circle's centre, whether the clip plays and at what size. Every row added to
`PARITY.md` is `🔬`.

## v0.29.0 — 2026-08-07 — Offline-first: open from the device, then ask what changed

Until this version the app was **online-first**, and that was the wrong shape
for what it holds. Every screen waited for the network to re-send data the
phone had already been given; in a lift, a basement or a tunnel it had nothing
to show at all. And an ECG recording is **immutable** — the trace measured last
Tuesday is byte-for-byte the same trace in ten years — so asking for it again
on every cold start was pure waste for the entire life of the device.

The relationship is now inverted. The phone keeps its own durable copy and
renders from it immediately; the network's only job is to answer one cheap
question: *what changed?*

### Two mechanisms, not one

Both are defined in `CYPHIX_SHARED/src/api/sync.ts` — protocol, not client
policy, because a server that answers `304` and a client that treats `304` as
an error would produce an app that shows a blank profile **only when everything
is working correctly**.

- **Collections (recordings) → a cursor delta.** `GET /recordings/sync?since=`
  returns rows changed since the cursor plus **tombstones** for rows deleted
  since it. The usual answer is `{ changed: [], deletedIds: [] }`.
- **Single documents (medical card, portrait) → ETag + `If-None-Match` → 304.**
  The portrait is up to 1.5 MB of base64 and by far the largest thing the app
  downloads. A revalidation is now a couple of hundred bytes, and because its
  validator is built from the row's `updated_at` rather than from the payload,
  the server does not even decrypt the picture to answer.

### Why the reading and the refreshing are two different things

`offlineBaseQuery` **reads**: cache-first, and it never judges freshness.
`syncEngine` **refreshes**: on sign-in, on foreground, on pull-to-refresh. The
order inside a sync is what makes them safe together — pull the delta, write it
to disk, *then* invalidate the RTK Query tag. The refetch that invalidation
causes is answered from the mirror that was just written, so there is no race
between "the tag says stale" and "the disk still says old", and no loop,
because an empty delta invalidates nothing.

There is no polling and no timer. A phone in a pocket has nothing to learn, and
the moment the screen comes back is the moment the answer starts mattering
again — which is the foreground event, for free.

### Where the bytes live

Heavy payloads are **files** under the documents directory (safe from the
system's low-storage sweep); metadata, cursors and small documents are
AsyncStorage. Waveforms are fetched **lazily** — only when a study is actually
opened — and then kept forever, because they cannot change.

**Deliberately not `expo-sqlite`.** It is a native module, and a native module
cannot reach an installed build over the air; it would need a new EAS build
first (root `CLAUDE.md` §5, and the v0.27.x channel trap that cost a day). This
had to be deliverable as an OTA. The access pattern here is get-by-key plus one
small index, which is what a key-value store is for; the day History needs real
queries — date ranges, search across notes — that argument flips, and the API
is shaped so SQLite can replace `deviceCache` without anything above it moving.

### One account owns the cache

`claimCacheFor` runs **inside the boot splash, before the app can render**, and
if the signed-in account changed it wipes the cached documents, the mirror and
the sync cursors *together*. Clearing two of those three would be worse than
clearing none: a cursor that outlives its data tells the next sync "you are up
to date" about records that are gone, and the device stays quietly short of
history forever.

Doing this in the sync engine alone was not enough, and the first draft got it
wrong: the engine runs from an effect *inside* the app, by which point History
has already mounted and asked the mirror for a list. One frame of the previous
patient's record is one frame too many.

Signing out does **not** clear anything. Same person, same device, and what
actually grants access — the tokens — is cleared regardless and lives in the
secure enclave, not here.

### What did NOT change

Writes. They still go to the server and still fail when it cannot be reached;
there is no offline write queue, and that is a tracked row in `PARITY.md`
rather than a silence. What is new is *write-through*: a mutation's response is
the updated record, so it lands on the disk immediately instead of waiting for
the next sync to discover a change this device just made.

No endpoint definition, hook or screen was rewritten. The only screen edit in
this release is History's pull-to-refresh, which now runs a sync instead of
refetching one query — so it also picks up studies deleted elsewhere and notes
written in the browser.

### Server side

- Migration `0002_recording_sync.sql` adds `recordings.updated_at`, backfilled
  from `COALESCE(deleted_at, created_at)` — **not** from the column default.
  Stamping every existing row with the migration's clock would tell every
  already-synced device that its whole history changed at deploy time.
- Every mutating route now touches it, **including the annotation routes**,
  which touch the *parent* recording: a device only ever asks about recordings,
  so a note that did not move its study is a note no phone would ever see.

⚠️ **This needs a deploy before the phone benefits, and the migration runs on
boot.** Until then the mobile app degrades to what it did before: `/sync`
answers 404, the sync reports an error, and every read falls through to the
network. Nothing breaks; nothing is cached either.

### Verified

`tsc --noEmit` clean on mobile, web and server, and `expo export` bundles. Per
root §6.4 that means **well-formed, not working** — none of it has run on a
phone against a deployed server yet, so every row below stays `🔬`.

## v0.27.0 — 2026-08-04 — No Mac: EAS builds the native module in the cloud

The borrowed MacBook is Intel on a macOS below 14.5, so it cannot run the
Xcode 16.1 that Expo SDK 54 / RN 0.81 require, and Apple provides no way to put
a newer Xcode on an older macOS. A paid Apple Developer account was bought
instead, which promotes v0.23.0 §9.3's escape hatch to the main road.

**The question asked was "how do we do this with Expo Go" — and the answer is
that it cannot be done there, ever.** Expo Go is a prebuilt App Store binary
carrying only Expo's own native modules. `modules/cyphix-ble` is not in it and
cannot be added to it, so `requireOptionalNativeModule('CyphixBle')` returns
null and `bleClient` falls back to `EcgSimulator` by construction. That single
fact is why only a demo signal was ever seen — nothing in the ECG path was
broken.

`eas.json` (new) has Expo compile the Swift module on their macOS runners,
driven entirely from Windows. What the $99 actually buys is the **signing
credentials**: EAS builds for free accounts too, but installing on a physical
iPhone needs ad-hoc or App Store provisioning that Apple issues only to Program
members.

Three profiles, because they trade differently:

- **production** → TestFlight. ~30 min a round, but no UDID registration, and
  the build is valid a **year** rather than the free tier's 7 days.
- **preview** → straight onto the phone by QR. The fast loop for hardware work.
- **development** → dev client + Metro, for stepping through JS against real BLE.

`appVersionSource: remote` with `autoIncrement` is deliberate: TestFlight
refuses a build number it has already seen, and discovering that after a
20-minute cloud build is an expensive way to discover it.

Also: `app.json`'s `version` was still the `0.1.0` scaffold value. It is the
string App Store Connect displays, so it now tracks `version.ts`.

> Still unverified on hardware. The Swift module has never executed once. The
> four checks that separate a real trace from a convincing one are in
> `IPHONE_SETUP.md` §6.3 — the decisive one is taking your fingers off the
> electrodes: a demo keeps beating.

## v0.26.0 — 2026-08-04 — The photographs are warmed at launch, not on the screen that shows them

Reported from the phone: the picture on the **sign-in** screen takes a couple of
seconds to appear, and so do the **START TEST** guide photographs — *"they should
be part of the build itself, they should take 0 seconds."*

**They are part of the build — in a Release build.** `require()`d assets are
embedded in the binary (verified: the four `.jpg` files show up in
`expo export`'s asset list). But in **Expo Go and in a Debug dev build they are
not in the app at all**: `Image.resolveAssetSource` hands back
`http://<dev-machine>:8081/assets/...`, and React Native fetches it over Wi‑Fi
the first time the `<Image>` is rendered — queued behind Metro serving a 5.7 MB
JS bundle. A 36 KB photograph then takes seconds, and it looks like the app is
slow rather than like the dev server is.

So the first thing to know is *which build shows this*. If it disappears in
`--configuration Release`, nothing was ever wrong with the assets.

That said, the warm-up we already had was genuinely half-done:

- **v0.22.0 warmed the welcome photograph and nothing else**, because that is
  the one that had been reported. The three measurement guides had no preload
  at all — their first fetch happened at the exact moment the patient tapped
  START TEST. Same bug, one screen deeper.
- **It started too late.** `prefetchHero()` ran from `AuthGate`'s effect, which
  mounts *behind* `PreferencesGate` — the gate that holds the tree until it has
  read stored preferences off the device. Part of the 1.7 s splash the fetch is
  meant to hide inside was already spent before it began.

Both are closed:

- New `services/media/imagePreload.ts` — **one registry** of every bundled
  photograph (hero + the two prep steps + the circular touch guide), warmed
  together. Adding an image to the app can no longer silently skip its warm-up:
  it is in that list or it is not preloaded, and that is visible in one place.
- Started at **`App.tsx` module scope**, before the first render, so the
  fetches are in flight while preferences are being read and the whole splash
  is available to absorb them. Nothing waits for it.
- Each image is prefetched **independently**. A single `try`/`catch` around a
  sequence of `await`s — which is what the old hero-only version was — lets one
  rejection abandon every image after it, and in a Release build a local
  `file://` asset *can* reject.

`heroImage.ts` is now only the asset; `AuthGate` no longer warms anything.
No new dependency: `resolveAssetSource` + `Image.prefetch` are React Native's
own. No screen's rendering changed.

Typechecks; both bundles export, with all four photographs embedded. Whether it
*feels* instant is a device question — 🔬 in `PARITY.md` until someone opens it
on the phone.

## v0.25.3 — 2026-08-04 — The camera badge sits on the portrait, not inside it

Reported from the phone: on the **Profile** tab, the camera badge on the bottom
corner of the portrait is *cut off by the circle of the picture itself*, and it
should be above it.

It was, exactly — and the cause is one style doing two jobs. `styles.avatar`
carried `borderRadius: 34` + `overflow: 'hidden'`, which it genuinely needs (or
Android renders a square photo inside a round border), **and** it was the
`Pressable` the badge lived inside. A round mask crops every child it contains,
and the badge sits at the corner of the square — precisely the region the circle
excludes.

The old comment above it admitted this and shipped the workaround anyway:
*"the avatar clips its children, so this is positioned inside the circle's
edge rather than hanging off it."* Pulling the badge inward until only its own
corner was lost is not the same as not losing it.

- The round mask is now its **own inner view**, and the badge is its **sibling**
  — painted after the circle, so it rides on top of it whole.
- The `Pressable` stays **68×68** and no longer clips. Deliberately the same
  size, not larger: the badge then still lands inside its parent's own bounds,
  which Android needs — a child drawn outside its parent is not reliably
  rendered — and the square's corner is outside the *circle* while staying
  inside the *square*.

Nothing else moved: same tap target, same RTL side (`right: 0`, which Yoga
already flips in RTL — hence bottom-left in Hebrew), same busy indicator in the
same place.

Typechecks; both bundles export. Unverified on a handset — this is a pixel
change, so it stays 🔬 in `PARITY.md` until someone looks at it.

## v0.25.2 — 2026-08-04 — The shapes come back; only the timing was wrong

**Corrects v0.25.1, which overreached.** Asked to remove the moment where the
corner leaned out at the upper left, it did that *and* pulled every radius
toward 50 % — trading away one of the best shapes in the set to fix a moment.
Reported plainly: *"you gave up one of the nicest shapes there were; I only
asked to get rid of the start."* Correct, and the entry below said the quiet
part itself — it called the 75 % frame the extreme and then removed the
extreme.

- The `excursion` knob is **gone** from `blobShape.ts`. The keyframes are the
  CSS's again, whole and untamed, and the 75 % frame's tight top-left corner is
  back on purpose.
- What stays is the half of v0.25.1 that was the actual bug: **the morph clock
  free-ran from mount** while the idle blob was the 0 % frame held still, so
  connecting *jumped* the outline to wherever the clock had drifted — landing
  straight on that corner whenever the timing fell that way. The clock now
  starts with the connect, at zero, so the cycle is walked in order and the eye
  is **led into** that corner about six seconds later instead of being dropped
  onto it.

The lesson, written down because it is an easy one to repeat: **an extreme that
is arrived at wrongly is a timing bug.** Sanding the extreme down makes the
symptom go away and takes the design with it.

`blobShape.ts` is now byte-identical to v0.25.0 outside its comments, and the
only behavioural change in `HeroBlobButton.tsx` since then is which effect
starts the clock. Typechecks; both bundles export.

## v0.25.1 — 2026-08-04 — The morph stops opening on a corner

Reported from the phone: *"right at the start, the vertex at the upper left of
the circle goes out of proportion — it should always be almost a circle."*

### Measured, not guessed

Sampling the outline across the whole 8 s cycle and comparing every point to a
circle of the same box, the single worst point is the **top-left corner at the
75 % keyframe: 7.6 px outside** the circle — while the **top-right corner of
that same frame is 7.8 px inside** it. A **15.3 px swing across the top of a
150 px blob** is the top visibly ceasing to be round. It is also the only
keyframe with a corner that is small in **both** axes (35 % × 42 %), sitting
next to one that bulges in both (65 % × 60 %).

### Two causes, both fixed

**1. The morph clock free-ran from mount.** The idle blob is the 0 % keyframe
held still, so nothing showed it — but the clock was running behind it the
whole time. At the instant of connect the outline jumped from the rest shape
to **wherever the clock had drifted to**, and if that was near 75 % the corner
arrived out of nowhere, already at its tightest. That is the "right at the
start". The clock now starts **with the connect, at zero**, so the morph begins
at the shape already on screen and flows from it.

**2. The 75 % keyframe was too far out to begin with.** `blobPathAt` now takes
an `excursion`: every radius is pulled toward 50 % by it. This is safe to do
per radius because **each opposite pair in every keyframe sums to exactly
100** — which is precisely what keeps a border-radius shape free of straight
edges — so scaling a complementary pair by the same factor keeps the sum at
100. At **0.5** the worst deviation drops to **3.7 px out / 3.9 px in**: always
almost a circle, never a perfect one.

The excursion is **reached over the 1.2 s fill** rather than applied flat, so
the idle shape stays the exact CSS one and the blob rounds out as it becomes a
button.

Typechecks; both bundles export. `🔬` until it has been seen on the phone.

## v0.25.0 — 2026-08-04 — The home orb becomes a button

Reported as two complaints — *"it isn't that pretty"* and *"it isn't clear
that it's a button to press"* — which are one defect.

### What was actually wrong

The connected orb was **a navy shape with a caption underneath it**, and a
caption under a picture is a caption. The composition named the action in the
one place the eye does not look for a control, and put **decoration** where the
action should have been: the white morphing core, which reads as a heart.
Everything about it animated beautifully and none of it said *press me*.

### The middle now carries the action

- **The white morphing core is gone.** The grey idle core it grew out of does
  not simply vanish either — it expands ~55 % about its own centre as it
  dissolves, so the dot in the middle reads as **opening into** the label
  rather than being swapped for it.
- **A play glyph and the button's own words sit inside the blob**, white on the
  brand navy. They arrive at **45 %** of the 1.2 s fill, not at 0: colour
  first, words second, because two things changing at once read as one blurry
  event. The glyph is drawn with borders, not typed as `▶` — that character
  arrives as a colour emoji on iOS.
- **The blob casts a real navy drop shadow.** A shape printed flat on the page
  is an illustration; a shape sitting *above* the page is a button, and that is
  the oldest affordance there is. Cast in the brand navy rather than black — a
  grey shadow under a navy shape reads as dirt.
- **The caption below collapses** as the words move inside, animated in step
  with the fill, so the action is never named twice and nothing snaps.
- The press is now a **shared value**: 96 % on touch-down, springing back on
  release instead of snapping, and with no React re-render to do it.

### What was deliberately left alone

The **disconnected** state, at the user's instruction: same grey blob, same
white disc, same grey core, same caption underneath. The whole change lives in
the connect transition and the state it lands in. A green "ready" treatment was
offered and declined — the brand is navy, and the connection is already stated
in words below.

### ⚠️ The canvas is bigger than the orb, on purpose

`BOX = ORB + 2·PAD`. A Skia drop shadow is drawn into the canvas's **own**
pixels, so a canvas cut to the blob's exact size clips the shadow off and the
lift silently does not exist. `PAD` is the room the shadow needs; the orb box
carries `marginVertical: -PAD`, so those pixels cost the layout nothing and
every gap around the orb is exactly what it was before.

Typechecks, and both the iOS and Android bundles export. Nothing here has been
seen on a phone yet — it stays `🔬` in `PARITY.md` until it has.

## v0.24.3 — 2026-08-03 — Slide the glass across all five tabs

Two things arrived together from the iPhone.

### The diagnostic answered: the material is real

Settings › About reads **`Apple Liquid Glass (iOS 26+)`**. That settles the
open question from v0.24.1 — this phone has the real material and it is
loading. Neither of the two "not in the dock" causes applies, so anything left
to fix about how the bar feels is in this app, which is where the second report
points.

### "Why can't it be slid between all the icons?"

Reported as sliding working for the Chat icon only. What was actually happening
is that it never worked at all: **the highlight moved on touch-down, and a
`Pressable` owns its touch from the moment it starts and never re-targets** —
that is what a press *is*. So the only tab a finger could reach was the one it
**landed on**, and the tab that appeared to be special was simply the one being
tapped. Sliding towards a neighbour did nothing, for every tab equally.

Re-targeting cannot be decided by a component that can only see its own tab. It
is now **one `Pan` gesture on the bar**:

- Slide and the pill follows continuously through all five tabs.
- A **selection tick** as it passes each one — `Haptics.selectionAsync()`, the
  event a picker wheel reports as it passes a value, not an impact. This is
  scrubbing, and it is what makes a slide feel like it catches on each tab.
- The pill stays **swollen** for the whole drag, so the thing under the finger
  is visibly the thing being moved.
- Release commits wherever it ended, clamped to the ends of the bar — a finger
  that has run off the edge is still clearly asking for the tab at that edge.

**Taps are untouched.** The pan requires 6 pt of travel before it takes over,
so below that the `Pressable` still owns the touch and behaves exactly as it
did — which also keeps every tab a real accessibility button rather than a
region of a gesture surface.

`runOnJS(true)` is deliberate: every effect of this gesture is a React state
update or a haptic, both of which live on the JS thread anyway. Running the
callbacks there too removes the `runOnJS` hops and, more importantly, makes
ordering against the pressable's cancellation **deterministic** rather than a
race — the guard in `handlePressOut` depends on it. It costs nothing per frame
because updates are filtered to actual index changes: at most four `setState`s
across a full sweep of the bar, not one per touch event.

`onFinalize` and not `onEnd` for the cleanup, so a drag interrupted by a call
or by the app backgrounding cannot leave the bar permanently swollen.

### This closes a note that has been open since v0.2

PARITY's dock row has carried "**Not ported:** the drag-the-pill gesture" from
the beginning — the web dock has it and mobile never got it. Per the
Cross-Platform Rule that was a real outstanding debt, not a nicety, and the
report was the user finding it independently.

## v0.24.2 — 2026-08-03 — Selection gets a moment of its own

Prompted by a suggested pattern: replace the tab button with a custom one that
springs the icon and fades a backdrop in behind it, wired through
`options.tabBarButton`.

### What of it was already here

Most of it, and for several releases. Worth writing down precisely, because
"add a custom tab bar button" is advice for a project using the **default** tab
bar, and this one has not used it since v0.2:

- `RootNavigator` passes `tabBar={(props) => <BottomDock {...props} />}`, which
  replaces the entire bar. **`options.tabBarButton` is consumed only by React
  Navigation's own `BottomTabBar`** — set it here and nothing reads it.
  `DockItem` *is* the custom button.
- The spring on press is there (Reanimated, UI thread — the project standard
  per mobile `CLAUDE.md` §3.1, rather than the `Animated` API).
- The backdrop that grows behind the icon is there: it is the pill, and since
  v0.24.0 it swells on touch and swells further on a hold.
- Haptics, both weights, are there.

### What of it was real, and is now in

**Selection had no moment of its own.** The pill slid and the icon filled —
both of those are *states*, not events — so committing a tab felt like the bar
catching up with the router rather than like the tap having done something.
That is the difference the suggestion was pointing at, and it was a fair hit.

The tab that lands now **pops**: its icon and label rise 10 % on a 110 ms
timing and spring back. Up on a timing and not a spring because the rise should
be immediate and identical every time; only the settle should feel physical.
Not on first paint — an app that pops its tab bar while it opens is announcing
something the patient did not do.

**The pop is on the content, not on the pill**, and that is arithmetic rather
than taste. The pill's scale already carries the press swell, so a hold
released on the *outermost* tab would put `HOLD_SWELL` and the pop on one
transform (1.13 × 1.10) — wide enough to be cut by the bar's rounded cap. The
content pops inside its own item box, where nothing can clip it.

### What was deliberately not taken

- **A per-tab halo at `rgba(255,255,255,0.2)`.** That is precisely the bug
  v0.24.1 was spent on: a highlight defined relative to the material under it
  vanishes the moment the material changes, and 20 % white on a light glass bar
  starts out invisible. The trap table has a row for it now.
- **A persistent 1.15 scale on the selected tab.** At 68.9 pt of item width a
  permanently enlarged label is a truncated label in every language, and Hebrew
  truncates first. The pop gives the same read without costing a word.
- **`BlurView` with no `experimentalBlurMethod`**, as the snippet's
  `tabBarBackground` used: on Android that does not blur *at all* — it draws a
  flat translucent rectangle. `GlassSurface` exists because of that.

## v0.24.1 — 2026-08-03 — An indicator may not depend on the material behind it

Reported from the iPhone against v0.24.0: the current tab is no longer marked
at all, and the bar does not do the glass effect iOS has to offer — "like Apple
Music's bottom bar".

### What v0.24.0 broke, and why it is the more useful half of this entry

The pill was a **translucent** white — `rgba(255,255,255,0.85)` on light,
`rgba(255,255,255,0.16)` on dark. It was never visible in its own right. It was
visible *because it was brighter than the bar under it*.

The same release then made the bar glassier — tint 55 % → 32 %, rim removed —
to look more like the system's. So the pill lost the only thing it had been
contrasting against, and **the dock's own dressing destroyed the one thing the
dock exists to show.** Typecheck, both bundles and `expo-doctor` all passed
while it did; none of them can see contrast.

The pill is now a **solid** colour, and it is *the same constant* the active
icon's inner details are cut out in. Those two were always required to match —
the cut-outs sit directly on the pill — and while they were merely *similar*
(a translucent pill against a fixed cut-out colour) they drifted apart with
every change to the bar behind them. Now they are one value and cannot. It also
gets its own hairline and a small shadow, so it reads as a puck **on** the bar
rather than a lighter patch **of** it — which is what a system segmented
control does.

The rule this leaves behind: **an indicator may not be defined relative to the
material it sits on.** Anything that says "you are here" has to be legible on
its own terms, because the surface under it is the part most likely to be
restyled.

### `isInteractive` is off the bar

v0.24.0 put Apple's `UIGlassEffect.isInteractive` on the dock's `GlassSurface`.
It was flagged in that release as the one prop unverifiable from this machine,
and it is the one applied against its grain: Apple's interactive glass is for a
**button-sized control inside a glass container**, not for a whole bar. With
"no glass effect" reported and no way to look, it goes out.

Nothing was lost — the hold-and-swell is Reanimated and never depended on it.
`GlassSurface` keeps the capability, documented, with no caller.

The rim comes back too, softer on the glass path than on the blur path.
Removing it rested on "the material lights its own edge"; over a pale flat
backdrop it does not do so nearly strongly enough, and a floating object with
no edge stops reading as an object.

### ⚠️ Two causes of "it doesn't look like glass" are not in the dock at all

**1. This phone may have no Liquid Glass.** It requires iOS 26+ *and*
`expo-glass-effect` present in the running client. Miss either and
`GlassSurface` falls back to `UIBlurEffect`, which is flat by design and will
never look like iOS 26's material no matter what is tuned here.

That is unanswerable from Windows, and guessing at it costs a release each
time — so **Settings › About now names the material that actually resolved**:
`Apple Liquid Glass (iOS 26+)`, `UIBlurEffect — no Liquid Glass on this
client`, or `BlurView (dimezisBlurView)` on Android. One look at that row
settles which of the three possible problems this is.

**2. A material needs something behind it.** Apple Music's tab bar looks like
glass because artwork and lists scroll *under* it. This dock floats over a soft,
flat backdrop — and glass with nothing to refract renders as a plain
translucent plate however it is tinted. That is not a dock bug; it is the same
lesson as the blur inside a `Modal` (v0.18.0), and closing it properly means
letting screen content pass under the dock, which is its own change.

## v0.24.0 — 2026-08-03 — The dock stops being a picture of glass

The request was: on the iPhone, make the bottom bar Apple's native glass — and
make it behave like the system does when you pick something, where holding an
element makes the glass grow, the way WhatsApp does it.

### The finding: the bar was already Liquid Glass, and that was never the point

`GlassSurface` has resolved to `expo-glass-effect`'s `GlassView` on iOS 26 since
v0.19.2, so the dock has been rendering Apple's real material for several
releases. It still did not feel like the system's tab bar, and holding a tab did
nothing at all.

The reason is that **glass on iOS is not a look, it is a material that answers
your finger.** A `UIVisualEffectView` that never reacts to a touch is a
photograph of glass, and the eye reads the difference immediately even when it
cannot name it. Three separate things were missing, and none of them is a tint.

### 1. The material itself responds — `UIGlassEffect.isInteractive`

`GlassSurface` gains an optional `interactive` prop that maps to Apple's own
`isInteractive`. With it on, the glass brightens and its specular highlight
tracks the touch inside it. This is the system behaviour, not an approximation
of it — there is nothing to hand-animate.

It is **opt-in, defaulting off**, and that is deliberate: a sheet or a report
bar is a surface you look *past*, and one that lights up because a finger
crossed it on the way somewhere else is noise. The dock is the one surface in
the app that *is* the control, so it is the one caller. On the BlurView
fallback the prop is a no-op — that material has no touch model to hook.

### 2. The highlight follows the finger, not the router

Touch down on any tab and the pill travels there immediately; releasing commits
the navigation, sliding off the bar springs it home after 140 ms.

The lit icon now follows the **pill** (`lit`) rather than the navigator
(`selected`), and that is not cosmetic. A filled icon's inner details are cut
out in *the pill's colour* so they read against it — that is how the whole icon
set works. Had the pill travelled under a finger while the filled icon stayed
on the old tab, that icon's cut-outs would have been sitting on glass instead of
on the pill, which on the dark theme is a visibly broken shape. Following the
pill makes the two structurally unable to disagree.

Accessibility keeps the router's truth: `accessibilityState.selected` still
reports what is actually selected. A preview under someone's thumb has not
selected anything, and announcing that it has would be a lie.

### 3. Hold, and the glass grows — the part that was actually asked for

Touch swells the pill by 5 %. Keep holding past **220 ms** and it swells to
13 % with a heavier haptic, and the icon and label grow with it (7 %, slightly
less and slightly slower, so the surface leads and the content follows — the
order the eye reads as one object moving rather than two).

Two decisions worth writing down:

- **It is not wired to `onLongPress`.** React Native does not fire `onPress`
  after `onLongPress` has fired, so that wiring would produce a hold that grows
  the glass and then navigates nowhere — a tab bar ignoring the very gesture it
  just animated. The hold is timed by the dock instead, and releasing selects
  the tab no matter how long you held it.
- **220 ms, not `delayLongPress`'s 500 ms.** That default is the threshold for
  a *different* gesture (long-press menus). At half a second the growth reads as
  something announced after the finger rather than caused by it.

The swell is Reanimated, on the UI thread, so **Android gets the gesture too**
even though only iOS 26 gets the material. The material may differ per platform;
the interaction may not.

### ★ Why the pill is not itself a `GlassView`

The obvious implementation — make the sliding highlight a second piece of glass
— is wrong, and it would have looked correct in every check available on this
machine. `UIGlassContainerEffect` **merges** glass elements that come near each
other into one continuous shape; that is what a glass container is *for*. A
glass pill inside a glass bar dissolves into the bar, and the selection
indicator stops existing.

Apple's own tab bar does what this one now does: **one** glass bar, with a
solid-ish capsule riding on it.

### Dressing, per material

On the Liquid Glass path the bar drops the hand-drawn 1 px rim — the material
lights its own edge, and a second edge over it is the tell that it is not really
glass — and takes a 32 % tint instead of the web's milky 55 % plate, which is
what was making it read as a white plastic bar rather than as glass. The border
*width* stays, so the bar is still exactly the height `dockMetrics` promises.

Android and older iOS keep the web's values unchanged. That is the v0.19.2 trap
in the other direction: an untinted blur over a light page is very nearly
invisible, so the two materials genuinely need different numbers to look like
the same design.

### Structure

`DockItem` is now its own molecule, wrapped in `memo`. The dock re-renders on
every touch-down, hold and release now that the highlight is previewed in state,
and without a memo boundary that is five SVG re-renders per press for the one
tab that changed.

### 🔬 What a device still has to confirm

Typecheck, both bundles and `expo-doctor` all pass, and none of them can see
any of this. Specifically unverified:

- **`isInteractive` on a whole bar** rather than on a button-sized control is
  the one judgement call here. If the entire bar bulges toward the touch instead
  of the tab, it is one prop to remove.
- **The swell against `overflow: hidden`** is arithmetic, not observation: at
  13 % the pill grows to 60.0 pt inside a 65.1 pt inner box, and horizontally to
  ~4.5 pt short of the rounded cap on the outermost tabs. It should press
  against the container without being cut by it.
- Whether the pill travelling on touch-down reads as responsive or as jumpy.

## v0.23.0 — 2026-08-03 — The road to a real signal on an iPhone, and two things found while checking it

### 0. The finding that reframes the request: the pipeline was never the problem

The report was "there is only a demo signal, never the real one from the
hardware". The reasonable reading is that something in the ECG path is broken.
It is not. Every piece exists and is correct — the Swift/CoreBluetooth module,
the Kotlin one, the frozen packet contract, the raw ring buffer, the live
display filter, the analysis on raw. Checked against the firmware too: it
advertises the service UUID the native scan filters on, and sends 16 samples ×
9 bytes (int32 µV) at 20 Hz with MTU 185 — exactly what the modules decode.

The real cause is one line, working as designed:

```ts
export const CyphixBleNative = requireOptionalNativeModule('CyphixBle'); // null in Expo Go
```

**Expo Go cannot contain this app's native code.** It is a pre-built app from
the App Store carrying only the modules Expo shipped in it, so `cyphix-ble` is
absent, the handle is null, and `bleClient` falls back to `EcgSimulator` — the
documented fallback (mobile CLAUDE.md §4). No amount of work inside the app can
change that. Reaching the hardware requires a **development build**, which
requires Xcode, which requires a Mac. That is the whole story.

So the deliverable is the path, not a patch: **`IPHONE_SETUP.md`**, written end
to end for a Windows developer, an **Intel** MacBook and a **free** Apple ID.
The compatibility gate is deliberately §1, before anything is installed: Expo
SDK 54 / RN 0.81 needs Xcode 16.1+, which needs macOS 14.5+, and Apple does not
let a newer Xcode onto an older macOS. An Intel Mac from 2018 or later is fine;
2017 and earlier is a dead end with no workaround inside the project, so the
alternatives are named honestly instead — including that the EAS cloud-build
escape hatch needs the **paid** account, so it is not a free substitute.

It also documents the two things most likely to waste an evening: `.env` is
git-ignored and therefore does **not** arrive with the clone, and a Debug build
is tethered to Metro — hardware testing away from the desk wants
`--configuration Release`.

### 1. A frozen trace stopped being called live

Checking whether the link could be trusted surfaced a real gap against root
CLAUDE.md §3.2, which requires exactly this and had no implementation.

A BLE link stays `connected` while delivering nothing — the phone locks, the
app backgrounds, the device slips off the patient, the ESP32 browns out. In
every case the last waveform stays on screen. A screen that keeps calling that
live is presenting a frozen trace as a patient's heart.

`STREAM_STALE_MS` is **derived, not chosen**: the firmware notifies every 50 ms
and the native bridges flush at 10 Hz, so a healthy link delivers something
every ~100 ms; 600 ms is six missed flushes. It lives in `CYPHIX_SHARED` beside
the cadence it comes from, so web and mobile cannot drift.

Three details that are the difference between a watchdog and a decoration:

- **AppState marks stale on the way OUT.** A suspended app's timers do not run,
  so the interval cannot be relied on to notice afterwards.
- **Only a real arriving batch clears it.** Announcing "live again" on
  foreground, before a sample has landed, is the same lie in the other
  direction.
- **`isStreaming` now means samples are arriving**, not that the link is up —
  and an in-flight capture is **discarded**. Ten seconds of wall clock is not
  ten seconds of ECG; a strip padded with silence reads as asystole.

### 2. Android BLE permissions were never requested — and PARITY said ✅

`CyphixBleModule.kt` is annotated `@SuppressLint("MissingPermission")` and its
header states the UI must have obtained the runtime grants before `connect()`.
Nothing ever did.

A manifest declaration is not a grant. Since Android 6 the user must be asked at
runtime, and an unpermitted `startScan` **returns no results and throws no
error** — which on screen is indistinguishable from "the device isn't here".
The request now runs in `bleClient.connect()` via React Native's own
`PermissionsAndroid` (no new native dependency), splitting on API 31: `BLUETOOTH_SCAN` +
`BLUETOOTH_CONNECT` from Android 12, `ACCESS_FINE_LOCATION` below it. A refusal
says which thing was refused, because "Bluetooth error" sends someone to check a
battery for a problem that is in Settings.

The PARITY row claiming Android ✅ was wrong and is corrected to 🔬.

### 3. The app has its own icon

It was still Expo's blue placeholder — the one with the construction guides.
It is now the CYPHIX mark on white, with the Android adaptive and themed layers
and the favicon regenerated to match.

`scripts/make-icons.js` renders them from **`BrandLogo`'s own path data**,
copied verbatim, rather than from a redrawn lookalike that would drift from the
logo the first time either was touched. The counter-dot is punched through as
real transparency on the layers that need it (the themed Android icon is tinted
by the system, so a filled dot would tint too), while `icon.png` is fully
opaque, since iOS rejects an alpha channel.

Two sizing decisions worth keeping: the square icon fills 60 % — iOS masks to a
squircle and an organic mark needs real air — and the Android foreground fills
only 42 %, because an adaptive icon's outer third is croppable and only the
inner 66 % is guaranteed visible.

> **Not verified on a device.** Per root CLAUDE.md §6.4, typecheck and bundle
> prove the code is well-formed, not that it works. The Swift module has still
> never run against the hardware — that is what `IPHONE_SETUP.md` exists to
> make possible, and every row here stays 🔬 in `PARITY.md` until someone has
> held the phone.

## v0.22.0 — 2026-08-03 — You can set your portrait from the phone, and the welcome photo stops arriving late

Two things, one asked for and one reported.

### 1. The portrait can be changed from the phone

v0.21.0 could *show* a portrait but not set one, which is half a feature. Now
the avatar is a button — with a camera badge, because a tappable circle with no
affordance is a circle nobody taps — opening **take a photo / choose from
library / remove**. It saves to the **record, not the device**, so a picture
taken on the phone shows up in the browser, and the sheet's copy says so: a
patient deciding whether to put their face on a medical record deserves to know
where it goes.

The photo the **sign-up wizard** collects is now uploaded too, right after the
account exists — it could not travel in the registration body, which has no
patient id yet. That upload is deliberately best-effort: the account and the
session are already created by the time it runs, so a failed picture must never
be reported as "sign-up failed". The patient lands with initials and a working
picker, which is the only reason swallowing that error is acceptable here.

**One new dependency: `expo-image-manipulator`.** The server caps the portrait
data-URL at 1 500 000 characters, and a square crop off a 12 MP sensor is
several times that once base64 adds a third on top — so uploading what the
picker returns would fail on exactly the good cameras. The image is resized to
**512 px** on-device first (~40 KB, about 3 % of the cap). The picker's own
`quality` option could not do this: it lowers JPEG quality, never the pixel
count, which is the expensive part. The web does the equivalent on a canvas;
React Native has none.

Three failures, kept apart because they need different answers: the OS
**refused** (a decision, not an error — the message says where to change it),
the image could not be **encoded**, and the **upload** failed (the optimistic
cache patch rolls back, so the old portrait returns instead of the new one
appearing to have stuck). Changing it is audited as `patient:update` — the
reference, never the image.

Verified against the deployed API: PUT a portrait → 200, GET returns it
**byte-identical**, remove → 200, GET → null, and the demo account is left
exactly as it was found. A 1.6 M-character upload really is refused with 400,
which is the check that makes the resize load-bearing rather than tidy.

### 2. "The screen is blue and only then the picture comes up"

Correct, and it was not the file — 1400 × 1066, 176 KB is modest. It was the
**timing**: nothing asked for the image until `WelcomeStep` mounted, so the
fetch *and* the decode happened while the patient was already looking at the
screen. In **Expo Go**, where it was noticed, it is worse: a `require`d asset is
not bundled into the client, it is pulled from the Metro dev server over Wi-Fi
on first use — so the very first screen of the app pays a network round trip for
its own background.

Two changes, no new dependency:

- **`prefetchHero()` runs inside the boot splash**, which is 1.7 s of held time
  the app already spends. By the time the welcome screen mounts, the image is in
  the loader's cache. (`resolveAssetSource` + `Image.prefetch` are React
  Native's own; in a production build, where the asset is local and this is
  unnecessary, the rejection is caught and ignored.)
- **The photo fades in over the navy in 260 ms** when it is not already there,
  so a slow load reads as a deliberate arrival rather than a glitch. The hero's
  layers are explicit now (image / scrim / copy) instead of an `ImageBackground`
  — fading the container would have taken the gradient and the headline with it.
  The wordmark and the title never wait for the picture; they sit on the scrim,
  which is drawn over navy whether there is a photograph behind it or not.

Typecheck, both exports and expo-doctor pass. Neither change has been seen on a
handset yet — the PARITY rows stay `🔬`, and the fade in particular is the kind
of thing only a device can confirm.

## v0.21.0 — 2026-08-03 — The Profile tab shows YOUR record, not the demo patient's

> "אם חיברת את השרת - מצוין אבל למה בטאב של PROFILE אני לא רואה את התמונה
> שלי את השם שלי את הגיל שלי וכו וכו?"

Because sign-in was connected and the Profile screen was not. It read
`DEMO_CARD` — a hard-coded fictitious patient — with one line,
`const card = DEMO_CARD;`. v0.20.0 named that as pending in `PARITY.md` and
left it, which is why a signed-in patient was looking at "Test Patient Alpha".

### What it does now

`usePatientCard` → `GET /patients/:id/card` for the signed-in account's own
`linkedPatientId`: name, age, sex, MRN, phone, blood type, height, weight, BMI,
conditions, allergies, medications, family history, emergency contact and care
team. The card is assembled and minimized **server-side** — the same one call
the web makes — so the phone and the browser cannot end up disagreeing about
what "age" or "BMI" means, and no client ever receives a raw clinical resource
to pick through.

The portrait is a second call, `GET /patients/:id/photo`, because it is up to
1.5 MB against a card of a few hundred bytes and it changes far less often. It
lives inside the encrypted health profile server-side, so **a photo set in the
browser now appears on the phone**. Worth saying plainly: the avatar had never
rendered a photo at all before this, in any mode — it was always initials.

### The failure case, which is the part worth reading

A real account whose card does not load does **not** fall back to `DEMO_CARD`.
That shortcut would print "A+", "Lisinopril 10 mg" and "Atrial fibrillation"
under a real person's own name, on the one screen whose entire job is to be
their medical record — and someone could act on it. Instead: a name-only card
from the session, an explicit "your record could not be loaded" notice, and
pull-to-refresh. The notice exists because empty sections silently read as
*"you have no conditions and no allergies"*, which is a different and far more
dangerous claim than "we could not reach the server".

(The pull-to-refresh is real, and was added because the first draft of that
sentence said "pull to try again" on a screen that had no such gesture. A
message that promises an interaction the screen does not have is the same
broken promise as a button that does nothing.)

`DEMO_CARD` is now the OFFLINE card only, and says so in its own header.

### Shared, not copied

`PatientCardModel` + `CodedItem` / `MedicationItem` / `EmergencyContact` /
`CareContact` / `PatientPhoto` and the patient route paths now live in
`@cyphix/shared` (root CLAUDE.md §2.1). The web and the server still declare
their own copies; migrating them is tracked in `PARITY.md`.

### Verified

Probed the deployed API with the demo patient: `/card` returns every field the
screen draws — age 68, sex, MRN, phone, A+, 174 cm, 79 kg, BMI 26.1, and one
each of conditions / allergies / medications / family history, plus the
emergency contact and the care team. `/photo` returns `null` for that account,
which is exactly the "initials" path. Typecheck, both exports and expo-doctor
pass. Unverified on a handset, so the rows stay `🔬`.

### Still missing, and named

**You can see a portrait on the phone but not set one from it.**
`setPatientPhoto` is wired; the entry point is not — no picker on the Profile
avatar, and the onboarding photo step still keeps its file URI on the device
(it always did, and the avatar never showed it either). Doing it properly needs
a resize to fit the server's 1.5 MB cap, which on mobile means a new dependency
(`expo-image-manipulator`) rather than the web's canvas. Also still pending: a
clinician has no single active patient, so their Profile tab still shows the
demo card until there is a patient picker.

## v0.20.1 — 2026-08-03 — "Connection issue" on sign-in: the app was right

Signing in from Expo Go with a real account failed with *"No connection. Check
your network and try again."* Nothing was wrong with the code — that message is
`AuthErrorCode: 'network'`, which the client raises only when the `fetch`
itself never lands. It was telling the truth.

**Cause:** v0.20.0 pointed `.env` at the **dev server on the laptop**
(`http://10.0.0.19:8080`), and nothing was listening on 8080. That URL needs a
server running locally *and* the phone on the same Wi-Fi — two conditions that
are false most of the time, which makes it a bad default however well it is
documented.

Ruled out along the way, so it does not get re-investigated later:

- the LAN address was still correct (`10.0.0.19`);
- the API is reachable over that address once running — `/healthz` and a real
  login both answer;
- Windows Firewall is **not** the problem: this Wi-Fi is a *Public* profile,
  but `node.exe` already has inbound Allow rules on it, which is also why
  Expo Go reaches Metro on 8081;
- the bundle *had* picked up the env var — in offline mode the mock service
  never fetches, so a wrong password would have said "invalid credentials",
  not "no connection".

**Fix:** the app now points at the **deployed API**,
`https://cyphix-api.onrender.com`. Verified to be the same database, not just a
lookalike: the demo patient returns an identical `user.id` **and**
`linkedPatientId` from the deployed instance and from the local server. The
full client sequence passes against it — login · `/auth/me` · own-patient read
· foreign patient 403 · rotation · replay 401 · family revoked · logout ·
re-login · enumeration-safe failures · 400/409 mapping.

Two things worth knowing:

- **`EXPO_PUBLIC_*` is inlined at BUNDLE time.** After editing `.env`, stop
  `npm start` and start it again — reloading the app is not enough.
- **The free tier sleeps after ~15 min idle and wakes in ~50 s.** The first
  sign-in after a long gap is slow; that is the host waking, not the app. It
  also interacts with `AuthGate`'s 4 s ceiling (see PARITY.md): a cold boot can
  show the welcome screen and then jump into the app when the refresh lands.

## v0.20.0 — 2026-08-03 — One account system: the phone signs into the web app's server

The native app no longer has accounts of its own. With `EXPO_PUBLIC_API_BASE_URL`
set it authenticates against **CYPHIX_SERVER** — the same Fastify API and the
same Neon Postgres the web app has been using since web v1.46.0 — so a person
who registered in the browser signs in on the phone and is the same `users` row,
the same FHIR Patient, the same recordings. Registering on the phone works the
other way round just as well.

### What the investigation found first (it changed the plan twice)

The server was already there and already correct, so almost nothing needed
inventing — the work was making the mobile client tell the truth about it:

- **Auth is argon2id + a 15-minute HS256 access JWT + a ROTATING refresh token
  family with theft detection.** Present a refresh token that was already
  rotated out and the server revokes the entire family. That single fact is why
  `refreshSession` had to be single-flight: several screens 401ing in the same
  frame would each refresh, the second would look like a replay, and the patient
  would be signed out by their own app. The stub it replaced would have hidden
  this — it always returned `null`.
- **The web keeps its refresh token in a cookie AND in the request body.** A
  native app has no cookie jar; the server reads the body first
  (`presentedRefreshToken`), so mobile needs no server-side special case.
- **`user.linkedPatientId` is the identity link**, and it was missing from the
  shared `SessionUser`. Without it a signed-in patient asks for records they do
  not own — which the server answers 403, correctly. Verified: a foreign patient
  id really is refused.
- **The server refuses to be an account-enumeration oracle** (unknown account and
  wrong password return one identical message). So the sign-up step's "is this
  address taken?" check has nothing to ask when connected; 409 on register is the
  real answer, and it lands on the same step with the same message.

### The changes

- **`@cyphix/shared`** — `SessionUser.linkedPatientId` (the cross-platform
  identity link) and an `AuthTokens` envelope. `AUTH_ROUTES` now names the routes
  the server actually serves: it listed `/auth/session`, which has never existed
  — it is `/auth/me`. The three routes the server does *not* implement (password
  reset, SMS code, SMS verify) moved to `AUTH_ROUTES_PLANNED`, so no client can
  call one by accident and the gap cannot be forgotten.
- **`tokenStore`** — real now. Enclave-stored rotating refresh token, in-memory
  access token, single-flight exchange, and the distinction a phone needs most:
  a server *rejection* clears the session; a *network failure* keeps it, because
  offline is not signed-out.
- **`httpAuthService`** (new) — login / register / restore / logout, mapping the
  server's statuses onto the same `AuthErrorCode`s the UI already translates.
  `authService.ts` picks it over the device mock in one line.
- **`useCurrentUser`** — connected, the RBAC principal is now the **real signed-in
  account**. It had deliberately answered "demo clinician" while every account was
  device-local; against a server that stops being a harmless stand-in, because
  the server enforces its own RBAC and the client would draw a toolbar whose
  every request comes back 403. Offline it is still the demo clinician, so the
  showcase keeps History's tools. **Expect a real patient login to hide calipers,
  filters, annotations and compare — that is the correct answer, not a bug.**
- **`sessionExpired`** — the service→slice bridge the web has, so an exhausted
  refresh puts the app back on the door instead of leaving it signed-in over 401s.
- **Server `auth.ts` v0.2.1** — accepts `emergencyRelation`. The mobile sign-up is
  the only flow that asks who the emergency contact is, and every card was
  reading "Emergency contact" regardless.

### What was verified, and what "verified" means here

Replayed the client's exact sequence against the live server and the real
database — no cookies, as a phone has none: login · `/auth/me` · own-patient
read · **foreign patient refused (403)** · refresh rotates · replay of a
rotated-out token 401s · the family is dead afterwards · logout · re-login ·
enumeration-safe failures · 400-mentions-password → `weak-password` ·
409 → `email-taken`. All pass. The registration body was probed against a
known-taken address, which the server validates *before* the duplicate check —
so the shape is proven with **zero rows written** to the production database.

That proves the contract. It does not prove the screens: nobody has yet signed
in on a handset. Every affected row in `PARITY.md` stays `🔬`.

### Not done, and named rather than left quiet

Biometric unlock is **not offered** when connected (the only thing a fingerprint
could release is a refresh token that `restore()` has already used — the button
would be decorative; an app-lock on resume is the real feature). Password reset
and SMS verification remain device-honest because the server has no mailer and no
SMS gateway. The Profile tab still renders `DEMO_CARD` rather than
`GET /patients/:id/card`.

## v0.19.5 — 2026-08-03 — It was not centred, and that was measurable

> "אבל זה לא ממורכז בכלל אז או שתעשה שזה יהיה כמעט על כל רוחב המסך (מומלץ כי
> הלוגו ארוך) או שתמרכז את זה בבקשה"

Both, and the reason they were the same fix.

### Why it looked off-centre: it was off-centre

`BrandLogo`'s viewBox is inherited from the web app, and it is **not tight
around the artwork**. Measured (bezier-sampled, not eyeballed):

```
ink        x  41.34 → 181.45     y  85.12 → 105.64
declared   x  34.00 → 209.00     y  79.00 → 109.00

air on the left :  7.34 units
air on the right: 27.55 units      → the ink sits 10.1 units left of centre
```

Centre that box on a screen and the artwork lands **~18 pt to the left of the
middle** at 320 pt wide. It also means the logo was only ever filling **80 %**
of the width it was given — which is part of why "make it bigger" kept not
being enough.

It never showed anywhere else because every other caller anchors the logo to a
corner: `PatientShell` and `ProfileScreen` pin it top-start (and both are behind
`SHOW_SHELL_WORDMARK`, currently off), and `ReportHeader` sets it in a row.
Padding on the right of a left-aligned logo is just a gap.

### The fix

`BrandLogo` takes an opt-in **`crop`** prop that swaps in the ink's measured
box (`40.988 84.769 140.810 21.225` — padded 0.35 units, half the mark's
hairline stroke, so nothing clips). Default is unchanged **byte for byte**:
correcting it globally would resize the logo on screens nobody has complained
about, and that is not this change.

The splash uses `crop` and goes to **90 % of the window**, capped at 520:

```
                    v0.19.4 ink      now (90 %, cropped)
iPhone SE  320 →     210 × 30    →    288 × 43 pt
iPhone 15  390 →     256 × 37    →    351 × 53 pt
Pixel      412 →     271 × 39    →    371 × 56 pt
tablet     768 →     368 × 53    →    520 × 78 pt  (capped)
```

("ink" is the artwork itself, not the padded box it was drawn inside — which
is the only measurement that describes what an eye sees.)

**Verified:** `tsc` clean, both platforms bundle, `expo-doctor` 18/18, and every
number above is computed from the path data rather than estimated. That the
lockup is now centred follows from the geometry; that it *looks* right at 90 %
is still a look-at-it-on-the-phone question.

---

## v0.19.4 — 2026-08-03 — The splash goes back to navy and the full logo, at the bigger size

> "עזוב תחזיר למה שהיה עם הרקע הכחול והלוגו המלא … פשוט תגדיל אותו קצת כי זה
> היה קטן מדיי"

v0.19.3 changed three things when only one of them was the complaint. The
complaint was the **size**; the white screen and the mark-only lockup were my
reading of "maximise it", and they are reverted.

So the splash is again the navy screen with the **full** `BrandLogo` — mark +
CYPHIX + "MEDICAL", the same signature that sits on the shell, the profile and
every report — and it keeps the one thing that was worth keeping:

```
                    was          now (82 % of the window)
iPhone SE  320 →   210 × 36  →   262 × 45 pt
iPhone 15  390 →   210 × 36  →   320 × 55 pt
Pixel      412 →   210 × 36  →   338 × 58 pt
tablet     768 →   210 × 36  →   460 × 79 pt  (capped)
```

A flat 210 pt is a guess that is right on exactly one screen. The lockup is
wide and thin (aspect ≈ 5.8), so near-full-width reads as confident rather than
shouted, and 9 % of clear space each side is still more than the app's 24 pt
gutter.

`CyphixLogo` — the mark-only atom v0.19.3 introduced — is **deleted**, not left
sitting in `atoms/`. Three lockups with two callers is how the wrong one gets
picked six months from now. It is one `git show 542a650` away if it is ever
wanted, and the brand SVG it was built from has not moved.

Still true from v0.19.3, and still worth knowing: `app.json` configures **no**
native splash, so a standalone build shows Expo's default before this screen.
In Expo Go it does not matter. When the first real build happens, pointing
`expo-splash-screen` at navy with this mark makes the native → JS handoff
seamless instead of a change of screen.

**Verified:** `tsc` clean, both platforms bundle, `expo-doctor` 18/18, and the
table above is computed rather than eyeballed. Whether 82 % is *right* is a
look-at-it-on-the-phone question — it is one number in one file.

---

## v0.19.3 — 2026-08-03 — The splash is the logo, on white, at the size it should have been

> **Superseded by v0.19.4** — reverted at the user's request. The size change
> below is the part that survived.

> "כשיש את הלוגו המלא נטען עם המסך הכחול שהוספת הוא ממש קטן … תנסה למקסם את
> הגודל שלו שייראה נורמלי … ותשים את זה על מסך לבן בבקשה"

Three changes, one screen.

### The lockup

`CyphixLogo` — mark + "CYPHIX", no "MEDICAL" — from the brand file
`cyphix - logo+cyphix only white backround.svg`. That makes three lockups in
the app, and they are **not** interchangeable:

| | what it is | where |
|---|---|---|
| `BrandLogo` | mark + CYPHIX + "MEDICAL" | the full signature — reports, the shell |
| `CyphixLogo` | mark + CYPHIX | a screen that **is** the logo — the splash |
| `CyphixWordmark` | the word alone | over a headline — the welcome hero |

Same note as last time, because it is the same trap: the source is an **A4
Inkscape page**, so the viewBox here is the measured union of the mark, the
white dot and the lettering (`60.34 85.26 85.05 20.52`, aspect 4.144) rather
than the page. And the mark's `innerShadow` filter is dropped — react-native-svg
has no equivalent, and `BrandLogo` already drops the same one.

### The size

It was 210 pt wide (≈36 pt tall) on every screen, which is where "ממש קטן"
comes from: a fixed point size is a guess that is right on exactly one device.

It is now **82 % of the window's width**, capped at 460 so a tablet does not get
a billboard:

```
iPhone SE  320 →  262 × 63 pt
iPhone 15  390 →  320 × 77 pt
Pixel      412 →  338 × 82 pt
tablet     768 →  460 × 111 pt
```

It is the only thing on the screen. It should look like it.

### White

As asked. Dark mode keeps the app's own dark surface with the light lockup:
an opening frame of white at 2 a.m., on a phone whose owner has set the app
dark, is exactly the flash `PreferencesGate` exists to prevent. One line if you
want it white always.

One loose end worth knowing about: `app.json` has **no** native splash
configured, so a standalone build shows Expo's default before this screen
appears. In Expo Go it does not matter (Expo Go shows its own). When the first
real build happens, pointing `expo-splash-screen` at a white background with
this mark would make the native → JS handoff seamless instead of a change of
screen.

### Verified / not verified

`tsc` clean, both platforms bundle, `expo-doctor` 18/18, and the sizes above
are computed rather than eyeballed. Whether 82 % is *right* is a
look-at-it-on-the-phone question — it is one number in one file.

---

## v0.19.2 — 2026-08-03 — An iPhone next to a Galaxy found a one-line bug in every glass surface

> "באייפון כשלוחצים על SIGN OUT זה מופיע ישירות על המסך (עם רקע שקוף), זה קורה
> רק באייפון — בגלאקסי זה עם רקע לבן יפה. למה זה קורה?"

Because of one line, and the answer is worth writing down: **the two phones
were running different code paths, and only one of them was ever given the
colour.**

### The bug

`GlassSurface` resolves to the best material the device actually has:

```
iOS 26+  → expo-glass-effect  <GlassView glassEffectStyle="regular">
otherwise → expo-blur         <BlurView> + a tinted underlay
```

The tint was a prop called `fallbackTint`, and the name was the bug: it was
passed **only to the BlurView branch**, documented as "ignored by Liquid Glass,
which tints itself".

It does not tint itself — not enough. `glassEffectStyle="regular"` with no
`tintColor` over a **light** page is very nearly clear. So on the iPhone the
panel was genuinely there, genuinely rendering, and genuinely invisible: title,
body and both buttons floating over the profile page. The Galaxy took the
BlurView branch, got `rgba(255,255,255,0.88)` painted underneath, and looked
exactly as intended.

Nothing about this was specific to the dialog. **Every** surface built from
that atom had it — the History sheets, the action sheet, the bottom dock, the
report's action bar — none of which had ever been looked at on an iPhone. One
line fixes all of them.

While in there: the same call now passes `colorScheme` (which
`expo-glass-effect` documents as "use this when your app has its own theme
toggle"). Left on `auto` the glass follows the *phone's* appearance while every
token around it follows the patient's Settings choice — the exact half-dark app
`useIsDark` exists to prevent.

### The dialog is solid now, and stays solid

Even with the tint fixed, `ConfirmDialog` no longer uses a material at all.

A material is for a surface you look **past**. This is the one surface in the
app you must look **at**, immediately before something irreversible — and its
legibility should not depend on which iOS version is running, on what happens
to be behind it, or on whether a blur implementation is available. It is a
white (or `#161F31`) card over the dimmed page, on both platforms. That is also
what the Galaxy was already showing, which is the version that got called
"יפה".

### Typed names capitalise themselves

"elio" → "Elio". The field already had `autoCapitalize="words"`, and that only
sets the **keyboard's shift state** — a suggestion a third-party keyboard, a
paste or a correction can all ignore, which is how a lower-case name reaches
the field in the first place. So the value is normalised instead, in the
reducer rather than in the field, so every route into the draft gets it and a
future screen cannot forget.

What it deliberately does *not* do: it never lower-cases anything, so
"McDonald" stays "McDonald" and "ELIO" stays "ELIO". Boundaries are spaces and
hyphens ("jean-pierre" → "Jean-Pierre") but **not apostrophes** — "O'Brien" and
"d'Angelo" disagree, and guessing wrong at someone's own name while they type
it is worse than leaving it alone. Hebrew and Arabic have no letter case, so
there is nothing there for it to do. The emergency contact's name gets the same
treatment.

### Verified / not verified

`tsc` clean, both platforms bundle, `expo-doctor` 18/18. The capitalisation is
checked against ten real-shaped names. **The glass fix is inferred from the
symptom and the API, not observed** — the machine this is written on cannot
run iOS at all. It wants one look at the sign-out dialog and one at a History
sheet on the iPhone.

---

## v0.19.1 — 2026-08-03 — Four from the first look

> "תוסיף LOG OUT בPROFILE … רציתי רק בCYPHIX כמו שהיה ברפרנס … העיגול בתוכו יש
> אות ECG ירוק — תעיף את זה, זה לא הלוגו שלי … במקום הרקע הכחול בוא ננסה לשים
> את התמונה הזאת"

All four are things no compiler could have flagged: where a control lives,
which lockup belongs over a headline, what is and is not the brand, and what
a hero should be a picture of.

### 1. Sign out is on Profile

It shipped in Settings only — which is Profile → Settings → scroll, one screen
further than anybody looks for it. It is now the last thing on the Profile tab,
under the Settings card, as a quiet centred row rather than a second
illustrated card: it is not a place to go, it is a way to leave, and it must
not compete with what is above it. The row shows *whose* session is about to
end. The confirmation is the same one Settings raises, and Settings keeps its
row — two doors to one action is correct here.

### 2. The welcome hero carries the text-only wordmark

`BrandLogo` is the full lockup: mark + CYPHIX + "MEDICAL". Directly above
"Clinical-grade ECG, recorded at home." that second line of type argues with
the headline it is introducing, which is exactly why the reference uses the
word alone there.

New atom `CyphixWordmark`, path data verbatim from the brand file
(`Logo - cyphix/plain svg/cyphix((txtonly).svg`). One thing worth writing down:
that file is an **A4 Inkscape page** — a `viewBox` of `0 0 210 297` with the
word sitting in the middle of it. Dropped in as-is the wordmark renders as a
speck surrounded by empty sheet. The viewBox here is the glyphs' measured
bounding box (`47.77 85.38 62.48 12.79`, aspect 4.886).

`BrandLogo` is unchanged and still the mark everywhere else — splash, reports,
the shell.

### 3. The pulsing ECG mark is gone

The reference opens on a ring pulsing around a stylised ECG trace that draws
itself. It was ported faithfully in v0.19.0 and it is out now, at the user's
instruction: **it is not the CYPHIX identity**. A mark that behaves like a logo
without being one is worse than no mark — it teaches people the wrong thing to
recognise. `EcgSweepMark` is deleted rather than left unused.

The splash is now the wordmark and the tagline, fading up on navy. `PulseRing`
survives on "Profile created", where it rings a checkmark and is a
confirmation rather than a logo — say the word if that should go too.

### 4. The welcome hero is a photograph

Instead of flat navy: the device on an older person's wrist, being pressed by
their other hand, at home. It says what the product is faster than the
sentence under it does.

The scrim is structural, not decoration. The photo is warm and **light**, and
white type over it would be unreadable exactly where the eye lands — so a navy
gradient sits between them: `0.45` at the very top (so the light status-bar
glyphs stay legible), clearing to `0.10` where the picture is the subject, then
`0.72 → 0.97` under the type. The headline is therefore always on navy
whatever the image is doing underneath.

The asset is resampled to 1400 px wide and saved as JPEG q84 —
**7.0 MB → 176 KB**. A 2354 px source in the bundle is 7 MB every user
downloads to draw a 390 pt panel.

One thing to watch on a device: the rounding is on the *wrapper*, not the
`ImageBackground`. A native image view ignores a parent's `borderRadius` on
Android unless the clip belongs to the view that owns `overflow: hidden`.

### Verified / not verified

`tsc` clean, both platforms bundle, `expo-doctor` 18/18 — and, as with
v0.19.0, none of that has touched a phone. The scrim in particular is a
judgement made against a thumbnail: it wants a real screen and, ideally, a
real pair of eyes in daylight.

---

## v0.19.0 — 2026-08-03 — The app gets a front door

> "אנחנו הולכים להתחיל את מסך ההתחברות … תיקח מכאן רק את שלבי ההתחברות בלבד,
> לא את מסך הבית. תשתמש בפונט שלנו. עיצוב — מהרפרנס. האנימציות — מהרפרנס.
> זה רק הפתיח למה שכבר קיים, אל תשנה מה שכבר יש."

Everything that happens **before** the tabs, converted from the `CYPHIX
Onboarding` design reference to React Native. Fourteen screens: splash →
welcome → sign in / reset password, or welcome → credentials → phone → code →
six health steps → review → "Profile created". The reference's own home screen
is deliberately **not** ported — this app already has one.

### Where it sits in the app

`AuthGate` stands in **front** of `RootNavigator`, not inside it. The flow has
no tabs, no dock and no routes of its own, and until there is an account there
is nothing for the navigator to be about. Nothing else in the app moved: the
tabs, the exam, the report and Scan History are byte-identical.

The flow itself is **one screen that swaps its contents** (`OnboardingScreen`),
which is both what the reference does and what the web's `RegisterWizard` does.
A native stack push would have read as leaving CYPHIX rather than moving
through it — and the reference's transition is a 16 px slide, which is a
content change, not a page change.

### The animations are ported, not approximated

All four of the reference's keyframes, on the UI thread via Reanimated:

| Reference | Here |
|---|---|
| `scrIn` — 16 px + fade, 320 ms, `cubic-bezier(.22,.7,.3,1)` | `StepFadeIn`, keyed on the step, and **direction-aware** — going back does not look like going on |
| `fadeUp` — 10 px + fade, 600 ms, `both` | `FadeUpView`. The `both` fill mode is the point: the element is INVISIBLE during its delay, never flashed and then animated |
| `pulseRing` — scale .9→1.35, 2 s, staggered .6 s | `PulseRing`, two of them. The 30 % of the cycle where it is invisible is the REST between beats; without it the rings read as a spinner |
| `sweep` — `stroke-dashoffset` 520→0 over 1.6 s | `EcgSweepMark`, through `useAnimatedProps` — putting the offset in React state would re-render the splash 96 times in 1.6 s |

Plus the two the reference does with CSS transitions: the step rail (400 ms on
the same bezier) and the password meter (width **and** colour, 300 ms).

### Three things that are deliberately NOT the reference

1. **The font.** The reference sets IBM Plex Mono on every label, digit and
   keycap. Mobile ships the system font (root `CLAUDE.md` §3.1) — "תשתמש
   בפונט שלנו". What carries over is the *treatment*: 10.5 pt, caps, `.1em`
   tracking, and `tabular-nums` everywhere digits change in place, so the
   64 pt height readout does not shift under the thumb dragging it.
2. **The emergency contact.** The reference opens on the phone's contact list.
   Reading the address book needs a permission and a native module — and a
   mis-tap in a list of real people silently writes a real person into a
   medical record. It is typed here; the native picker is a tracked follow-up.
3. **Dark mode**, which the reference does not have at all. The app has a
   theme switch, so `authTheme.ts` carries a dark translation of the same
   design rather than flashing white at 2 a.m.

### The bug that would have shipped

"Profile created" was written, styled, animated — and **unreachable**.
Registration writes the account, so `auth.user` exists one screen before the
flow ends, and the gate swapped in the app on that frame. The patient would
have gone from the review screen straight to the tabs, and nobody would ever
have seen the last screen of the design.

`authSlice.justRegistered` is the latch that holds the door, and
`welcomeAcknowledged` is the patient letting go of it. Worth stating plainly:
`tsc`, both `expo export`s and `expo-doctor` were **green** through all of it.

Two more found the same way, both in the arithmetic rather than the logic:
three 33 % keypad keys plus two 10 pt gaps overflow their row, and `flexWrap`
answers that by silently giving a two-column dialler; and `paddingEnd`
resolves against the native layout direction, which this app does not switch —
so in Hebrew the password text would have run underneath the Show button.
All three are in PARITY.md's trap table.

### Honest about what is mocked

There is no server, and the flow says so rather than pretending:

- **No SMS.** The code step states it is a demo build and prints the code it
  will accept. A realistic screen waiting on a text that never arrives would
  have been the worse lie.
- **No mail.** Reset answers "if that address is on an account, a link is on
  its way" — which is both true here and what a real server should say anyway
  (confirming which addresses exist is an enumeration oracle).
- **Apple / Google** are drawn and land on the e-mail form. They cannot work
  until the server holds the client secrets.
- **Terms / Privacy** are named in the legal line and are not tappable,
  because no such document exists yet.
- Accounts live on the device (AsyncStorage, **SHA-256 digests** via
  `expo-crypto`); the session token goes to the **Keychain / Keystore**.
  `authService` is the same swap point the web has — one class, one line.

### Face ID, and when it is offered

`expo-local-authentication`, drawn only when the device has the hardware, has
something enrolled, **and** remembers an account. All three, or the offer could
not be honoured — and the front door is the last place to bluff.

### What this changes outside the flow (small, and on purpose)

- **Sign out** is live in Settings › Account, behind a confirmation. It was
  already there as a disabled "Coming soon" row waiting for exactly this — and
  without it the flow could never be reached a second time on a device that has
  completed it.
- **The greeting** on Home is the name the patient typed, falling back to the
  demo card.

Everything else stays: the Profile tab still renders `DEMO_CARD`, and
`useCurrentUser` still answers with the demo **clinician**. That second one is
deliberate and worth being explicit about — a registered account is a
`patient`, and every Scan History tool is gated on clinician permissions, so
wiring the session through would silently strip a finished module with no way
to switch back. WHO the patient is, is now real; WHAT they may do is still the
stand-in. Both are rows in PARITY.md.

### Shared

`CYPHIX_SHARED/src/auth/contract.ts` is new: the account shape, the
registration profile, the typed failure codes, `MIN_PASSWORD_LENGTH`, the auth
route paths, and `passwordStrength()` — so "fair" means the same thing on the
phone and on the web. ⚠️ The web still carries its own copy in
`services/auth/authTypes.ts`; until it imports from the package, an edit
belongs in both.

### Verified / not verified

`tsc --noEmit` clean, `expo export` bundles for **both** platforms,
`expo-doctor` 18/18. None of that has touched a phone. Unproven and listed in
PARITY.md: the animations at real frame rates, the pad and the OTP boxes on a
short screen (both steps scroll for that reason and nobody has watched them do
it), the slider under a thumb, the photo picker returning a usable square, and
Face ID — which cannot be tested from Windows at all.

---

## v0.18.2 — 2026-08-02 — It was never the animation. It was one un-memoised object.

> "you just made the animation faster, but it flickers — it's not the speed it
> opens, there's just judder, it's not smooth"

Correct, and v0.18.1's shortened timings were me guessing at a symptom instead
of measuring a cause. The timings are back to 240/160 with a comment saying not
to reach for them again for a smoothness complaint.

### ★ One line, three complaints

```ts
const palette = { ...(dark ? ECG_PAPER_DARK : ECG_PAPER_LIGHT), ghost: t.textTertiary };
```

A fresh object on every render of `StudyViewerScreen` — and it is a prop of six
`EcgReviewStrip`s, **every one of which is `memo`-wrapped specifically to avoid
this**. The memo therefore never held, not once. So every re-render of the
screen — opening a sheet, nudging a caliper, one frame of any drag — re-ran
`buildEcgPath` over **four tiles × six leads**, doubled again when a ghost was
on. That is 24–48 decimating passes over thousands of samples, on the JS
thread, on the frame the sheet was trying to animate in.

Memoised, the strips now skip re-rendering entirely.

### Dragging the ghost was worse than that

> "when you move the reference trace it stutters, really slow, feels dated"

Everything above, *plus* every touch event re-entered `useOverlayRecording`,
which allocated six shifted `Float32Array`s — and in warp mode re-ran
`alignByFiducials` on all six leads. Per move event. The fiducial warp is the
most expensive thing in this module and it was running at touch frequency.

None of it was necessary. **A manual nudge is a pure translation of an
already-aligned curve**, so it belongs where translations belong:

- `useOverlayRecording` no longer takes the reader's nudge at all, and reports
  only what the *algorithm* did — which is also the only part a reader needs
  stated.
- The nudge is carried in **millimetres of paper** (the unit it is drawn in,
  rather than samples) and applied as a `<G translate>` on the ghost. One native
  attribute update; the path strings never change, so react-native-svg has
  nothing to re-parse.
- ⚠️ The catch: each tile only draws the samples that land on it, so a translate
  would open a gap the width of the shift at every seam. Each tile's ghost path
  is now over-drawn by `GHOST_NUDGE_LIMIT_MM` (40 mm = 1.6 s, more than one RR
  interval at any resting rate) on both sides, the `<Svg>` viewBox clips the
  overhang, and the nudge is clamped to exactly that margin.

### The compare capsule stayed on screen with nothing to drag

> "even after you leave compare mode the DRAG TO MOVE THE GRAY TRACE capsule is
> stuck on screen although there is no reference trace"

Clearing the comparison set `overlayId` to null and left `mode` on `'ghost'`.
Two fixes, because either alone would have been luck: the screen now drops out
of ghost mode when the overlay goes away, **and** the sheet requires a ghost to
*exist* before drawing any of its chrome.

That second one mattered more than the capsule did. Underneath it sat an
invisible full-sheet drag surface, also gated on `mode` alone — so a stuck ghost
mode was silently swallowing every touch on the trace and freezing its scroll.
The visible symptom was a leftover capsule; the real one was a dead sheet.

### Verified

`tsc --noEmit` clean · both `expo export`s bundle · `expo-doctor` 18/18 — and
a frame rate remains something none of them can see.

---

## v0.18.1 — 2026-08-02 — Two blurs were one too many, and I over-corrected on the drag

### The sheets were slow and flickered on open

> "when you open it, it's slow and flickers a bit"

Both symptoms, one cause: **two full-screen blurs, the outer one with an
animated opacity.**

- The scrim blurred the page, and the panel's own `GlassSurface` then blurred
  *that*. On Android `dimezisBlurView` is experimental and snapshots a view
  tree per frame; two stacked is visibly janky.
- Worse, the scrim's opacity was what animated. A `UIVisualEffectView`
  **re-computes its effect whenever its opacity changes**, so fading one in
  re-renders a full-screen blur on every frame of the presentation. That is the
  flicker, exactly.

The scrim is now a plain animated colour — free to fade, native driver, no
effect to re-compute — and the **panel keeps the blur**, sampling the page
straight through the dim. Nothing was lost: this is what the platform itself
does, since an iOS sheet dims its backdrop and reserves the material for the
sheet. A blur was moved, not removed. Timings came down too, 260/170 → 210/140.

### The ghost is dragged on the paper again

> "the moving like before, with everything on the screen, not like now with
> buttons"

Fair, and v0.18.0's arrow pad was me answering the wrong question for the
second time running. The complaint was never that the drag was hard to *do* —
it was that nothing said it existed. v0.17.0 fixed that with a labelled handle.
Then v0.18.0 replaced the gesture anyway, and made it worse: **lining two
heartbeats up is a direct-manipulation task.** The eye judges the fit
continuously, and none of that loop survives being expressed as 40 ms steps in
a list you have to look away from the trace to press.

So: the paper is draggable **everywhere** in ghost mode (the interaction), the
labelled handle stays over it (the affordance that says so), and both carry
their own responder instance rather than sharing one — a responder keeps its
running totals in a single closure, and two nodes sharing them would be the
mid-gesture-rebuild bug in a new hat.

The comparison sheet keeps its job — what the grey trace is, which study, how
they are aligned and what that costs — and now ends with one primary action
that **closes it** and hands the trace back draggable. Comparing two waveforms
is done by looking at them; a panel over the thing being judged is the last
thing that helps. The offset reads out on the status line while dragging, so
the sheet never has to be reopened just to see a number.

### Verified

`tsc --noEmit` clean · both `expo export`s bundle · `expo-doctor` 18/18. As
ever, none of that can see a frame rate or a gesture. Both fixes here are
exactly the kind only a hand on a device can confirm.

---

## v0.18.0 — 2026-08-02 — One import caused two of the three

Three findings came back from the device. Two of them are the same bug, and
v0.17.0's changelog entry for the sheets was **wrong** — it claimed the sheets
now rise on a blurred material. They did not, and could not have. The code was
right and the container made it impossible.

### ★ `Modal` is a separate window, and that ruins blur *and* landscape

React Native's `Modal` is not a view in your tree. On iOS it is its own
`UIViewController` in its own window; on Android it is a `Dialog` with its own
`Window`. Two consequences, both of which the user reported:

> "when you press FILTERS AND COMPARISONS it still looks dated with the grey
> rectangle coming up over it"

`UIVisualEffectView` — what `expo-blur` wraps — samples the layer tree of **its
own window**, and dimezis' `BlurView` snapshots **its own decor view**. Inside a
`Modal` that content is empty, so both degrade to a flat translucent rectangle
over black. Every glass sheet shipped in v0.17.0 was, on the device, precisely
the grey rectangle it was written to replace. No radius, tint or intensity
could have fixed it: **a material needs something behind it, and a Modal is
defined by having nothing behind it.**

> "in FULL SCREEN when working with MARKERS or something else it crashes the
> app in Expo Go"

`Modal` defaults to `supportedOrientations={['portrait']}`. Present one while
the app is landscape and UIKit raises `UIApplicationInvalidInterfaceOrientation`
— an uncaught Objective-C exception, so the **process dies**. Full screen is
landscape; MARK → tap a beat → the composer presents → gone. This was not a
JS error and would never have appeared in a red box.

Note that `supportedOrientations` would have silenced the crash and left the
grey rectangle. Only leaving `Modal` fixes both, so overlays are now rendered
**in tree** — an absolutely-positioned layer inside the screen's own hierarchy
(`components/atoms/OverlayLayer.tsx`). The blur samples the real page, and
there is no second window to disagree about orientation.

What that file had to take over from `Modal`, none of which is optional:

- **Android's hardware back button** (`onRequestClose`). Without it the first
  thing an Android user tries leaves the *app* rather than the sheet.
- **The keyboard.** A bottom-anchored sheet in tree is not lifted by the OS, so
  the layer measures the keyboard and rides above it. `KeyboardAvoidingView`
  came out of `AnnotationComposer` rather than being kept "just in case" — it
  does not work inside an absolutely-positioned host, so it was only ever a
  second thing that could move the panel without ever having moved it.
- **Mount/unmount around the animation**, so a closed sheet costs nothing and a
  closing one is still visible while it leaves.

Full screen's safe-area padding moved to an inner view at the same time: an
overlay's scrim is positioned against its parent's *content* box, so a padded
root would have left four unblurred strips around every sheet.

### Comparison stops being a settings list for an unexplained feature

> "COMPARE WITH is still not clear or intuitive to use"

Reported twice now, and the reason is in the sentence: what was on screen was
**a list of settings for a feature that had never been explained**, three rows
down the middle of the filters sheet, whose only control — moving the reference
trace — was a drag on a surface the reader had no reason to think was
draggable. v0.17.0 added a visible handle. That fixed *discovering the drag*
and not *understanding the feature*.

It is now its own toolbar tool and its own sheet (`CompareSheet`), which
answers the three questions a reader actually has, in order:

1. **What is this?** One sentence, plus a **legend**. The grey trace is the
   most confusing thing on the screen the moment it appears; a two-swatch key
   costs 20 pt and removes the confusion outright. The swatch is painted from
   the colour the ghost is really drawn in, so it cannot drift out of date.
2. **Compared with what?** The studies, as a plain radio picker.
3. **How do I move it?** **Buttons.** A drag is the nicest way to move the
   ghost and the worst way to discover that moving it is possible. One tap =
   **one small square** — 40 ms across, 0.1 mV up — which is the unit a reader
   is already looking at. The drag is still there, offered in the sheet as an
   alternative rather than being the secret.

The alignment modes stay, as a segmented control with the selected mode's
**consequence printed underneath**. "Never measure off a warped trace" is not a
footnote; it is simultaneously the reason the mode exists and the reason it is
dangerous.

The ⋯ sheet is therefore filters only, and is titled that.

### Verified

`tsc --noEmit` clean · `expo export` bundles for iOS and Android ·
`expo-doctor` 18/18. **None of which would have caught either bug fixed here**
— a Modal typechecks, bundles and passes doctor whether or not it crashes in
landscape, and a blur that samples an empty window is well-formed code. This is
the second consecutive release where every real defect was invisible to all
three checks. The module stays 🔬 in `PARITY.md`.

---

## v0.17.0 — 2026-08-02 — Seven more from the device

### ★ The cursor bug was real, and it is the same class as last time

> "in CURSOR when you place one and then move it and lift your finger, it
> moves with the finger and gets deleted instead of staying where I put it"

Both halves of that sentence come from one line. The handlers close over the
running totals that turn `gestureState`'s *distance since touch-down* into
*distance since the last event*. `useMemo(..., [onTap, onStep])` rebuilt the
responder between move events — those props are fresh arrows on every parent
render, and every drag re-renders the parent — and a rebuilt responder starts
with `last = 0` and `travelled = 0`. So:

- each move applied the **full** distance from touch-down → it ran away from
  the finger;
- release read `travelled === 0` as a **tap** → and a tap on a reference line
  removes it.

Responders are now built **once** and read everything live through a ref.
`useDragHandle` exists so no call site can reintroduce it. **Never put a
callback prop in a responder's dependency array.**

### The sheets stop looking like 1998

> "when the BASELINE SMOOTH tab and the MARKER tab open, make it beautiful,
> it looks like an app from the 80s with a grey rectangle"

Fair. They were a flat `surface`-coloured rectangle over flat black. Every
sheet and dialog now rises in one shared `BottomSheet`: the scrim **blurs** the
page instead of dimming it, the panel is `GlassSurface` (Apple Liquid Glass on
iOS 26+, a real `dimezisBlurView` blur on Android — never a translucent
rectangle pretending to be one), 28 pt corners, a grabber, a hairline edge and
a shadow that lifts it. Fields and chips inside are a translucent wash of the
panel rather than solid blocks pasted onto it. `ConfirmDialog` gets the same
treatment — the study you are about to delete stays recognisable behind it,
which is the point of confirming against a specific record.

### Full screen: three separate faults

> "the top bar goes over the waves" · "there's the island on iPhone and you
> didn't account for it, it hides parts of the wave" · "there's no exit button"

1. The bar **floated over the paper**. It is now in flow above the sheet.
2. The screen was **full-bleed**. In landscape the notch/Dynamic Island is on a
   SIDE, so the first ~50 pt of every lead sat under it. The whole screen is
   now inset on all four edges. A cut-off ECG is not a cosmetic problem.
3. The only way out was the toolbar's contract icon. There is now a **labelled
   exit button**, first in the bar.

### The measurements header

> "it's nice that the tabs stick, but it looks dated — content just scrolls
> beneath with no threshold"

The header is now a blurred glass bar that content genuinely passes **under**,
and it earns a hairline edge only once something has actually gone behind it
(6 pt of scroll). A line drawn over an unscrolled page is a boundary between
nothing and nothing.

### Compare, and the missing marker

> "in COMPARE I still don't understand how to move the reference wave"

Because the drag surface was invisible — the whole sheet was draggable and
nothing said so. Ghost mode now shows a **labelled handle** in the middle of
the sheet, and the comparison status line is itself the way in: tap it and the
ghost becomes movable.

> "in MARKER, as soon as I lift my finger the sheet comes up and nothing is
> left on screen for the doctor to know where they left the marker"

The point being composed is now drawn on the trace — a dashed hollow marker, so
it cannot be mistaken for a saved one — for as long as the sheet is open.

### Verified

`tsc --noEmit` clean · `expo export` bundles for iOS and Android ·
`expo-doctor` 18/18. Which is what the two previous rounds also passed. Every
fix here is a gesture or a material, and both are invisible to all three — this
needs a phone.

## v0.16.0 — 2026-08-01 — The viewer meets a real finger

v0.15.0 typechecked, bundled and passed `expo-doctor`, and the CHANGELOG said
plainly that none of that proves the gestures work. It was right to. Six
findings from the device, and the first is not a polish item — it is the whole
feature not working.

### ★ Nothing was draggable, and the reason is one line

> "in CALIPERS when you grab the circles the waves move too, so you can't
> really move it" · "in MARK and CURSOR you can't grab the line and drag it
> after you place it"

Every handle used `onMoveShouldSetPanResponder`, i.e. it asked for the gesture
after the finger had already moved. **A `ScrollView` that has begun panning
owns the responder, and a child asking afterwards is ignored.** So the
crosshair moved *and* the paper moved, and a marker could not be moved at all.

Every handle now claims on **touch-down** (`onStartShouldSetPanResponder` +
capture) and sets a `dragging` flag in `onPanResponderGrant`, which flips
`scrollEnabled` to `false` in the same commit — the ScrollView never starts.
Release turns it back on.

That created a second problem and its fix: a handle that owns touch-down
swallows any `Pressable` inside it, so a marker would have become draggable
and un-openable. Tap and drag are now told apart **on release, by travel** —
under 6 pt it was a tap. That is also what made reference lines usable: the
grab strip covers the whole line, a drag moves it, a tap removes it.

### The trace gets the screen back

> "why are all the MARK CURSOR buttons so long, there's barely room for the
> ECG waves which should take about 90% of the screen"

Correct, and the ratio was indefensible on the one module whose entire subject
is a waveform. Two different answers:

**Portrait is compacted.** The toolbar is icons (38 pt row, was ~120 pt of
wrapped 44 pt chips); the metadata line folded into the headline; the status
line is a **fixed 26 pt slot** that the caliper readout *shares* rather than
adds to — so the trace's height no longer depends on which tool is on.
Everything that needs words to be honest — the filter stages, the comparison,
the alignment modes — moved into a labelled ⋯ sheet. An icon for
"Savitzky-Golay smoothing" would have been a guess.

**Full screen is landscape, and it is the real answer.** A six-lead ECG is
259 × 180 mm — a landscape shape. The button rotates the route (declaratively,
through `setOptions`; `lockAsync` stays banned), hides everything but one slim
floating bar of dense icons, and opens at the window that fits **all six leads
to the height** (`fitWindowMm`). Note that this is a *height* calculation:
the obvious "fit" — show the whole recording — gives 99 pt bands inside a
353 pt sheet, so four of the six leads are below the fold. Where that leaves
paper past the end of the recording, blank paper is drawn, exactly as a
printout does.

### The rest

- **"the capsule sits on top of the waves instead of above them"** — the live
  Δt / bpm / ΔmV readout was floating over the trace, covering the very
  deflections whose distance it reports. It is now in the chrome, in the
  status slot.
- **"R PEAKS only works on lead II"** — a rule copied from the report, where
  it is right (a printed sheet marks the one rhythm strip the rate came from).
  In a *tool* the web marks every lead, for the stated reason that a reader
  wants to see which beats the rate came from wherever they are looking. Fixed.
- **"in COMPARE WITH you can't move the reference wave"** — same scroll-steals
  -the-gesture defect, plus the control was buried behind two chips. Nudge is
  now a row in the ⋯ sheet that puts the sheet into ghost mode directly.

### Verified

`tsc --noEmit` clean · `expo export` bundles for iOS and Android ·
`expo-doctor` 18/18. As last time, that proves the code is well-formed and
nothing about how it feels. This round exists precisely because the previous
round's green checks meant less than one minute on a phone — the module stays
🔬 in `PARITY.md`.

## v0.15.0 — 2026-08-01 — History becomes a module, not a placeholder

The History tab said "Completed measurements sync here through the CYPHIX
server". They did not, because there is no server yet — so the tab was a
sentence about a plan. This ships the whole web History module on the phone.

### Why there is an on-device store

The web app has never had a backend either; its History works because
`mockBaseQuery` routes to `localStorage`. Mobile now has the same thing:
`services/db/recordingStore.ts` over AsyncStorage, behind
`services/api/localBaseQuery.ts`, selected by exactly the line web's `baseApi`
carries — `ENV.hasBackend ? httpBaseQuery : localBaseQuery`. Set
`EXPO_PUBLIC_API_BASE_URL` and every endpoint, hook and screen above it is
already talking to the real server; nothing changes but that line.

One departure from the web store, and it is deliberate: recordings are kept as
an **index plus one payload key each**, not as a single JSON blob.
`RecordingRepository.list()` exists so browsing does not drag every waveform
out of storage, and on a 6 MB AsyncStorage budget rewriting ~1.4 MB to save one
note is the difference between that promise being kept and being decorative.

A finished exam now files itself the moment the report appears
(`useSaveRecording`, ported), saves **once**, and says so on the report — and
says so louder if it failed. A recording that did not persist must never look
like one that did.

### The viewer, re-thought for a finger

Same guarantees as the web: the scale is **frozen at 25 mm/s · 10 mm/mV**,
zoom is a window over the paper, all six leads share ONE scroll so they always
show the same instant, and the measurements are computed from the waveform
actually on screen. What changed is every interaction that assumed a mouse:

| Web | Phone | Why |
|---|---|---|
| Hover → click → click → click calipers | **Two crosshairs that are always there and are dragged** | A finger cannot hover, and it covers ~9 mm of paper — 360 ms of ECG, wider than a QRS. Every handle moves by the finger's *delta*, so the point being positioned stays visible beside the hand positioning it. Precision comes from zooming in, never from rescaling the trace |
| Ctrl+wheel zoom | − / + and Fit | Redrawing six vector sheets per frame is not a 60 fps operation in JS. Discrete steps are what the web's own buttons do anyway |
| Corner dropdown "Actions" | **Bottom sheet** | A 180 pt popover anchored to the far top corner of a 390 pt screen is the one place every platform's guidelines say not to put actions |
| Floating annotation card | **Keyboard-aware bottom sheet, five quick tags above the field** | The thing that shrinks a phone's waveform is the keyboard. One tap on "PVC" and it never opens |
| Ghost dragged whenever no tool owns the pointer | Ghost dragging is its **own mode** | A drag that both pans the paper and moves the ghost cannot be either |

The sheet is **tiled**: each lead is a row of 65 mm `<Svg>` panes rather than
one. react-native-svg gives each `<Svg>` a single native texture, and past
~4 096 px an over-wide one draws *nothing at all* — a blank lead, not a clipped
one. 65 mm is a multiple of the 5 mm major grid so the seams are invisible, and
each tile's path starts one sample early so the trace crosses them unbroken.

### Export leaves the building properly

`buildRecordingCsv`, `buildRecordingEdf` and the CSV importer moved into
`@cyphix/shared`, so a file exported on the phone and one exported in the
browser are the same bytes. Only delivery differs: the web clicks a hidden
`<a download>`, the phone writes to the cache and opens the OS share sheet —
a phone has no downloads folder to click into.

PDF is new work rather than a port: `window.print()` has nothing to snapshot on
a phone, so `services/export/recordingPdf.ts` **builds** the A4 sheet from the
same shared `buildEcgPath` / `buildEcgGrid` the screen uses. A ruler laid on the
printout therefore agrees with the web print. A 10 s capture paginates across
consecutive six-lead sheets the way a real machine does, instead of printing
6.9 s and captioning the rest away.

### The gates are real code, not a plan

`types/rbac.ts` and `features/history/viewerFeatures.ts` are ported whole,
rationale comments included. Calipers, filters, annotations, compare, export and
delete each ask `features.has(...)`, never a role. `features/auth/useCurrentUser.ts`
is the single stand-in identity — auth lands as a swap of that one file, not as a
retrofit of permission checks into finished screens. Every read, annotate,
export and delete goes through `services/audit/auditLogger.ts` with references
only, never PII.

### Four new dependencies, and what each buys

`expo-file-system` + `expo-sharing` (export delivery), `expo-print` (the PDF),
`expo-document-picker` (CSV import). All four are in Expo Go for SDK 54, so the
Expo Go workflow is intact — verified against the SDK 54 bundled-module list,
not against npm `latest`, which would have dragged the project to SDK 57 and
broken Expo Go exactly as `CLAUDE.md` §1 warns.

### Verified

`tsc --noEmit` clean on the app **and** on `CYPHIX_SHARED` · `expo export`
bundles for iOS and Android · `expo-doctor` 18/18.

That means the code is well-formed. It does **not** mean the gestures feel
right: a caliper that drags a hair off the finger, a tap target under a scroll,
a seam that shows at one particular zoom — none of that is visible to a
compiler. Everything here stays 🔬 in `PARITY.md` until it has been touched on a
device.

## v0.14.0 — 2026-08-01 — The floating wordmark goes away (for now)

The user asked to hide the CYPHIX logo in the top-start corner of the native
app. **Hidden, not removed** — "for now" was the word, so it is a switch:

```ts
// src/config/featureFlags.ts
export const SHOW_SHELL_WORDMARK = false;   // ← flip to true, it all comes back
```

It renders from **two** places, because Profile scrolls and therefore does not
use `PatientShell` — it carries its own copy of the shell's floating mark. Both
now read the same constant, so they cannot disagree.

### The padding follows the switch

The mark's 70 pt of top padding existed for exactly one reason: to keep content
clear of a logo floating over it. With the logo hidden, that reservation holds
nothing, which is the same mistake as the dock-inset bug written up in
`CLAUDE.md` — space reserved for chrome that is not there. So the padding is
tied to the same condition and drops to 12 pt.

Visible effect, since the patient screens are vertically centred: content
settles **up by ~29 pt** on Home / History / Tests / Chat, and the Profile card
starts nearer the top. If the empty gap was actually wanted, that is a one-line
change — say so and I will pin the padding back to 70.

### What is NOT hidden

`ReportHeader`'s letterhead mark, at the top of the end-of-exam report. That
one identifies a clinical document rather than decorating a screen, and a
report with no issuer on it is a different decision from a tidier home screen.
Say the word if you want it gone too.

### Verified

`tsc --noEmit` clean · `expo export` bundles for iOS and Android ·
`expo-doctor` 18/18. The re-centring is a layout change no typecheck can see —
`🔬` until it is looked at on a device.

## v0.13.0 — 2026-08-01 — The app learns to speak: i18n, and a language picker in Settings

The user asked three questions: is the native app modular, does it support
multiple languages, and can the language picker be added to Settings. The
first was already yes. The second was **no** — every string in the app was a
literal, and `SettingsScreen`'s own header comment said so ("Language — the
mobile app has no i18n layer yet"). The third is what this release is.

### The shape is the web's, on purpose

`src/i18n/` is the same four files the web app has, with the same names and
the same public surface:

```
i18n/
├── config.ts          ← THE REGISTRY. Adding a language is an edit HERE.
├── I18nContext.ts     ← context + { lang, dir, rtl, setLang, t }
├── I18nProvider.tsx   ← owns the active language
├── useTranslation.ts  ← the hook every component calls
└── locales/
    ├── en.ts          ← the canonical key set
    └── he.ts          ← Record<TranslationKey, string>
```

**Adding a third language is one new file plus three lines**, exactly as on
the web: copy `locales/en.ts`, translate the values, then add the code to
`LangCode`, a row to `LANG_META` and a line to `TRANSLATIONS`. Nothing else
changes anywhere — the Settings picker is driven by `LANG_META`, so the new
language appears in it on its own.

`he.ts` is typed `Record<TranslationKey, string>` where `TranslationKey` is
`keyof typeof en`. A key that exists in English and not in the new language is
a **compile error**, not a blank label discovered by a patient.

Wherever the web already says a sentence in Hebrew, the wording is copied
verbatim from `CYPHIX_MEDICAL_WEB/src/i18n/locales/he.ts` — the gate messages,
the prep steps, the whole measurements sheet. Two platforms giving the same
clinical instruction two different ways is a clinical problem, not a copy one.

### Where the choice is stored, and why not in its own key

The web provider reads and writes `localStorage` synchronously. Every phone
equivalent is **async**, so reading the language during the first render is
impossible — the app would open in English and repaint in Hebrew a frame
later. That is the same bug `PreferencesGate` already exists to prevent for
the theme.

So `language` lives in the **preferences slice**, inside the blob the gate
already hydrates before the first paint. One gate, one write path, no flash.
`I18nProvider` mounts inside `PreferencesGate` and reads from it.

### RTL: what works, and what is honestly not done

Hebrew is right-to-left. On the web that is one line (`document.documentElement
.dir`) and the browser mirrors the layout. React Native has **no per-subtree
`dir`** — real mirroring is `I18nManager.forceRTL()`, which is process-wide and
only takes effect **after the app is relaunched**.

So this release does the part that works today: rows, section headers, metric
tiles, chips, the profile identity block and the forward chevron all reverse
and re-align off `useTranslation().rtl`. Native mirroring is marked `🟡` in
`PARITY.md`; when it lands it needs a deliberate "restart to apply" flow, not
a silent flip under a patient mid-session.

Two things are **never** mirrored, in any language:

* the interval bar's axis — `scaleMin → scaleMax` is a number line, and
  flipping it would put a short PR interval where a long one belongs;
* the ECG paper — time runs left to right on every ECG on earth.

### What is deliberately not translated

Each of these has a comment at the site explaining why:

* clinical `display` values on coded chips — ICD-10 / SNOMED **data**, not copy;
* lead names (I, II, III, aVR, aVL, aVF) and unit symbols (BPM, ms, Hz, mV, %);
* the 25 mm/s · 10 mm/mV scale caption;
* `APP_BUILD_LABEL` — a developer identifier a bug report should quote verbatim;
* the platform's own BLE error text, shown untranslated rather than replaced by
  a generic sentence that says less about what actually went wrong.

### One bug fixed on the way

The report's letterhead formatted its date with `toLocaleDateString(undefined)`
— "whatever the device is set to". A patient who set CYPHIX to Hebrew on an
English phone got a Hebrew report with an English date on it. It now formats in
the **chosen** language, which is the whole point of having a picker.

### The picker itself

Settings → Appearance, **first row**, above Theme. Everything else in that
section is about how the app looks; this one decides whether the patient can
read any of it — so it is the first thing under the first heading, and its
options are written in their own scripts (`English`, `עברית`), never
translated. A row of 44 pt pills rather than the web's dropdown: RN has no
non-modal `<select>`, and a menu whose label is in the language you are trying
to leave is not an escape route.

### Verified

`tsc --noEmit` clean · `expo export` bundles for **iOS and Android** ·
`expo-doctor` 18/18. That means the code is well-formed, **not** that it looks
right in Hebrew on a real screen — line breaks, pill wrapping and the reversed
rows all pass every one of those checks. Stays `🔬` until someone switches the
language on a device.

## v0.12.0 — 2026-08-01 — Report polish: the five things that still read as "not native"

v0.11.0 fixed the report's *structure*. This fixes how it looks, against five
specific observations from the user.

### 1. The tab switcher sat in the left third of the screen

`SegmentedControl` is a port of the web's `.settings-seg` — chips sized to
their own text, brand-navy fill on the active one. That is a settings **chip
group**, and it is right in Settings. As a tab bar it occupied the left third
of the row and recoloured on tap, which reads as a toggle rather than as
navigation.

New molecule `SegmentedTabs`, left `SegmentedControl` alone so Settings does
not change underneath the user. Segments are `flex: 1` (they divide the full
width) and the active one is marked by a **thumb that slides** between them on
the native driver — so it keeps moving smoothly while the tab it is revealing
mounts six SVG strips.

### 2. Glass — but where it can actually do something

The user asked for a glass effect on the tab switcher. A frosted material only
reads as glass when there is something behind it to refract, and the tab bar
sits on a flat page background: glass over flat grey renders as flat grey.

So the glass went on the **action bar** instead, which is the one place in this
screen where it earns its keep — the bar is now absolutely positioned and the
document scrolls underneath it. `GlassSurface` (already proven on the dock)
gives Apple's real Liquid Glass on iOS 26+ and a genuinely blurring fallback
elsewhere. If the user wants it on the tabs anyway that is a one-line change,
but it would be decoration rather than material.

### 3. The waveform section floated on grey

Six separately bordered cards with gaps between them, on the app background.
Now: **one surface panel**, and inside it the six leads are drawn edge to edge
with **no gap at all** (`EcgStripSvg variant="channel"` — no border, no
corners, no per-strip chrome), so the millimetre grid runs unbroken from lead I
to aVF. That is what actually comes off a six-channel ECG machine, and it is
also simply cleaner.

One constant had to change for it to work: the band height is now **30 mm, not
32**. It must be a multiple of the 5 mm major step, or band N's last grid line
and band N+1's first do not coincide and every seam shows as a stripe of
mismatched squares. The panel's corner radius clips the paper, and the scale
caption moved inside the panel under a hairline, where it belongs to the sheet.

| iPhone 15 Pro | before | v0.11.0 | now |
|---|---|---|---|
| band height | 50.6 pt | 115.5 pt | 107.7 pt |
| 1 mV | 18.1 pt | 36.1 pt | **35.9 pt** (1.99×) |
| leads | 6 bordered cards | 6 bordered cards | one continuous sheet |

### 4. Units spilled out of their tiles

Not the numbers — the **word-valued** measurements. "Slightly variable" is 17
characters at 22 px, about 200 pt inside a 147 pt tile. A `<Text>` inside a
`flexDirection: 'row'` does not wrap by default; it overflows its parent and
prints straight through the border. `flexShrink: 1` on the value (and `0` on
the unit, so "ms" never breaks across lines) is the RN equivalent of the web's
`.metric-value { overflow-wrap: anywhere }`.

While in there: `axisLayout` had `alignItems: 'center'`, which was shrinking
the metric grid under the dial to its text width and leaving that row ragged.

### 5. The axis dial was a thumbnail

It was a fixed 190 pt. It is now self-sizing — it measures the width it is
given and fills it, capped at 340 pt (**1.74×** on an iPhone 15 Pro). Every
stroke, label and radius scales by **√**, not linearly: at 1.8× the diameter,
1.8× stroke weights would have made it look coarse rather than bigger.

This diagram is the only thing on the measurement sheet that is *read* rather
than looked up — "+62°" means nothing without the hexaxial reference frame —
so it was the worst thing on the page to have shrunk.

### Also: the measurement blocks are grouped cards now

The web draws them as bare blocks separated by the accent rule, because they
sit on a white `.report-page` that already is the sheet. On mobile there was no
page under them, so five dense blocks sat on the grey background looking like
loose parts. Each is on its own surface now — the platform's own inset-grouped
list.

### Verified

`tsc --noEmit` clean, iOS and Android both bundle, `expo-doctor` 18/18. The
measurements above are computed from the layout formulas. None of it proves the
glass renders or that the thumb slides at 60 fps — that stays 🔬 in `PARITY.md`
until it has been touched on the phone.

## v0.11.0 — 2026-08-01 — The report is a phone document now, not a photocopy of an A4 sheet

The user's report: *"it still feels messy, not native, not professional for a
phone."* They were right, and v0.10.1 only fixed the report's **colours**. The
structure was still wrong, and the structure was the actual complaint.

### What I had built, and why it read as a fax

The web report is deliberately two A4 sheets: `.report-page` × 2, each with a
full `.report-header` letterhead, built for a printer. I ported that layout
element-for-element, which on a 393 pt screen produced:

| symptom | cause |
|---|---|
| the brand mark and four provenance fields, twice, in one scroll | the letterhead repeat — correct on paper (a separated sheet must identify itself), meaningless on a screen that cannot be separated |
| six 51 pt slivers of grid paper | a 182 mm sheet squeezed into 361 pt is **1.9 pt per millimetre**, so a 1 mV R wave stood 19 pt tall |
| everything arriving at once | two "pages" stacked in one vertical scroll with no navigation between them |

Every one of those is a *faithful* port. Fidelity to a print layout is what
made it wrong here — root `CLAUDE.md` §3.3 already says brand identity is
identical to web and layout patterns follow the platform, and I applied the
first half only.

### What it is now

Same content, same tokens, the same frozen 25 mm/s · 10 mm/mV geometry from
`@cyphix/shared`. Restructured:

- **One letterhead** for the document (`ReportHeader` v2.0.0), not one per
  sheet. The provenance it used to hold moved into the card below.
- **A summary card** (`ReportSummaryCard`, new) answers *"what did it say?"* in
  the first screenful: the rate at 46 px, the rhythm, then duration / leads /
  sample rate. Without it the report opened on a wall of grid paper.
  The rhythm chip is tinted with the **accent, never green** — "Regular" is a
  measurement, and a green chip would quietly turn it into a finding.
- **A segmented control** (Waveform | Measurements) replaces the two paper
  pages. Native, and it is what stops the screen being a dump.
- **The waveform window scrolls.** This is the change that fixes "the graphs
  are too small". The window shows 100 mm of paper instead of 182, so the scale
  doubles — and the strip is as long as the recording and slides under it:

  | | v0.10.1 | v0.11.0 |
  |---|---|---|
  | strip height (iPhone 15 Pro) | 50.6 pt | **115.5 pt** (2.28×) |
  | 1 mV deflection | 18.1 pt | **36.1 pt** (2.00×) |
  | one 1 mm square | 5.4 device px | **10.8 device px** |
  | recording shown | 7.3 s, rest discarded | **all 10 s**, 3.6 s per window |

  The alternative ways to fit a 10 s strip on a phone were to rescale the time
  axis — banned in `ecgPath.ts`, because a QRS eyeballed off a stretched axis
  reads the wrong width — or to silently throw away six seconds of a clinical
  recording. Scrolling costs a gesture and keeps both.

  All six leads live in **one** horizontal `ScrollView`, so they move together.
  Six independently scrolled strips would let you compare lead I at t=2 s with
  lead aVF at t=7 s and not notice.

- **Lead labels are pinned** outside that scroll, on paper-coloured chips. A
  label that slides off the sheet leaves you looking at an unidentified trace.
- The heart rate is no longer a `hero` tile inside the analysis sheet: the
  summary card already carries it at 46 px directly above, and two hero
  treatments of one number is precisely the "thrown on the screen" look.

### One defensive limit

`react-native-svg` rasterises each `<Svg>` into a single native texture, and
past the GPU limit (4096 px on much Android hardware) it draws **nothing** —
a blank strip, not a clipped one. Ten seconds of paper is 2 805 px on a 3×
phone, comfortably inside, but `MAX_STRIP_PX` caps it so an unusually wide
screen costs a little zoom instead of the whole trace.

### Verified

`tsc --noEmit` clean; iOS and Android both bundle. Those prove the code is
well-formed, not that it looks right — the geometry above is computed from the
layout formulas, and the report stays 🔬 in `PARITY.md` until it has been
scrolled on the phone.

## v0.10.1 — 2026-08-01 — Two regressions I introduced, both fixed at the source

### The prep photograph was cropped to a corner. Again.

This is the second time, and it is the same line of code both times.

| version | Image style | result |
|---|---|---|
| v4.0.0 | `StyleSheet.absoluteFill` | cropped to a corner ❌ |
| v5.0.0 | `{ width: '100%', height: '100%' }` | correct ✅ |
| v5.2.0 | `StyleSheet.absoluteFill` (to stack both photos for the crossfade) | cropped again ❌ |

`absoluteFill` gives an `<Image>` its box from four zero insets and no
intrinsic size; `resizeMode="contain"` then resolves against the wrong frame
and the parent's `overflow: hidden` crops what is left — the patient sees one
finger. v0.10.0 reintroduced it purely to stack the two photographs for the
crossfade, and brought the bug back with it.

The frame's exact width and height are computed three lines above, so they are
now passed explicitly (`position: 'absolute'` for the stack, real point
dimensions for the size) and nothing is left to infer. The file carries a
comment naming this so it cannot happen a third time.

### The report strips were on pink paper. I invented that.

The web's report tokens are in `report.css` and are **white paper with a BLUE
grid**:

```
--ecg-paper: #FFFFFF   --ecg-grid-minor: rgba(0,82,255,.15)
--ecg-trace: #0A2540   --ecg-grid-major: rgba(0,82,255,.30)
```

v0.10.0 painted `#FFF8F6` paper with red-orange grid lines, reasoning from
what clinical ECG paper looks like in the real world rather than from the
product it is supposed to mirror. Both themes now use the web's values
verbatim, and the file says not to re-derive them from first principles again.

### The measurement sheet reads as a sheet now

The rest of the "it looks thrown on the screen" was three specific things:

- **The lead label and the scale caption sat in a row ABOVE each strip**,
  turning six clean sheets into eighteen competing elements. The web puts both
  ON the paper (`.ecg-svg-label` top-start in the trace colour,
  `.ecg-svg-scale` bottom-end, quiet) and so does this now — the strip is one
  bordered card again.
- **Metric tiles were laid out in ragged thirds.** The web grid is
  `repeat(auto-fit, minmax(140px, 1fr))`, which on a phone column is exactly
  two per row; `flexBasis: 46%` reproduces that and `flexGrow` makes each row
  end flush. Tile styling is now the web's too: uppercase letter-spaced label,
  22 px value (32 px for the hero heart rate), hero on `accent-soft`.
- **Section headings were body-coloured text.** `.analysis-section` is
  uppercase, letter-spaced, in the ACCENT colour with a hairline under it —
  it is the only thing separating five dense blocks, so it has to read as a
  rule rather than as another line.

### Verified

`tsc --noEmit` exit 0 · `expo export` bundles for iOS and Android ·
`expo-doctor` 18/18. The colour values were read out of `report.css` rather
than remembered. Still not a device test.


## v0.10.0 — 2026-08-01 — The report becomes a document

### The report is the web's two-page sheet, and it is portrait

Until now the report was a summary card: nine numbers in a grid and six
Skia traces on a plain background. The web produces something else entirely,
and this is now a port of that:

- **A letterhead on every page** — wordmark, title, which page this is, and
  the provenance block (recorded at / duration / lead set / sample rate).
  Repeated on page 2 on purpose: a sheet separated from its first page must
  still identify itself, or it ends up filed against the wrong record.
- **Page 1, the waveforms**, as VECTOR strips on real ECG paper: a 1 mm /
  5 mm grid at the clinical **25 mm/s and 10 mm/mV**, each with the 1 mV
  calibration pulse so the gain can be checked by eye against the grid, and
  R-peak ticks on lead II showing what the rate was computed from.
- **Page 2, the measurements**: rate & rhythm tiles, the hexaxial axis dial,
  interval bars against typical adult reference bands, the per-lead amplitude
  table with its QRS profile, and signal quality. Measurements only — no
  finding, no normal/abnormal label, nothing that reads as a diagnosis.

**★ The screen rotates back to portrait to show it.** The exam is landscape
because six live traces need the long edge; a report is the opposite shape of
problem — a document read top to bottom, one full-width strip after another.
Sideways would halve every strip and push the measurement sheet behind a
scroll. This is done with `navigation.setOptions({ orientation })`, so
react-native-screens remains the **single owner** of the orientation API — the
whole point of the v0.8.0 flicker fix. `lockAsync` is still nowhere in this
repo, and "record again" rotates back by the same path it came.

`buildEcgPath`, `buildCalibrationPulse` and `buildEcgGrid` moved into
`@cyphix/shared` (`src/ecg/ecgPath.ts`, `ecgGrid.ts`). This is geometry, not
signal maths, but the same rule applies for a different reason: an interval
measured off the web's sheet and one measured off the phone must land on the
same ruler. The web still has its own copies and is untouched — it imports
nothing from `@cyphix/shared` yet (verified), so this addition cannot affect
it. Migrating it is still tracked in `PARITY.md`.

### The set-up steps

- **Both photographs are now exactly the same size.** They were not: the
  picture's slot is the flex remainder, so step 2's longer title wrapped to a
  second line and stole ~25 pt from its own photograph. The title block now
  has a FIXED one-line height, which makes the remainder identical on every
  step regardless of copy — and both steps get the LARGER frame (436 × 245 on
  an iPhone 15 Pro, 462 × 260 on a Pixel 7).
- **Step 2's line is shortened** to "Rest that hand on your left thigh". The
  web's 74-character version was the cause above, and the detail it was
  spending a line on — which way round the watch sits — is precisely what the
  photograph shows unambiguously. `adjustsFontSizeToFit` is the safety net so
  a longer string shrinks rather than truncating: a clinical instruction cut
  off mid-sentence is worse than a small one.
- **The step change is a crossfade, not a reload.** Swapping `source` on one
  `<Image>` makes RN fetch and decode the asset at the moment of the tap — and
  in a dev build that "file" is an HTTP request to Metro — so the frame went
  blank for a beat. Both photographs are now mounted from the first render and
  only their opacity animates; by the time the patient taps, the next one has
  long since decoded.

### The live bar

"Recording — stay still and breathe normally" is gone from the phone layout.
The draining ring beside the BPM already says a capture is running, and a line
of prose is read once and then occupies the traces' height for ten seconds.
The desktop layout keeps the web's copy.

### Verified

`tsc --noEmit` exit 0 · `expo export` bundles for iOS and Android ·
`expo-doctor` 18/18 · prep geometry recomputed and confirmed identical across
both steps · confirmed the web imports nothing from `@cyphix/shared`, so the
shared addition is additive-only. Still not a device test — `🔬` in
`PARITY.md`.


## v0.9.1 — 2026-08-01 — The ring comes back, and it is free

Follow-up to v0.9.0 on the user's note: keep the circle that shows how much
time is left, and tighten the seams between the traces.

### The countdown ring, at zero cost to the traces

v0.9.0 replaced the web's draining circle with a plain number to buy back the
footer. That was the right trade for the footer and the wrong conclusion about
the ring: the bar's height is set by the **Exit pill (~41 pt)**, so anything
shorter than that sits inside height the bar already had. A **40 pt ring fits
there for nothing.** The bar measures 57 pt with the ring and 57 pt without —
the traces do not pay a single point for it.

`CountdownRing` now gives a captionless ring its whole middle: the web's 0.29
number-to-diameter ratio is tuned for a 132 px ring that also carries a
caption, and at 40 pt it would have left an 11 px digit. With no caption to
share the space, the ratio is 0.40 (≈16 px). The label lives beside the ring
in the bar instead, and the ring carries an `accessibilityLabel`.

### Tighter seams

- Grid gap 10 → 6 px on short grids (< 400 pt). A phone was spending 20 of
  ~300 pt of grid on two horizontal seams, and a seam carries no signal. The
  web's 10 px stands on everything taller.
- The card's inner margin now rounds **down** (`floor(cardH × 0.06)`, was
  `round(… × 0.07)`). It is dead space between the card border and the ECG
  paper, so when it falls between two values the trace should get the spare
  point, not the whitespace.
- The stage no longer reserves the **home indicator's** inset. That pill is a
  thin translucent overlay and the grid beneath it is a display with nothing
  to tap, so reserving ~11 pt to protect a card border is a bad trade. The one
  bottom inset that IS opaque system chrome — Android's 3-button nav bar — is
  still cleared, using the same `> 40` test and for the same reason as
  `dockMetrics.dockBottomOffset`.

### Where the traces landed

Computed from the layout formulas (worst case), against the two earlier
versions:

| Device / state | v0.8.0 | v0.9.0 | **v0.9.1** |
|---|---|---|---|
| iPhone 15 Pro, recording | ~52 | 80 | **89** |
| iPhone 15 Pro, waiting | ~52 | 68 | **76** |
| iPhone SE 3rd gen, recording | ~52 | 78 | **83** |
| Pixel 7, recording | ~52 | 84 | **94** |

Widths are 311–425 pt. Net since v0.8.0: **+71 %** of trace height while
recording, with the web's countdown ring still on screen.

### Verified

`tsc --noEmit` exit 0 · `expo export` bundles for iOS and Android ·
`expo-doctor` 18/18 · geometry recomputed from the formulas, including an
Android 3-button-nav case. Still not a device test — `🔬` in `PARITY.md`.


## v0.9.0 — 2026-08-01 — A faithful port of a desktop layout is still a
##                        desktop layout

v0.8.0 got the structure right and the SCALE wrong. Every size came from the
web's CSS, which was measured on a viewport several times taller than a phone
held sideways (~390 pt). Rendered there, the chrome ate the content:

| | v0.8.0 | v0.9.0 |
|---|---|---|
| Prep photograph | ~259 × 146 | **393 × 221 – 462 × 260** |
| Trace, waiting | ~52 pt tall | **66 – 72 pt** |
| Trace, recording | ~52 pt tall | **78 – 84 pt** |

(Computed from the layout formulas for iPhone 15 Pro, iPhone SE 3rd gen and
Pixel 7, worst case — a two-line step title.)

### The set-up steps: the button was bigger than the instruction

An 18 px-padded button with 21 px text, a 34 px headline and 28 px gaps cost
~140 pt of height. On a desktop that is a tenth of the page; on a landscape
phone it is nearly half, and the photograph — the only thing step 1 has to
communicate — got what was left. You could not tell which wrist the watch was
on.

There are now two sets of metrics in `LimbPrep`, and below a 500 pt stage the
compact one applies: 13/16 button (still over the 44 pt tap-target floor),
~20 px headline, 10 px gaps, 7 px dots. **Nothing is hidden or truncated** —
the layout is identical, only tighter, and every pixel saved goes to the
picture. The headline also gets the full stage width instead of the web's
`max-width: 640px`, because at 20 px the longest step title then fits on one
line and the line it saves is worth ~30 pt of photograph.

### The live monitor: the traces are the screen now

Per the user's suggestion, **the capture clock moved into the top bar beside
the BPM**, styled the same way (big number + unit) so the two read as one
instrument panel. That was the load-bearing change: during a capture the foot
then has nothing left to say, so it is not rendered at all and the traces take
the entire screen below the bar — which is where the patient is looking during
the ten seconds that matter.

Also on a short stage:
- The bar drops its second line while idle. The instruction is not lost — the
  guide circle over the traces carries it, in bigger type. It is dropped
  rather than ellipsised: a clinical instruction cut off mid-sentence is not a
  shorter version of itself.
- The auto-arm hint is hidden while that circle is up, since the circle's
  caption already says the recording starts on its own.
- The simulation badge shortens to `SIMULATION` (full sentence kept as the
  accessibility label) so it cannot push the Exit button off the bar. It still
  says the one thing that matters.

Above `COMPACT_H` nothing changed: the desktop layout and the web's 132 px
countdown ring in the foot are exactly as they were.

`SixLeadMonitor`'s card padding now **scales** with the card instead of
stepping at 90 pt. The step was a trap: an 89 pt card drew a taller trace than
a 92 pt one, so the traces would have visibly shrunk as the layout grew.

### `npm start`: the QR pointed at a port nothing was listening on

The recurring "the QR doesn't work" had a specific cause, and it was in our
own launcher. `scripts/start.js` printed `exp://<ip>:8081` **before Expo had
bound anything**. When a Metro from an earlier session still held 8081 — which
survives closing the terminal and closing the lid — Expo asked to move to
8082, and every URL and QR already advertised pointed at a dead port. It
looked like a broken QR; it was a correct QR for the wrong port.

Rewritten (v2.0.0), and the failure cannot recur:

1. **A stale dev server on 8081 is reclaimed.** Only processes whose command
   line matches Expo/Metro are killed; anything else on that port is left
   alone and we move to the next free port instead.
2. **Nothing is printed until the server answers.** The host, port and QR all
   come from the running server's own manifest.
3. **The manifest must carry the address we launched with.** Found while
   testing this: without that check the script attached to a leftover server
   from an earlier session — on an earlier Wi-Fi network — and printed a QR
   for an IP this machine no longer had.

Two bugs were caught by that same test and are worth recording:

- `isPortFree` used `listen(port, '0.0.0.0')`, which *looks* like the careful
  version and is the broken one. Metro listens on the dual-stack wildcard
  `::`; an IPv4-only probe binds `0.0.0.0` right beside it and reports the
  port FREE. Now it binds with no host at all.
- The machine's LAN address had changed between sessions (10.0.0.19 →
  192.168.7.33), which is a second, independent way a printed QR goes stale —
  and the reason the address is re-detected on every run.

New dev dependency: `qrcode-terminal` (12 kB, no native code), so the QR comes
from the verified address rather than from Expo's own pre-bind guess.

### Verified

`tsc --noEmit` clean · `expo export` bundles for iOS and Android ·
`expo-doctor` 18/18 · the layout numbers above computed from the formulas
themselves. Still not a device test — everything stays `🔬` in `PARITY.md`.


## v0.8.0 — 2026-08-01 — The exam is a port of the web again, and the flicker
##                        had a cause, not a symptom

### The rotation flicker: two writers, one iOS API

v0.7.0 said the "flicker and photo-shape were one bug" and held the first
paint back until `width > height`. That was wrong — it hid a symptom. The
device still physically rotated **landscape → portrait → landscape**, and the
holder-count in `useExamOrientation` could never fix it because the race was
never between two React effects.

`expo-screen-orientation`'s `lockAsync()` sets a **global** orientation mask
from an effect, one tick after mount. `react-native-screens` already answers
`supportedInterfaceOrientations` **per pushed view controller**. Both drive
the same iOS mechanism, so a single navigation went: push (VC says the app
default — portrait allowed) → effect sets the landscape mask (rotate) → the
push animation completes and the VC is re-queried (portrait again) → the
global mask wins once more (rotate). Three rotations.

The fix is to have exactly one writer, and to make it the declarative one:

- `LimbMeasure` declares `orientation: 'landscape'` on its `Stack.Screen`;
  the stack declares `portrait_up` for everything else.
- `useExamOrientation.ts` is **deleted**, `App.tsx` no longer calls
  `lockPortrait()`, and `expo-screen-orientation` has been uninstalled and
  removed from `app.json` — leaving it available is leaving the bug loaded.

Because the rotation is now part of the push, the exam's **first** layout pass
already measures the landscape box, which is the other half of what v0.7.0 was
working around.

### The set-up steps are the web's layout again

`LimbPrep` had grown a landscape branch that put the photograph in a left
column, the confirm button in a right rail and the Exit link adrift between
them. The exam is *always* landscape, so that was the layout every patient
got. It is gone. The screen is `.prep-stage` column for column: top bar
(Exit/Back · "Step n of 2"), a centred body of picture → title → dots, and one
full-width green confirm button at the bottom.

**Why the picture only showed its top-left corner:** the frame's shape was
derived at runtime from `Image.resolveAssetSource`, and when that gave nothing
useful the frame came out the wrong shape while `overflow: hidden` cropped the
photo to a corner. The frame is now a plain 16:9 rectangle — the constant
`.prep-image` uses — fitted into the space actually left over, with `contain`
so the worst case is a border, never a missing hand.

One deliberate departure, because a phone held sideways is wide and short:
`.prep-title`'s `clamp(23px, 5vw, 34px)` assumes the viewport's width is its
*short* edge. Here it is the long one, so 5vw pins the headline at 34px and a
three-line title eats the photograph it is captioning. The ceiling is now tied
to the stage height as well.

### Six leads, 2 × 3

The traces were stacked 6 × 1, which is the web's `max-width: 720px` fallback,
not its layout — and it gave each trace ~26px of height on a phone. They are
now the web's `repeat(2, 1fr) / repeat(3, 1fr)` grid, filled row-major
(I·II / III·aVR / aVL·aVF), with the web's own drawing ported rather than the
BeatAlign-Native reference's: 3-second window, 12/60px paper, 1 mV = 38 % of
the card, and the per-frame window-mean centring that stops the trace drifting
off the card while the 0.5 Hz high-pass settles.

The live screen around it is the web `.limb-stage` too — compact bar (title ·
BPM · red Exit pill), the trace grid, and a status foot carrying either the
heartbeat gate or the countdown ring. The circular "touch the watch" guide
overlays the traces while the gate searches, as on the web. Copy is verbatim
from `en.ts`.

Two things are scaled for the phone, both applying rules the web already
wrote for small screens: the stage padding/gap/BPM digits follow the web's own
`@media (max-width: 720px)` block (triggered on a short viewport rather than a
narrow one), and a lead card shorter than 90px halves its inner padding — the
web never meets that case, since its cards are a 110px canvas plus padding.

### Settings

Built under Profile, since there is no top-bar avatar popover on mobile to
hang it from: a full-width card at the end of the medical card opens a new
`Settings` route. Same sections, same order and the same pastel illustrations
as the web page — Appearance · Notifications · Care connection · ECG Device ·
Privacy & Security · Account · About.

New `preferencesSlice` (theme, background, notification toggles, care mode)
persisted through `@react-native-async-storage/async-storage` — **the one new
dependency**, justified because a preference that resets every launch is a
broken preference, and because tokens must stay in SecureStore rather than
being joined by non-secret settings. `PreferencesGate` hydrates before the
first paint so the app never opens light and repaints dark.

`useTheme` now resolves the stored choice first and the OS second, and every
screen that was asking `useColorScheme()` directly (dock, navigator, ECG
paper) asks `useIsDark()` instead — otherwise the toggle would leave the app
half dark.

Rows the web has and this does not, each with a reason, are recorded in
`PARITY.md`. Text size is present but deliberately different: iOS and Android
already own text size system-wide, and a second app-only scale would fight the
phone's own setting.

### Verified

`tsc --noEmit` clean · `expo export` bundles for **both** iOS and Android ·
`expo-doctor` 18/18. That means the code is well-formed, **not** that it
works: every screen here stays `🔬` in `PARITY.md` until it has been touched
on a device.


## v0.6.0 — 2026-08-01 — The core ran at double speed, and the connection
##                        animation was never ported at all

- **The core morph was exactly 2× too fast.** The CSS is
  `morphingCore 8s ease-in-out infinite alternate`, and its keyframes
  already return to the circle at 100 % (0 % circle → 40–60 % blob → 100 %
  circle) — so `alternate` replays a symmetric curve and changes nothing
  visible. v0.5 ping-ponged the 8 s clock on top of that, completing
  circle→blob→circle **twice** per cycle. The ping-pong is gone.
- **The connection animation existed in the reference and was never
  ported.** `triggerConnectionMagic()`: **70 halo dots** at 80–120 px that
  pop in place (`haloFade 1.8s`, scale 0 → 1.5 @40 % → 0, drifting 1.2×
  out, per-dot delay 0–0.4 s), plus `breatheIn 1.5s` (scale 1 → 0.92 @40 %
  → 1) on the button. Both now fire on connect.
- **Connecting cross-fades over 1.2 s** instead of snapping:
  `.hero-blob { transition: all 1.2s cubic-bezier(.25,1,.5,1) }` drives the
  scale 1 → 1.25, and the two gradients and the two core colours now
  cross-fade as `transition: background 1.2s` does. The white disc fades
  with them rather than disappearing on a boolean.
- **The device rotated three times entering the exam.** `lock on mount /
  unlock on cleanup` runs mount → cleanup → mount under Strict Mode and on
  any remount during a navigation transition — landscape, portrait,
  landscape. Now a module-level holder count with the revert deferred to
  the next tick, so a remount cancels it and the device rotates once.
  (The BeatAlign-Native reference locks landscape on this screen too —
  `MeasureScreen.js:433` — so the orientation itself was right.)
- **The greeting carries the patient's name**: `Hello {name}`, using the
  web's exact `firstName()` resolver (which keeps "Dr."/"Prof." titles).
- **No live BPM under the start button.** The web's MeasurePage does append
  one; removed here at the user's instruction — a deliberate divergence,
  recorded in PARITY.md.
- **Photographs use `contain`, never `cover`.** The frame is computed to be
  the photo's own shape, so the two agree when everything is right — but if
  the frame is ever off (a transient layout mid-rotation), `contain`
  letterboxes while `cover` crops. Cropping a patient instruction can hide
  the very thing being pointed at, so the failure mode must be a border,
  never a missing hand. The landscape text column also gives 30 px back to
  the picture, which is width-limited in that layout.

## v0.5.2 — 2026-08-01 — The frame fits the photograph, not the layout

The guide photographs are 1100 × ~615, i.e. **landscape already** (aspect
≈ 1.79). The bug was the opposite of what it looked like: the FRAME was the
wrong shape. v0.5.1 gave the picture a flex remainder — about 392 × 349,
aspect 1.12 — and `resizeMode="contain"` dutifully letterboxed a 1.79 photo
inside it, leaving wide empty bands and a small picture.

- **New `utils/fitBox`**: the largest rectangle of a given aspect that fits a
  slot. Both photo surfaces now use it.
- **The slot is measured (`onLayout`), not calculated.** No duplicated
  padding/safe-area arithmetic, and it stays right on any device.
- **The aspect comes from the asset** (`Image.resolveAssetSource`), so it
  follows the artwork if it is ever replaced instead of being a magic 16:9.
- `resizeMode` is now `cover`: once the frame *is* the photo's shape, cover
  and contain agree, and nothing is cropped or wasted.

At 844 × 390 with a 47 px side inset: prep frame **444 × 247** with a 290 px
text column beside it; portrait **350 × 195**; the measurement rail's guide
**209 × 117** inside its leftover slot.

## v0.5.1 — 2026-08-01 — Landscape screens that actually fit the screen

v0.5.0 rotated the exam but kept portrait layouts inside it. A phone in
landscape has ~390 px of HEIGHT, and both exam screens were sizing boxes as
a *fraction of the viewport* instead of from the space actually left — so
the picture ate the screen and the confirm button rendered below the bottom
edge. On a screen whose entire job is "press to continue", that reads as a
broken app.

- **`LimbPrep` gets a real landscape layout**: picture on one side, title +
  dots + confirm on the other. The picture is `flex`, so it takes what is
  left over after the button is placed rather than claiming `54vh` up front.
  Portrait is unchanged.
- **The measurement rail** sized its guide photograph `16:9` at full rail
  width — 130 px that, added to the fixed rows, overflowed the 390 px rail.
  It is now `flex: 1` and absorbs only the remainder.
- **The monitor** is sized from `height − padTop − padBottom`, and the stage
  finally has bottom padding at all.
- **The notch is on a SIDE in landscape.** `PatientShell` and `EcgReport`
  used a flat `paddingHorizontal: 20`; both now take `max(insets.left/right,
  20)`, so nothing sits under the cutout.

Verified arithmetically at 844×390 with a 47 px side inset: prep picture
392×349 with the button placed, monitor 508×361 (six 55 px cards), guide
117 px with 244 px of fixed rows above it.

## v0.5.0 — 2026-08-01 — Smooth, glass, landscape, and the real photographs

- **The blob stuttered because it was animated by React.** v0.4 drove the
  morph from `setInterval` + `setState` at 25 Hz — a re-render and a
  JS-thread path rebuild every frame, with 65 separately-animated particle
  views competing for the same thread. Now two Reanimated clocks run on the
  UI thread and every shape is a `useDerivedValue`; the builders in
  `blobShape.ts` are worklets returning `SkPath`. React renders the button
  once and then never again while it animates. The particle clock's period
  (42 s) is an exact multiple of every dot duration, so the field loops
  seamlessly instead of reseating once a minute.
- **The dock is real glass now.** The cause was platform-specific and
  invisible from Windows: **`expo-blur` does not blur on Android at all**
  without `experimentalBlurMethod="dimezisBlurView"` — it draws a flat
  translucent rectangle, a literal imitation of glass. New `GlassSurface`
  atom resolves the best available material: Apple's **Liquid Glass**
  (`expo-glass-effect`) on iOS 26+, a genuinely blurring BlurView
  everywhere else. The `require` is guarded because
  `expo-glass-effect`'s iOS entry calls `requireNativeViewManager` at
  module scope and throws in clients that lack it.
- **The exam is landscape**, locked from the moment the route mounts — set-up
  photographs included, so the phone is already rotated before the patient's
  hands are occupied. `app.json` moves to `"orientation": "default"` and the
  rest of the app opts back in to portrait from `App.tsx`; pinning the
  manifest to `"portrait"` would make `lockAsync` fail silently in a real iOS
  build while still working in Expo Go.
- **The six leads are on ECG paper**, ported from the BeatAlign-Native
  reference (`SixLeadDisplay.js`): a card per lead, minor grid every 16 px,
  major every 80 px, label chips, 1 mV = 35 % of card height, traces at
  `#1e3f66`. The one thing deliberately NOT copied from the reference is its
  signal path — it filters six leads independently, which breaks the
  Einthoven identities on the derived four. We keep filter-two-derive-six.
- **The set-up steps use the web's own photographs.** `assets/guides/` now
  carries `ecg-limb-step1-wear`, `-step2-rest` and `-step3-touch`, and the
  frame matches `.prep-image` (16:9, radius 28, `contain`). Drawing SVG
  diagrams instead was the wrong call: a patient shown a photograph on the
  web and a line drawing on the phone is being told two different things
  about how to hold a medical device. The step-3 photograph now also appears
  on the live screen while the gate searches, as it does on the web.
- **Prep screen no longer reserves space for a dock that isn't there.**
  `PatientShell` took the dock's ~99px footprint unconditionally, but the
  exam route is stacked above the tab navigator. New `dock` prop, defaulting
  to `chrome`.
- **The report's heart rate comes from the Pan-Tompkins gate**, not the BLE
  client's threshold detector. `useLimbRecorder` documented this preference
  from the start; the screen never passed the value.

## v0.4.1 — 2026-07-31 — The button was dead; the dock floated too high

Both defects were reported from a device. Neither was visible to a
typecheck, a bundle or `expo-doctor`, which is the point: those three
gates say the code is well-formed, not that the app works.

- **"Start Demo" did nothing.** The tap target was a `Pressable` wrapped
  *around* the Skia `<Canvas/>`. A Skia canvas is a native view that can
  claim the touch itself, and when it does the enclosing `Pressable` never
  fires — a button that looks alive and is not. The hit layer is now an
  empty `Pressable` laid **over** the canvas, with every visual layer
  (`idleDisc`, particles, canvas) marked `pointerEvents="none"`, so the
  press no longer depends on how the renderer handles touch. Added the
  haptic and the `:active` 0.96 press-scale that were missing with it.
- **The dock floated 46px up on an iPhone; the web sits at ~20px.** The
  offset was `insets.bottom + 12`, adding the whole safe-area inset on top
  of the web's `bottom: clamp(12px, 2.4vh, 24px)` — the inset was already
  the thing that clamp is measured against. Ported literally now, with one
  exception that genuinely needs it: Android's opaque 3-button navigation
  bar (`insets.bottom > 40`), which the dock must clear. A home indicator
  or gesture pill is a thin overlay the pill may float over, exactly as the
  web does in mobile Safari.
- **The bar is 67px tall, was 77px.** Height is set by the tallest item,
  which is Home. `.dock-item--home .dock-item-icon svg` sizes it at
  `clamp(28px, 7.6vw, 33px)` — a rule written for the desktop dock that
  reaches the phone breakpoint only because its specificity (0,2,1) beats
  the media query's `.dock-item-icon svg` (0,1,1). Honouring the intent of
  the `≤480px` block instead: Home 26px (still clearly emphasized against
  the others' 20px), padding 6px. Deliberate departures from a literal
  copy, documented as such in `dockMetrics.ts`.
- **Sizes and offsets now live in one file**, `navigation/dockMetrics.ts`,
  imported by both the dock that draws it and the shells that must keep
  content clear of it. `PatientShell` and `ProfileScreen` were each adding
  `insets.bottom` on top of a hard-coded 74px clearance — double-counting
  the safe area and squeezing the screen.

## v0.4.0 — 2026-07-31 — The animations, actually ported

**Why:** v0.2.0–v0.3.0 claimed the hero button was "ported 1:1". It was not —
the blob was a React Native `borderRadius` approximation and the core was a
plain circle. The shapes were wrong, and describing them as ported was wrong.

- **The blob is now the real CSS shape.** `border-radius: 43% 57% 41% 59% /
  54% 43% 57% 46%` is an *elliptical* radius — a horizontal AND a vertical
  radius per corner. RN's `borderRadius` has one value per corner and
  structurally cannot express it, which is why the approximation read as a
  rounded rectangle. `blobShape.ts` builds the true outline as four
  quarter-ellipse cubics and Skia draws it; `@keyframes morphingBlob` is
  copied verbatim and its eight numbers are interpolated per frame.
  Verified numerically: at 0% the top-left corner is 51.60px horizontal ×
  64.80px vertical on a 120px box — the asymmetry the old version flattened.
- **The core morphs for real too** — the two `clip-path` outlines of
  `@keyframes morphingCore` interpolate control point by control point, with
  its `translate(2px, 3px)` and 1.22× peak, alternating like the CSS.
- **Fills are the CSS gradients**, not flat colours: `#e5e5ea → #f2f2f7`
  disconnected, `#1e3f66 → #0A2540` connected, both at 135°.
- **Particles start mid-flight.** The web uses a negative `animation-delay`
  so the field is already in motion on the first frame; Reanimated has no
  negative delay, so each dot now runs a partial first pass before looping —
  no synchronised "burst" on mount.
- **Dock rebuilt to the exact `layout.css` phone numbers.** The real error was
  icon size: the web draws every icon at 20px *except Home*, whose own rule
  (`clamp(28px, 7.6vw, 33px)`) has higher specificity and beats the ≤480px
  media query. Rendering all five at one size is what made the bar read as a
  heavy slab; v0.3.0 then over-corrected by shrinking the whole bar. Now:
  20px icons, ~30px Home, 8px item padding, 3px gap, 11px/1.1 labels, 7px bar
  padding — the bar's height follows from those, as it does on the web.

## v0.3.0 — 2026-07-31 — The whole HOME pipeline, and the Profile card

**Why:** v0.2.0 had the right chrome but the Home tab was a dead end — the
button connected a toy simulator and nothing followed it. This makes the tab a
working product: connect, set up, measure, read the report.

- **★ The signal chain now LIVES IN `CYPHIX_SHARED`.** `filterDesign`,
  `ecgDSP`, `qrsValidator`, `ecgSimulator`, `reportFilter`, `ecgAnalysis` and
  the measurement constants were copied there verbatim and are consumed by
  mobile. This is the root `CLAUDE.md` §2.3 rule made real: mobile does not
  re-derive the frozen maths, it runs the identical code, so a waveform is
  bit-identical across platforms. **The web still has its own copy** — until it
  is migrated, an edit to either must be made in both (tracked in PARITY.md).
- **Background default corrected to flat gray `#E7EAEF`.** `BackgroundProvider`
  sets `DEFAULT_BG = 'gray'`; the wavy teal field is an opt-in style. v0.2.0
  shipped waves as the default, which made the app read as a different product.
- **Dock height** rebuilt from the web's *phone* breakpoint (≤480px: 20px icons,
  8px padding) instead of its desktop one — the first bar used 28px icons and
  read far too tall.
- **Measurement pipeline** (`Home → Start Test`): the two-step `LimbPrep`
  set-up gate, then the live six-lead Skia monitor, then a 10 s capture that
  **arms itself** the moment the frozen Pan-Tompkins gate proves a real,
  regular heartbeat — because the patient's hands are holding the electrodes
  and physically cannot press Record. `HeartbeatSearch` keeps the gate's
  reasoning on screen so it is never a black box; `CountdownRing` shows the
  capture. The exam is a full-screen route above the tabs, with the back
  gesture disabled, mirroring the web's immersive `isExam` shell.
- **Report**: six filtered strips plus the shared analysis sheet (rate,
  rhythm, axis, PR/QRS/QT/QTc, beats, quality). Every measurement is nullable
  and renders "—" rather than a guess. A simulated recording is banner-labelled.
- **BLE layer** rebuilt to web parity: `BleProvider` holds ONE client above the
  navigator so a connection survives navigation and the ring buffer is not
  reset mid-recording; `useBle` now exposes the web's exact surface
  (`subscribe`/`getBuffer`/`connectSimulator`/`isSimulated`/…), which is what
  let the two measurement hooks port across essentially unchanged.
- **Profile**: the medical card ported from `PatientProfilePage` — identity
  header, Details, Conditions, Allergies, Medications, Family history,
  Emergency contact, Care team, Recent activity. Clinical codes render as
  coded chips, never free text. The demo patient is the web's own fictitious
  `mock-0001`, assembled from its seed files so both platforms show the same
  content until `profileApi` is wired.

## v0.2.0 — 2026-07-31 — The web app's actual design, ported

**Why:** v0.1.0 shipped a generic scaffold — system-font wordmark, stock
Ionicons, a tab bar welded to the screen edge, placeholder screens. That is not
what the product looks like. This release ports the real design surface so the
app reads as the CYPHIX web app opened on a phone.

- **Logo**: the real CYPHIX wordmark. SVG path data copied verbatim from the
  web `BrandLogo.tsx` into react-native-svg. The web's inner drop-shadow filter
  has no react-native-svg equivalent and was dropped — a 15%-opacity detail
  invisible at this size. It floats top-start and whitens on dark, as on the web.
- **Backdrop**: the teal wavy hero field — the five ribbon paths verbatim from
  `HeroBackdrop.tsx`, over the `.main--full` gradient, both themes.
- **Bottom dock**: floating frosted-glass pill, not an edge-welded bar.
  `expo-blur` provides what `backdrop-filter: blur(22px) saturate(1.6)` does on
  the web; a single highlight springs behind the active tab; icons fill in with
  their inner details cut out in the pill colour; Home is emphasized in the
  centre. Order matches `dockConfig.tsx`: History · Tests · **Home** · Chat ·
  Profile. Live Scan stays out, exactly as on the web.
- **Nav icons**: all five ported verbatim from the web `NavIcon/` set (v4),
  keeping each icon's own fit transform and stroke weight.
- **Home**: greeting + the ported HeroBlobButton — white orb, 65 emitting
  particles while disconnected, morphing navy blob once connected, status stated
  in words. The web animates the blob with asymmetric `border-radius`, which RN
  cannot express; per-corner radii on the same 8 s cycle read the same in motion.
- Screens draw full-bleed under the floating dock; the scaffold's
  `ScreenScaffold`, `MeasureScreen`, `LiveScanScreen`, `PatientsScreen`,
  `SettingsScreen` and `BrandWordmark` are removed.

## v0.1.0 — 2026-07-31 — Mobile bootstrap (iOS + Android from one codebase)

**Why:** the platform needed a mobile surface that cannot drift from the web
app. Everything shared was pulled into `CYPHIX_SHARED` first so a single
definition serves all three platforms, and the Cross-Platform Rule was written
into the root `CLAUDE.md` before any feature code was added.

- **Project**: Expo SDK 54 / React Native 0.81.5 / React 19.1, TypeScript strict.
  `expo prebuild` (CNG) — `ios/` and `android/` are generated, never hand-edited.
  Scaffolded on SDK 57 and **deliberately pinned back to 54**: the Expo Go app in
  the App Store runs exactly one SDK (`expoGoSdkVersion` in the Expo versions API,
  54.0.0 today) and lags npm's `latest` by several releases, so SDK 57 could not
  open on a phone at all. 54 keeps the whole UI previewable in Expo Go; the
  native BLE module needs a development build on any SDK.
- **Shared core** (`../CYPHIX_SHARED`): ECG domain types, the frozen ESP32 BLE
  protocol (UUIDs, 320 Hz, 5 B/9 B packet parser, int16 rail constants), and the
  API request/error envelope. Wired into Metro (`watchFolders` + alias) and
  tsconfig `paths`.
- **Native BLE bridge** (`modules/cyphix-ble`): Swift `CyphixBleModule`
  (CoreBluetooth) and Kotlin `CyphixBleModule` (BluetoothGatt). Both parse
  notifications on their own thread and flush batched millivolt samples to JS at
  10 Hz — the JS thread never sees per-sample traffic.
- **Simulator fallback**: `EcgSimulator` produces a synthetic P-QRS-T trace when
  the native module is absent (Expo Go / emulator). The UI badges it `SIMULATED`
  so it can never be mistaken for a measurement.
- **State**: Redux Toolkit + RTK Query, same shape as web — but in `src/store/`,
  not web's `src/app/`, because Expo's CLI claims a top-level `app/` directory as
  the Expo Router route root. `httpBaseQuery` is a
  behavioural twin of the web one (bearer auth, single-flight 401→refresh→retry,
  `{ status, message }` errors). Tokens live in SecureStore (Keychain/Keystore),
  never AsyncStorage.
- **UI**: brand tokens ported 1:1 from `tokens.css` (light + dark, OS-driven);
  the web sidebar becomes a platform-adaptive bottom tab bar with the same five
  modules and feature flags; haptics on primary actions; Skia renders the live
  Lead II sweep.
- **Waveform**: `EcgWave` decimates with min/max per pixel column, not every Nth
  sample — plain subsampling walks over the R peak and makes the QRS shrink and
  flicker between frames. A trace must never render smaller than the data.
- **Screens**: Measure (patient-first: connect card, live wave, HR), Live Scan,
  History, Patients, Settings. Placeholders state honestly what is not yet
  ported rather than faking it — tracked in `PARITY.md`.

<!-- v0.1.0 -->
