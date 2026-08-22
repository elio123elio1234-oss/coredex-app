/* App version — rendered in the visible badge (web CLAUDE.md §8 convention). */

export const APP_VERSION = '0.60.0';
export const APP_BUILD_LABEL = 'the report opens with the page you can actually read';

// v0.60.0 - THE PDF TAKES THE DESIGN LANGUAGE, and four clipping bugs fall out
//           of finally looking at it.
//
//           1. A NEW MEASUREMENTS PAGE, and it opens the report. From the
//              "Clinical data export to PDF" handoff: a plum-to-navy band with
//              the rate and the study's own lead II across it, one hue per
//              family of measurement, every interval drawn against its band,
//              and all six leads' waves as bar charts. The ECG sheets move to
//              page 2 — every clinical document opens with a summary, and this
//              one opened with two full pages of trace, so a patient scrolled
//              past twenty seconds of waveform before reaching a number they
//              could read. The trace is untouched and is still the only part of
//              this document a ruler may be laid on.
//              Two things the handoff asked for were deliberately NOT built,
//              both at the user's instruction and both for the same reason:
//              the per-interval "within range" / "2 ms below range" call-outs,
//              and the green "Normal axis" pill. Those are statements ABOUT a
//              measurement, and this report stopped making those in v0.59.0.
//              The band and the marker stay: a reader can see where the marker
//              sits without being told what it means.
//              System fonts, not the handoff's three Google families. This
//              document is built ON THE PHONE at the moment somebody taps
//              Export, so a <link> to fonts.googleapis.com is a network request
//              inside an export that has to work on a plane — and it hands a
//              third party the user's IP every time a medical report is
//              printed. Offline it silently falls back to a different typeface
//              than the one that was approved.
//              Every oklch() in the handoff was converted to hex offline:
//              oklch() landed in Safari 15.4 / Chrome 111, and a colour an
//              engine cannot parse does not degrade, it drops the declaration.
//              The letterhead would have printed white on exactly the older
//              devices least likely to be tested on.
//
//           2. ★ FOUR CLIPPING BUGS, ALL PRE-EXISTING, ALL FOUND BY RENDERING
//              THE THING. `verify-pdf.ts` had been passing for months on a
//              report that was printing THREE OF SIX LEADS in its amplitude
//              table; aVR — the lead that catches swapped arm electrodes — did
//              not print at all. Also cut: the last row of both measurement
//              tables, the fifth interval bar (QTc Fridericia), the second row
//              of the identification grid, the sixth median beat, and the last
//              row of the signal-quality table.
//              One cause, four faces: assertFits validates the heights the
//              BUILDER DECLARES and cannot see what a browser did inside one.
//              An <svg> is inline, so it sits on a text baseline and reserves
//              descender space under itself; a ruled row's height is a LINE BOX
//              (font-size x 1.2), not the font size. Both make a block taller
//              than its arithmetic, and `.blk { overflow: hidden }` then throws
//              the excess away in silence.
//              The harness now writes its HTML out (PDF_OUT=<dir>), because
//              the only thing that catches this class of bug is looking.
//
//           3. The rest of the report follows the same language: the letterhead
//              is the hero's gradient rather than flat navy, section headings
//              became the redesign's letterspaced kicker over a hairline, and
//              ruled-table headers went from a solid navy bar to a soft wash.
//              Paddings were left alone everywhere on purpose — see above for
//              what a millimetre of cell padding does to a fixed-height block.
//
//           4. Two v0.59.0 leftovers, fixed: the disclaimer opened with "This
//              is a screening result, not a diagnosis" on a report that no
//              longer screens, and the reference page still printed "WHAT THIS
//              TEST CANNOT SEE" over 34 mm of white space. A section that
//              promises blind spots and then lists none is worse than no
//              section — there always are blind spots; this is six limb leads
//              and it never sees the front wall.
//
// v0.59.0 - Three changes the user asked for, and one they did not have to.
//
//           1. FINDINGS IS OFF. "The app does not decode anything, it only
//              shows measurements." That is a claim about the product, not
//              about one screen, so it is ONE flag - INTERPRETATION_ENABLED in
//              config/featureFlags.ts - read by every surface that would
//              otherwise make the claim: the viewer's third tab, the verdict
//              pill on every History row, the digest backfill that computed
//              that pill, and the PDF's interpretation pages.
//              ★ Nothing was deleted. screenLimbEcg, all 43 rules,
//              EcgScreeningSheet, the "why" sheets and interpretationPages are
//              untouched and still correct. Flip the flag and all four come
//              back together, which is the only way "for now" means what it
//              says.
//              The PDF mattered most: it leaves the phone, gets emailed, gets
//              filed, and is read later by someone with no way to ask what the
//              app was showing that day. A document carrying a verdict the app
//              no longer offers would be the last copy of that claim still in
//              circulation.
//              The verdict pill was NOT in the request - it was found while
//              doing the rest, raised, and removed on the user's answer. A
//              coloured verdict on every row is decoding; it was simply not in
//              the tab that had been named.
//
//           2. THE DOCK'S SECOND SLOT SWAPPED. "My Tests" -> "Insights", same
//              glyph. It opens the ECG ID, which used to live behind a sub-tab
//              inside History; History is one list again, and the
//              hide-don't-unmount machinery that kept both panes alive - and
//              cost five rounds of touch bugs, v0.58.2 through v0.58.7 - went
//              with the sub-tab. TestsScreen is kept in the tree and
//              deliberately unrouted: a test starts from the HOME button,
//              which is the control that has always started one.
//
//           3. VALUES WAS REDESIGNED, from the handoff. It was the web's
//              printed measurement form, ported line for line, being read on a
//              phone by a patient - reported as "very old-fashioned", which it
//              was. Now the rate is a hero card with the study's own lead II
//              under it, the sections are told apart by colour on translucent
//              cards over a fixed glow field, and every value is tappable for
//              one sentence saying what the quantity IS.
//              ★ Never whether it is good. Colour on that screen sections, it
//              never grades: the rhythm tile is amber when the rhythm is
//              regular, the steadiness ring is mint at 12 % and at 98 %, the
//              reference band is one tint at any value. Those are three places
//              the measurements-only rule could have been broken as styling,
//              and each is argued in the file that would have to change.
//              Two departures from the handoff, both recorded in PARITY.md:
//              the cards are translucent GRADIENTS rather than eight blur
//              views (a 26 px blur of a smooth glow field is barely a blur,
//              and eight of them in a moving scroller is not free), and the
//              hero number is flat crimson rather than gradient-filled text -
//              RN has no background-clip:text, and the only ways to fake it
//              are a native dependency (which would make this a 40-minute
//              rebuild instead of a 1-minute OTA) or SVG text (which gives up
//              tabular figures).
//
// v0.58.7 - "the touch stops working on this bar when you go to STUDIES and then
//           come back to INSIGHTS - it is like the bar stops existing."
//           ★ THE FIFTH ROUND, AND THE FIRST ONE THAT IS NOT A NEW CANDIDATE.
//           v0.58.6 wrote down the right observation and then acted on the
//           weaker half of it. It noted that the CALIPER already survives this
//           trip for free, because its detector unmounts entirely when
//           `measurable` goes false - and then, instead of copying that, it kept
//           the builder's detector mounted the whole time and REBUILT it on the
//           way back, from a useEffect, one tick after the pane was already
//           visible.
//           Those are not the same property, and the difference is the bug. The
//           caliper has NO gesture handler in the tree for the entire time
//           Insights is hidden. The builder had one - attached to a native view
//           that History hides with `display: none`, which Fabric marks hidden
//           and Yoga lays out at zero. Every fix since v0.58.2 has been an
//           attempt to repair that handler after the fact: give it a new gesture
//           object, give it back its width, stop queueing pointer samples into
//           it, remount it on return. Five rounds of restoring something that
//           did not have to be there.
//           So it is not there. The detector is mounted by `enabled` exactly as
//           the caliper's is: absent while the reader is on Studies, and
//           constructed fresh in the SAME COMMIT that reveals the pane, over a
//           freshly-mounted track whose onLayout therefore reports a real,
//           visible width. Nothing crosses the boundary because nothing exists
//           at the boundary to cross it.
//           Why this one is different from its four predecessors: each of those
//           was a mechanism I named and could not observe from Windows. This is
//           the observed behaviour of a control in the SAME PANE, behind the
//           SAME `active` prop, that has never been reported dead - the builder
//           was simply the only one doing it the other way.
//           ⚠️ "Built once" (v0.58.2) still holds: `gesture` memoises on
//           `settle` alone, so no re-render of the panel can touch it, and
//           `enabled` only changes on a tab tap - which nobody performs with a
//           finger on the track.
//           ⚠️ Verified only as far as this machine can (§6.4): tsc clean, both
//           platforms bundle. It stays needs-device-verify until it is dragged.
// v0.58.6 - "But WHY does it work on Insights, then I go to Studies and back to
//           Insights and it stops working again - why, why?"  ... "FIX IT!!!"
//           ★ THE BELT, AND IT IS DELIBERATELY NOT A DIAGNOSIS. This control
//           has been reported dead three times on exactly the same route -
//           drag it, leave the tab, come back - and each round found a REAL
//           cause and shipped a CORRECT fix: a gesture object rebuilt mid-drag
//           (v0.58.2), a track width measured as zero (v0.58.4), a queue of
//           pointer samples outliving the drag (v0.58.5). And after every one
//           of them it came back.
//           What those three share is not a mechanism. It is a shape: some
//           piece of state crosses the hide/show boundary in a condition that
//           nothing on a Windows machine can observe, and I have now spent
//           three releases naming candidates one at a time. So the question
//           stops being "which one is it" and becomes "why is anything allowed
//           to survive the trip at all". Coming back on show remounts the
//           detector with a gesture object of its own: a fresh native handler,
//           a fresh onLayout measurement, no half-finished interaction, no
//           inherited width - whichever of them it actually was.
//           ⚠️ This does NOT weaken "the gesture is built once" (v0.58.2). That
//           rule forbids reconfiguring a handler DURING a drag; `enabled` can
//           only change when the reader taps a tab, and nobody taps a tab with
//           a finger on the track. One rebuild per visit, never one mid-drag.
//           The caliper already had this property for free - its detector
//           unmounts entirely when `measurable` goes false (v0.58.5), so it is
//           mounted fresh on every return by construction. This makes the
//           builder behave the same way, on purpose rather than by accident.
//           ⚠️ Still unverified from this machine (§6.4): it typechecks and
//           bundles. Whether the round trip is finally clean is a question only
//           the phone can answer.

// v0.58.5 - "On the Insights tab, playing with the green bar is perfect. Then I
//           go back to the Studies tab and I STILL FEEL the vibration from the
//           Insights tab! And then when I go back to Insights it doesn't work
//           again!"
//           ★ FIRST, THE THEORY I DID NOT SHIP. The obvious reading is that the
//           hidden Insights pane is still catching touches - and I checked it
//           in the RN source instead of assuming, because assuming is exactly
//           what made v0.58.3 useless. It is not true:
//           `UIView+ComponentViewProtocol.mm` sets `self.hidden = displayType
//           == None`, and a hidden UIView is never returned by hitTest, so a
//           `display: none` pane cannot receive a touch at all. Nothing was
//           being stolen.
//           ★ WHAT IT ACTUALLY WAS: A QUEUE, and the vibration the user felt on
//           Studies was the tail of the drag they had already finished. Two
//           causes, compounding.
//           * `useEcgIdentity` returned a BARE OBJECT LITERAL, so `view` was a
//             new reference on every render - and `EcgIdentityPanel` lists
//             `view` in five useMemo dependency arrays, one of which is
//             `buildBaselineSequence` over every template in the history. The
//             panel was re-fusing the whole baseline on EVERY RENDER, including
//             every render the drag itself caused. Memoised now: the fusion
//             happens when its inputs change, which is the only time its answer
//             can differ.
//           * `BeatBuilder` marshalled EVERY POINTER SAMPLE into JS through
//             `runOnJS` - 60 to 120 a second - and only there discovered that
//             the finger was still on the same notch and returned. The header
//             has always said the tick fires once per study crossed; that was
//             true of the haptic and false of the plumbing. With JS saturated
//             by the fusion above, `runOnJS` QUEUED, so the buzz ran behind the
//             finger, kept firing after the tab had changed, and the next drag
//             began behind a thread still retiring the last one. The crossing
//             test now runs in the gesture worklet against shared values: JS is
//             entered ONCE PER NOTCH, ~11 times a sweep instead of hundreds.
//           * AND A MUTE, because a queue can never be proved empty: the panel
//             takes `active`, the builder takes `enabled`, and a crossing
//             retired after the reader has left is DROPPED rather than buzzed.
//             The caliper is gated the same way (`measurable={active}`) - it
//             fires the strongest haptic in the app. Coming back on show
//             resyncs the worklet's guard from the prop, or a crossing dropped
//             while muted would swallow the first drag back to that notch.
//           ⚠️ Splitting a guard across two threads introduced a hazard that
//           did not exist while it was one ref: copying `value` back into the
//           worklet mid-drag REWINDS it (JS is a notch behind by construction),
//           and the next sample would re-report a notch already reported - a
//           double thump. The sync now ignores an echo of the control's own
//           commit and copies only a value it did not ask for.

// v0.58.4 - "There is NO loading. No, there isn't, look. And the bug with the
//           green bar in the average beat not sliding is back - you didn't
//           really fix it."
//           Both correct. Two fixes, and in each case my previous attempt was
//           aimed at the wrong layer.
//           * ★ THE REFRESH SPINNER: `progressViewOffset` (v0.58.3) is NOT
//             dependable on iOS and I should have read the implementation
//             before shipping it rather than only the prop table. RN moves
//             the UIRefreshControl by REWRITING ITS FRAME from
//             `layoutSubviews`, through a coordinate conversion that
//             converges rather than computes, and the same file warns that
//             "setting the frame breaks integration with ContentInset". It
//             changed nothing on the phone.
//             The RefreshControl now keeps only the job it is good at - the
//             pull gesture and the refreshing state - and its indicator is
//             left where it always was, behind the glass, invisible and
//             harmless. What the reader sees is a badge THIS SCREEN draws,
//             at a position this screen owns: one indicator, both platforms,
//             no native quirk anywhere in the path.
//           * ★ THE BUILDER'S DRAG: the gesture fix in v0.58.2 was real, but
//             there was a SECOND cause and it was not a gesture problem at
//             all - `onLayout` accepted a width of ZERO. `move` cannot
//             compute a ratio without a width, so it returns and the control
//             is simply dead. And something writes zero: v0.58.1 made History
//             keep both tabs mounted and hide the inactive one with
//             `display: none`, and Yoga lays a hidden subtree out at zero -
//             so every trip to Studies blanked the track's width. My own
//             flicker fix armed this one. A zero is never a measurement; the
//             track's width does not change while the panel lives.

// v0.58.3 - "In Studies, when you pull down and it loads and refreshes, there
//           is no refresh circle - it visually looks like it gets stuck at a
//           height and then releases after a few seconds, when it is clearly
//           refreshing."
//           Exactly right, including the diagnosis hidden in "it is clearly
//           refreshing": the sync WAS running and the pull WAS holding. The
//           only missing part was the one that says so.
//           A refresh indicator is positioned at the top of the SCROLL VIEW,
//           and since v0.58.0 the top of the scroll view is behind a frosted
//           header ~180 pt tall. The spinner span there the whole time,
//           perfectly, invisibly - a regression the glass header introduced
//           and nothing on this machine could have caught, because a hidden
//           spinner typechecks and bundles like a visible one.
//           `progressViewOffset={headerH}` moves it into the space the pull
//           opens up. ⚠️ Verified in the RN 0.81.5 source rather than
//           assumed, because this prop has a reputation for being
//           Android-only: the iOS spec declares it
//           (`PullToRefreshViewNativeComponent`), `RefreshControl.js` strips
//           only enabled/colors/progressBackgroundColor/size before
//           spreading the rest to the iOS view, and `RCTRefreshControl.m`
//           implements it by offsetting the control's frame. It works on
//           both.

// v0.58.2 - "In Insights the slide feature - where I drag to see the average
//           beat built up over time - sometimes just doesn't work. It's like
//           it loses touch."
//           ★ THE GESTURE OBJECT WAS BEING REBUILT MID-DRAG, and it is the
//           same class of bug as v0.57.1's re-render storm wearing different
//           clothes. The chain: `EcgIdentityPanel` passed `onChange` as an
//           inline arrow, so it was a new function every render; `move` is a
//           `useCallback` on it, so that was new too; the gesture was a
//           `useMemo` on `move`, so THAT was new - and crossing a notch calls
//           `onChange`, which re-renders the panel. So every notch the finger
//           crossed handed `GestureDetector` a brand-new gesture, which
//           reconfigures the native handler IN THE MIDDLE OF the interaction
//           it is tracking, and a reconfigured handler can drop it. The
//           control did not "sometimes" fail - it failed whenever the timing
//           of a reconfiguration landed inside a drag, which is exactly the
//           intermittency that was reported.
//           `BeatBuilder` now builds its gesture ONCE and closes over a
//           stable callback that reads the live `move` out of a ref, so a
//           careless caller can no longer reach the detector. The caller was
//           also fixed (`onBuiltChange`, keyed on the sequence LENGTH rather
//           than the array) - defending in one place is a fix, defending in
//           both is a rule.
//           Two smaller faults found in the same read:
//           * `failOffsetY` was ±12, the tolerance for vertical drift BEFORE
//             the pan claims the touch. A thumb starting a horizontal drag on
//             a 28 pt track is never purely horizontal, and too tight a
//             tolerance fails the pan and scrolls the page instead - the
//             other half of "sometimes it doesn't work". Now ±16, still small
//             enough that a deliberate vertical scroll hands off.
//           * `last` (the guard that stops a redraw per frame) never followed
//             the `value` prop, so an external change - the reset link, a lead
//             switch, a rebuilt identity - left it stale and the first drag
//             back to that same notch did nothing.
//           `shouldCancelWhenOutside(false)` is now stated rather than
//           inherited: the track is 28 pt tall and a dragging finger leaves it.

// v0.58.1 - "1) The newest recording sits right up against the top bar, it
//           looks unprofessional and ugly. 2) There is still some flicker
//           when you enter History at first, then it runs smooth - and going
//           to Insights and back to Studies flickers a little again until it
//           all comes up."
//           * ★ AIR UNDER THE GLASS. `paddingTop: headerH` parked the first
//             card exactly on the bar's edge: the one row a reader looks at
//             first was the one row with no room. `CONTENT_TOP_GAP` (14) is
//             a RESTING gap only - the card still travels under the glass
//             the moment the list moves, which is the point of the header.
//           * ★ THE TABS WERE REBUILDING THE SCREEN. `showTabs && tab ===
//             'insights' ? <Insights/> : <list/>` unmounts one pane every
//             time the reader switches - and a remount replays everything
//             that makes a first paint expensive: every row's entrance
//             animation, every visible trace's sweep, the scroll position,
//             the whole cell window. The "flicker until it all comes up" was
//             literally the screen being built again. Both panes stay
//             mounted now and hide each other with `display: none`, which
//             Yoga drops from layout entirely - nothing measured, nothing
//             drawn, everything kept. Insights is still mounted LAZILY on
//             its first visit: it runs the identity backfill over the whole
//             history, and paying for that on a tab nobody opened is the
//             opposite trade.
//           * ★ THE FIRST-ENTRY JOLT WAS MY OWN CONSTANT. The bar's height
//             is measured (it grows a count line, a progress clause, a tab
//             row, an error banner), but the first frame paints before any
//             measurement exists and `HEADER_H_GUESS = 148` was wrong by
//             ~35 pt on a notched phone - so the list visibly dropped into
//             place. The estimate is now built from the same blocks the bar
//             is (`estimateHeaderH`: safe area + title + count + tabs +
//             padding), lands within a point or two, and the correction is
//             invisible.
//           * `activeTab` derives from `tab` AND `showTabs`: the switch
//             disappears while the list is loading, erroring or empty, and a
//             stale 'insights' would otherwise hide BOTH panes and leave a
//             blank screen.

// v0.58.0 - "Can the top bar - where the Scan History title and the
//           Studies/Insights buttons are - get the glass effect like the tab
//           bar at the bottom, so you see the waves behind it as if looking
//           through glass?"
//           Yes, and it is the same material and the same rules the study
//           viewer's header and the dock already use - `GlassSurface`, so a
//           phone with Liquid Glass gets Liquid Glass and everything else
//           gets a real blur.
//           * THE BAR IS ABSOLUTE, WHICH MOVES WHERE THE SPACE LIVES. A
//             header that floats is not part of the layout, so every
//             scroller carries its height on its CONTENT inset instead -
//             the same inversion `scrollsUnderDock` made at the bottom in
//             v2.3.0, now as `PatientShell.bleedTop` at the top. Without
//             that third axis the shell's safe-area padding would push the
//             list down and the glass would have nothing but empty page to
//             refract, which is the failure the dock's own row warns about.
//           * THE HEIGHT IS MEASURED, NOT ASSUMED. The bar grows a count
//             line, a "analysing n of m" clause, a tab row that only exists
//             once there are studies, and an import-error banner. Any
//             constant would be wrong in at least one of those states, so it
//             is an `onLayout` on the inner view plus the glass's own
//             padding added back - the study viewer paid for that addition
//             already (without it the first card hides behind the tabs).
//           * ANYTHING "BETWEEN THE HEADER AND THE LIST" HAS TO GO INSIDE
//             THE GLASS. The import error was a sibling of the list, and as
//             a sibling it gets pushed down by the clearance and then the
//             list pads for the header AGAIN below it - a header-sized hole.
//             It now lives in the bar it belongs to and is part of what gets
//             measured.
//           * The hairline is earned, not drawn: it appears once ~6 pt has
//             scrolled under the bar, because an edge over an unscrolled
//             page divides nothing from nothing. Insights reports its scroll
//             too, so the rule holds on both tabs.
//           * Tint sits between the dock's (0.38/0.55) and the viewer
//             header's (0.74) - denser because a 30 pt title has to stay
//             readable with cards passing under it, lighter because it was
//             asked for as the DOCK's glass. Liquid Glass takes the lower
//             pair, the same split the dock makes.

// v0.57.1 - "The animation works, but something in your design is broken - it
//           slows the whole History tab down drastically, you can't scroll
//           there at all, it lags."
//           Correct, and it was a wrong MECHANISM rather than a missing
//           optimisation. Two causes, both mine, both from v0.57.0:
//           * ★ `strokeDasharray` + an animated `strokeDashoffset` IS NOT A
//             CHEAP EFFECT - IT IS A PER-FRAME GEOMETRY REBUILD. To draw a
//             dashed stroke the renderer walks the path, measures it and
//             constructs the dash segments, and it must redo that every time
//             the offset moves: every frame, for a ~700-point polyline, times
//             every visible row. Running on the UI thread did not save it; it
//             only moved where the frames were dropped.
//             The SVG is now drawn ONCE and never touched again. The reveal
//             is a plain `Animated.View` in the card's own colour sliding off
//             on a `translateX` - the cheapest thing this runtime animates.
//             The pen dot is a second small view riding its edge. Trace
//             resolution also dropped 1.0 -> 0.6 points per pixel: detail a
//             44 pt strip cannot show, paid for on every row that scrolls in.
//           * ★ A RE-RENDER STORM. Every viewability event called setState,
//             which re-rendered EVERY mounted row - and `StudyCard` was not
//             memoised, and was being handed a fresh `{samples, sampleRate}`
//             object and a fresh `onPress` closure per render. This is the
//             exact inline-object/memo trap PARITY already records from
//             `StudyViewerScreen`, walked into a second time.
//             `StudyCard` is `memo`ised and every prop is now a primitive or
//             a stable reference (`id` + one shared `onOpen`, the digest's
//             own Float32Array, memoised labels), so a viewability tick
//             re-renders exactly the one row whose `animate` flipped.
//           * Fixed while there, found by reasoning rather than by the
//             report: the "reveal anyway" timer was harmful. FlatList mounts
//             rows a screen or more before they are seen, so the timer drew
//             them off-screen and REACHING them blanked the strip and
//             re-drew it. There is no timer now - only visibility starts a
//             sweep, a `swept` latch stops anything restarting it, and the
//             viewability threshold dropped to 30 % so a row peeking in at
//             the bottom still qualifies (nothing else would ever draw it).

// v0.57.0 - "Something is off with the colours in History. First, I don't want
//           the finding sitting inside a coloured capsule - it looks cheap.
//           Second, the ECG traces are lovely, but (1) make the blue the dark
//           medical navy of my logo, and (2) add an animation as if the wave
//           is being created live - and the ones you can't see, say further
//           down, should only run when you scroll to them."
//           Three changes to the row, one of them structural:
//           * THE VERDICT LEAVES ITS CAPSULE. It was a filled lozenge, and
//             "cheap" is the right word: a coloured pill is an APP BADGE, and
//             a clinical conclusion is not a badge - the PDF makes the same
//             argument at page scale, where the verdict is a ruled statement
//             block rather than a card (v0.50.0). It is now a dot in the
//             level's colour plus the words in the level's ink, nothing
//             behind them, one size up (14 pt) now that the capsule is not
//             constraining it.
//             ⚠️ The dot is NOT what StudyCard v1 rejected. That objection
//             was to "two 8 px dots distinguished only by hue" - colour
//             carrying the meaning ALONE with the words behind a hover a
//             phone does not have. The words are beside it here.
//             SIMULATION deliberately KEEPS its chip: it is not a finding, it
//             is a warning that the trace did not come from a heart (§4), and
//             a safety label may shout where a conclusion may not.
//           * THE TRACE IS THE BRAND'S NAVY (#0D2041 - the wordmark's own
//             lettering), not `accentLive`. That token means "a live UI
//             element" and is a generic product blue; a stored clinical trace
//             is neither live nor generic. `brandNavy` already carries its
//             dark-theme translation (#9FB4D8), so legibility on the dark
//             surface needed no second decision.
//           * ★ THE TRACE SWEEPS ON. `strokeDasharray` + an animated
//             `strokeDashoffset` on the UI thread, at CONSTANT speed
//             (Easing.linear - a stylus does not accelerate, and easing it
//             reads as a UI wipe rather than an instrument), with a pen dot
//             travelling at the writing edge that fades as it lands. ~1.1 s,
//             not the recording's own 4 s: a list you have to wait for is not
//             a list. It fires from FlatList VIEWABILITY, so rows below the
//             fold draw as they are reached - the animation is a reward for
//             arriving somewhere, not something that happened off-screen. A
//             mounted row draws once and then holds still.
//             The seen-ids live in a ref with a counter, not a state Set:
//             this is written from a scroll callback, and rebuilding a Set
//             into state per viewability event would re-render the list
//             mid-flick. `onViewableItemsChanged` and its config are
//             ref-stable - RN throws if that prop's identity changes.

// v0.56.0 - "The PDF does not look like a professional report (except the
//           waveform page) - not colourful enough, has things a doctor does
//           not need, no added value. And I want to SEE the report in the
//           app before exporting."  ⚠️ NATIVE REBUILD: app.json 0.34.0→0.35.0
//           (react-native-webview). Ship with `eas build --platform ios
//           --profile production` then `eas submit`; do NOT `eas update`
//           until the 0.35.0 binary is live (§5A.2). v0.53-0.55 were
//           published OTA to runtime 0.34.0 BEFORE this bump.
//           * ★ THE BUG THAT MATTERED MOST WAS NOT COLOUR: `patientName` and
//             the ScreeningContext existed in the builder since v0.48 and
//             were NEVER PASSED. The letterhead named nobody, the ID grid
//             printed "Patient —", and the PDF screened without sex/age so
//             the paper could DISAGREE with the Findings tab it was exported
//             from. `useReportContext` now attaches both, under the same
//             "provably theirs" guard as the screen (patientContext.ts) - a
//             clinician exporting someone else's study gets an anonymous
//             conservative report, never a mislabelled one.
//           * THE COLOUR PASS (the user chose the bolder direction): a
//             full-bleed navy letterhead band with the WHITE wordmark on
//             every page (negative margins - flow height unchanged, so the
//             assertFits arithmetic is untouched), blue section rules and
//             footer keylines, BRAND header rows + soft blue zebra on every
//             ruled table, blue panels under every figure, the verdict
//             statement on its level's tint, the ID grid as a tinted band.
//             Green stays reference-band-only (v0.49) and there are still no
//             pills or rounded cards (v0.50) - it is a lab report in the
//             issuer's colour, not the app on paper.
//           * CONTENT: the layperson "how to read" tutorial is CUT (wrong
//             reader, and its fourth sentence - continuation sheets - has
//             been false since v0.49); the SIGNAL QUALITY table (SQI,
//             analysed window, beats, RR range, ectopy burden) prints at
//             last; a SIMULATED report now carries the ID grid on its
//             statistics page instead of having none anywhere; dead labels
//             deleted from the contract.
//           * THE EXPORT HAS A FACE: ExportOverlay blocks and says
//             "preparing" while the DSP + 43 rules + print engine run on the
//             JS thread - it used to be fire-and-forget, which read as a
//             dead tap.
//           * ★ THE PREVIEW: ReportPreviewScreen renders the EXACT HTML the
//             printer receives (buildRecordingHtml) in a WebView with an A4
//             viewport - one source of truth, previewed and printed; a third
//             hand-kept page layout was rejected. The ⋯ menu leads with
//             "View report"; on a binary without the module (OTA to 0.34.0)
//             `OptionalWebView` is null and the same item falls back to the
//             direct share - no dead menu entries.
//           * scripts/verify-pdf.ts makes the v0.48 "nine cases" Node
//             harness repeatable: page counts vs footers, letterhead per
//             page, ID grid everywhere incl. simulated, quality table,
//             name present iff passed, no unsized SVGs / NaN / placeholders.

// v0.55.0 - "The Settings tab is a real mess - the texts climb on top of the
//           tiles. Not professional, not user friendly."
//           Correct, and the root cause is one layout rule misapplied, not
//           many small ones: SettingsRow clamps its inline control slot to
//           52% of the row, but Yoga's default flexShrink is 0 and RN views
//           default overflow:visible - so a control WIDER than the slot (a
//           3-segment theme control is ~200 pt; the slot on a 390 pt phone
//           is ~161 pt) kept its natural width, was pinned to the row's end
//           by alignItems:'flex-end', and painted LEFTWARD over its own
//           label. Under Hebrew the unflipped alignItems made the same bug
//           spill toward the card's outer edge instead. Clamping harder just
//           moves the collision; the honest fix is the one the language and
//           background pickers always used:
//           * SettingsRow gains `layout="stack"` - a wide control gets the
//             WHOLE row, under its label. Opted in: Theme, Care connection,
//             the role-chip group, and About's three long values (build
//             label, session diagnostic, compliance), which used to wrap
//             4-6 lines beside two-word labels.
//           * The control slot's cross-axis now FLIPS with rtl.
//           * SegmentedControl may shrink as a last resort (flexShrink on
//             track+options, font fit at 0.8) - degradation is compression,
//             never overpainting.
//           * SettingsChip is a View around a Text: borderRadius 999 +
//             overflow:hidden on a bare wrapping Text node clipped the first
//             and last glyphs of every line ("Secure On-Device Processing").
//           * Section art centres against its heading; the swatch row wraps;
//             the full-width pickers take the row rhythm so dividers
//             underline groups.
//           * ★ THE PRIVACY COPY WAS FALSE AND IS REWRITTEN: "Your ECG never
//             leaves this device. There is no server today." has not been
//             true since the backend and sync engine shipped. It now says
//             what happens: analysed on the phone, synced encrypted to the
//             account. A stale privacy promise is not reassurance.
//           * Sections land with the house FadeUpView stagger (Profile and
//             History got theirs in v0.53-0.54).
//           * PARITY housekeeping: preview-as-role row was stale (shipped
//             v0.28.0), notifications row predated Reminders, app-lock had
//             no row at all.

// v0.54.0 - "The Profile tab is ancient - personal details cannot be edited."
//           True, and the strange part is WHY: `PATCH /patients/:id/card` has
//           existed end-to-end (server route, shared contract, wired RTK
//           mutation) since v0.39.0 - only the UI was missing. So:
//           * A NEW PUSHED SCREEN, PersonalDetails - reached from the Details
//             and Emergency-contact section headers. Pushed, not a sheet (the
//             Reminders precedent: sliders + a grid + a form are a panel), and
//             built from SettingsSection/SettingsRow for continuity. It edits
//             exactly what the shared PatientCardPatch accepts - height,
//             weight, blood group, emergency contact - and SHOWS the identity
//             fields (name, DOB, sex, phone) with one sentence saying the
//             clinic changes those. The onboarding step BODIES are reused
//             (MeasureSlider + UnitToggle, the blood grid with a first-class
//             "I don't know", the contact fields with relation chips), through
//             the existing authPalette(dark) - same controls the patient met
//             at sign-up, no wizard chrome, no new palette.
//           * THE PATCH IS A DIFF - only touched fields are sent, sliders
//             track "touched" separately from "different" so an untouched
//             fallback is never written into the record, and a HALF-TYPED
//             emergency contact BLOCKS saving rather than being dropped
//             (server requires name+phone+relation; saving around it would be
//             the "appeared to work" failure).
//           * BUG FIX - THE MEDICATION EDITOR ATE DOSES. The list editor
//             seeds `{display, code}` and the server REPLACES the whole
//             array, so opening Medications and pressing Save wiped
//             "10 mg, mornings" off every medicine. The dose is now rejoined
//             by name on the way out. Dose EDITING remains out of scope;
//             preservation was the bug.
//           * EMPTY IS NOT INVISIBLE - Emergency contact and Care team
//             sections used to vanish when empty, which hid the Add
//             affordance from precisely the patient who needs it (the Section
//             component's own header had argued against this all along). They
//             always render now, with honest empty sentences; Care team stays
//             read-only because the clinic assigns itself.
//           * Profile sections land with the house FadeUpView stagger.

// v0.53.0 - "The first thing a patient sees is a list of dates… in Kardia you
//           see a screenshot of the recording itself. Only when I open a study
//           and press Findings do I see whether the signal is fine. Maybe the
//           insights first? Plan it."
//           The History redesign, in three linked decisions:
//           * EVERY ROW NOW CARRIES ITS VERDICT — the full 43-rule screening
//             level, never the rejected 6-rule summary shortcut (PARITY's old
//             verdict-dot row explains why that shortcut was banned: it could
//             disagree with the detail screen). The cost problem that row
//             documented — decoding every waveform to draw a list — is paid
//             ONCE per study by a new device-side cache, `studyDigestCache`,
//             built exactly like `templateCache` (one heavy entry, version
//             gate, PINNED filters, staged writes, pruned on delete) and
//             backfilled one study at a time off the render path with visible
//             progress (`useStudyDigests`, the `useEcgIdentity` pattern).
//             The honesty rules bind unchanged: a simulated study is never
//             screened (SIMULATION chip where the pill would go), and patient
//             sex/age reach the engine only when the study provably belongs to
//             the active patient — that rule now lives ONCE, in
//             `patientContext.ts`, imported by the Findings tab and the
//             backfill alike, with the context recorded per digest (`ctxKey`)
//             so a card that loads late updates the verdicts exactly once.
//           * EVERY ROW NOW SHOWS FOUR SECONDS OF LEAD II. StudyCard v1's
//             header argued a thumbnail would be "an unreadable squiggle" -
//             true of 10 s in 40 pt, not true of a 4 s window at a fixed time
//             scale (the Kardia pattern). `EcgMiniPreview` deliberately does
//             NOT look like ECG paper - no grid, no calibration pulse, only
//             second-ticks - so recognition and measurement stay different
//             things. Placeholders reserve both slots; a card never reflows
//             as knowledge arrives. Imported CSVs, whose stored summary bpm
//             is null, borrow the digest's measured rate.
//           * FINDINGS LEADS THE STUDY VIEWER - first segment, and the
//             initial tab for a patient (a clinician still lands on ECG; the
//             ORDER is the same for everyone so the control can be learned).
//             Reverses v5.0.0's trailing-edge decision at the user's request:
//             the answer first, the evidence after.
//           Save-time digesting was considered and skipped: the backfill
//           computes a fresh capture's digest within one History visit, and
//           the auto-save path stays untouched.

//           possible, and when I lift my finger the green line should
//           disappear, and while it's there it should write the wave's value
//           nicely."
//           Three linked changes, each correcting a decision that was right
//           when it was made and stopped being right afterwards.
//           * THE TICK IS Heavy - the strongest single event either platform
//             exposes through expo-haptics. The only louder thing in the API is
//             notificationAsync, a multi-thump PATTERN meaning success /
//             warning / error, which is both wrong here and impossible to fire
//             at scrubbing rate. What it replaces is selectionAsync, the
//             LIGHTEST event iOS defines - tuned for a picker wheel under a
//             resting thumb, and this finger is moving.
//             MIN_TICK_MS (45 ms) is not a compromise on that: a 1 mm square on
//             a ~40 mm sheet means an unhurried sweep crosses 40 squares a
//             second, and asking for a Heavy impact every 25 ms asks for more
//             than the engine can reproduce - past that rate the thumps merge
//             into one flat rumble, which is WEAKER in the hand than a slower
//             train of distinct hits. It throttles the buzz only; the line and
//             its reading still move on every square.
//           * THE READING IS BACK, AND IT IS ON THE SHEET: a paper chip at the
//             top edge, beside the line and never centred on it, carrying ms
//             from R, the baseline's mV, and - when a study is laid over - that
//             study's mV in the colour it is drawn in.
//             WARNING: the rule it was kept off the sheet for (v0.16.0 - a
//             readout floating on the trace covers the deflections whose
//             position it reports) is still true, and is exactly why it sits at
//             the top edge on paper rather than under the finger. What changed
//             is that v0.44.0 deleted the chrome strip it reported INTO without
//             moving the numbers, so from then on this was a line you could
//             drag along your own ECG that told you no value at all.
//           * IT VANISHES ON RELEASE. Persisting was right only while the
//             readout lived elsewhere and STAYED UP - you parked the line, then
//             read the figures. With the number travelling with the line, a
//             parked caliper is a green mark left on someone's own trace.
//             The tap went with it (a tap fires on release, so it could only
//             flash a line that erased itself); a 180 ms HOLD replaces it, long
//             enough that a finger on its way to scrolling the page does not
//             drop a caliper.
//           * The lead name steps aside while the caliper is out - two chips at
//             the top edge is the clutter this screen was stripped for.
//           * BUG, found while reading it: the panel held the caliper reading in
//             state that nothing has drawn since v0.44.0, so every millimetre
//             the finger moved re-rendered the whole Insights tree for a value
//             thrown away. The gesture is gated on a measurable prop now rather
//             than on someone subscribing to it.

// v0.51.0 - "You removed the progress bar I could play with to see how my ID
//           gets built over time, and that's a shame because it was cool with
//           the vibration (and the vibration needs strengthening)."
//           * THE BUILDER IS BACK, directly under the trace on the first
//             screen. v0.44.0 cut it together with the legend row and the
//             explainer, on the argument that all three were explanations
//             nobody had asked for. Half of that was right and the difference
//             matters: the legend and the explainer TOLD the reader something.
//             The builder lets them DO something, and the thing they do is the
//             only demonstration in the app of the claim the whole feature
//             rests on - that averaging many recordings cancels what is not the
//             heart. Nobody has to read that; they drag, and they watch it
//             happen. That is the opposite of the pile-on the redesign was
//             aimed at, and cutting it was over-applying a good rule.
//             It sits UNDER the trace and above the lead buttons, because a
//             control has to be adjacent to the thing it changes. It fits in
//             the one-viewport budget: that block reserves the full remaining
//             window height and its content was ~130 pt short of it, so the
//             builder is absorbed by slack that already existed.
//           * THE HAPTIC IS STRONGER, and the old one was weak for a reason
//             worth recording: `selectionAsync` is the LIGHTEST event iOS
//             defines - tuned for a picker wheel under a thumb resting on
//             glass - so through a case, one-handed, with the finger already
//             moving, it is easy to miss entirely. A control whose feedback
//             you cannot feel is a control you have to watch, which defeats
//             the point of the sensation. Now a Medium impact per study
//             crossed, and a HEAVY one at either end of the timeline so the
//             finger can find the first and last study without looking.
//             MIN_TICK_MS (32 ms) stops a fast flick merging the ticks into
//             one continuous rumble - it throttles the BUZZ only, never the
//             value, so the picture never lags the finger.
//           * While a partial baseline is drawn, the latest-study overlay stays
//             hidden - laying one study over "the first three studies" invites
//             reading a comparison against something that is not the person's
//             baseline.

// v0.50.0 - "The PDF does not look like a professional medical report (except
//           page 1 with the graphs). And the three tabs at the top are really
//           cramped - think how to arrange that professionally."
//           * THE TABS WERE CRAMPED BECAUSE THE LABELS WERE, and shrink-to-fit
//             was papering over it. A segmented control divides its width
//             EVENLY, so three labels of very different lengths always look
//             wrong however the type is tuned: "Waveform / Measurements /
//             Interpretation" put 72 pt in the first slot and ~105 in the next
//             two, on ~120 pt segments, and the two long ones ended up
//             touching with no gutter between them.
//             Two fixes, and the first is the real one: the viewer's tabs are
//             now `ECG / Values / Findings` - near enough the same length to
//             read as one composed control, and simply the better words,
//             because they are what a clinical report calls those three
//             sections. The gutter went 4 -> 10 pt. Shrink-to-fit stays only
//             as a safety net for a long word in a language nobody measured.
//             The end-of-exam report's TWO-tab control keeps the long names;
//             it has the room and nothing there was cramped.
//           * THE REPORT WAS THE APP, PHOTOGRAPHED ONTO A4. That is the whole
//             diagnosis. Pages 2-4 were built out of app idioms - rounded
//             cards, soft coloured fills, chips, six 30 pt stat tiles - and an
//             app rendered onto paper does not become a document. What makes a
//             sheet read as a clinical report is boring and specific, and all
//             of it is now there:
//             - AN IDENTIFICATION GRID at the top of page 2: whose, when, on
//               what, how many beats, what quality. A reader pulling the sheet
//               out of a folder answers those before anything else and should
//               not have to read a sentence to do it.
//             - THE VERDICT IS A STATEMENT BLOCK, not a card: a heavy left
//               rule in the level's colour, a kicker, the conclusion. The same
//               shape a pathology report puts its impression in, because a
//               conclusion is something the issuer stands behind rather than a
//               widget.
//             - SIX STAT TILES BECAME TWO RULED TABLES with reference ranges
//               and H/L FLAGS. Tiles are a dashboard; a clinician reads a
//               column, and the eye runs down the flag column first and stops
//               on the letters. Blank when in range - a column of ticks makes
//               exceptions harder to see, not easier.
//             - SECTION HEADERS are uppercase, letterspaced, on a full-column
//               rule. That single selector does more to make the sheet read as
//               a document than anything else in the stylesheet.
//             - Radii, soft fills and chip pills are gone; figures are aligned
//               on the decimal (`tabular-nums` on the body).
//           Re-verified in Node across nine cases: 4 pages, 0 unsized SVGs,
//           0 percentage dimensions, 0 unresolved placeholders, 0 inconsistent
//           page numbers, 0 NaN, 8 identification cells and the H/L flags
//           present in the output.
//           OTA: TypeScript only, app.json stays at 0.34.0.

// v0.49.0 - "Why is there a blank page after every page? Why is there half a
//           page of ECG for the remaining leads? Why are you not using my logo
//           and writing it in plain text? A whole page for that one line - are
//           you serious? Green is not my brand colour. There is partial
//           information that gives no value. It is ugly and does not look like
//           a report a doctor would be impressed by. Add the average beats from
//           the ECG ID tab. Think outside the box."
//           Six complaints, six causes, and two of them were bugs I shipped.
//           * THE BLANK PAGE WAS ONE MILLIMETRE. `.pg` was `height: 297mm`
//             inside a 297 mm page. WebKit lays print out in CSS pixels:
//             297 mm is 1122.52 px, which it rounds UP to 1123, so the box was
//             half a pixel taller than the page holding it. The engine then
//             honoured `page-break-after: always` on a box that had ALREADY
//             overflowed - and half a pixel of nothing became a sheet of paper,
//             after every single page. `PAGE_BOX_H` is 296 now, and
//             `:last-child` breaks with `avoid` rather than `auto`.
//           * THE HALF PAGE OF ECG IS GONE. The recording no longer paginates
//             at all. 186 mm at 25 mm/s holds 7.1 s, so a 10 s capture used to
//             become two sheets and the second was six leads stopping a third
//             of the way across - the ugly half of a trade nobody asked for.
//             One sheet now, the window stated against the total in the
//             caption. Compressing 10 s into 186 mm would mean 18.6 mm/s, and
//             rescaling the time axis is banned (`ecgPath.ts`): every interval
//             measured off the paper would be wrong by a quarter. CSV and EDF
//             still carry every sample.
//           * THE LOGO IS THE LOGO. `pdf/logo.ts` carries the wordmark as
//             plain SVG - path data copied verbatim from
//             components/atoms/BrandLogo, which cannot be imported here
//             because it renders through react-native-svg into native views.
//             34 mm on every letterhead.
//           * THE RULER IS ON THE PAPER. A second label per large square along
//             the time axis, +/-0.5 and +/-1 mV against the baseline, and the
//             calibration pulse named. A grid without numbers asks the reader
//             to remember that a large square is 200 ms.
//           * GREEN IS NOT THE BRAND, and it should never have been the
//             verdict colour. `clear` is the wordmark's own navy #0D2041 now.
//             Green survives ONLY as the reference band on an interval bar and
//             the normal sector on the dial, where it is not identity but the
//             universal chart convention for "inside range".
//           * THE INTERPRETATION PAGE HAD A RING, A HEADLINE AND ONE FINDING ON
//             297 MM OF PAPER. The emptiness was the symptom; the disease was
//             that "no abnormal finding" is a claim with NO CONTENT unless the
//             reader knows what was looked for. `screenLimbEcg` now returns a
//             per-rule AUDIT, and the page prints all 43 in three columns,
//             grouped by category, marked present / ruled out / not evaluable.
//             A clinician wants the negative list at least as much as the
//             positive one: "atrial fibrillation: not present" is a clinical
//             statement, and a report that omits it asks to be trusted rather
//             than read.
//           * THE REPRESENTATIVE BEAT, ALL SIX LEADS, from `buildBeatTemplates`
//             - the SAME function the ECG ID tab uses, so the beat on paper and
//             the beat on that screen are one computation. Real ECG machines
//             print exactly this panel beside the rhythm strip, because a
//             median beat is what a reader inspects when asking about a Q wave
//             or an ST segment; a ten-second strip shows rhythm, not
//             morphology.
//           Re-verified in Node across nine cases: 4 pages (was 5), 0 unsized
//           SVGs, 0 percentage dimensions, 0 unresolved placeholders, 0
//           inconsistent page numbers, 0 NaN, and 43 audit rows plus 6 median
//           beats present in the output.
//           OTA: TypeScript only, app.json stays at 0.34.0.

// v0.48.0 - "The PDF is not laid out for the page. The graphs stretch across
//           two pages. The tables are colourless and dated. It is ugly. I need
//           a report with graphs, with circles, with statistics on every
//           measurement, six leads filling the whole first page, in my brand
//           colours, perfect, with no errors and no overflow between pages.
//           Statistical analysis of everything. Do not be stingy. Add
//           illustrations too."
//           * THE STRETCHING WAS A MISSING CONSTRAINT, NOT A STYLING MISTAKE.
//             Every strip was `<svg width="100%">` with a viewBox and NO
//             height, so its height was INFERRED from an aspect ratio against
//             whatever column the print engine had decided on - and `.page`
//             had no height ceiling at all. Any growth above (a long device
//             name wrapping the letterhead is enough) pushed the sixth lead
//             past 297 mm, and the engine did the only thing it can: started a
//             new page in the middle of a lead.
//           * NOW EVERY BOX IS A NUMBER IN MILLIMETRES, and `assertFits()`
//             throws WHILE BUILDING if a page''s blocks exceed the body. A torn
//             report is worse than a failed export precisely because it looks
//             fine on the phone that made it: printToFileAsync reports success,
//             the file opens, and the damage is a lead sliced in half in a
//             document somebody treats a patient from.
//           * AND A SECOND SILENT SHEAR, FOUND WHILE FIXING THE FIRST:
//             printToFileAsync''s default paper size FOLLOWS THE DEVICE LOCALE.
//             A phone set to US English gets Letter - 6 mm narrower and 18 mm
//             shorter than the geometry every page is built to. A4 is now
//             passed explicitly in points, with zero margins.
//           THE DOCUMENT, four kinds of page:
//             1..n  THE ECG at full page - six leads, 40 mm each, 240 of the
//                   256 mm body. 25 mm/s, 10 mm/mV, 1 mV calibration pulse per
//                   lead, R-peak ticks on II. 186 mm of column holds 7.1 s, so
//                   a 10 s capture is two consecutive sheets - what a
//                   six-channel machine does, rather than truncating.
//             n+1   INTERPRETATION - the verdict as a donut whose FILL is the
//                   checks that ran, then every finding with its evidence
//                   chips, its margin bar and its PUBLISHED CRITERION printed
//                   underneath. Findings paginate; nothing is dropped.
//             n+2   STATISTICS - six stat tiles, all five intervals as bars
//                   against their reference bands, and three real figures: the
//                   HEXAXIAL DIAL (the axis is an angle, so it is drawn as a
//                   compass), a POINCARE PLOT with its SD1/SD2 ellipse, and
//                   the RR TACHOGRAM. Amplitudes as a striped table with a
//                   signed mini-bar per lead.
//             n+3   REFERENCE - EINTHOVEN''S TRIANGLE drawn, with which leads
//                   see which wall and which walls are not recorded at all;
//                   the blind spots; how to read the sheet; the disclaimer.
//           * A SIMULATED RECORDING GETS NO INTERPRETATION PAGE. The same rule
//             the app obeys, and it binds harder in a PDF: a document leaves
//             the phone and is read by someone with no way to know the trace
//             came from a bench generator.
//           VERIFIED THE ONLY WAY A PDF CAN BE: the document builder was split
//           away from expo-print into `pdf/document.ts` so it imports nothing
//           native and can be BUILT IN NODE. Nine cases (normal, simulated,
//           3 s, 30 s, brady, tachy, low voltage, left axis, irregular), all
//           with deliberately over-long labels: 0 unsized SVGs, 0 percentage
//           dimensions, 0 unresolved placeholders, 0 inconsistent page numbers,
//           0 NaN/undefined in the output, and the overflow guard confirmed to
//           fire when handed an over-tall page.
//           OTA: TypeScript only, app.json stays at 0.34.0.

// v0.47.0 - "What is this? It is not informative. Why did it decide that? Why
//           are there no illustrations of why? I look at it and I have no idea
//           what you are talking about. As a healthy person I see this and I
//           get stressed. Maybe even a button that explains it like to a small
//           child, with drawings and proof from my own measurement."
//           Every word of that was fair, and one part of it was not a design
//           complaint at all - it was a bug report.
//           * THE AMBER WAS 4 % OF A THRESHOLD. `Largest QRS +0.48 mV /
//             Threshold 0.50 mV`. A finding a hair past its line drew exactly
//             like one 200 % past it, because the engine had no way to express
//             DEGREE. Every rule now returns a `margin` (0 = on the line,
//             1 = unambiguous) and a finding below 0.15 is `borderline`: still
//             listed, still explained, still in the report - and it NO LONGER
//             RAISES THE VERDICT. A well person's mark stays green.
//           !! AND THAT FIX, ALONE, SHIPPED A WORSE BUG THAN THE ONE IT FIXED.
//             Validation caught a QTc of 515 ms - three per cent past the
//             torsades threshold - being demoted to borderline and returning a
//             GREEN verdict. Silencing an urgent finding is not a milder
//             version of over-calling a benign one, it is the opposite error,
//             and they do not cost the same. Borderline demotion is now
//             deliberately asymmetric: `attention` findings can be demoted,
//             `urgent` findings never can.
//           * "WHY?" ON EVERY FINDING, and it answers with the patient's OWN
//             recording: their representative beat drawn with the segment the
//             rule measured shaded, their number on a bar against the typical
//             band, the cause in ordinary words, and the published criterion.
//             A stock diagram would explain the concept and prove nothing - the
//             question is not "what is a QT interval", it is "why did you flag
//             MINE". A rhythm finding gets a five-second strip with the beats
//             ticked, because a pause is invisible inside one complex.
//           * 43 RULES, 43 FILES. The engine was one 900-line function; it is
//             now `screening/<category>/<disease>.ts`, each a declarative object
//             carrying its threshold, its citation, its evidence, its margin and
//             what to draw. Adding a disease is: write the file, add the line to
//             the registry. `RULE_COUNT` is derived from the array so the
//             "43 checks" denominator cannot go stale.
//           * THE TABS WERE TRUNCATING - "Measurem... Interpretat...". Three
//             segments on a 390 pt screen give ~120 pt each and the labels are
//             over 100 pt at 14 pt bold. SegmentedTabs now shrinks type to fit
//             above two options, per label and per language.
//           * REDESIGNED AT PATIENT SCALE. Statistics were `MetricTile`, the
//             REPORT's dense bordered table atom, six to a screen - which reads
//             as a spreadsheet. They are `StatCard` now: 30 pt value, inset
//             card, a progress track where the number is a fraction. Section
//             headings 19 pt. Findings are large tappable cards; the raw figures
//             moved into the Why sheet, where a doctor still has them and a
//             frightened person does not meet them first.
//           VALIDATION AFTER THE REFACTOR: 90.4 % of 3 000 synthetic healthy
//           adults return "no abnormal finding" (was 87.0 %) and 0.00 % return
//           urgent. All 20 threshold regression cases pass. The 43-file split
//           did not change a single result.
//           !! STILL OPEN, and both are real: the history list cannot carry a
//           verdict dot without the level being CACHED ON WRITE the way
//           `RecordingSummary` is - the list endpoint returns metadata only, by
//           design, and re-deriving 43 rules per row would mean decoding every
//           waveform to draw a list. Deriving a dot from the cached summary
//           alone would use ~6 of 43 rules and disagree with the detail screen,
//           which is worse than no dot. The PDF has no interpretation page yet.
//           OTA: TypeScript only, app.json stays at 0.34.0.

// v0.46.0 - "For every measurement, interpret it for different heart diseases.
//           Write algorithms for the kinds of heart disease that can be
//           extracted from 6 limb leads. Show it to the patient in calming
//           colour with gentle animation. Something a patient looks at and says
//           okay I'm healthy, or the opposite, okay I need to go to A&E."
//           ★ A THIRD TAB IN THE STUDY VIEWER: Waveform | Measurements |
//             INTERPRETATION. 43 rules across rate, rhythm, conduction,
//             repolarisation, axis, chambers, blood supply and recording
//             technique, resolving to ONE of four answers - no abnormal
//             finding / worth showing a doctor / get help now / could not be
//             read - with the action underneath it and a breathing mark in the
//             level's colour.
//           ⚠️ THIS CROSSES A LINE THE CODEBASE WROTE DOWN TWICE, so it is
//           crossed in a specific place. `ecgAnalysis.ts` says it measures and
//           must never interpret; `tokens.ts` says painting a difference red is
//           a layer interpreting when it may not. Both are still true and
//           neither changed. The reading lives in a NEW module,
//           `shared/ecg/ecgScreening.ts`, which imports the measurements and is
//           never imported by them. Delete it and the measurement layer is
//           intact; that is the property that keeps the numbers auditable.
//           Two words were added to ecgAnalysis - `export` on `delineateBeat`
//           and on its type - so screening can find a J point without forking
//           the delineation. No maths, no constant, was touched, and the web's
//           own copy was regenerated from shared so the two stay identical.
//           ── AND NOW THE PART WORTH KEEPING ──
//           ★ THE FIRST VERSION FIRED ON 39 OF 40 HEALTHY SUBJECTS, and every
//             defect below was found by RUNNING it, not by reading it:
//           (1) `qtLongSevere` - an URGENT finding - fired on 3.6 % of 3 000
//               synthetic healthy adults. One emergency alarm per 28 well
//               people. The cause is not a coding error, it is Bazett: QT/vRR
//               over-corrects above ~90 bpm, so an ordinary 390 ms QT at 98 bpm
//               comes out as a QTc of 500 - the torsades threshold. The
//               correction is now chosen BY RATE (Bazett inside 60-100 where it
//               is accurate, Fridericia outside), and the urgent finding needs
//               BOTH to agree. Reports still print both, unchanged.
//           (2) `electricalAlternans`, also urgent, fired on 1 subject in 7. It
//               was measuring noise: on ten beats, ordinary jitter splits into
//               "even" and "odd" groups differing by 15 % often. It now needs
//               the alternation to exceed the scatter WITHIN each group.
//           (3) `leadReversal` fired on ordinary marked RIGHT AXIS DEVIATION. A
//               vector at +120 degrees inverts lead I on its own, P wave
//               included, so "lead I is upside down" cannot tell a swapped
//               cable from a rightward heart. aVR can: its P is negative at
//               every physiological axis and flips POSITIVE when the arm
//               electrodes are swapped. One sign, measured at -0.09 mV at +45
//               and +0.73 mV reversed.
//           AFTER: 87.0 % of 3 000 healthy adults return "no abnormal finding"
//           and 0.00 % return urgent. The findings that do fire sit at their
//           published population rates - LVH voltage criteria ~5 %, PR > 200 ms
//           ~2 % - which is epidemiology, not a bug.
//           ★ THREE THINGS THE SHAPES ENFORCE RATHER THAN THE COPY:
//             * every finding carries the ARITHMETIC that fired it (QTc 512 ms),
//               so it can be argued with. A verdict nobody can check must be
//               either believed or ignored, and both are wrong;
//             * every screen carries what six limb leads CANNOT see - the
//               anterior wall above all - and it renders on a CLEAR result
//               too, most importantly there. Green with nothing beside it reads
//               as "my heart is fine" when it says "nothing these leads can see
//               is wrong";
//             * a rule that could not be evaluated is COUNTED, not skipped, so
//               "no abnormal finding" always arrives with "41 of 43 checks ran".
//               Six of 43 is a recording that could not be read, and without the
//               denominator both draw the same green mark.
//           ⚠️ A SIMULATED RECORDING GETS NO VERDICT AT ALL - not a caveat
//           under one. `useScreening` returns null and the tab says what the
//           recording is. The bench simulator's T wave sits at a FIXED offset
//           from the QRS, so its QT does not shorten with rate and every
//           simulated strip measures a QTc near 280 ms; screened, ~90 % would
//           report a short QT. The engine is right and the signal is not a
//           heart. (Mobile CLAUDE.md §4 already required this; the measurement
//           of how badly it would have failed is new.)
//           Patient sex moves the long-QT limit by 10 ms and is passed ONLY
//           when the study provably belongs to the active patient - a clinician
//           opening someone else's record would otherwise screen them against
//           the wrong threshold, silently.
//           OTA: TypeScript only, app.json stays at 0.34.0.

// v0.45.0 - "sometimes I'm in the app and it suddenly switches to the login
//           screen and disconnects me on its own."
//           Third time on this bug, and the first two fixes were both right -
//           they just could not reach it. tokenStore v2.1.0 and v2.2.0 fixed
//           real causes on THIS side (the Keychain accessibility class, the
//           retried enclave write, an empty read beside a live principal).
//           The cause that survived them lives in the SERVER, and the other
//           half of this release is CYPHIX_SERVER v0.5.0 + migration 0003.
//           ★ THE SERVER HALF: rotation retired a token before its replacement
//             could reach the phone, so any dropped reply left the enclave
//             holding a token the server had already killed. Presenting it
//             read as THEFT and revoked the entire family - an unrecoverable
//             logout, minutes later, for a patient who did nothing. The server
//             now records which token replaced which, and a successor that was
//             never presented proves the reply never landed.
//           ★ THE APP HALF, and it is this file's release: `revalidate()` no
//             longer ROTATES A TOKEN JUST TO ASK A QUESTION. AuthGate calls it
//             on every return from the background and again on a 4s->60s
//             backoff for as long as the app believes it is offline - so the
//             app was spending its most fragile credential over and over, on
//             exactly the flaky network that loses a rotation's reply. It now
//             asks with the access token it already holds (GET /auth/me) and
//             rotates only when that cannot answer: no access token at all (a
//             cold start) or a 401. One rotation per ~15 minutes of use
//             instead of one per foreground, and NONE while offline.
//           Nothing about revocation is weakened here: a server that answers
//           and refuses still ends the session, on the same path as before.

// v0.44.0 - "I don't like the Insights design, it feels like you just piled
//           more information on me instead of minimalism. In the end a patient
//           doesn't know what that 'agree' in the green circle is and I don't
//           care about it either."
//           Fair, and v0.42.0 earned it: answering "make it useful for a
//           patient" by ADDING a verdict band, three figures and a three-line
//           explainer is how a screen gets fuller while getting no clearer.
//           WHAT IS GONE: the confidence ring ("82 - agree"), the three
//           figures, the explainer, the caliper readout strip, the beat
//           builder, the legend row, the standalone baseline numbers, every
//           explanatory paragraph, and "Changes since you started".
//           WHAT IS FIRST: the ECG. The trace and the lead buttons are sized
//           to ONE viewport, so the recording is never half-visible.
//           ★ THE SHEET IS PAPER AGAIN - a ground, a hairline edge and a low
//             soft shadow. Reported as "the rounded rectangle with no outline
//             and no shadow behind it doesn't look professional", and both
//             halves were right. This is NOT the white card v0.33.0 removed:
//             that was a white sheet inside a white CARD on a grey page. The
//             grid keeps the brand's navy rather than clinical pink.
//           ★ EVERY MEASUREMENT, EVERY TIME, under the chart - heart rate, PR,
//             QRS, QTc, axis, each beside what that person usually holds, with
//             colour as the ONLY difference. Showing only what moved made the
//             screen's content depend on whether anything was wrong, so the
//             layout jumped and an empty space was ambiguous between
//             "everything agreed" and "nothing could be measured".
//           ★ A WEEKLY GOAL in "When you measure", as seven rings against the
//             number of reminder times already set. No second setting: a goal
//             and a schedule are one intention said twice. It never scolds.
//           The plain reading moved under the lead buttons and lost its tick -
//           a green check is a PASS MARK and this layer does not pass anything.
//           Type is up throughout: no small text, for an older reader.

// v0.43.0 - "When comparing old ECG studies, there should also be an option to
//           bring the patient's representative beat and put it on the ECG graph
//           to compare against a specific measurement."
//           The viewer could already ghost one STUDY behind another. It could
//           not compare a strip against the PATIENT - and comparing against one
//           prior study compares against that study's noise as well, while the
//           ECG ID is the signal that survived every clean recording they have.
//           The better reference was one screen away and unreachable from the
//           place people actually look at waveforms.
//           ★ HOW ONE BEAT BECOMES A 30-SECOND GHOST: it is STAMPED at every R
//             peak of the strip it is laid over, so alignment is exact by
//             construction - no beat-shift to accumulate error, no fiducial
//             warp to distort intervals. The three alignment modes are not
//             shown for it, because they exist to reconcile two independent
//             timelines and this ghost has none of its own.
//           ⚠️ WHICH MEANS ITS RHYTHM IS THE STRIP'S OWN, and the sheet says
//             so: compare the SHAPE, never measure an interval off the grey
//             trace. Above ~130 bpm the beats are closer together than the
//             700 ms template is long, so each stamp is necessarily cut short -
//             stated too, because a truncation read as a T-wave change is a
//             difference the DRAWING invented.
//           Two bugs found by measurement rather than reasoning: the stamp has
//           to remove the TEMPLATE's own isoelectric before adding the strip's,
//           and the gaps between beats have to HOLD the neighbouring stamp's
//           edge rather than be written at the strip's measured level - the two
//           are different numbers and the difference was a 0.13 mV staircase.

// v0.42.0 - "Design the Insights tab in a more modern way, it feels dated with
//           old colour choices and isn't very practical - add useful, nice
//           information for a patient who understands nothing about ECG."
//           All three complaints were one defect: the screen was built for a
//           clinician. It opened with "ECG ID / BASELINE ESTABLISHED - 24
//           STUDIES" in letterspaced small caps, then a ring reading 82, then a
//           waveform, then percentages and Latin. The person whose heart it
//           describes was never answered at all.
//           ★ THE ORDER INVERTED. The answer comes first, in a sentence, then
//             three figures anyone can place (resting rate, their own recording
//             count, how long they have been tracking), then the curve, then
//             three numbered lines saying what the curve IS. Nothing was
//             deleted - the ring, the coverage grid, the deviations and every
//             clinical figure are still there, lower down.
//           ★ THE "DATED" FEELING WAS THE SECTION HEADERS. 11 px letterspaced
//             uppercase in the faintest text colour, six of them down one grey
//             column - quiet to the point of unreadable, so the eye got no
//             structure and the page read as a wall. Now legible sentence-case
//             in the secondary colour. Gaps 10 -> 14: removing every box in
//             v0.33.0 also removed the spacing the boxes had been doing.
//           ★ THE PALETTE DID NOT CHANGE. It was barely being SPENT - almost
//             everything was one of three greys. The tints that carry meaning
//             now actually appear.
//           ⚠️ Every plain-language verdict comes from a comparison with the
//           PATIENT'S OWN spread of scores, never from the per-study deviation
//           thresholds. Those fire on nearly every recording, which is exactly
//           how v0.41.0's alert banner came to say "26 studies in a row".

// v0.41.1 - "Get rid of this line, it gives me no added value." It read:
//           "The same difference on 26 studies in a row: Shape - Amplitude.
//           Worth showing your doctor."
//           ★ 26 OF 26 IS NOT A FINDING ABOUT A HEART, IT IS A BROKEN RULE.
//           The persistence rule counted backwards while the same deviation
//           KIND kept appearing, and `morphology` and `amplitude` fire against
//           the local baseline on very nearly every study - so the run never
//           terminated and the banner had been true since the patient's first
//           recording. Removed: the line, the `IdentityAlert` model behind it,
//           and its copy, rather than left computed and unrendered.
//           The lesson is NOT "tune the rule". A persistence rule cannot rescue
//           per-study thresholds that fire constantly - it inherits their
//           false-positive rate however many repeats it demands, and an alarm
//           that has been on since day one is indistinguishable from a
//           decoration. Anything put back has to rest on a residual whose quiet
//           state is genuinely quiet, shown on real serial data first.
//           ⚠️ My synthetic cohorts never caught this: they are clean enough
//           that only ~11 of 24 studies carry any deviation, so the backward
//           run terminated and the two tests I wrote for the rule both passed.
//           The per-study deviation chips are unaffected and stay - they are
//           checkable arithmetic about one recording, which is a different
//           claim from "something is happening to you".

// v0.41.0 - "It looks like one measurement carries a lot of weight and the rest
//           barely matter." That reading was right, and there were FOUR separate
//           causes behind the one picture:
//           (1) THE CHART WAS THROWING THE DATA AWAY. Similarity was stretched
//               from a correlation of 0.90 while the timeline drew an axis it
//               had chosen for itself starting at 80 - so the whole visible
//               range of that chart was r 0.971-1.000, and an excellent 0.96
//               study was drawn as the identical 6 px stub as a poor one. Most
//               of "one tall bar in a row of dashes" was this, not the maths.
//               `SIMILARITY_FLOOR` and `SIMILARITY_AXIS_FLOOR` are now exported
//               together so two files cannot disagree about one scale again.
//           (2) THE AGREEMENT WEIGHT WAS A WINNER-TAKE-ALL RAMP. A linear
//               `(r - 0.8) / 0.2` turns a 0.05 difference in correlation into a
//               10x difference in weight and deletes everything below 0.80
//               outright. Replaced by a Tukey biweight against the cohort's own
//               spread, plus a hard cap: no study may hold more than a third of
//               the total, whatever the arithmetic concludes.
//           (3) ELECTRODE PLACEMENT WAS BEING SCORED AS HEART MORPHOLOGY. The
//               four derived limb leads are linear combinations of the two
//               measured channels, so pads a couple of centimetres off change
//               THEIR shapes while I and II stay perfect - exactly the
//               "Shape - 3 leads" the screen was reporting. Those studies were
//               being struck as outliers. The placement remap is now fitted out
//               before agreement is judged, and never out of what the deviations
//               report: the axis and amplitude findings are untouched.
//           (4) THERE WAS NO TIME IN THE MODEL AT ALL, so a slowly changing
//               heart was guaranteed to drift below the floor and be called an
//               outlier. Now two baselines - a frozen enrollment ANCHOR and a
//               time-weighted TRACKER - with the distance between them reported
//               as a per-year rate, and a new-study alert that needs the same
//               difference TWICE before it stops being "look at this".
//           ★ `nEff` is the number to watch: the effective study count. It is
//             what would have said "24 studies, 2.5 of them effective".

// v0.40.5 - "Sometimes I'm in the app and suddenly, on its own, it goes to the
//           login page - literally while I'm signed in."
//           ★ ONE ROOT CAUSE, TWO ROUTES OUT OF IT, AND NEITHER WAS VISIBLE
//           FROM A TYPECHECK. `expo-secure-store` defaults to `WHEN_UNLOCKED`,
//           and nothing in this app had ever set `keychainAccessible`. That
//           attribute makes the keychain item unreadable AND UNWRITABLE while
//           the screen is locked - which, combined with rotating refresh
//           tokens, is a spontaneous sign-out generator:
//           ① a refresh runs while the device is locked, the READ comes back
//           empty, the exchange reads that as "there is no token" and answers
//           `rejected` -> the door.
//           ② far worse: the refresh SUCCEEDS, the server rotates the old token
//           out, and the WRITE of the new one fails because the screen is
//           locked. `storeSession` swallowed that in an empty catch. The
//           enclave now holds a token the server has ALREADY REVOKED, and the
//           next refresh presents it - which the server correctly treats as a
//           replay, so it kills the entire token family and answers 401. One
//           swallowed write; total logout, minutes later, with nothing on
//           screen connecting the two.
//           Every keychain call now passes AFTER_FIRST_UNLOCK - still
//           device-bound, still hardware-encrypted, still unreadable on a phone
//           that has not been unlocked since boot. It gives up only "locked
//           right this second", which is the exact window that was breaking
//           this. Accessibility is fixed at WRITE time, so this heals itself on
//           the first refresh after the update.
//           ⚠️ I APPLIED THIS FIX WRONG THE FIRST TIME and caught it on review:
//           the pass covered every keychain READ and missed the refresh-token
//           WRITE - i.e. it fixed the mild cause and left the dangerous one
//           exactly as it was.
//           Two more, because one setting should not be the only thing standing
//           between a locked screen and a logout:
//           * the token write is RETRIED once and RECORDED when it still fails.
//           With rotation, silently keeping a revoked token is the worst
//           possible outcome, so it may not be swallowed.
//           * an empty token read BESIDE A LIVE PRINCIPAL is now `offline`, not
//           `rejected`. The two are written together and cleared together, so
//           that combination is a failed read and never a revocation.
//           ★ AND A LOGOUT CAN NOW EXPLAIN ITSELF. `noteSessionEvent` records
//           the last thing that happened to the session - in AsyncStorage
//           deliberately, so it SURVIVES the sign-out that clears the enclave,
//           which is the moment anyone would want to read it. Settings > About
//           appends it: "no stored session - last: refresh refused by server
//           (401) @ 14:02". No credential, no secret; what happened and when.
//           OTA: TypeScript only, app.json stays at 0.34.0.

// v0.40.4 - "While it's connecting the text is enough, it doesn't need the
//           capsule around it." Right, and it is the third and last step of the
//           same walk: coloured toast -> monochrome glass capsule -> nothing.
//           The capsule was drawing a box around two words in order to announce
//           that they were worth putting in a box. Once the text is legible the
//           frame is pure decoration, and decoration on a status line is exactly
//           what makes chrome read as bolted on.
//           ★ THE ANIMATION HAD TO CHANGE WITH IT, and that is a consequence
//           rather than a second opinion: a container can SETTLE - scale up a
//           few per cent and read as a small object arriving - but bare words
//           cannot, because scaling text reads as a zoom, which would be the
//           loudest thing this line is capable of doing. Opacity only now.
//           Everything else is untouched: same words, same spinner, same
//           outline glyph, same fixed 14 pt slot so swapping one for the other
//           cannot shift the label sideways, same silence when all is well.
//           OTA: TypeScript only, app.json stays at 0.34.0.

// v0.40.3 - Reported: force-quit from the app switcher, reopen, straight to the
//           login screen. This is a bug v0.40.2 SHIPPED, and it is the same bug
//           v0.40.0 set out to kill, recreated one layer up by the fix for it.
//           v0.40.2 added a migration path: a device with a refresh token but no
//           persisted principal (every install that was already signed in before
//           v0.40.0) resolves who it belongs to with one refresh. I put that
//           refresh INSIDE `restore()` - i.e. I made restore await the network
//           again, which is the precise thing v0.40.0 exists to have stopped.
//           `AuthGate`'s 4 s ceiling then raced it, and against a Render
//           container that takes ~50 s to wake that race is not close: the
//           ceiling fires, `user` is still null because the thunk is still
//           pending, and the gate shows the door to somebody holding a valid
//           credential. Deterministic on a cold server, which is exactly what a
//           force-quit produces.
//           ★ THE REAL LESSON, and it is why the ceiling was wrong rather than
//           merely too short: 4 000 ms was chosen to bound a DISK READ. Putting
//           a network call behind a timeout sized for storage is not a tuning
//           error, it is two different waits sharing one number. They are now
//           two numbers with two reasons - RESTORE_TIMEOUT_MS still bounds the
//           enclave, and RECOVERY_TIMEOUT_MS (20 s) bounds the lookup.
//           HOW IT IS BUILT NOW: `restore()` is a pure disk read again and never
//           touches the network. It reports `hasStoredSession` instead, the slice
//           latches `recovering`, and the GATE holds the splash and drives the
//           refresh - because a wait that must be bounded belongs where the bound
//           lives. Costs at most one launch per install; the refresh writes the
//           principal and every launch after it is instant.
//           ★ AND A DIAGNOSTIC, because two rounds were spent guessing at this
//           phone's state from Windows and each guess cost a release. Settings >
//           About now prints what the ENCLAVE holds: "token + principal",
//           "token only", "no stored session", "enclave unreadable". A fact
//           about the device, never advice, and it names no secret - whether a
//           token exists, not what it is. Same reasoning that put the resolved
//           glass material on that screen.
//           OTA: TypeScript only, app.json stays at 0.34.0.

// v0.40.2 - Three reports, and two of them were my bugs.
//           ★ (1) FACE ID ON EVERY ENTRY. The lock gated every cold start,
//           which is what "require unlock" literally means and is not what
//           anyone wants from a health app. The counter-example offered was
//           DEXCOM, and it is the right one: a CGM showing live glucose does
//           not ask for a face each time you open it, and neither does MyChart
//           by default. Nothing in HIPAA or the MDR requires a per-launch
//           biometric on a patient's own phone - because the OS lock screen
//           already IS that check. You unlocked the phone to reach the app, so
//           a second prompt re-asks what the device just answered.
//           It now guards only the gap the OS cannot: an ALREADY-UNLOCKED phone
//           handed over with the app resident, five minutes after it went to
//           the background (was 60 s - shorter than fetching a code from
//           Messages, so it fired during ordinary use). Renamed to "Lock when
//           unattended", and the description now says opening the app does not
//           ask. Honest cost, written down: a cold start on an unlocked phone
//           somebody else is holding is not gated.
//           ⚠️ The asked-for version - "Face ID only after 30 days" - is not
//           implementable, and pretending otherwise would have been worse than
//           saying so. After 30 days the refresh token is DEAD; no gesture can
//           revive it, because only the server can issue new tokens and it wants
//           the password. Biometrics can gate a session that still exists; they
//           cannot resurrect one.
//           ★ (2) OFFLINE NEVER RECOVERED WITHOUT A RESTART. Real, and mine.
//           Nothing was watching for the network coming BACK: the boot
//           revalidation runs once per account, the sync engine refreshes on
//           foreground, and neither fires when the radio reconnects under an app
//           already open. Two halves to the fix, and both were needed -
//           `httpBaseQuery` now reports reachability from EVERY request (the
//           only layer that actually knows; NetInfo is native and cannot ship
//           over the air, and "the radio has an IP" is not "CYPHIX is
//           reachable" anyway), and AuthGate knocks on a backoff (4 s -> 60 s)
//           while offline, because an app on a screen that has all its data
//           makes no requests to report from. `sessionMode` moves in both
//           directions now, so the strip reads ONE true signal instead of two
//           stale ones.
//           ★ (3) STILL SOMETIMES THE LOGIN SCREEN - and this one was a
//           migration bug I shipped. Before v0.40.0 the enclave held a refresh
//           token and NOTHING ELSE; the principal was never written down. So
//           every phone already signed in when the update landed had a valid
//           token, no principal, and `readPrincipal()` -> null -> the door. It
//           looked intermittent because it happened exactly once per install and
//           signing in again repaired it - the worst kind of report to get,
//           because the fix erases the evidence. `restore()` now falls back to
//           one refresh when a token exists with no principal, which writes the
//           principal and never runs again.
//           Second cause, same class: `readRefreshToken` swallowed a SecureStore
//           failure into null, which read as "no token" and therefore as
//           REJECTED - so a transient Keychain error signed the patient out. An
//           enclave that will not answer is not a server that refused.
//           OTA: TypeScript only, app.json stays at 0.34.0.

// v0.40.1 - Reported on the phone: the "Connected" capsule that popped up at
//           the top was ugly and did not feel native. Three faults, and the
//           first is the one worth keeping:
//           (1) ★ "CONNECTED" SHOULD NEVER HAVE EXISTED. Reconnecting is not an
//           achievement, and a green success badge for it is a UI congratulating
//           itself for doing its job. Worse, it appeared AFTER everything was
//           already fine - a new interruption caused by the absence of a
//           problem. The honest confirmation is that the notice which WAS there
//           is gone, so the capsule now simply dissolves. The `connLive` string
//           is deleted in both languages, not left orphaned.
//           (2) IT WAS A COLOURED PLATE NEXT TO A GLASS DOCK. The app's native
//           feel IS the material - the dock is Liquid Glass on iOS 26 - and a
//           flat `successSoft`/`attentionSoft` rectangle with a hairline border
//           and a coloured status dot is a web toast. It is `GlassSurface` now,
//           the same atom with the same tint arithmetic copied rather than
//           re-tuned (two surfaces of one material must not drift), and it is
//           MONOCHROME: `attention` and `danger` mean specific things in this
//           app and neither of them is "the wifi".
//           (3) IT SLID DOWN LIKE A NOTIFICATION BANNER. A banner arrives from
//           off screen because it comes from elsewhere; this is the app talking
//           about itself, so it settles instead - a spring on scale from 0.94,
//           no translation. And it stays MOUNTED at zero opacity, so
//           offline -> connecting changes the words underneath instead of the
//           whole capsule leaving and re-entering every time the sync engine
//           wakes up. The glyph sits in a fixed 14 pt box so swapping it for a
//           spinner cannot shift the label sideways.
//           OTA: TypeScript only, app.json stays at 0.34.0.

// v0.40.0 - Reported from the phone: "close the app for a while, open it again
//           and it throws me straight to the sign-in screen - and it only signs
//           me in once the server wakes up."
//           BOTH HALVES WERE ONE BUG, AND THE BUG WAS A TYPE.
//           `refreshSession(): Promise<SessionUser | null>` had TWO outcomes for
//           THREE situations: it collapsed "the server revoked you" and "the
//           request never left the phone" into the same `null`. The caller could
//           not tell them apart, so it picked the harsh reading - and that
//           reading revokes NOTHING (the refresh token stays in the enclave
//           either way, because nothing was revoked), it only stops a patient
//           reading the record already on their own phone. Security theatre that
//           costs usability and buys nothing.
//           The "it connects when the server comes up" half was the same file:
//           `restore()` AWAITED that refresh, so a Render container still waking
//           up meant the 4 s ceiling in AuthGate fired first (-> the sign-in
//           screen) and the reply landed forty seconds later (-> the app,
//           suddenly). Exactly what was described, in that order.
//           ★ THREE OUTCOMES NOW, named in @cyphix/shared `auth/session.ts` so
//           no platform can re-flatten them: `refreshed` | `rejected` |
//           `offline`. Only `rejected` - a server that ANSWERED and refused -
//           ends a session. A 5xx counts as unreachable, not refused, which
//           matters here specifically because that is what a sleeping Render
//           service answers while it wakes.
//           ★ RESTORE NO LONGER TOUCHES THE NETWORK. It reads the principal
//           beside the token in the enclave and resolves in milliseconds; the
//           app opens on it. Whether the server still agrees is settled
//           afterwards, behind the rendered app, and on every foreground.
//           A cold start is now the same length with the server up, asleep or
//           absent.
//           ── AND THE SECURITY, BECAUSE THAT WAS THE ASK ──
//           An offline session grants NOTHING new. The access token is
//           memory-only, so it is gone after a cold start and every request 401s
//           until a real refresh succeeds - the server stays the sole authority
//           over data. What opening early unlocks is the device's own cache,
//           which was already on the device. Revocation still lands the instant
//           the phone has signal, and it is now STRONGER than before: `rejected`
//           clears the enclave, where the old bounce-to-sign-in left the token
//           sitting there. Bounded by the refresh token's own lifetime - and the
//           server now STATES that lifetime (`refreshExpiresInSec`, CYPHIX_SERVER
//           v0.4.0) instead of the client hard-coding 30 days and never learning
//           we changed it.
//           ★ AN APP LOCK, which is what actually pays for opening offline.
//           Face ID / fingerprint / device passcode in front of a restored
//           session - Settings > Account, off by default, offered only where the
//           OS can honour it (a switch that silently does nothing is worse than
//           no switch). It goes back up after 60 s in the background, not
//           instantly: a lock that fires when you fetch an SMS code gets
//           switched off within a day and then protects nothing. Rendered BEFORE
//           the navigator mounts, not over it. It is a gate on RENDERING and is
//           described as one - anyone who can beat the OS's own check can read
//           the cache files directly.
//           ★ A CONNECTION STRIP at the top: "Connecting…" / "Offline - showing
//           saved data" / "Connected" for a moment, then silence. The steady
//           state draws nothing, because a permanent badge stops being read
//           within a day and then is not read on the day it matters. It reads
//           BOTH `sessionMode` and the sync engine's phase - the first only ever
//           moves towards live, so on its own it could never report a phone that
//           connected at boot and walked into a basement an hour later.
//           ⚠️ One hole found while reviewing this and closed: `sessionMode`
//           was set only by the boot revalidation, which runs once per account.
//           An app that opened while the server was asleep and reconnected two
//           minutes later through any ordinary query's 401 -> refresh -> retry
//           had no way to tell the slice, and would have sat on "Offline" over
//           data it had just fetched. `sessionConfirmed` (the mirror of
//           `sessionExpired`) now carries that upward.
//           OTA: TypeScript only - expo-local-authentication and
//           expo-secure-store are both already in the 0.34.0 binary. app.json
//           stays at 0.34.0.

// v0.39.2 - v0.39.1 fixed the clipping and the button was STILL not reachable,
//           because the last cause was never inside the sheet at all.
//           The dock is the tab navigator's `tabBar` - a SIBLING of the screen,
//           painted after it. Nothing a screen renders can go above it: zIndex
//           orders siblings within ONE parent, and these have different
//           parents. So pinning Save to the panel's bottom moved it from "off
//           screen" to "behind the bar" - unreachable either way - while the
//           scrim never dimmed the dock and the dock stayed TAPPABLE through
//           the modal.
//           Overlays now render at the app root (`OverlayPortal`), above the
//           navigator. Still the same window, so the blur still samples the
//           real page - that was the reason `Modal` had to go, and a portal
//           does not reintroduce it.
//           The judder had a third cause too, and it was WHEN, not what: the
//           slide started in the same commit that MOUNTED a hundred-odd views,
//           and views are created on the UI thread - the thread the
//           native-driver animation runs on. The panel is now committed off
//           screen and rises only once its content reports a layout.
//           OTA: TypeScript only, app.json stays at 0.34.0.

// v0.39.1 - v0.39.0's edit sheet was unusable, and one cause explains all four
//           symptoms reported: no scroll, the confirm hidden, nothing saveable,
//           and "it comes up in frames".
//           `BottomSheet` renders its children with NO scroll view, inside a
//           panel capped at 82 % of the window with `overflow: hidden`. Give it
//           more than that and the excess is not scrolled to - it is CLIPPED.
//           Twenty-three catalogue rows plus a Save button meant the button was
//           never on screen at all. "Hidden under the bar" is exactly what a
//           clipped sheet looks like from outside.
//           The same absence explains the stutter: with nothing bounding it,
//           the panel's height is whatever has mounted SO FAR, so it grows
//           across several frames while React commits the rows - underneath an
//           entrance animation already running on the native thread. Bounded,
//           it is one height from the first frame.
//           Fixed at both levels: `BottomSheet` gained an opt-in `scrollable`
//           (opt-in because wrapping a video or an action list in a scroll view
//           changes touch handling for no benefit), and the editor puts Save in
//           the sheet's `footer` - which existed for exactly this and was not
//           used. Anything that can outgrow the sheet scrolls; anything that
//           must always be reachable is pinned.
//           OTA: TypeScript only, app.json stays at 0.34.0.

// v0.39.0 - The medical card became editable, end to end.
//           ONE SHEET, NOT A PAGE PER CATEGORY. Asked for, and right: this is
//           picking a few items off a short list. A pushed screen per category
//           is four screens and four back buttons for a job that takes two
//           taps. `BottomSheet` already blurs the page rather than dimming it,
//           so the card stays visible behind the thing editing it.
//           THE PICKS COME FROM A SHARED CATALOGUE, chosen for cardiac care -
//           the things that change how this patient is treated, which is why
//           adhesive is on the allergy list (ECG electrodes) and pollen is not.
//           Free text is ALWAYS available: a list that cannot express the
//           patient's real answer teaches them to pick the nearest wrong thing,
//           which is then recorded as if it were true.
//           * ONLY THE EDITED CATEGORY IS SENT. A client that echoes back every
//           field it rendered reverts anything changed elsewhere since it
//           loaded - invisible on one device, inevitable with two.
//           * NOTHING IS WRITTEN UNTIL SAVE. A sheet that saved per tap would
//           change the record of somebody who opened it to look.
//           * ON FAILURE THE SHEET STAYS OPEN with the draft intact. Closing
//           would discard what was just typed and leave the patient believing
//           it was saved - the one outcome a medical record must never produce.
//           * The DEMO card has no Edit button. There is no patient behind it
//           to write to, and a button that appears to work and quietly changes
//           nothing is worse than no button.
//           Diagnoses stay read-only: they are FHIR Conditions recorded BY
//           someone ABOUT a date, and a settings sheet has none of that
//           provenance (CYPHIX_SERVER v0.3.0).
//           OTA: TypeScript only, app.json stays at 0.34.0.

// v0.38.1 - Teal lasted one release. It reads as an APP; green reads as an
//           INSTRUMENT, which is why every continuous monitor on the market is
//           green. `signal` #00A862 / #3DDC84.
//           * TWO WEIGHTS, deliberately. A green vivid enough to be worth
//           having is ~2.6:1 on white - fine for a 0.22 mm trace, unreadable as
//           12 px type. So `signal` is strokes, bars, arcs and dots, and
//           `signalInk` is anything that is words. Darkening one token until it
//           served both is exactly what made `attention` brown.
//           * The DARK-MODE baseline trace went near-white. The rule this panel
//           follows is: baseline neutral, compared study in the brand colour.
//           Keeping the report's green trace in dark would have put green
//           against green - two curves to separate by eye, in the one place
//           whose whole job is showing where they differ.
//           * The ring stopped changing HUE with confidence (accentLive ->
//           success) and changes WEIGHT instead. That distinction only worked
//           while those were blue and green; with Insights green throughout
//           they are one colour to the eye. Weight is the better encoding
//           anyway - the same thing getting more definite, which is what is
//           actually happening.
//           OTA: TypeScript only, app.json stays at 0.34.0.

// v0.38.0 - Three fixes reported from the phone.
//           THE SETTINGS LAYOUT BUG, and it was a real one. `SettingsRow` had
//           `control: { flexShrink: 0 }` - "the control keeps its natural
//           size", which is right for a Switch. Give it a long chip ("Secure
//           On-Device Processing") and the control takes the width it asks
//           for, `flex: 1` on the label column loses to a sibling that refuses
//           to yield, and the label wraps ONE CHARACTER PER LINE. A control may
//           now shrink and may never exceed half the row; nothing with a fixed
//           intrinsic size notices.
//           THE COLOURS. Insights was drawn in `accentLive` (#2F6BD8), which
//           means "live" - the streaming dot, the running trace - a generic UI
//           blue doing a job it was never chosen for, and it looked it. It is
//           the brand TEAL now (#0AA3B2 / #2DD4BF), which the whole signed-out
//           flow already carries. `accentLive` is untouched, so the report, the
//           viewer and the status dot are unchanged.
//           * `attention` stopped being brown. #B45309 was chosen to clear
//           4.5:1 as body text on white, and any amber dark enough for that IS
//           brown. The fix was structural: the accent is now only ever a
//           stroke, a border, a dot or a soft fill, and deviation text is drawn
//           in ordinary text colours - which freed the colour to be the gold it
//           should have been (#D99A2B / #F0B84A).
//           "EARLY STUDIES THAT DISAGREE" IS GONE. Defensible in the abstract -
//           the first studies weigh most, so a bad one bends the reference -
//           but on a real screen it asked the reader to judge, from a date and
//           a percentage, whether a weeks-old recording was bad. There was no
//           good answer to "what do I do with this". The model still flags them
//           and the timeline still draws them in the attention colour, so a
//           divergent early study stays findable where every study is looked
//           at; what went is a section repeating it in prose.
//           OTA: TypeScript only, app.json stays at 0.34.0.

// v0.37.0 - Two things, both asked for.
//           THE SECOND ASK IS ON BY DEFAULT, an hour later. Someone who set
//           reminders at all has said they want to be caught when they forget;
//           a reminder they slept through having no consequence is the case
//           they were guarding against. It stays one tap from Off, and a
//           measurement silences it before it ever fires, so being wrong about
//           this default costs nothing.
//           * `normalizeSchedule` now distinguishes an explicit `null` ("the
//           patient chose Off" - honour it) from a MISSING field ("written by a
//           build that had no such field" - take the default). Coercing the
//           second to null is what silently left the follow-up off on every
//           pre-existing install, which is what had somebody waiting an hour.
//           REMINDERS FITS ON ONE SCREEN. It had grown to four sections, three
//           descriptions, a subtitle and a footnote - a whole scrolling page to
//           set a notification. Now one card, and every cut followed one rule:
//           A CONTROL THAT EXPLAINS ITSELF NEEDS NO SENTENCE UNDER IT.
//             - `Off` became a SEGMENT of the follow-up control, which
//               collapsed a switch, its description and their heading into
//               nothing for identical expressive power;
//             - the two armed counts and the test button became ONE row whose
//               VALUE is the count;
//             - 17 translation keys deleted per language, not orphaned.
//           Kept: the permission warning (every control above it is a lie
//           without it) and the armed count (fact rather than intent - its
//           absence once cost an hour).
//           OTA: TypeScript only, app.json stays at 0.34.0.

// v0.36.0 — An hour was spent waiting for a follow-up that never arrived, and
//           the app could not say why. That is the real defect this release
//           fixes; the follow-up itself was probably never armed, because a
//           rollback to 0.34.0 (no follow-up at all) and a `followUpMinutes`
//           that `normalizeSchedule` reset to null both leave exactly the
//           symptom seen: primary fires, second ask does not.
//           ★ "CHECK IT WORKS" — a section reporting what the OPERATING SYSTEM
//           actually holds, read from `getAllScheduledNotificationsAsync`.
//           Every other reading on that screen described INTENT (the switch,
//           the times, the next one due), and intent was never what was in
//           doubt. Two numbers would have answered the question in seconds.
//           ★ "SEND A TEST NOW" — the real primary in 10 s and the real
//           follow-up 70 s later, through the same content, category and
//           actions. Not a mock: if the test works and the scheduled one does
//           not, the difference is timing rather than plumbing. A feature whose
//           shortest honest interval is thirty minutes is otherwise close to
//           untestable, which is how an hour gets spent.
//           THE FOLLOW-UP NOW REPEATS — three times, ten minutes apart, all
//           carrying the same `due` so one Done or one measurement cancels the
//           chain rather than the next one only. One notification on a lock
//           screen is one chance to be looking at the phone.
//           ⚠️ Which forces a BUDGET: iOS keeps at most 64 pending
//           notifications and silently drops the rest, and 4 slots × 7 days × 3
//           repeats is 84. Occurrences are armed in TIME ORDER until the budget
//           is spent — tonight matters, next Tuesday's third repeat does not.
//           Android follow-ups get their own HIGH-importance channel. The
//           primary stays DEFAULT: it is a routine nudge at a time the patient
//           chose, and nothing this app produces is urgent by construction. The
//           follow-up is different, and the difference is consent — they
//           switched on a thing whose whole job is to catch a miss.
//           OTA: TypeScript only, app.json stays at 0.34.0.

// v0.35.1 — ⚠️ v0.35.0 CRASHED THE APP ON EVERY NAVIGATION. Rolled back to the
//           embedded 0.34.0 bundle within minutes; this is the fix.
//           WHAT HAPPENED. v0.35.0 added `schedule.followUpMinutes`. Every
//           existing install had a schedule PERSISTED BY v0.34, which has no
//           such field — and `hydrate` was `{ ...state, ...payload }`, which
//           replaces a nested object WHOLESALE, so the default never applied.
//           It came back `undefined`; `undefined !== null` passed the "is the
//           follow-up on?" guard; `new Date(NaN)` was built; and an Invalid
//           Date is TRUTHY, so it also survived `if (!followUpAt) continue`.
//           Handing it to the OS scheduler threw, inside a `void (async …)()`
//           with no catch — an unhandled rejection. `useReminders` is mounted
//           by the Tests TAB, so it re-fired on any navigation.
//           FIXED IN FOUR PLACES, because any one of them alone would have
//           left the next version of this bug live:
//             1. `hydrate` MERGES nested objects and runs the schedule through
//                the new `normalizeSchedule` — the root cause. What is on disk
//                was written by a different program and is untrusted input.
//             2. `normalizeSchedule` (shared) validates types and ranges, so
//                every optional field has exactly one absent value.
//             3. The scheduler checks `Number.isFinite(date.getTime())` rather
//                than truthiness, and `safely()` wraps every call into
//                expo-notifications.
//             4. Every `void (async …)()` in the feature now catches. A
//                reminder that fails to arm is a reminder that does not
//                arrive; it must never be an app that dies.
//           Verified against the exact crashing blob plus fourteen other
//           malformed shapes, and the nine behaviour cases still pass.
//           ★ THE LESSON, worth more than the fix: a persisted shape is
//           untrusted input, and `x !== null` is not a null check when the
//           value can be `undefined`.

// v0.35.0 — Two additions to reminders, both asked for.
//           THE SECOND ASK. Set a reading for 19:00 and, if nothing is in your
//           history by 20:00, the phone asks once more. The word doing the work
//           is IF: a patient who measured at 19:12 must not be nudged at 20:00
//           about the thing they already did, and nothing erodes a reminder
//           faster than being wrong about what you already know. A reading up
//           to 45 min EARLY counts too — 18:50 is the evening reading.
//           ⚠️ THE TWO KINDS ARE ARMED DIFFERENTLY, AND HAVE TO BE. The primary
//           reminder is a repeating DAILY trigger: it fires whether or not this
//           app has run in a month, and that guarantee is the feature. The
//           follow-up cannot be, because it is CONDITIONAL — nothing can
//           evaluate "did they measure?" while the app is closed. So it is
//           armed as DATED one-shots, a week ahead, and simply not armed where
//           a recording already answers it (cheaper than cancelling later, and
//           it works for a reading taken on another device and synced here).
//           The honest cost: follow-ups exist only as far ahead as they were
//           armed. Re-armed on every launch and after every recording, so a
//           patient would have to ignore the app for a week to lose them — by
//           which point the primary reminders, which never stop, are the thing
//           doing the work.
//           SNOOZE / DONE on the notification, so it is something the patient
//           ACTS on rather than only swipes away. Neither opens the app: the
//           whole point of "not now" is that it costs nothing. Done cancels
//           that occurrence's second ask — matched on the slot AND the date it
//           was due, because the same slot has a follow-up armed for each of
//           the next seven days and cancelling all of them would silence the
//           rest of the week.
//           ⚠️ ALSO FIXES A LATENT RACE. `useReminders` is mounted in three
//           places and Settings + Reminders are on screen together whenever the
//           editor is pushed, so two concurrent cancel-then-set passes could
//           interleave and leave duplicates or nothing. Every apply now goes
//           through a queue. It would have presented as "sometimes I get two",
//           which is close to impossible to reproduce on purpose.
//           Copy stays neutral by rule: no "you missed", no "you still
//           haven't". The app does not know why, and a reminder that scolds is
//           a reminder that gets switched off.
//           OTA: TypeScript only — `expo-notifications` is already in the
//           0.34.0 binary, and categories and actions are runtime calls into
//           it. app.json stays at 0.34.0.

// v0.34.2 — The boot splash was navy with the full lockup. It is now the CYPHIX
//           WORDMARK on white — the web's session-restore splash (`AuthGate`),
//           not its blob-and-orbit `LoadingScreen`. The distinction was the
//           user's and it is the right one anyway: this screen exists because a
//           disk read is in flight, which is a fraction of a second and is not
//           an occasion. Keeping the theatrical version for somewhere it is
//           earned is what keeps it meaning something.
//           Wordmark rather than `BrandLogo`: the lockup adds the mark and
//           "MEDICAL", which is full identification — right on a report, where
//           the issuer of a clinical document must be unambiguous, heavy on a
//           screen that is up for under a second.
//           ⚠️ The status bar flipped to DARK glyphs with it. Light ones were
//           correct on navy and are invisible on white, and nothing in a
//           typecheck, a bundle or expo-doctor catches that.
//           The splash floor dropped 1700 → 900 ms: 1700 existed so the old
//           ENTRANCE ANIMATION could finish, and that animation is gone. The
//           only job left is not flickering. Leaving it would have been a magic
//           number whose reason had been deleted out from under it.
//           The version line stays — with OTAs landing several times a day it
//           is the fastest honest answer to "did my change reach the phone?" —
//           but moved from `muted` to `label`, because #B3BCC9 at 75 % on white
//           is a line that is in the render tree and not on the screen.

// v0.34.1 — The reminder editor was a bottom sheet, and it read as small and
//           improvised on the phone. It was the wrong container: on iOS a
//           settings row with a chevron PUSHES a panel, and a sheet is for a
//           quick action or a single pick — not for a switch, a segmented
//           control, a list of times and an inline wheel.
//           It is a pushed route now (`Reminders`), which also gets it the
//           native slide transition, the edge-swipe back and as much height as
//           it needs. Built from Settings' OWN `SettingsSection` /
//           `SettingsRow` and the same page metrics — not for code reuse, for
//           CONTINUITY: it is reached from Settings and is part of it, so a
//           bespoke layout would announce itself as somewhere else. Looking
//           like the screen it came from is most of what "native" means here.
//           The two switches also collapsed into one ON THIS SCREEN: the
//           master switch and the schedule cannot usefully differ here, and a
//           patient facing two toggles that both say "reminders" has to work
//           out which is which. They stay separate in the model, so silencing
//           still does not forget the times.
//           OTA: TypeScript only, so app.json stays at 0.34.0 — the runtime
//           the installed build listens on.

// v0.34.0 — Reminders. The patient picks how many measurements a day and at
//           what times; the phone notifies them, every day, whether or not
//           this app has been opened since.
//           WHERE IT LIVES. The Settings row `testReminders` already existed
//           as a switch that stored a boolean and did nothing — it is now the
//           real thing, and the row itself opens the schedule. The two stay
//           SEPARATE settings: the switch answers "may this app remind me at
//           all", the schedule answers "when". Folding them into one would
//           mean a patient silencing reminders for a fortnight lost the times
//           they had chosen. The Tests tab's badge said the static word
//           "Scheduled"; it now prints the actual next reminder, because that
//           circle is where someone looks to ask when they are meant to do
//           this.
//           HOW IT FIRES. `SchedulableTriggerInputTypes.DAILY` — a repeating
//           trigger handed to the OS. Deliberately NOT a background task: a
//           patient who has not opened the app in a week would silently stop
//           being reminded, which is the one failure this feature cannot have.
//           The stored schedule is the truth and the OS is a projection of it,
//           re-applied on mount — which also fixes a bug that would otherwise
//           be invisible, since a notification's words are baked in when it is
//           scheduled and a patient switching to Hebrew would keep being
//           reminded in English.
//           The schedule SHAPE is in `@cyphix/shared` (`types/reminder.ts`):
//           it is a statement about a patient's care, not a handset setting —
//           it has to survive a new phone and be legible to the web. Times of
//           day, never instants, so flying does not move anyone's reminders.
//           Nothing in it recommends how often to measure; four a day is a UI
//           bound, not advice.
//           ⚠️ THIS RELEASE IS A NATIVE REBUILD, NOT AN OTA. `expo-notifications`
//           and `@react-native-community/datetimepicker` are native modules, so
//           `app.json`'s version moved to 0.34.0 WITH this file — the only
//           situation in which the two travel together (mobile CLAUDE.md
//           §5A.2). Every OTA after this one must be published while app.json
//           still reads 0.34.0, or it targets a runtime no installed build has
//           and reaches nobody, silently.

// v0.33.3 — The sheet ran FLUSH to the display, which was fine while its
//           corners were square and wrong the moment they were rounded: a
//           curve ending against the screen edge does not read as a corner, it
//           reads as the grid spilling off the screen. It now stops
//           `SHEET_MARGIN` (10 pt) short on each side — half the page's own
//           20 pt margin, so the sheet is still visibly wider than everything
//           around it while being a rectangle you can actually see the shape
//           of. "Almost the full width", which is what was asked for.

// v0.33.2 — The full-bleed ECG grid ended in hard 90° corners. Rounded now, at
//           the app's own radii (lg for the signature, md for the smaller
//           rejected-beats sheet — radius scales with the surface).
//           ⚠️ Done as an SVG `ClipPath`, NOT `overflow: 'hidden'` +
//           `borderRadius` on the wrapping View. Clipping a native SVG child
//           to a parent's rounded corners is one of the places iOS and Android
//           have historically disagreed, and a corner that is round on one and
//           square on the other passes typecheck, both bundles and doctor. The
//           radius converts points → millimetres through the sheet's own
//           scale, so the curve reads the same at any width, and each sheet
//           gets a `useId` clip id because Android resolves `url(#…)` per
//           document — two sheets sharing one would clip to whichever mounted
//           last. The lead label and the scale caption moved in to 20 pt so
//           they clear the arc instead of floating loose in it.

// v0.33.1 — • THE EDGES WERE BEING CUT, lead label included. Not a padding
//             mistake: a negative margin cannot escape a ScrollView, because
//             RN clips a scroller's children at its own frame — so making the
//             child wider than the scroller simply lost the overhang. The
//             SCREEN now bleeds (`PatientShell.bleedHorizontal` +
//             `shellPaddingH`), History applies the side padding per element,
//             and the ECG cancels it with a negative margin that finally has
//             room to go.
//           • "LATEST STUDY" IS GONE AS A SECTION. It repeated the timeline's
//             last bar — same date, same match figure — so the duplication was
//             the whole complaint. The chart is now a PICKER: tap any bar and
//             the detail under it changes, defaulting to the newest. The
//             deviation chips survived because they are the only place the
//             actual answer lives, and the beats that study left out moved in
//             beside them. Tapping a bar no longer navigates (the detail row
//             does), which also makes the older studies inspectable rather
//             than only openable.
//           Still an OTA: TypeScript only, app.json stays 0.30.0.

// v0.33.0 — Three reports, one cause: it was still drawn INSIDE things.
//           • THE BOX RESIZED. Height and gain were derived per lead from that
//             lead's own amplitude, so every lead drew a different rectangle
//             and dragging the builder resized it under the finger. Both are
//             now chosen ONCE from the tallest lead in the identity and handed
//             in — one gain, one channel height, every lead, which is what a
//             real 12-lead sheet does. A small lead now draws as a small trace
//             in the same box: true, and information. A lead scaled to fill its
//             own box is the picture that lies.
//           • THE WHITE RECTANGLES ARE GONE. White ECG paper, inside a white
//             card, on a grey page — three nested rectangles, which is how you
//             announce a picture pasted into a layout. Sections are now a
//             small-caps label, their content and a full-bleed hairline; the
//             trace is drawn on the app's own background with the grid as a
//             faint brand tint. The REPORT keeps its paper: that is a document
//             with real edges, this is an instrument panel on a screen.
//           • THE ECG GOT THE WIDTH. It runs edge to edge now — the bleed is
//             MEASURED (screen width − content width) rather than hard-coded,
//             so it cannot drift from the shell's padding on a device nobody
//             tests on. And the prose behind it was cut to one line per
//             section; what survived is what the screen cannot say without
//             words: what a difference IS, and the disclaimer.
//           Also: baseline figures are a plain row rather than bordered tiles
//           (five numbers, not five controls), and the compare toggle lost its
//           button chrome.
//           Still an OTA: TypeScript only, app.json stays 0.30.0.

// v0.32.0 — Insights reworked on device feedback. It looked, correctly, like a
//           landing page rather than an ECG system, and it was static.
//           WHAT WAS WRONG, IN THE ORDER IT WAS SAID:
//           • A green ESTABLISHED capsule beside a 24 pt headline. Green means
//             "pass"; a baseline existing is not a pass and this layer may not
//             grade anything. State is now a letterspaced small-caps line, the
//             register an instrument labels itself in. No status colour at all.
//           • "Confidence 48%" printed THROUGH the ring. A Text in a flex row
//             does not wrap — it overflows — and that column had no
//             `flexShrink`. Fixed, and the ring stopped being frozen at 5/5
//             forever: segments while enrolling (a countable target), a
//             continuous arc for agreement once established.
//           • Red. On a medical device red means alarm — act now — and a
//             distance from your own baseline is a measurement, not a verdict.
//             It made people tense before they had read what it referred to,
//             which is a colour interpreting on a layer forbidden to. New
//             `attention` amber token; `danger` stays for destructive actions.
//             The chips also gained a sentence saying what a difference IS: a
//             number nobody can interpret is worse than no number.
//           • A grey band under the content, over the dock. The shell reserved
//             the dock's footprint as padding, so the page ENDED above the bar
//             and the strip it floats over was bare — which also left the
//             frosted bar with nothing to refract. The clearance moved onto
//             the scroll views' content insets; the page now passes behind it.
//           WHAT IS NEW:
//           • A CALIPER on the signature. Tap or drag and a line follows the
//             finger, ticking once per small square, reading out time from R,
//             the baseline in mV and the width of your own range there — in
//             the chrome, never on the paper it would cover.
//           • A BUILDER: drag the track and the baseline assembles study by
//             study under your finger, one haptic tick each. It is the only
//             control that EXPLAINS the feature instead of describing it.
//             ⚠️ It was written claiming the band tightens as studies are
//             added. Measuring it said otherwise — 0.021 → 0.028 mV, then
//             flat. The corridor is a prediction interval, not a standard
//             error, so it converges on real variability rather than
//             shrinking. The honest story is better and is what ships: after
//             one study the narrow band is a single measurement dressed as a
//             range, and watching it fill out is the app learning how much
//             you vary.
//           • The REJECTED beats are kept (TEMPLATE_VERSION → 2) and drawn on
//             the accepted beat's own axes with why each went. "3 beats were
//             not used" asked for trust on the decision that most shapes the
//             result; now it is checkable.
//           Still an OTA: TypeScript only, app.json stays 0.30.0.

// v0.31.0 — History got a second tab, and with it the feature the app did not
//           have: a way to answer "has anything CHANGED?".
//           A list cannot answer that. It is a question about every study at
//           once, and a list is read one row at a time — so the forty rows hold
//           the answer and never show it.
//           ECG ID. Every eligible study is reduced to its REPRESENTATIVE BEAT
//           (the median of ~12 beats, ectopics rejected, cross-correlation
//           realigned before averaging), those are fused into one weighted
//           baseline, and every study is then scored against it. The clinical
//           point is the part a textbook range cannot give: a QRS of 104 ms is
//           unremarkable for a population and may be a 16 ms change for THIS
//           person. Doing it by hand — pull the old traces, lay them on top —
//           is how that is caught today; this just does it every time and keeps
//           the arithmetic afterwards.
//           The early studies weigh most, exactly as a fingerprint enrollment
//           does — and BECAUSE they do, an early study that disagrees with its
//           own cohort is flagged by name instead of absorbed.
//           ⚠️ TWO REAL DEFECTS were found by running the algorithm on
//           synthetic cohorts before shipping, and neither would have been
//           found by reading it:
//             • as a weighted MEAN, five consistent studies plus one bad one
//               ended with the FIVE excluded and the ONE as the baseline. An
//               estimator an outlier can pull cannot be used to find that
//               outlier. The provisional baseline is now a per-sample weighted
//               MEDIAN;
//             • the amplitude ratio fired `marked` on the small derived leads
//               (III, aVL) for ordinary session-to-session variation. It now
//               needs an absolute floor as well as a ratio.
//           This is an OTA: TypeScript only, no native module added, so
//           `app.json` stays at 0.30.0 (mobile CLAUDE.md §5A.2).
// v0.30.0 — The Tests tab stopped being a placeholder and became the web's test
//           PICKER. One circle owns the screen instead of the web's 3-up grid,
//           because the photograph is the interface here and a thumbnail is not
//           a photograph. Two tests, at the user's instruction: 6 limb leads or
//           the full 12.
//           ⚠️ THIS RELEASE IS A NATIVE REBUILD, NOT AN OTA. `expo-video` was
//           added for the explainer clips, and `app.json`'s version was bumped
//           to 0.30.0 WITH this file — which is the ONLY situation in which the
//           two move together (mobile CLAUDE.md §5A.2). Every OTA after this one
//           must be published while app.json still reads 0.30.0, or it targets a
//           runtime no installed build has and reaches nobody, silently.
// v0.29.0 — The app was online-first: every screen waited for the network to
//           re-send data the phone had already been given, and in a lift or a
//           basement it had nothing to show at all. An ECG recording is
//           IMMUTABLE — the trace measured last Tuesday is the same trace
//           forever — so re-downloading it was pure waste, every cold start,
//           for the life of the device.
//           Inverted. The phone now keeps its own durable copy and renders
//           from it at once; the network's only job is to answer "what
//           changed?". Two mechanisms, chosen per resource and both defined in
//           `@cyphix/shared` `api/sync.ts` so the server and every client
//           agree on what "unchanged" means: a CURSOR DELTA for recordings
//           (changed rows + tombstones, usually an empty answer), and
//           ETag → 304 for the medical card and the portrait (the portrait is
//           the largest thing the app downloads; a revalidation is now ~200
//           bytes and the server does not even decrypt it).
//           The split that makes it safe: `offlineBaseQuery` READS from the
//           device and never judges freshness; `syncEngine` REFRESHES on
//           sign-in, on foreground and on pull-to-refresh, writes to disk
//           FIRST and only then invalidates the RTK tag — so the refetch it
//           causes reads the new state instead of racing it. No polling, no
//           timers: a phone in a pocket has nothing to learn.
//           Heavy payloads (waveforms, portrait) are FILES under the documents
//           directory; metadata and cursors are AsyncStorage. Deliberately no
//           `expo-sqlite`: a native module cannot reach an installed build
//           over the air (root §5, and the v0.27.x channel trap), and this had
//           to be an OTA. The API is written so SQLite can replace it the day
//           History needs real queries.
//           ★ One account per device's cache. `claimCacheFor` runs inside the
//           boot splash, BEFORE the app can render, and wipes documents,
//           mirror and cursors together if the signed-in account changed —
//           a shared phone must not show one patient a single frame of
//           another's record. Signing out keeps the cache: same person, same
//           device, and the tokens (what actually grants access) are cleared
//           regardless.
//           Writes are unchanged: they still go to the server and still fail
//           when it cannot be reached. There is no offline write queue — see
//           PARITY.md, where it is a tracked row rather than a silence.

// v0.28.0 — "Preview as role" ported from the web's Settings page, which had
//           been listed as NOT ported because there was no real role to switch
//           away from until connected mode landed a real principal.
//           `auth.debugRole` is applied in ONE place — `useCurrentUser`, where
//           the principal is resolved — so every `can()` and every gate in the
//           app follows it without knowing it exists.
//           ★ It grants NOTHING, and the row says so on screen. The server
//           authorises against the session's REAL role, so previewing `admin`
//           on a patient account draws the admin affordances and each request
//           behind them returns 403. That is the honest demonstration and the
//           reason this is safe to ship rather than hide behind a build flag.
//           Two deliberate limits: `id` and `linkedPatientId` are never
//           swapped — doing so would make the app read and write a DIFFERENT
//           PATIENT'S record, which is not a preview but a data-integrity bug —
//           and the override is cleared on sign-out, so a preview cannot
//           outlive the account it was chosen on and silently apply to whoever
//           signs in next. `guest` is not offered: it is the signed-out
//           principal, and previewing it from a screen that only exists behind
//           sign-in would draw a shell with no way out. Tapping the active
//           role clears the override, so there is always a way back without
//           knowing which role was real — and while a preview is on, the
//           actual role is printed beneath the picker.

// v0.27.4 — Sign-in kept failing with credentials that work in the browser,
//           because the phone was still offline: the OTA carrying the API URL
//           never arrived. `eas update --auto` derives the branch from the
//           GIT BRANCH (`master`), and a new branch auto-links to a channel of
//           the SAME NAME — but the installed build was made with the
//           `production` profile and listens on channel `production`. So the
//           update published successfully to a channel nothing subscribes to.
//           No error, no delivery. `--auto` is only correct when branch names
//           already match channel names; here the branch must be named
//           explicitly (`--branch production`), and CLAUDE.md §5A.1 said
//           `--auto` — that was wrong and is corrected.
//           This bump exists to be VISIBLE: with the badge unchanged there was
//           no way to tell a failed delivery from a delivered-but-broken app,
//           which is exactly the confusion that cost this round. Version.ts is
//           bumped, app.json's version deliberately is NOT (§5A.2 — that would
//           change runtimeVersion and orphan the update all over again).

// v0.27.0 — The route to a REAL BLE signal on an iPhone, rebuilt around the
//           fact that the borrowed MacBook is Intel on a macOS too old for
//           Xcode 16.1 (SDK 54 / RN 0.81), which Apple gives no way around.
//           A paid Apple Developer account was bought instead, and that turns
//           §9.3's escape hatch into the main road: `eas.json` (new) has EAS
//           compile modules/cyphix-ble on Expo's macOS runners, driven from
//           Windows. ★ The asked question was "how do we do this with Expo
//           Go" — and the answer is that it CANNOT: Expo Go is a prebuilt App
//           Store binary containing only Expo's own native modules, so
//           `requireOptionalNativeModule('CyphixBle')` is null there by
//           construction and bleClient falls back to the simulator forever.
//           That is why only a demo signal was ever seen; nothing in the ECG
//           path was broken. The paid tier specifically buys the SIGNING
//           credentials — EAS builds for free accounts too, but installing on
//           a physical iPhone needs ad-hoc or App Store provisioning that
//           Apple issues only to Program members.
//           Three profiles: `production` → TestFlight (valid a YEAR, not the
//           free tier's 7 days), `preview` → straight to the phone by QR for
//           fast hardware iteration, `development` → dev client + Metro.
//           `appVersionSource: remote` + `autoIncrement` because TestFlight
//           refuses a build number it has already seen, and learning that
//           after a 20-minute cloud build is an expensive way to learn it.
//           app.json `version` was still the 0.1.0 scaffold — it is the
//           string App Store Connect shows, so it now tracks this file.

// v0.26.0 — Reported from the phone: the sign-in photograph and the START TEST
//           guide pictures arrive seconds late, "and they should be part of
//           the build". They ARE part of the build — but only in Release. In
//           Expo Go and in a Debug dev build a `require`d asset is not in the
//           app at all: `resolveAssetSource` returns an http URL on the dev
//           machine and RN fetches it over Wi-Fi the first time the <Image>
//           renders, queued behind Metro serving a 5.7 MB JS bundle. v0.22.0
//           warmed the welcome photograph inside the splash and stopped there,
//           because that was the one that had been reported — so the three
//           measurement guides were still first requested at the exact tap
//           that shows them. There is now ONE registry of every bundled
//           photograph (services/media/imagePreload.ts), warmed together, and
//           started at App.tsx MODULE scope rather than from an effect:
//           AuthGate mounts behind PreferencesGate's storage read, so by the
//           time it ran, part of the 1.7 s of splash the fetches are meant to
//           hide inside was already spent. Each image is prefetched
//           independently — a single try/catch around a sequence of awaits
//           would let one rejection abandon every image after it. No new
//           dependency and no change to any screen's rendering.

// v0.25.3 — Reported from the phone: on Profile, the camera badge on the
//           portrait is cut off by the circle of the picture itself, and it
//           should be ABOVE it. It was, exactly, and the cause is one style
//           doing two jobs: `styles.avatar` carried `borderRadius: 34` +
//           `overflow: 'hidden'` — which it needs, or Android draws a square
//           photo inside a round border — AND it was the Pressable the badge
//           lived inside. A round mask crops every child, and the badge is a
//           child at the corner of the square, which is precisely the region
//           the circle excludes. The comment above it even said so, and
//           "positioned inside the circle's edge" was the workaround, not a
//           fix: the badge was pulled in until only its own corner was lost.
//           The mask is now its own inner view and the badge is its SIBLING,
//           so it is painted after the circle and rides on top of it whole.
//           The Pressable stays 68×68 and no longer clips — deliberately the
//           same size, so the badge still lands inside its parent's bounds:
//           a child drawn outside its parent is not reliably rendered on
//           Android, and the square's corner is outside the circle but inside
//           the square. Nothing about the tap target, the RTL side or the
//           busy indicator changed.

// v0.25.2 — Corrects v0.25.1, which overreached. Asked to remove the moment
//           the corner leaned out at the upper left, it ALSO pulled every
//           radius toward 50 % — and that traded away one of the best shapes
//           in the set to fix a moment. "You gave up one of the nicest shapes;
//           I only asked to get rid of the start."
//           The `excursion` knob is gone from `blobShape.ts` and the keyframes
//           are the CSS's again, whole and untamed. The 75 % frame's tight
//           top-left corner is BACK, deliberately.
//           What stays is the half of v0.25.1 that was the actual bug: the
//           morph clock free-ran from mount while the idle blob was the 0 %
//           frame held still, so connecting JUMPED the outline to wherever the
//           clock had drifted — landing straight on that corner if the timing
//           fell that way. The clock now starts with the connect, at zero, so
//           the cycle is walked in order and the eye is LED into that corner
//           six seconds later instead of being dropped on it.
//           The lesson, written down because it is easy to repeat: an
//           extreme that is arrived at wrongly is a timing bug. Sanding the
//           extreme down makes the symptom go away and takes the design with
//           it.

// v0.25.1 — "Right at the start, the vertex at the upper left goes out of
//           proportion." Measured, and it is exactly there: sampling the
//           outline across the whole 8 s cycle, the single worst point is the
//           TOP-LEFT corner at the 75 % keyframe — 7.6 px OUTSIDE a circle of
//           the same box, while the top-right corner of that same frame is
//           7.8 px INSIDE it. A 15.3 px swing across the top of a 150 px blob
//           is the top visibly ceasing to be round. It is the only keyframe
//           whose corner is small in BOTH axes (35 % × 42 %).
//           TWO causes, both fixed:
//           1. The morph clock FREE-RAN from mount while the idle blob was
//              the 0 % frame held still. So at the instant of connect the
//              outline jumped from the rest shape to wherever the clock had
//              drifted — and if that was near 75 %, the corner arrived out of
//              nowhere already at its tightest. The clock now starts WITH the
//              connect, at zero, so the morph begins at the shape on screen.
//           2. `blobPathAt` takes an `excursion`: every radius is pulled
//              toward 50 % by it. Safe per radius because each opposite pair
//              in every keyframe sums to exactly 100 — which is what keeps a
//              border-radius shape free of straight edges — so scaling a
//              complementary pair by the same factor keeps the sum at 100.
//              At 0.5 the worst deviation drops to 3.7 px out / 3.9 px in:
//              always almost a circle, never a perfect one.
//           The excursion is REACHED over the 1.2 s fill rather than applied
//           flat, so the idle shape stays the exact CSS one and the blob
//           rounds out as it becomes a button.

// v0.25.0 — "It isn't that pretty, and it isn't clear it's a button to press."
//           Both halves of that are the same defect. The connected orb was a
//           NAVY SHAPE WITH A CAPTION UNDER IT, and a caption under a picture
//           is a caption: the composition named the action somewhere the eye
//           does not go looking for a control, and put decoration — the white
//           morphing core, read as a heart — where the action should be.
//           So the middle now carries the action:
//           • the white morphing core is GONE. The grey idle core it grew out
//             of now expands ~55 % as it dissolves, so the dot reads as
//             opening INTO the label rather than being swapped for it.
//           • a play glyph + the button's own words sit inside the blob, in
//             white on the brand navy, arriving at 45 % of the 1.2 s fill —
//             colour first, words second, because two things changing at once
//             read as one blurry event.
//           • the blob casts a real navy drop shadow. A shape printed flat on
//             the page is an illustration; a shape ABOVE the page is a button,
//             and that is the oldest signal there is. Cast in navy, not black:
//             a grey shadow under a navy shape reads as dirt.
//           • the caption below COLLAPSES as the words move inside, so the
//             action is never named twice — animated, so nothing snaps.
//           The DISCONNECTED state is deliberately untouched at the user's
//           instruction: same grey blob, same white disc, same core, same
//           caption. The connect transition is now the whole change.
//           ⚠️ The Skia canvas is deliberately BIGGER than the orb
//           (BOX = ORB + 2·PAD): a drop shadow is drawn into the canvas's own
//           pixels, so a canvas cut to the blob's size clips it away. The orb
//           box carries `marginVertical: -PAD` so the extra pixels cost the
//           layout nothing and every gap around it is what it was.

// v0.24.3 — "WHY CAN'T IT BE SLID BETWEEN ALL THE ICONS?" — and the answer is
//           that it never could be slid at all. The confirmed diagnosis, from
//           Settings › About reading `Apple Liquid Glass (iOS 26+)`: the
//           material is live and real, so what was left was the gesture.
//           v0.24.0 moved the highlight on TOUCH-DOWN, and a `Pressable` owns
//           its touch from the moment it starts and NEVER re-targets — that is
//           what a press is. So the only tab a finger could ever reach was the
//           one it landed on; sliding towards a neighbour did nothing, and the
//           one tab that appeared to work was simply the one being tapped.
//           Re-targeting has to be decided by something that can see all five
//           tabs, so it is now ONE Pan gesture on the bar: slide and the pill
//           follows continuously through every tab, with a selection tick as
//           it passes each one (`selectionAsync` — the picker-wheel event, not
//           an impact, because this is scrubbing), staying swollen the whole
//           time so the thing under the finger is visibly the thing being
//           moved. Release commits wherever it ended.
//           Taps are untouched: the pan needs 6 pt of travel first, so below
//           that the `Pressable` still owns the touch and behaves exactly as
//           before — which also keeps every tab a real accessibility button.
//           `runOnJS(true)` on purpose: every effect of this gesture is a
//           React state update or a haptic, both JS-thread things anyway, and
//           running the callbacks there makes ordering against the pressable's
//           cancellation deterministic instead of a race. It costs nothing per
//           frame because updates are filtered to actual index changes — at
//           most four setStates across a full sweep.
//           This closes the "**Not ported:** the drag-the-pill gesture" note
//           that has been sitting in PARITY's dock row since v0.2.

// v0.24.2 — From a suggested "custom tab bar button with a spring" pattern.
//           Most of it this dock already had and has had for releases — it is
//           wired with `tabBar={}` (RootNavigator:96), which replaces the WHOLE
//           bar, so `tabBarButton` is never consulted by React Navigation at
//           all; `DockItem` IS the custom button, and the spring, the growing
//           backdrop and the haptics are all in. But one thing in it was real
//           and missing: **selection had no moment of its own.** The pill slid
//           and the icon filled — both STATES, not events — so committing a tab
//           felt like the bar catching up rather than like the tap doing
//           something. The tab that lands now pops its icon and label: timing
//           up (110 ms, identical every time), spring back (the only part that
//           should feel physical). Not on first paint — an app that pops its
//           tab bar while opening is announcing something nobody did.
//           ★ On the CONTENT, not on the pill, and that is arithmetic not
//           taste: the pill's scale already carries the press swell, and a hold
//           released on the OUTERMOST tab would put 1.13 and 1.10 on one
//           transform — wide enough to be cut by the bar's rounded cap. Content
//           pops inside its own item box, where nothing can clip it.
//           NOT taken from the suggestion: a per-tab translucent halo at 20 %
//           white. That is exactly the bug v0.24.1 was spent on — a highlight
//           defined relative to the material under it disappears the moment the
//           material changes. And not a persistent 1.15 scale on the selected
//           tab: at 68.9 pt of item width a permanently enlarged label is a
//           truncated label in every language, and Hebrew truncates first.

// v0.24.1 — v0.24.0 ERASED THE CURRENT-TAB INDICATOR, and the cause is worth
//           more than the fix. The pill was a TRANSLUCENT white (0.85 / 0.16).
//           It was never visible in its own right — it was visible *because it
//           was brighter than the bar*. So when the same release made the bar
//           glassier (tint 55 % → 32 %, rim removed) to look more like the
//           system's, the pill lost the only thing it was contrasting against
//           and the dock stopped showing which tab you were on. The dock's own
//           dressing destroyed the one thing it exists to show, and every
//           check available on this machine passed while it did.
//           The pill is now a SOLID colour, and it is THE SAME CONSTANT the
//           active icon's inner details are cut out in. Those two were always
//           required to match — the cut-outs sit directly on the pill — and
//           while they were merely similar they drifted with every change to
//           the bar. Now they cannot. Plus its own hairline and small shadow,
//           so it reads as a puck ON the bar rather than a lighter patch OF
//           it, which is what a system segmented control does.
//           ★ `isInteractive` IS OFF THE BAR. Reported as "no glass effect
//           like iOS has to offer". It was the one prop flagged as
//           unverifiable from Windows, and it was applied against its grain:
//           Apple's interactive glass is for a button-sized control inside a
//           glass container, not for a whole bar. The hold-and-swell is
//           Reanimated and never depended on it, so nothing was lost.
//           The rim is back too — softer on the glass path. A floating object
//           with no edge stops reading as an object over a pale backdrop.
//           ⚠️ TWO CAUSES OF "IT DOESN'T LOOK LIKE GLASS" ARE NOT IN THE DOCK.
//           (1) The phone may have no Liquid Glass at all: it needs iOS 26+
//           AND `expo-glass-effect` inside the running client. Settings ›
//           About now NAMES the material that resolved, because from a
//           Windows machine that question is otherwise unanswerable and
//           guessing at it costs a release each time.
//           (2) A material needs something BEHIND it. Apple Music's bar looks
//           like glass because artwork and lists scroll under it; this dock
//           floats over a soft flat backdrop, and glass with nothing to
//           refract renders as a plain translucent plate however it is tuned.
//           Same lesson as the blur inside a `Modal` (v0.18.0).

// v0.24.0 — THE BOTTOM DOCK STOPS BEING A PICTURE OF GLASS. It was already
//           Apple's Liquid Glass on iOS 26 and still did not feel like the
//           system's tab bar, and the reason is that glass on iOS is not a
//           LOOK — it is a material that answers your finger. Three things
//           were missing; all three are in.
//           (1) THE MATERIAL RESPONDS. `GlassSurface` gains an opt-in
//           `interactive`, which is Apple's own `UIGlassEffect.isInteractive`:
//           the glass brightens and its specular highlight tracks the touch.
//           Opt-in on purpose — a sheet you only READ that lights up because
//           a finger crossed it is noise. The dock is the one surface in the
//           app that IS the control, so it is the one caller.
//           (2) THE HIGHLIGHT FOLLOWS THE FINGER. Touch any tab and the pill
//           travels there at once; release commits, slide off and it springs
//           home. The lit icon now follows the PILL rather than the navigator
//           — which is not cosmetic: the filled icon's inner details are cut
//           out in the PILL's colour, so an icon left lit after the pill has
//           moved away would have its cut-outs sitting on glass. Screen
//           readers still hear the navigator's truth, not the preview.
//           (3) HOLD AND THE GLASS GROWS — the thing that was actually asked
//           for. Touch swells the pill 5 %, holding past 220 ms swells it 13 %
//           with a heavier haptic and grows the icon and label with it.
//           220 ms, not `delayLongPress`'s 500: that default is a threshold
//           for long-press MENUS and is far too slow to read as the surface
//           reacting to being held. And the swell is Reanimated, so ANDROID
//           GETS THE GESTURE even though only iOS 26 gets the material — the
//           material may differ per platform, the interaction may not.
//           ★ The pill is deliberately NOT a `GlassView` itself.
//           `UIGlassContainerEffect` MERGES nearby glass into one shape — that
//           is what the container is for — so glass-on-glass would dissolve
//           the pill into the bar and the selection indicator would stop
//           existing. Apple's own tab bar is one glass bar with a solid-ish
//           capsule riding on it, which is exactly what this is.
//           On iOS the bar also drops the hand-drawn 1 px rim (the material
//           lights its own edge; a second one is the tell that it is fake) and
//           takes a 32 % tint instead of the web's milky 55 % plate. The
//           border WIDTH stays, so `dockMetrics.DOCK_BAR_HEIGHT` is still
//           honest. Android keeps the web's values — an untinted BlurView over
//           a light page really is invisible (the v0.19.2 trap).
//           🔬 Unverified on a handset: the swell geometry is arithmetic
//           against the bar's `overflow: hidden` (60.0 pt inside a 65.1 pt
//           inner box), and `isInteractive` on a whole BAR rather than on a
//           button is the one judgement call here — if the entire bar bulges
//           instead of the tab, it is one prop to remove.

// v0.23.0 — The release that makes the REAL signal reachable on an iPhone,
//           plus the two gaps found while checking that it could be.
//           ★ Nothing was wrong with the ECG pipeline. The reason only a demo
//           signal was ever seen is that Expo Go contains no `cyphix-ble`, so
//           `requireOptionalNativeModule` returns null and `bleClient` falls
//           back to the simulator — exactly as designed. Reaching the hardware
//           needs a development build, which needs Xcode, which needs a Mac.
//           `IPHONE_SETUP.md` is that path written out end to end, for an
//           Intel MacBook and a FREE Apple ID, with the macOS 14.5 / Xcode
//           16.1 compatibility gate first — it is the one check that can cost
//           an evening, and it cannot be worked around.
//           (1) A STALENESS WATCHDOG. A BLE link stays "connected" while
//           delivering nothing: the phone locks, the app backgrounds, the
//           device slips. The last waveform just sits there, and a screen that
//           keeps calling it live is showing a frozen trace as a patient's
//           heart. After STREAM_STALE_MS (600 ms — six missed flushes of the
//           frozen 10 Hz cadence, so it is derived, not chosen by feel)
//           `isStreaming` goes false. AppState marks it on the way OUT to the
//           background, because a suspended app's timers do not run to notice
//           later, and only a real arriving batch clears it — saying "live
//           again" before a sample has landed is the same lie. An in-flight
//           capture is DISCARDED rather than run out against silence: ten
//           seconds of wall clock is not ten seconds of ECG, and a strip
//           padded with silence reads as asystole.
//           (2) ANDROID BLE PERMISSIONS WERE NEVER REQUESTED. The Kotlin
//           module is `@SuppressLint("MissingPermission")` and documents that
//           the UI must have asked already. Nothing asked. A manifest entry is
//           not a grant, and an unpermitted `startScan` returns no results and
//           throws no error — indistinguishable from "the device isn't here".
//           PARITY had Android as ✅; that was wrong and is corrected.
//           (3) The icon was still Expo's blue placeholder. It is now the
//           CYPHIX mark on white, rasterised by `scripts/make-icons.js` from
//           `BrandLogo`'s OWN path data — a hand-traced lookalike drifts from
//           the logo the first time either is touched.


// v0.22.0 — Two things. (1) The portrait can now be SET from the phone: the
//           avatar is a button with a camera badge — a tappable circle with
//           no affordance is a circle nobody taps — opening take / choose /
//           remove, saved to the RECORD so it shows in the browser too. The
//           sign-up wizard's photo is uploaded as well, best-effort, because
//           a failed picture must never be reported as a failed sign-up.
//           `expo-image-manipulator` is the one new dependency: the server
//           caps the data-URL at 1.5 M chars and a 12 MP square crop is
//           several times that, so it is resized to 512 px before encoding.
//           The picker's `quality` could not do it — it lowers JPEG quality,
//           never the pixel count.
//           (2) "The screen is blue and only then the picture comes up" —
//           not the file, the TIMING: nothing fetched the welcome photo
//           until that screen mounted, and in Expo Go a required asset is
//           pulled from Metro over Wi-Fi on first use. It is now warmed
//           during the splash the app already holds, and fades in over the
//           navy if it is still not ready.

// v0.21.0 — Sign-in was connected; the Profile tab was not. It read the
//           hard-coded fictitious DEMO_CARD, so a signed-in patient was
//           looking at "Test Patient Alpha". Now `usePatientCard` fetches
//           GET /patients/:id/card for the account's OWN linkedPatientId,
//           plus the portrait from /photo — which is why a picture set in
//           the browser now appears on the phone (the avatar had never
//           rendered a photo at all before, in any mode).
//           ★ A real account whose card fails does NOT fall back to the
//           demo record: printing a fictitious blood type and medication
//           list under a real person's name is the worst failure this
//           screen has. It shows a name-only card, says the record could
//           not be loaded — empty sections otherwise read as "you have no
//           conditions and no allergies" — and offers pull-to-refresh.
//           Still missing and named in PARITY: no way to SET the portrait
//           from the phone, and a clinician has no active patient yet.

// v0.20.1 — "CONNECTION ISSUE" on sign-in, and it was configuration, not code.
//           v0.20.0 pointed the app at the dev server on the laptop
//           (http://10.0.0.19:8080), which has to be running and on the same
//           Wi-Fi — and was not. The app was right: the fetch never landed,
//           so it said `network`. Now pointed at the deployed API,
//           https://cyphix-api.onrender.com, verified to be the SAME database
//           (the demo patient returns an identical user id and
//           linkedPatientId from both) and to pass the full client sequence.
//           ⚠️ EXPO_PUBLIC_* is inlined at BUNDLE time: changing .env needs
//           `npm start` restarted, not just the app reloaded.

// v0.20.0 — The app stopped having accounts of its own. With
//           EXPO_PUBLIC_API_BASE_URL set, sign-in goes to CYPHIX_SERVER — the
//           same Postgres the web app uses — so one person is one account
//           everywhere. `HttpAuthService` + a real `tokenStore` (rotating
//           refresh token in the enclave, single-flight exchange, because the
//           server kills a token family on replay) sit behind the same
//           `authService` object every onboarding step already talked to.
//           `useCurrentUser` now answers with the REAL principal when
//           connected: the server enforces RBAC and row scoping, so a client
//           claiming clinician while the server says patient only draws
//           buttons that come back 403. Offline: unchanged, demo clinician.
//           Contract verified end-to-end against the live server + DB; the
//           screens are unverified on a handset (PARITY 🔬).

// v0.19.5 — "זה לא ממורכז בכלל" was not an impression, it was arithmetic.
//           `BrandLogo`'s inherited viewBox is padded ASYMMETRICALLY: the ink
//           runs 41.34 → 181.45 inside a box declared 34 → 209, so 7.3 units
//           of air on the left against 27.6 on the right. Centre that box and
//           the artwork lands ~18 pt left of the screen's middle, and fills
//           only 80 % of the width it claims. Every other caller anchors the
//           logo to a corner, which is why it never showed before.
//           `crop` (new, opt-in, default byte-identical) draws the ink's own
//           measured box. The splash uses it and goes to 90 % of the window
//           capped at 520: 351 pt of real lockup on a standard iPhone against
//           256 pt in v0.19.4 — centred this time.

// v0.19.4 — v0.19.3 is REVERTED at the user's word: the splash is the navy
//           screen with the FULL `BrandLogo` (mark + CYPHIX + "MEDICAL")
//           again. Only the part that was actually asked for survives — the
//           size. It is 82 % of the window's width capped at 460, so ~320 pt
//           on a standard iPhone instead of the flat 210 pt that read as
//           small; a fixed point size is a guess that is right on exactly
//           one screen.
//           `CyphixLogo` is DELETED rather than left unused: three lockups
//           with only two callers is how the wrong one gets picked later.
//           It is one `git show 542a650` away if it is ever wanted.

// v0.19.3 — (superseded by 0.19.4) The splash became the mark + CYPHIX
//           lockup on WHITE. The white screen and the mark-only lockup were
//           not what the user wanted; the sizing fix from this version is
//           what carried forward.

// v0.19.2 — Two from an iPhone next to a Galaxy.
//           THE SIGN-OUT DIALOG HAD NO BACKGROUND ON iOS AND A PROPER PANEL
//           ON ANDROID, from ONE line in `GlassSurface`: the tint was passed
//           only to the BlurView branch, on the reasoning that Liquid Glass
//           "tints itself". It does not — `glassEffectStyle="regular"` with no
//           `tintColor` over a light page is very nearly CLEAR, so on iOS 26
//           the panel was really there and really invisible. The tint now
//           reaches both materials, which fixes every sheet, the dock and the
//           report bar at once — none of which had been looked at on an iPhone
//           yet. The same call now passes `colorScheme` too, so the glass
//           follows the patient's theme choice instead of the phone's.
//           ConfirmDialog is SOLID regardless: a material is for a surface you
//           look past, and this is the one surface you must look at, right
//           before something irreversible.
//           And: a typed name capitalises itself ("elio" → "Elio").
//           `autoCapitalize` only suggests a shift state to the keyboard; the
//           VALUE is normalised now. It never lower-cases, so "McDonald"
//           survives, and it splits on spaces and hyphens but not apostrophes.

// v0.19.1 — Four corrections from the first look at v0.19.0, all of them the
//           kind only a person can see.
//           1. SIGN OUT IS ON PROFILE, at the bottom, under Settings — where
//              every app a patient already uses puts it. It was in Settings
//              only, which is one screen further than anybody looks.
//           2. The welcome hero carries the TEXT-ONLY wordmark ("CYPHIX",
//              no mark, no "MEDICAL"), as the reference does: a second line
//              of type directly over a headline argues with it.
//              `CyphixWordmark` is the brand file's own path, cropped to the
//              glyphs — the A4 page it was drawn on would have rendered the
//              word as a speck.
//           3. THE PULSING ECG MARK ON THE SPLASH IS GONE. It came from the
//              reference and it is not the CYPHIX identity — a thing that
//              behaves like a logo but is not one is worse than no thing.
//              The wordmark carries the splash alone now.
//           4. The navy panel behind "Clinical-grade ECG, recorded at home"
//              is a PHOTOGRAPH of the device being used. A navy gradient
//              scrim sits between the picture and the type, clear at the top
//              and opaque at the bottom, so white text is always on navy
//              whatever the image does underneath.

// v0.19.0 — THE APP HAS A FRONT DOOR. Everything before the tabs, taken from
//           the "CYPHIX Onboarding" design reference and converted to React
//           Native: a navy splash whose ECG mark draws itself, a welcome hero,
//           sign-in (with Face ID / fingerprint where the device really has
//           one), password reset, and a registration wizard — credentials with
//           a live strength meter, phone and a six-digit code on an in-page
//           pad, then six health steps (sex, height, weight, blood type,
//           emergency contact, photo), a review screen that names what was
//           skipped, and "Profile created".
//           The reference's animations are PORTED, not approximated: `scrIn`
//           (16 px + fade, 320 ms, cubic-bezier(.22,.7,.3,1)) on every step,
//           `fadeUp` with its `both` fill mode staggering the splash,
//           `pulseRing` on two offset rings, and `sweep` drawing the trace by
//           animating strokeDashoffset — all on the UI thread.
//           What is deliberately NOT from the reference: the font (mobile
//           ships the system font per root CLAUDE.md §3.1, so the mono labels
//           keep their treatment and their tabular digits but not IBM Plex
//           Mono), and the emergency step, which types the number instead of
//           picking from the address book — a mis-tap in a list of real people
//           writes a real person into a medical record.
//           Registration is device-local for now: `authService` is the same
//           swap point the web has, accounts are held with SHA-256 digests and
//           the session token goes to the Keychain / Keystore. Sign out is live
//           in Settings — and is the only way back to the flow once it is done.

// v0.18.2 — The judder was never the animation, and v0.18.1 shortening it was
//           me guessing. ONE LINE caused it: `palette` was rebuilt inline on
//           every render of StudyViewerScreen, and it is a prop of six
//           `memo`-wrapped EcgReviewStrips — so the memo never held once, and
//           every re-render (opening a sheet, nudging a caliper, one frame of a
//           drag) re-ran `buildEcgPath` over four tiles × six leads, twice over
//           with a ghost. Memoised, the strips now skip entirely.
//           Dragging the ghost was worse still: it also re-entered
//           `useOverlayRecording`, which allocated six shifted Float32Arrays and
//           in warp mode re-ran `alignByFiducials` on all six leads — PER TOUCH
//           EVENT. A manual nudge is a pure translation, so it is now a `<G>`
//           transform at draw time and the signals are never re-derived.
//           And: leaving a comparison now leaves ghost mode with it. It did not,
//           so the "drag to move the grey trace" capsule stayed on screen with
//           nothing to drag — and the invisible full-sheet drag surface under it
//           stayed too, swallowing every touch.

// v0.18.1 — Two from the device, and one of them is me over-correcting.
//           SPEED: the scrim was a second full-screen blur under the panel's
//           own, and its opacity was ANIMATED — which makes a
//           UIVisualEffectView re-compute the whole effect every frame, and on
//           Android stacks two experimental dimezisBlurViews. That is what
//           "slow, and it flickers a bit" was. The scrim is now a plain
//           animated colour and the panel keeps the material, which is also
//           what the platform's own sheets do. Timings 260/170 → 210/140.
//           MOVING THE GHOST: the arrow pad is gone; the paper is draggable
//           everywhere again, with the labelled handle kept over it. Lining two
//           heartbeats up is judged continuously by eye, and 40 ms steps in a
//           list you have to look away at cannot close that loop. The drag was
//           never the problem — its invisibility was, and the handle fixes that
//           without taking the gesture away. The offset now reads out on screen
//           while dragging, so the sheet never has to be reopened for a number.

// v0.18.0 — Three from the device, two of them one root cause. React Native's
//           `Modal` is a SEPARATE WINDOW, and that fact caused both remaining
//           sheet complaints: (a) `UIVisualEffectView` and Android's
//           dimezisBlurView can only sample their own window, which inside a
//           Modal is empty — so every "glass" sheet shipped in v0.17.0 was, on
//           the device, exactly the grey rectangle it was written to replace;
//           (b) Modal defaults to portrait-only, so raising one while full
//           screen is landscape makes UIKit throw
//           UIApplicationInvalidInterfaceOrientation and the process DIES —
//           that is the MARKERS crash. Overlays are now rendered IN TREE
//           (`OverlayLayer`), where the page is really behind them.
//           Separately, comparison stops being three rows in the middle of the
//           filters sheet: it is its own toolbar tool and its own sheet, which
//           opens by saying what the grey trace IS and offers BUTTONS to move
//           it — one small square per tap — instead of only a drag nobody
//           could discover.

// v0.17.0 — Seven more from the device. The one that was a real bug: a
//           PanResponder rebuilt mid-gesture forgets its running totals, so a
//           dragged reference line ran away from the finger and then DELETED
//           itself on release (zero travel reads as a tap). Responders are now
//           built once and read live state through a ref. Also: every sheet
//           and dialog is a blurred glass material instead of a flat grey
//           rectangle; full screen insets the safe area (the Dynamic Island was
//           cutting the start of every trace in landscape), keeps its bar in
//           flow instead of over the paper, and carries a labelled way out; the
//           point being annotated is drawn on the trace while its sheet is
//           open; and the comparison status line is now the way in to moving
//           the ghost, which itself has a visible handle.

// v0.16.0 — Six things the device found that no compiler could. The big one:
//           NOTHING on the sheet was actually draggable, because a handle that
//           claims the gesture on MOVE loses to a ScrollView that has already
//           started panning — so grabbing a caliper scrolled the paper under
//           it. Every handle now claims on touch-down and freezes both scrolls
//           while held. Plus: the trace gets the screen back (icon toolbar,
//           one-line headline, words moved into a ⋯ sheet), a LANDSCAPE full
//           screen fitted to all six leads, the caliper readout out of the
//           trace's way, reference lines grabbable along their length, and R
//           peaks on every lead instead of only II.

// v0.15.0 — The History tab becomes the module it is on the web. Captures file
//           themselves into an on-device store the moment an exam ends; the tab
//           lists them from a cached summary; opening one gives a tiled vector
//           sheet at the frozen 25 mm/s · 10 mm/mV with the whole web toolbox
//           re-thought for a finger: draggable calipers, tap-to-mark, reference
//           lines, a ghost trace with three alignments, filter stages, and
//           export by share sheet (CSV, EDF+, a built PDF). Every tool is behind
//           the same RBAC permission the web checks, and every read, write,
//           export and delete is audit-logged.

// v0.14.0 — The floating CYPHIX wordmark in the top-start corner is behind
//           `SHOW_SHELL_WORDMARK` and currently off, at the user's request.
//           Hidden, not deleted — and the 70pt of padding that existed only
//           to clear it follows the same switch, so nothing reserves space
//           for something that is not drawn.

// v0.13.0 — The app gets an i18n layer mirroring the web's: a language
//           registry, en/he locale tables typed against each other, a provider
//           backed by the pre-hydrated preferences slice (so the first paint is
//           already in the right language), and a Language picker at the top of
//           Settings → Appearance. Every user-facing string now comes from the
//           locale; adding a third language is one new file plus three lines.
