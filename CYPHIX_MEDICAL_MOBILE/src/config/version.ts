/* App version — rendered in the visible badge (web CLAUDE.md §8 convention). */

export const APP_VERSION = '0.96.0';
export const APP_BUILD_LABEL = 'two fingers zoom the ECG sheet, the way two fingers zoom a photograph';

// v0.96.0 - PINCH TO ZOOM ON THE ECG SHEET. JS only - OTA.
//
//           "can pinching with two fingers zoom like on a picture, and be
//           smooth?" Yes - and SMOOTH is the whole engineering problem, not a
//           nicety at the end of the sentence.
//
//           ** WHY IT IS NOT JUST THE BUTTONS ON A GESTURE. ** Zoom here is a
//           LAYOUT quantity: ptPerMm = viewport / windowMm sets the width of
//           every tile and the height of every band, so moving it re-lays out
//           and re-rasterises 24 <Svg> views. The path STRINGS are already
//           memoised on geometry that excludes the zoom (EcgReviewStrip did
//           that for the ghost drag), so nothing is rebuilt in JS - but
//           react-native-svg still redraws each tile when its size changes,
//           and sixty times a second is not what that library is for.
//
//           So: a Reanimated transform on the UI thread while the fingers are
//           down, and ONE committed windowMm when they lift. Nothing renders
//           mid-gesture; the tiles redraw once, crisp, at the new scale.
//
//           ** THE ANCHOR IS KEPT IN PAPER MILLIMETRES. ** The hard part of a
//           pinch inside a ScrollView is the hand-off: the transform is ours
//           and lives on the UI thread, the scroll offset is the platform's
//           and can only be set from JS after a layout. Anything that assumes
//           both land in the same frame flashes. Millimetres are the one
//           coordinate the zoom does not change, so the transform can be
//           written as "put paper-mm X under the finger GIVEN wherever the
//           scroll actually is" - which resolves to zero by itself, whenever
//           the scroll arrives. A 160 ms settle covers the one case the
//           formula cannot: a scroll clamped at the end of the paper, where
//           the anchor is genuinely unreachable.
//
//           ** Two traps paid for by reading rather than by shipping. **
//           (1) The detector hangs on a plain View of its own. A scrolled
//           UIScrollView reports a recogniser's focal point in CONTENT
//           coordinates, so attaching it there would have put the anchor off
//           by exactly how far down the sheet the reader had scrolled.
//           (2) The gesture is memoised and NOT on `pinching`. onBegin sets
//           React state; an un-memoised builder would hand GestureDetector a
//           new gesture mid-pinch - the same trap EcgReviewSheet's header
//           already records for PanResponder, from a different direction.
//
//           ** Known and deliberate: ** pinching OUT does not reveal more
//           paper until you let go. There is nothing more inside the
//           transform to show, so the strip shrinks with blank around it and
//           the extra seconds appear on release. A photo behaves the same.
//
// v0.95.0 - THE LAUNCH IS SHORTER, AND IT REPORTS ITSELF. JS only - OTA.
//
//           "the server is already up and on the 5th launch it still takes
//           5-6 seconds - why?"
//
//           1. ** THE SYNC WAS ON THE CRITICAL PATH AND DID NOT NEED TO BE. **
//              v0.94.0 held the splash for the server AND for the first
//              `runSync`. That is a round trip for the recordings delta plus
//              two more for the card and the portrait, all of them AFTER the
//              revalidation, and on a device that already has a mirror NONE of
//              them change a pixel of what is about to be drawn.
//
//              It was put there to stop History spinning on arrival - and that
//              reason died in the same release that wrote it, because the
//              RefreshControl fix made a background sync SILENT on both
//              screens. It was buying something already paid for.
//
//              The wait now happens in exactly one case: `getCursor` says this
//              device has NEVER synced, so the app would open on an empty
//              History with a skeleton in it. Otherwise the list is read off
//              the disk and the delta lands behind the rendered app, where
//              nobody is looking at it. SyncProvider's trigger (1) still runs
//              it, a few milliseconds later, exactly as it always did.
//
//           2. ** AND THE REST OF THE LAUNCH NOW SAYS WHERE IT WENT. **
//              Settings > About has a LAST LAUNCH row: deltas per stage -
//              prefs, session, server, data, app. This was not guessable from
//              Windows: the build on the phone is a release build over
//              TestFlight, so there is no Metro, no console and no profiler,
//              and the same predicament produced GLASS_MATERIAL on that screen
//              for the same reason.
//
//              ** It measures from JS START, not from the tap. ** The process
//              launch and the Hermes bundle evaluation (4.4 MB of bytecode)
//              happen BEFORE T0 and are not in the number. That is said in the
//              value itself, because the gap between "3 s here" and "6 s in
//              the hand" is the finding, not a caveat.
//
// v0.94.0 - THE LOADING STATES. JS only - OTA.
//
//           Reported with three screenshots: "small glitches, but they make
//           my app look unprofessional." They were, and they had two causes
//           between them.
//
//           1. ONE LOADING SCREEN, NOT FOUR. A cold start used to show the
//              splash, then open the app, then report "connecting" under
//              the status bar while the server woke, then spin at the top
//              of History, then leave a gap at the top of Profile. Each was
//              defensible alone; together they read as an app that could
//              not tell whether it had finished opening.
//
//              The splash now HOLDS until the server has answered and the
//              first delta has landed (`useBootWarmup`). Everything that
//              used to happen in front of the patient happens behind the
//              orb instead.
//
//              ** 15 s, and then it opens anyway, offline. ** Asked for in
//              those words. The free tier takes ~50 s to wake from cold, so
//              that ceiling WILL be hit on the first launch of the day and
//              is meant to be: the app comes up on the device's own copy,
//              the strip says offline, and the backoff keeps knocking.
//              SyncProvider now has a fourth trigger for when that knock
//              lands - before this, nothing acted on a reconnection.
//
//           2. ** THE PAGES THAT MOVED ON THEIR OWN. ** History and Profile
//              both handed a BACKGROUND fetch to a RefreshControl. On iOS
//              `refreshing` is not "draw a spinner", it is "enter the
//              refreshing state": the scroll view's top inset grows ~80 pt
//              and the content goes down with it. So the list dropped away
//              from its title with nobody touching it, did not reliably
//              come back, and Profile opened from halfway down the screen.
//              The native ring drew under the notch, which is why it was
//              only ever caught in a screenshot - and why the note in
//              History claiming it "spun invisibly behind a frosted header"
//              was wrong: that header stopped being a bar in v0.70.0.
//
//              Both controls are driven by the GESTURE now. Background work
//              is silent on both screens. History's orb is drawn only while
//              pulling, and moved to the top of the screen - the pull has
//              cleared room there, and it used to land on the word
//              "History" itself.
//
// v0.93.0 - TWO THINGS THAT GRATED. JS only - OTA.
//
//           1. "the title is centred but it should be to the SIDE like the
//              rest of the titles." It was, and it read as a different app
//              next to Insights and History. It follows the writing
//              direction now, so it sits right in Hebrew.
//
//           2. ★ "when it is sending, the animation has to finish at least
//              ONE FULL TURN of the lights, for completeness and
//              satisfaction." Right, and it was not: the send resolved in
//              1.1 s and the beam was cut down wherever it happened to be -
//              about half a lap - which reads as an interruption rather
//              than as something finishing.
//
//              The fix is in the angle, not in a timer. `BorderBeam` counts
//              turns MONOTONICALLY now, because a wrapped angle cannot tell
//              "back where it started" from "never moved", while on a
//              running total every whole number IS home. When the caller
//              switches it off it sets a landing point at
//              `max(1, ceil(turns))` - the next whole lap, and at least one
//              whole lap however fast the work was - runs on to it, lands
//              exactly there rather than wherever the frame fell, and then
//              fades.
//
//              ⚠️ Opt-in (`finishLap`), NOT the default: a beam driven by
//              typing slows to 0.11 turns/s when the hands stop, so
//              finishing a lap there could hold a light on a blurred field
//              for nine seconds.
//
//              ⚠️ And the RESULT now waits for it. The button keeps saying
//              "Sending..." and stays disabled until the light is home, and
//              the outcome appears at that moment - "Not sent" under a
//              button still reading "Sending..." is two answers on screen at
//              once. The wait is bounded by one lap and it never changes
//              WHAT is reported, only when.
//
//           Measured on a Pixel 7 emulator from a screen recording: the
//           button is busy for 2.67 s (it was 1.10 s), and the beam crosses
//           the top halo at 2.71 s and the bottom at 3.71 s - one complete
//           revolution - before it fades.
//
// v0.92.0 - THE TAB IS NOT A CHAT ANY MORE. JS only - OTA.
//
//           Said plainly, and it is the right call: "nobody chats with their
//           doctor like it is WhatsApp - it should really be opening a
//           REQUEST, for a review of a recording." So the composer is gone
//           and the tab is a form:
//
//               Recording   Jul 30, 5:21 PM · 6 Limb Leads   >
//                           SIMULATION
//               Reason      Question about my results        >
//               Details     (optional)
//                                      [  Send request  ]
//
//           That is also what the platform ALREADY models - the server turns
//           a message into `kind: 'request'` the moment it carries a coded
//           reason, and takes a recording as its attachment - so this is the
//           app catching up with its own API rather than a new idea.
//
//           The other three reports, answered:
//
//           - "I press on it and nothing happens." The composer put the
//             touchable on the `TextInput` alone, so the generous padding
//             around it - which is most of what the eye reads as the control
//             - swallowed every tap. Every row's padding is now INSIDE its
//             pressable. A hit area has to be the thing that LOOKS like the
//             control.
//           - "the box is still very thick." There is no box. The details
//             field is one line of text on the card and grows only if you
//             write more than one line.
//           - "something there is unprofessional, not smooth." A bubble
//             thread with no one at the other end was the unprofessional
//             part. A request has a state - sent, seen, answered - and
//             saying that is more honest than a chat that sits unanswered.
//
//           ★ THE BEAM MOVED, TWICE. It is on the SEND BUTTON and only
//           while the send is in flight - asked for directly, and it is the
//           one place on this screen where the animation means something
//           ("work is in flight") instead of decorating a field somebody is
//           trying to type into. Then, on the emulator, it turned out to be
//           invisible for two compounding reasons, both fixed:
//             (a) it was drawn UNDER the pill, whose opaque fill covered the
//                 crisp ring and the inner glow and left only a faint halo;
//             (b) with no `energy` source its strength collapsed to ~6 %
//                 alpha, because "no one is typing" was being read as "keep
//                 quiet" when it should mean "run at full".
//           It is now mounted only while sending, above the pill - which is
//           what makes drawing over a control safe: the button underneath is
//           disabled for exactly as long as the canvas exists.
//
//           ⚠️ DELIVERY IS STILL NOT WIRED, ON PURPOSE. This app has no
//           `messageApi`. Pressing Send runs the real sending state and then
//           says, in words, that nothing was sent. It must never be made to
//           look successful: a patient who believes they have asked a
//           clinician to look at their heart, and has not, is the worst
//           thing this screen can produce.
//
//           ⚠️ STILL MISSING: a general file attachment. The recording IS
//           the attachment the server's request model takes, but "there is no
//           option to add files at all" is only half answered. Next change.
//
// v0.91.0 - FIVE REPORTS FROM THE PHONE, ANSWERED. JS only - OTA.
//
//           1. "you can never get out of typing mode" - and that was
//              literally true. The field is multiline so Return makes a new
//              line, and NOTHING else blurred it: the only way out was to
//              leave the tab. Tapping the thread now dismisses the keyboard,
//              and so does sending.
//
//           2. "the animation is too bright and has nothing to do with how
//              fast I type - it looks like fireworks." It ran at a fixed
//              speed and a fixed brightness, so it was decoration playing
//              over the top of someone's writing. It is now DRIVEN BY THE
//              TYPING: every keystroke adds to an `energy` value that decays
//              over 1.6 s, and that value moves BOTH the brightness and the
//              speed. Type fast and the border keeps up; stop and it settles.
//              Peak brightness is also about half what it was, and the lit
//              arc is longer and softer - a short bright arc reads as a
//              flash going past, a long gentle one reads as light moving.
//
//           3. "when you just open the tab, before typing at all, there is a
//              little coloured strip on the box." v0.90.0 rested at 30%
//              opacity, which is a coloured arc parked on an untouched
//              input. It now draws NOTHING at rest. An input is an input.
//
//           4. "the box is very tall from the start and does not depend on
//              how much text I wrote." The field had a 44 pt minimum - the
//              TAP-TARGET number - used for something whose height is
//              supposed to mean how much has been written. It starts at ONE
//              LINE and grows with the content to a ceiling, then scrolls.
//
//           5. "the app crashed." ⚠️ The likeliest cause is deleted:
//              `BorderBeam` built its ring with `Skia.Path.Make()` inside a
//              `useMemo` keyed on the measured size - handing React a NATIVE
//              object whose lifetime it does not manage and rebuilding it on
//              every layout pass. It is a declarative `<RoundedRect
//              style="stroke">` now, with no manual Skia object at all.
//              ⚠️ And `FailSoft` was never the protection it sounded like:
//              it catches a React render, not a native crash.
//
//           Verified on an Android emulator, not just typechecked: the box
//           grows to two lines and holds, `mInputShown=false` after tapping
//           the thread, no colour at rest, and the glow visibly fades and
//           drifts once the typing stops.
//
// v0.90.0 - THE CHAT TAB GETS A COMPOSER, AND IT GLOWS. JS only - OTA.
//
//           The tab was a title and an empty card. It now has the message box
//           from the reference that was asked for: tall, rounded, placeholder
//           at the top, a round send button at the bottom-end - with a
//           coloured light that runs around its border while the field is
//           focused or a send is in flight, and rests as a still gradient edge
//           otherwise.
//
//           ★ `npm install border-beam` WAS NOT POSSIBLE, and that is not a
//           preference. Unlike `thinking-orbs` - same author, and split into a
//           portable `engine` precisely so a React Native port could share it
//           - `border-beam` is CSS all the way down: 21 `@keyframes`,
//           `conic-gradient`, `filter: blur()/hue-rotate()`, `matchMedia`.
//           None of those exist in RN. So it is a PORT of the design read out
//           of the published bundle, and the package is NOT a dependency and
//           is NOT in SOUP.md.
//
//           ⚠️ IT DOES NOT RUN ALL THE TIME, and the reason is written in this
//           repo already: `ThinkingOrb`'s header says a Skia animation is
//           "fine for a splash that has a 60 s ceiling over it" and "NOT fine
//           as ambient chrome somewhere it could run for an hour". A composer
//           is exactly that. It also makes the animation MEAN something - a
//           border that lights when you touch the field is the app saying it
//           is listening. Reduce Motion and backgrounding stop it too.
//
//           ⚠️ TWO THINGS FOUND ONLY BY RUNNING IT ON A DEVICE, both of which
//           a typecheck and both `expo export`s waved straight through:
//             - the composer was COMPLETELY HIDDEN behind the keyboard on
//               Android. The usual advice is to leave Android to
//               `adjustResize`; this app is edge-to-edge, so the window does
//               not resize and nothing moved. `padding` on both platforms.
//             - three earlier builds of the beam drew NOTHING (a `DiffRect`
//               with a shader child yields no alpha for a `<Mask>`; a nested
//               mask; a gradient `transform` + `origin`). It is now one
//               stroked `Path` with a `SweepGradient`, no masks at all.
//
// v0.89.1 - THE PROFILE ORB MOVES ABOVE THE IDENTITY. JS only - OTA.
//
//           "It should be above the name, not next to it." v0.89.0 put it
//           in the header row's trailing status slot BECAUSE THAT SLOT
//           ALREADY EXISTED - which is a reason to notice a place, not a
//           reason to use it. Sitting on the same line as the name, it read
//           as something attached to the PERSON rather than as the state of
//           the page. Reusing existing furniture is only tidy when the
//           furniture means the right thing.
//
//           ★ AND THE SLOT IS RESERVED WHETHER OR NOT ANYTHING IS IN IT.
//           Rendering it only while fetching would shove the whole page down
//           ~32 pt the moment a refresh started - and on this screen
//           `isFetching` goes true on every ARRIVAL at the tab, which is
//           precisely when someone is looking at it. A fixed strip costs a
//           little air at the top of a page that scrolls anyway and can
//           never jump. `headerBlock` wraps the strip and the identity as
//           ONE child so the page's own 18 pt gap applies to the block
//           instead of opening a second gap under the indicator.
//
//           Outside `FadeUpView` on purpose: the entrance animation is for
//           content arriving, and a status indicator that fades up every
//           time the tab is opened would be animating the wrong thing.

// v0.89.0 - PROFILE GETS THE ORB, AND A MISPLACED RING GOES. JS only - OTA.
//           Finishes what v0.88.0 flagged rather than leaving it half done.
//
//           ★ AND IT WAS NOT ONLY COSMETIC. Profile still used the plain
//           native RefreshControl - and a RefreshControl's indicator is
//           positioned at the top of the SCROLL VIEW. This page's content
//           starts at `insets.top + 12`, so the ring was landing in the
//           STATUS-BAR STRIP, under the notch. The same defect History had,
//           reached from the opposite cause: there a frosted header covered
//           it, here there is no header and the scroll view simply starts
//           above the safe area. `progressViewOffset` is the obvious answer
//           and is not dependable on iOS - History's refresh block carries
//           the post-mortem, and it cost a release there. So the native
//           indicator is made TRANSPARENT (tintColor for iOS, colors for
//           Android) and keeps only the pull gesture.
//
//           ★ THE SLOT ALREADY EXISTED. The identity header row ends in a
//           status position that was showing an ActivityIndicator while
//           `isLoading`. The orb goes there - inside the layout, so nothing
//           has to be positioned absolutely against a header whose height is
//           not known, which is what History had to do. No new furniture.
//
//           Gated on `isFetching`, a SUPERSET of `isLoading`: one indicator
//           for the first load AND for a pull-to-refresh, instead of a
//           native ring for one and a spinner for the other. `isLoading` is
//           no longer destructured at all.
//
//           `design={20}` and FailSoft with the same ActivityIndicator
//           fallback, exactly as History - see v0.88.0 for why the 64 design
//           turns to mush at this footprint.

// v0.88.0 - THE REFRESH INDICATOR IS THE ORB. JS only - OTA.
//
//           Asked for: in History, when you pull down to refresh, show the
//           orb instead of the plain circle - small, not huge.
//
//           Easier than it looked, because this screen ALREADY draws its own
//           indicator. v0.58.x learned that a RefreshControl's spinner sits
//           at the top of the SCROLL VIEW - which here was behind a ~180 pt
//           frosted header - and that `progressViewOffset` is not dependable
//           on iOS (RN rewrites UIRefreshControl's frame from layoutSubviews
//           and its own source warns that breaks ContentInset). So the
//           control kept the pull gesture and a 36 pt badge drawn by this
//           screen became the visible part. That badge just swapped its
//           ActivityIndicator for the orb - the native control is untouched.
//
//           ★ `design={20}` IS THE WHOLE CRAFT OF THIS ONE. The package
//           ships TWO designs, not one scalable design: "64 (chat-avatar
//           scale) and 20 (inline-text scale) ... separate designs, not a
//           scale factor." The 64 ribbon is 566 dots at radius multiplier
//           0.395; scaled into a 26 pt badge every dot lands at a fraction
//           of a pixel and it reads as a grey smudge. The 20 design is 208
//           dots at 1.011 - sparser and fatter, so it survives being small.
//           RENDERED BOTH AT 26 pt AND LOOKED, rather than reasoned about:
//           the 64 one is exactly the blur predicted, the 20 one keeps its
//           dashes. `ThinkingOrb` takes `design` now; callers pick by
//           FOOTPRINT (20 up to ~40 pt, 64 above), never by preference.
//
//           Bounded in FailSoft like the splash's, falling back to the same
//           ActivityIndicator - a refresh spinner must not be able to take
//           down the History tab, and a ring appearing there is the signal.
//
//           ⚠️ ProfileScreen still uses the PLAIN native RefreshControl
//           with a tint - it has no self-drawn badge to swap. Flagged, not
//           silently half-done; it needs the same treatment to match.

// v0.87.0 - THE RIGHT ORB. JS only - OTA. One word changes; the work was
//           finding out WHICH word.
//
//           ★ I PICKED THE STATE BY MEANING AND NEVER ASKED. The package
//           ships NINE animations. v0.85.0 used `connecting` because the
//           name matched what the app is doing - waiting on a server, "a
//           constellation wires itself". Nobody requested that. The request
//           came with a link to a live demo, and the animation on it was a
//           specific one that had been SEEN. Choosing by semantics instead
//           of by looking produced a completely different object:
//             connecting -> web      48 dots + 82 LINES   sparse wireframe
//             composing  -> ribbon   566 dots, no lines   dense sash
//           Not a near miss - the opposite end of the set.
//
//           SETTLED BY RENDERING, NOT BY READING NAMES. The state names
//           describe an AGENT'S ACTIVITY (working, listening, composing),
//           not a shape, so no amount of re-reading them answers "which one
//           is in this video". The engine is pure `Math` with zero deps, so
//           it runs in plain Node: all nine states were rasterised from the
//           same MODE_FRAMES the app calls, and compared against frames cut
//           out of the screen recording (HEVC - the local ffmpeg is a stub
//           that cannot decode it, so a real one was fetched).
//           `ribbon` is the only match - same dense vertical dashes, same
//           undulating dark gap, same torus silhouette. The other eight are
//           not close.
//
//           ⚠️ DO NOT RE-PICK THIS FROM THE STATE NAMES. That is exactly
//           the mistake, and the nine renders are cheap to reproduce:
//           import MODE_FRAMES from 'thinking-orbs/engine' in Node and draw
//           the dot lists.

// v0.86.0 - THE ORB IS THE INDICATOR, FROM THE FIRST FRAME. JS only - OTA.
//
//           Reported: "I only see the old circle under Cyphix when the app
//           opens." Correct, and it was not a rendering bug - it was MY
//           THRESHOLD.
//
//           v0.85.0 raised the orb only after 1.5 s, reasoning from
//           BootSplash's own header that a disk read "is not an occasion"
//           and the flourish should be reserved for a wait that earned it.
//           ★ THE REASONING WAS FINE AND THE NUMBER WAS FATAL: AuthGate's
//           minimum splash is SPLASH_MS = 900 ms. The screen was gone 600 ms
//           before the timer fired, so on a healthy launch the orb was never
//           mounted at all - and a signed-in user with a stored principal
//           never hits the long `recovering` branch either. The feature
//           shipped in a state where it essentially could not run.
//           Taste is not worth a feature that never executes, and a loading
//           indicator that only appears when things go badly is not a
//           loading indicator. Threshold deleted; the orb is what the splash
//           shows, every launch. Entrance 520 -> 260 ms for the same reason:
//           it was still fading in when a 900 ms splash ended.
//
//           ★ AND THE SECOND BUG WAS THAT I COULD NOT TELL. v0.85.1 wrapped
//           the orb in FailSoft with the OLD RING as its fallback - so a
//           crashed orb and an orb that never mounted looked IDENTICAL on
//           screen. "I only see the old circle" described both, and neither
//           of us could have said which without another release. That is the
//           v0.82.0 lesson repeated: a tool that records one of two outcomes
//           cannot distinguish them.
//           Two fixes: with no threshold the ring is no longer a legitimate
//           state, so seeing one IS the failure signal; and FailSoft now
//           records what it caught, surfaced in Settings > About as "Render
//           fallback" - a row that only exists when something fell back, so
//           its presence is the message.

// v0.85.1 - THE ORB CANNOT TAKE THE APP DOWN, AND THE DEPENDENCY IS ON THE
//           RECORD. JS only - OTA onto runtime 0.45.0.
//
//           Asked, correctly, before v0.85.0 was allowed to stay: is this
//           safe at FDA level, and does it need any data egress or a
//           permanent external API?
//
//           EGRESS: NO, and it is now proven rather than asserted. The 19 KB
//           engine has zero runtime dependencies, zero install scripts, and
//           references exactly five globals - Math x155, Object x2, Set, Map,
//           Array - AND NOTHING ELSE. No fetch/XHR/WebSocket/sendBeacon, no
//           localStorage/indexedDB, no eval/new Function/import(), no
//           process.env, no Date, no crypto. It is compiled into the bundle:
//           no CDN, no licence check, no telemetry, no runtime host. It is
//           structurally incapable of exposing patient data because it is
//           never given any - its whole input is (size, elapsed seconds,
//           preset constants). See SOUP.md 1.1 for the method.
//
//           BUT THE REAL RISK WAS NOT EGRESS. React has no partial failure:
//           a throw unmounts the tree from the nearest boundary upward, and
//           THE APP HAD NO ERROR BOUNDARY AT ALL. On BootSplash - the FIRST
//           screen - that made an ornament as load-bearing as the ECG: a
//           defect in it would not be a missing animation, it would be an app
//           that does not start, with no screen left to report from. That was
//           true of v0.85.0 as shipped.
//           New atom FailSoft, and the orb is wrapped in it. The fallback is
//           the ActivityIndicator that preceded it, so the worst case is now
//           exactly the previous release. It is scoped to DECORATION and says
//           so: clinical content must never go behind it, because content
//           that silently fails to draw cannot be told apart from content
//           that was not there, and a missing finding reads as a normal one.
//
//           SOUP.md (new): a third-party library in device software is SOUP
//           under IEC 62304 whether or not anyone writes it down, and there
//           was nowhere to write it. thinking-orbs is fully evaluated;
//           all 41 direct dependencies are identified per 8.1.2.
//           The file is deliberately blunt about what it does NOT cover: the
//           other 40 have had no 7.1.2 risk evaluation, and several of them -
//           expo-secure-store, expo-local-authentication, expo-updates, Skia,
//           Reanimated - sit far closer to patient safety than the ornament
//           that prompted the file. That gap is PRE-EXISTING; this only makes
//           it visible.

// v0.85.0 - THE SPLASH SAYS SOMETHING WHILE THE SERVER WAKES. JS only -
//           OTA onto runtime 0.45.0. `thinking-orbs` is pure JS; Skia, which
//           draws it, was already in the binary.
//
//           ★ THE PACKAGE'S OWN COMPONENT CANNOT RUN HERE. `thinking-orbs`
//           ships a WEB component - its README says so in the first sentence
//           ("a plain 2D canvas ... Chrome, Safari and Firefox") and the
//           published bundle proves it: canvas.getContext('2d'), matchMedia
//           x6, document.visibilityState, devicePixelRatio. None of those
//           exist in React Native. `import { ThinkingOrb } from
//           'thinking-orbs'` does not render badly - it throws.
//
//           ★ BUT THE AUTHOR SPLIT THE MATHS OUT ON PURPOSE, AND SAID WHO
//           FOR. From engine/registry.d.ts: "The portable surface: pure
//           geometry, no canvas. The React Native port imports exactly these
//           functions." So `thinking-orbs/engine` is imported - never the
//           root entry - and a new atom `ThinkingOrb` draws the finished
//           frame with Skia. It derives NOTHING: the frame arrives z-sorted
//           and radius-clamped, and array order is draw order. That is what
//           keeps an upgrade a version bump instead of a re-port.
//
//           VERIFIED BY BUNDLING, NOT BY READING THE DOCS. This is the FIRST
//           screen the app shows, so a module Metro cannot resolve is not a
//           missing animation - it is an app that does not start. `expo
//           export` was run and the output inspected: the engine is present
//           (`rubik`, `connecting -> web`), `getContext("2d")` appears ZERO
//           times, and the one `matchMedia` in the bundle belongs to
//           Reanimated's reduced-motion check.
//
//           ★ IT ONLY APPEARS AFTER 1.5 s, AND THAT NUMBER IS THE DESIGN.
//           BootSplash's own header argues a busy ring is right for a disk
//           read because "a disk read ... is not an occasion. Reserving the
//           theatrical version for somewhere it is earned keeps it meaning
//           something." That argument is KEPT. AuthGate holds this screen
//           900 ms on a healthy launch and up to 60 s waiting for the server
//           (RECOVERY_TIMEOUT_MS) - a cold Render instance takes close to a
//           minute. So a healthy launch never sees the orb; if it appears,
//           something really is taking time.
//           It is also what makes it affordable: the geometry runs on the JS
//           thread (workletising an IMPORTED function is impossible - the
//           Babel plugin only transforms our own source), and by 1.5 s that
//           thread is blocked on a socket rather than doing work.
//
//           State `connecting` of the nine, because that is literally what is
//           happening. Painted in brand navy on white rather than the
//           package's grey: the atom maps its ink-depth language onto two
//           colours, so nearest still reads darkest.
//
//           🔬 Typechecks AND bundles - but the orb has never been seen on
//           a screen from this machine.

// v0.84.0 - THE ENTRANCE REPLAYS ON EVERY VISIT. JS only - OTA onto 0.45.0.
//
//           Asked for as: "can the animation happen every time I switch tab
//           and not only the first time I enter the tab in a session?"
//
//           ★ IT PLAYED ONCE BECAUSE IT WAS KEYED ON MOUNT. `FadeUpView`
//           and `PageTitle` start from useEffect, and a bottom-tab screen
//           mounts ONCE and then stays mounted for the life of the session -
//           leaving a tab does not unmount it, which is exactly what makes
//           coming back instant. So the second visit had nothing left to
//           animate: the effect had already run, hours ago. The event that
//           means "I am looking at this now" is FOCUS, not mount.
//
//           New hook `useReplayOnFocus`, and two decisions inside it that
//           are the whole difficulty:
//
//           1. ⚠️ NOT `useIsFocused()`. It calls `useNavigation()`, which
//              THROWS where there is no navigator - and three animated
//              surfaces are in exactly that position: the AUTH FLOW
//              (AuthGate stands in FRONT of the navigator, and SuccessStep
//              uses FadeUpView), every SHEET (overlays are portalled to the
//              app root, outside the navigator by design), and anything
//              mounted above the navigator later. The idiomatic hook would
//              have crashed the sign-in screen on launch. The context is read
//              with a plain useContext, and no navigator means MOUNT ONLY -
//              degrading to the old behaviour is the only safe direction.
//
//           2. ★ NOT A `focused` BOOLEAN IN REACT STATE. That shape was
//              written first and puts the reset ONE COMMIT LATE:
//                tab becomes visible (content still in its finished state)
//                  -> focus event -> setState -> re-render -> reset to 0
//              Between those commits the screen is drawn, complete, and then
//              BLANKS. That is a flash - and this app has had precisely that
//              reported before ("the tab is glitchy, it appears for a split
//              second"). Writing the shared value straight from the listener
//              has no commit in it: same JS tick as the commit that made the
//              screen visible, so Reanimated flushes it in the same frame. It
//              also avoids a re-render per row - FadeUpView is per-row in
//              History.
//
//           History's per-row CASCADE needed the same fix one level up: its
//           stagger was gated on `Date.now() - mountedAt < 900`, a ref set at
//           mount, so every later visit computed a stagger of 0 and the rows
//           would have replayed all at the same instant. It is STATE now,
//           because `renderCard` is memoised: unless something it depends on
//           changes, FlatList re-renders no rows and the new delays never
//           reach them.
//
//           ⚠️ Home and Chat have NO entrance animation to replay - they
//           never had one. Flagged, not invented: Home is the patient-first
//           screen and animating its one big button is a decision, not a fix.
//
//           🔬 Typechecks and bundles; the flash question is a device one.

// v0.83.0 - THE SHEETS CAN BE HELD. JS only - OTA onto runtime 0.45.0.
//
//           Reported as two things:
//             "kol ha-sliders she-olim mi-lmata le-mala olim be-ritsud
//              ve-ein li yecholet le-hachzik et ha-pas le-mala ve-lehachlik
//              le-at le-at - ze o niftach o nisgar, lo chalak ve-lo miktsoi"
//
//           ★ THE SECOND HALF IS THE DIAGNOSIS OF THE FIRST. There was no
//           gesture. The grabber was a 36x5 rounded <View> - a PICTURE of a
//           handle, drawn at the top of every sheet since BottomSheet v2.0.0,
//           announcing an affordance nothing implemented. (ActionSheet's own
//           header has claimed since v1 that a sheet "is dismissed by tapping
//           away or dragging down". Half of that sentence was fiction.)
//
//           So a sheet had exactly TWO states and a 240 ms timeline between
//           them, and an animation you cannot interrupt is the only thing on
//           screen - every dropped frame in it IS the experience. That is
//           also why shortening the durations in v0.18.1 changed nothing and
//           was told so plainly: "it's not the speed, it just isn't smooth."
//
//           A real pan now drives the same value the animation does, on the
//           UI thread. Drag and it follows the finger; release below 62 %
//           and it falls; flick and it goes with the flick; catch it
//           mid-rise and it is yours. The scrim dims with it, so the page
//           behind comes BACK as you pull down instead of waiting.
//
//           Three structural fixes to the rise ride along, each measurable:
//           1. Reanimated replaces Animated. A finger cannot take a JS round
//              trip per frame, so a gesture-driven sheet cannot be built on
//              Animated.Value + React state at all.
//           2. ★ THE PANEL TRAVELS ITS OWN HEIGHT, NOT THE WINDOW'S. A
//              380 pt sheet was flung 844 pt in 240 ms to cover 380 pt of
//              visible distance - too fast to read as an arrival, and a
//              full-width Liquid Glass surface composited off screen for most
//              of those frames. The window height was CORRECT when written
//              ("no layout pass needed before it can animate") and v1.2.0's
//              layout gate silently expired the reason.
//           3. ★ THE LAYOUT GATE IS A REF, NOT STATE. As state it rendered
//              the layer, re-published into OverlayPortal and re-rendered the
//              portal host on the EXACT frame the rise began: v1.2.0 moved
//              view creation off that frame and put reconciliation back on it.
//
//           ⚠️ IN_MS 240 -> 330 is NOT a smoothness fix. It is the same
//           perceived speed over half the distance.
//
//           The drag is on the HANDLE, not the whole panel: most callers put
//           a ScrollView inside it, and a pan over the whole surface races
//           every one of them for the same vertical finger.
//
//           🔬 Typechecks and bundles. The FEEL has to be judged by a
//           thumb - that is the whole subject of the report.

// v0.82.0 - THE SESSION DIAGNOSTIC RECORDS SUCCESSES. JS only - OTA onto
//           runtime 0.45.0 (build 17).
//
//           The sign-out was reported again, and the diagnostic built for
//           exactly that moment answered:
//             token + principal - last: refresh refused by server (401) @ 15:44
//           read at 18:51, after three hours of the app working perfectly.
//
//           ★ THE LINE WAS TRUE AND USELESS. It logged only FAILURES, so a
//           three-hour-old error and a three-second-old one looked identical,
//           and "nothing has gone wrong since" could not be told apart from
//           "nothing has happened since". The one question the tool exists to
//           answer - is it STILL happening? - was the one it could not.
//
//           Both healthy outcomes are now written:
//             'refreshed OK'              - a real token rotation
//             'confirmed OK (no rotation)' - a probe against GET /auth/me
//           Named apart on purpose. `httpAuthService.revalidate` prefers the
//           probe precisely because it does NOT spend the refresh token, so
//           probes happen far more often than rotations; a log showing only
//           rotations would go quiet for fifteen minutes at a time and read as
//           nothing happening.
//
//           WHAT THE EVIDENCE ACTUALLY SAID, recorded because it is the first
//           real test of the v0.71.0 / server v0.7.0 fixes:
//             14:37  server v0.7.0 live (grace window 60 s -> 24 h)
//             14:41  mobile v0.71.0 OTA published - starts reaching the phone
//             15:44  the 401 - inside that changeover window
//             18:51  no refusal since, across five builds
//           The old bundle chained concurrent rotations, which produces the
//           one state the grace window CANNOT rescue: the successor has
//           genuinely been used, so the server is right to call it a replay.
//           Server-side alone was never enough; both halves had to land, and
//           they did not land at the same instant.
//
//           ⚠️ NOT a claim that the bug is fixed. It is a claim that nothing
//           has been refused for three hours, which is the most the evidence
//           supports. From here the line dates itself.

// v0.81.0 - THE APP IS CALLED CYPHIX.
//           ⚠️ REBUILD: app.json 0.44.0 -> 0.45.0 (0.43.0 was build 16,
//           which this supersedes). `expo.name` is compiled into the binary -
//           CFBundleDisplayName on iOS, app_name on Android - so there is no
//           OTA for a rename.
//
//           "CYPHIX Medical" -> "Cyphix", in the two places it was written:
//           `app.json`'s `name` (the label under the home-screen icon) and
//           `BrandLogo`'s accessibilityLabel (what a screen reader announces).
//           Those two have to agree; a blind user hearing a different product
//           name from the one on the screen is the accessibility equivalent of
//           a wrong label.
//
//           ⚠️ WHAT IS *NOT* RENAMED, AND IS FLAGGED RATHER THAN GUESSED:
//           the WORDMARK still draws the word MEDICAL. It is a separate
//           <Path> in `BrandLogo` (fill={medical}), so hiding it is one line -
//           but the logo's crop box is measured around the full lockup
//           (CROP_BOX, 40.988 -> 181.798), and dropping the subtitle leaves
//           ~56 units of dead air on the right. Anywhere the mark is CENTRED -
//           BootSplash is - it would sit visibly off-centre, which is exactly
//           the class of defect v1.1.0 added `crop` to fix. A new box has to
//           be measured and LOOKED AT, and react-native-svg cannot be
//           rendered from this machine. So: not guessed, not shipped blind.
//           It shows on BootSplash, ProfileScreen and the report letterhead
//           (ReportHeader) - and that last one is its own decision anyway,
//           since it identifies the issuer of a clinical document.
//
//           The App Store listing name lives in App Store Connect, not here.
//           This changes the home screen, the app switcher and TestFlight.

// v0.80.0 - THE ICON FILLS ITS FRAME.
//           ⚠️ REBUILD: app.json 0.42.0 -> 0.43.0.
//
//           Reported: "on iOS it's too small, the elements need zooming in."
//           Measured, and right: the content occupied 47 % x 54 % of the frame
//           while the OS mask allowed 78 %. A small picture in a big blue field.
//
//           ★ AND THE CHECK I ADDED IN v0.78.0 PASSED IT. That check asked
//           only "is anything CLIPPED?" - which is half a rule. Nothing was
//           clipped, so it said fine, and it had no opinion at all about an
//           icon that was far too small. Shrink-only was never the right shape;
//           the same measurement answers both questions and I used one
//           direction of it.
//
//           `unmask-icon.js` now NORMALISES: content is scaled to SAFE_FILL
//           (0.87) of the largest scale the mask permits, whether that means
//           zooming or shrinking. Here it computes x1.449 of a x1.665 ceiling -
//           the same value I had picked by eye from a rendered comparison
//           BEFORE writing the rule, which is the only reason to trust it.
//           0.87 and not the ceiling because at the ceiling the lead labels and
//           the keypad squares crowd the corner; that too was rendered and
//           looked at (x1.00 / x1.30 / x1.45 / x1.60, side by side).
//
//           == ANDROID: THE LAUNCHER'S OWN ZOOM IS THE ANDROID VERSION OF THIS,
//              so its layer takes the UNZOOMED artwork ==
//           Zooming for iOS pushed content outward, and the launcher then adds
//           its own 1.5x crop on top - which cut the "6" clean off. But that
//           1.5x IS a zoom: fed the unzoomed source, the crop leaves content at
//           ~70 % of the visible area, which is what was wanted. So iOS and
//           Android are handed DIFFERENT FRAMINGS of one artwork, for one
//           reason: each platform applies a different amount of its own.
//           Measured rather than assumed: the unzoomed content survives the
//           square window but its furthest corner sat 377 px from centre
//           against a 342 px safe RADIUS - a Pixel circular mask would have
//           clipped the "6" and the keypad. x0.90 brings it to 328 px. Both
//           masks rendered and checked.
//
//           `adaptiveIcon.backgroundColor` #6AA6E8 -> #92C2F2, sampled.

// v0.79.0 - THE SAME 6-LEAD IDEA, ON BRAND BLUE.
//           ⚠️ REBUILD: app.json 0.41.0 -> 0.42.0.
//
//           v0.78.0 shipped the same concept as a PALE card, and the honest
//           note filed with it was that it "floats" on a light wallpaper -
//           low internal contrast and low external contrast at once. This
//           artwork fixes exactly that, and the render proves it: side by side
//           at 60 px on a light wall, the pale version loses its own outline
//           and this one holds a hard edge. That was the single biggest
//           weakness of the choice and it is gone.
//
//           ★ AND ANDROID FLIPS BACK TO FULL-BLEED, which is the opposite of
//           v0.78.0's call and right for the opposite reason. v0.78.0's
//           artwork ran its content to the card's edges, so the launcher's
//           1.5x zoom cut the "6" and the lead labels and the rebuilt
//           safe-circle layer was the only way to keep them. THIS artwork has
//           generous margin built in, so full-bleed survives the same crop
//           with nothing lost - and it is bolder than the 47 % subject the
//           safe-circle treatment produces. Both were rendered under a
//           circular mask and compared before choosing; the faintness warned
//           about in v0.78.0 is resolved rather than inherited.
//
//           ── Two pipeline corrections this needed ──
//           1. `unmask-icon.js` treated an ALREADY FULL-BLEED source as an
//              error and exited. It refused exactly the artwork that needs no
//              un-masking - and "no corner to remove" is not "nothing to
//              check": the mask-fit constraint applies to every source, and
//              that is the one that shipped a sliced "HR 72" in v0.77.0. It
//              now passes such a source through and runs the check alone
//              (result here: content already clears, no shrink).
//           2. A rendering script of mine lost its output path to
//              `$s = [int]($cell * 1.5)` - PowerShell variable names are
//              CASE-INSENSITIVE, so it overwrote `$S`, the scratch directory,
//              with 270. `make-icons.ps1`'s own header warns about precisely
//              this trap ("NOT $Src/$Out"), and I walked into it anyway. Only
//              a scratch render was affected; no asset was.
//
//           `adaptiveIcon.backgroundColor` #DBE8FA -> #6AA6E8, sampled.

// v0.78.0 - THE APP ICON IS THE 6-LEAD REPORT CARD.
//           ⚠️ REBUILD: app.json 0.40.0 -> 0.41.0.
//
//           Chosen by the user from five candidates, after all five were
//           rendered at the REAL home-screen size on both a dark and a light
//           wallpaper and ranked. Two of my own claims died in that render and
//           are corrected in the record: this artwork is MORE legible at 60 px
//           than I predicted, and the neon heart was the MOST legible of the
//           five (it still lost, on identity, not on eyesight).
//
//           ★ WHY IT IS THE RIGHT ONE: six leads at home is the product's
//           actual differentiator, and the "6" is the one thing on any of the
//           candidates that no other health app could put on its icon.
//
//           ══ THE PIPELINE BUG THIS EXPOSED ══
//           v0.77.0's icon shipped with "HR 72" SLICED by iOS's squircle -
//           7,178 ink pixels outside the mask, the worst by 31 px - and it was
//           reported from the phone, not caught here. The cause was a
//           one-sided optimisation: `unmask-icon.js` chose the frame so the
//           card NEARLY FILLED IT (no white corners) and never asked the
//           opposite question, so it pushed the artwork's own content out
//           towards the corners the OS was about to cut off. Two constraints
//           pull against each other and I had checked one.
//
//           The script now measures BOTH and re-checks the second. Three
//           things had to be got right for that check to be worth anything:
//             1. LOCAL CONTRAST, not a luminance threshold, decides what is
//                "content". "Darker than 140" is correct for a navy trace on
//                white and finds NOTHING on a pale-blue-on-pale-blue artwork -
//                it would have reported "no clipping" on exactly the icon most
//                likely to have some. "Darker than the median" then flagged the
//                card's own RIM, which reaches the frame edge by definition and
//                can never clear a mask.
//             2. The re-check IGNORES THE PADDING BAND. The band is made by
//                repeating the card's edge outward, so an element that runs to
//                that edge - the ECG trace does - is smeared into a bar
//                reaching the corner. Counting it meant chasing an artefact of
//                the fix, and it never converged: two rounds of "STILL CLIPPED"
//                against a bar the fix itself had drawn.
//             3. `make-adaptive-foreground.js` had four HARDCODED numbers
//                cropping a subject out of a page of white - which no source
//                has any more, since `unmask-icon.js` runs first. Left in, they
//                were a stale crop, and they mangled this artwork on the first
//                run (a 511x454 subject with the wrong aspect).
//           Regression-tested: run against v0.77.0's artwork, the check
//           correctly detects the clipping and shrinks to 86.1 %.
//
//           ANDROID USES THE REBUILT SAFE-CIRCLE FOREGROUND here, unlike
//           v0.75.0 and v0.77.0. Full-bleed was rendered first and it cut the
//           "6" and the lead labels - on this artwork the edges carry the
//           CONCEPT, not texture, so the v0.72.0 treatment is the right one
//           again. Honest cost, recorded rather than glossed: at 48 dp the
//           result is FAINT - a pale card on a pale field, shrunk to 47 % of
//           the frame. If Android ever becomes a real target, the fix is a
//           deeper background field, not a bigger subject.
//
//           `adaptiveIcon.backgroundColor` #DBE5F5 -> #DBE8FA, sampled.

// v0.77.0 - THE APP ICON IS THE ECG CARD (HR 72 / 25mm/s).
//           ⚠️ REBUILD: app.json 0.39.0 -> 0.40.0. v0.76.0's orientation fix
//           was published OTA to 0.39.0; its code is baked into this binary
//           too, so nothing is lost. Every OTA from here targets 0.40.0.
//
//           ★ THE ARTWORK ARRIVED PRE-MASKED, and that is not a detail. It
//           was a rounded card on a white page - how a designer PRESENTS an
//           icon, and the opposite of what the platforms want. `icon.png` has
//           to be FULL BLEED because iOS applies its own squircle on top, and
//           the artwork's corner radius was 25.2 % against iOS's ~22.4 %: ship
//           the presentation image and you get a rounded icon with white
//           crescents bitten out of every corner.
//
//           New: `scripts/unmask-icon.js`, because this is the third pre-masked
//           source in a row. It measures the card (edges from the CENTRE lines,
//           so the corner arcs and the drop shadow cannot move them; the corner
//           profile row by row, so no curve is assumed) and then picks the
//           largest centred square the card NEARLY fills.
//
//           ★ THE THING THAT MADE IT EASY, AND THAT I MISSED FOR THREE
//           ATTEMPTS: the OS masks the corners anyway. The first three tries
//           mapped the card's whole bounding square and tried to INVENT the
//           rounded corners back - ~420 px of made-up pixels each - and every
//           method (clamp to a circle, clamp to the measured span) left a
//           visible streak, because you cannot extend a gradient that far and
//           have it still look like the gradient. Modelling the corner as a
//           circular arc was wrong twice over: a modern card corner is a
//           SQUIRCLE, so a circle cuts inside the real shape along part of the
//           curve (page white showed through) and outside it along the rest
//           (the rim smeared).
//           Zooming to 88 % instead drops the worst uncovered corner from
//           257 px to 21 px - the curve falls away steeply, so one step of
//           zoom crosses it - and 21 px sits under the mask. The 12 % given up
//           is all card margin: "HR 72", the nearest content to an edge, keeps
//           47 px of clearance. Measured, not eyeballed.
//
//           ANDROID IS FULL-BLEED, deliberately, and it DOES crop: the
//           launcher's 1.5x zoom takes "HR 72", "25mm/s" and the swoosh with
//           it, leaving one bold beat. The alternative (fit the whole card
//           inside the safe circle, 47 % of the frame) was built and rendered
//           side by side, and it is worse: a small busy card on a pale field.
//           At 48 dp those annotations are unreadable decoration and the trace
//           is the mark, so the crop loses nothing real. Both were LOOKED AT.
//
//           `adaptiveIcon.backgroundColor` #D1C9CB -> #DBE5F5, sampled.
//           The monochrome layer stays three traces - same reasoning as
//           v0.75.0, and unchanged by the artwork swap.

// v0.76.0 - ORIENTATION, ACTUALLY FIXED. JS ONLY - OTA, and it needs BUILD 12
//           (runtime 0.39.0), because that is the binary that carries the
//           native module this now calls. Published to 0.39.0 ONLY: an OTA of
//           this code onto build 11 would call a module that is not in it.
//
//           ⚠️ v0.75.0 DID NOT FIX THIS and shipped a whole binary saying it
//           did. The icon changed; the rotation did not. Written down in full
//           because the reasoning was plausible at every step and still wrong.
//
//           v0.75.0 installed `expo-screen-orientation` WITHOUT calling it, on
//           the reading that its root view controller defers to
//           react-native-screens' per-route masks. It does not:
//
//             ScreenOrientationViewController (a plain UIViewController)
//               guard !shouldUseRNScreenOrientation() else {
//                 return super.supportedInterfaceOrientations
//               }
//
//           `super` is UIViewController, whose default is `allButUpsideDown`.
//           `shouldUseRNScreenOrientation` READS as "defer to RNS's mask" and
//           MEANS "defer to UIKit's default behaviour". I inferred the
//           semantics from the name and did not read the class declaration.
//
//           ★ SO THE DECLARATIONS WERE NOT NEUTRAL - THEY WERE THE BUG. Any
//           RNS orientation trait makes that guard fire, which switches the
//           package off for the ENTIRE APP and reports "anything goes" to iOS.
//           Declaring `portrait_up` on the stack is what unlocked the tabs.
//
//           ── Three writers, not one ──
//           The grep that should have come first found THREE places setting an
//           RNS trait, two of them dynamic and invisible in the navigator:
//             1. RootNavigator  - `orientation` on the stack + on the exam
//             2. LimbMeasure    - `nav.setOptions({ orientation })` per phase
//             3. StudyViewer    - `setOptions({ orientation })` on fullscreen,
//                                 under a comment claiming this kept RNS "the
//                                 single owner of that API"
//           Each one, on its own, unlocked rotation everywhere. Fixing the
//           navigator alone would have shipped another binary that changed
//           nothing - which is exactly what v0.75.0 was.
//
//           ── The fix: ONE authority ──
//           No route declares `orientation`; nothing calls `setOptions` with
//           it. `expo-screen-orientation` is now the only writer:
//             - RootNavigator locks PORTRAIT_UP once at start.
//             - LimbMeasure locks LANDSCAPE on focus, PORTRAIT_UP on blur, and
//               swaps to PORTRAIT_UP when the capture finishes (a report is
//               read top to bottom).
//             - StudyViewer locks LANDSCAPE for full screen, and restores
//               PORTRAIT_UP on blur - without that, backing out of a
//               full-screen study would leave the whole app landscape-locked,
//               the mirror image of the reported bug.
//
//           `lockAsync` was banned after the v0.30-era flicker, and that ban
//           is lifted rather than worked around. The flicker's diagnosis was
//           right - TWO WRITERS of one native API - but the cure removed the
//           wrong one: it deleted the only writer iOS listens to and left the
//           declarations, which is how the tabs free-rotated for months. The
//           invariant that replaces the ban is in RootNavigator's header:
//           NO ROUTE MAY DECLARE `orientation`. There is nothing left to race.
//
//           Honest cost: the exam's rotation now happens just AFTER its push
//           instead of as part of it - a beat of portrait before it turns.
//           Android never had this bug (its per-screen requestedOrientation
//           really is applied); it takes the same path now for one behaviour.

// v0.75.0 - TWO NATIVE CHANGES IN ONE BINARY.
//           ⚠️ REBUILD: app.json 0.38.0 -> 0.39.0. v0.73.0/v0.74.0 were
//           published to BOTH 0.37.0 and 0.38.0, so they are baked into this
//           bundle either way. From here, every OTA targets 0.39.0.
//
//           ══ 1. LANDSCAPE IS BLOCKED EVERYWHERE EXCEPT THE EXAM ══
//           Reported: "after you leave the measurement screen, turning the
//           phone sideways is suddenly legal in ALL the tabs."
//
//           ★ THE PER-ROUTE MASKS WERE NEVER THE PROBLEM. They read correctly
//           in both platforms' react-native-screens source: the walk finds the
//           stack's `portrait_up` for the tabs and `landscape` for the exam.
//           The problem was that ON iOS NOBODY WAS ASKING THEM. iOS decides
//           whether the USER may rotate by asking the ROOT view controller for
//           `supportedInterfaceOrientations`. A bare Expo app has no root VC
//           that knows about react-native-screens, so the question fell
//           through to Info.plist - which app.json's `"orientation": "default"`
//           fills with every orientation. Free rotation, everywhere, always.
//
//           And this is WHY IT HID: RNS does not need the root VC in order to
//           ROTATE. `enforceDesiredDeviceOrientation` calls
//           `requestGeometryUpdate` on the window scene directly, so pushing
//           the exam turned the phone correctly even though nothing enforced
//           the mask between navigations. Rotation on push worked; rotation by
//           the USER on every other screen was simply unchecked. The exam
//           looked right, which is exactly what stopped anyone looking further.
//
//           Fix: `expo-screen-orientation` is now a dependency, AND IT IS
//           NEVER IMPORTED. Its ReactDelegateHandler's
//           `createRootViewController()` installs a root VC whose
//           `supportedInterfaceOrientations` starts with
//               guard !shouldUseRNScreenOrientation() else {
//                 return super.supportedInterfaceOrientations
//               }
//           - i.e. when react-native-screens has a trait set (always, here) it
//           DEFERS to the declarations in RootNavigator. Installing it is what
//           makes the declarative approach take effect; CALLING it is what
//           broke the exam in the first place (three rotations per navigation,
//           see RootNavigator's header). ⚠️ The ban stands: no `lockAsync`, no
//           `unlockAsync` anywhere in src/. An import of that package IS the
//           bug coming back.
//
//           ══ 2. THE APP ICON IS THE ECG PAPER STRIP ══
//           Replaces v0.72.0's six-lead artwork, which was flagged at the time
//           as collapsing into a smudge at 60 px and shipped anyway at the
//           user's choice. This one does not: rendered at a real 60 px, the
//           trace and the grid are both legible. Source (a clean 1024 square,
//           no backdrop, no pre-applied corner mask) at
//           assets/brand/app-icon-source.png.
//
//           ★ ANDROID IS FULL-BLEED AGAIN, and that is a judgement, not a
//           regression. v0.72.0 needed `make-adaptive-foreground.js` because
//           its lead labels sat in a column hard against the left edge and
//           every launcher mask sliced them mid-glyph. THIS artwork carries
//           paper TEXTURE at its edges - part numbers already cropped in the
//           source - so a circular crop reads as a window onto the strip
//           rather than as damage. Rendered under circle, rounded-square and
//           squircle masks and looked at before deciding; the script is kept
//           (and its polarity bug fixed, below) for artwork of the other kind.
//
//           The MONOCHROME layer stays THREE traces even though the artwork is
//           one strip. Both were rendered at a real 48 dp and compared: a lone
//           trace is swallowed by the circle, three read as "ECG paper", which
//           is what the artwork is. Same subject, different density - not the
//           heart-vs-ECG contradiction v0.72.0 had to fix.
//
//           Two landmines found and removed while doing this:
//             - `make-adaptive-foreground.js` clamped the subject difference at
//               ZERO, silently assuming the subject is BRIGHTER than its
//               background. True of neon on navy, false of a dark trace on
//               white paper - it would have deleted the subject and shipped a
//               blank gradient. Now signed.
//             - the monochrome's safe-circle check compared two floats the
//               solver makes EQUAL by construction, and rejected its own answer
//               ("342 px past a 342 px radius") on `$rows = 2`. Half a pixel of
//               slack; the real failures it caught were 64 px over.

// v0.74.0 - THE INSIGHTS TAB STOPS JUMPING, AND BOTH TABS RISE IN. JS only.
//
//           Reported: "the Insights tab glitches - it shows for a split second
//           and it looks unstable", with a screenshot of "Building your ECG ID"
//           sitting UNDER the status-bar clock, hard against the left edge,
//           with no screen title above it.
//
//           ★ ONE BUG, NOT TWO. `EcgIdentityPanel` has three early returns
//           (error / building / no-identity) and every one of them rendered
//           `<Empty>` BARE - outside the ScrollView. So they missed all three
//           things that scroller carries: `header`, `paddingTop` and
//           `paddingHorizontal`. On a bleedTop screen (v0.70.0 moved the title
//           into the content and handed the safe area to it) that is not a
//           cosmetic miss: the loading state drew at y=0 with no title, and
//           then the ENTIRE PAGE jumped down and inward the moment the
//           identity resolved and the real ScrollView took over. The jump IS
//           the glitch. It was easy to miss because the building state is over
//           in a frame or two on a warm cache - the slower the device, the
//           longer the wrong layout is on screen, which is the opposite of how
//           a bug should be found.
//
//           All four states now go through ONE `frame()`: the ScrollView is
//           defined once and they can no longer disagree about where the page
//           begins.
//
//           ── The entrance, asked for as "subtle and professional" ──
//           `PageTitle` v1.1.0 rises 8 pt over 380 ms on mount, and the body
//           follows 90 ms behind it (FadeUpView, 10 pt / 420 ms - the same
//           values History's rows have used since v1.4.0, so the app has one
//           motion vocabulary rather than a new one per screen). History's
//           skeleton, error card and empty card take it too.
//
//           Two things that are easy to get wrong here and are not:
//             - the title's entrance is MULTIPLIED INTO its scroll fade, in
//               one animated style. Two nested animated views both writing
//               `opacity` is how a screen entered mid-scroll ends up with a
//               half-lit heading, each view correct about its own factor.
//             - the body wrapper is KEYED BY PHASE. Without that, React keeps
//               the same FadeUpView mounted across a state change and the real
//               content appears instantly under a wrapper that already
//               finished animating for the spinner.
//             - and the wrapper restates `gap: 14`: the body is now ONE child
//               of the content container instead of many, so the rhythm
//               between sections would otherwise collapse.

// v0.73.0 - THE GREETING SITS BACK WHERE IT WAS. JS only.
//
//           Reported the moment v0.68.0 landed: "now Hello Elio is really
//           close to the button, it should be a bit higher up." Right, and it
//           is a SECOND-ORDER effect of that deletion rather than anything
//           about the greeting itself. PatientShell centres its content
//           vertically, so removing the subtitle did two things at once:
//             - it left only `inner`'s 12 pt gap between a 38 pt heading and
//               the hero button, and
//             - it moved the greeting DOWN by half the lost height, because
//               the whole column re-centred around a shorter block.
//           `greet` now carries `marginBottom: 32` - greetSub's old footprint
//           (marginTop 6 + a ~24 pt line at fontSize 20) - so the composition
//           returns to exactly where it stood. The words are gone; the air
//           they held is not, because that air was doing its own job.
//
//           ⚠️ PUBLISHED TO TWO RUNTIMES, deliberately. app.json is 0.38.0 for
//           the icon rebuild, but the phone in the user's hand is still the
//           0.37.0 binary (build 10) - so an update published only at 0.38.0
//           would reach NOBODY until TestFlight delivers build 11. It is
//           therefore published twice, once with app.json temporarily at
//           0.37.0 and once at 0.38.0. Both sit on the `production` branch;
//           expo-updates serves each client the newest update matching ITS
//           runtime, which is exactly what that mechanism is for. `ship.ps1`
//           refuses this on purpose (it guards the far more common mistake of
//           publishing into a void), so the two publishes are done by hand
//           with the same checks run first.

// v0.72.0 - THE APP ICON IS THE SIX-LEAD ECG.
//           ⚠️ NATIVE REBUILD: app.json 0.37.0 -> 0.38.0. An icon is compiled
//           into the binary's asset catalog (iOS) and res/mipmap (Android) -
//           no OTA can change it. ★ AND v0.68.0-v0.71.0 RIDE ALONG: they were
//           published OTA to runtime 0.37.0, this binary is 0.38.0, so those
//           updates can never reach it - but their code is in this bundle,
//           baked in, which is the correct outcome and not a loss. Every OTA
//           after this one must be published while app.json still reads
//           0.38.0.
//
//           The source artwork is committed at assets/brand/app-icon-source.png
//           so the set can be regenerated rather than re-drawn.
//
//           ⚠️ WHAT WAS FLAGGED AND OVERRULED, recorded because it is real.
//           Rendered at the ACTUAL home-screen sizes before building (180 px
//           and 60 px, magnified x3 with NEAREST NEIGHBOUR so nothing was
//           flattered): at 60 px the six thin traces and the I/II/III/aVR/
//           aVL/aVF labels collapse into a blue-grey smudge. Four alternatives
//           built from the same artwork and the same palette - 3 leads, 2
//           leads, 1 lead, each on the original gradient - were offered with
//           previews. The user chose the full artwork. It is their brand; this
//           note is here so nobody later mistakes the density for an oversight.
//
//           ── THE TWO THINGS THAT ARE NOT A MATTER OF TASTE ──
//           (1) ANDROID CROPS. An adaptive layer is 108dp and a launcher may
//               crop everything outside the middle 72dp. Full-bleed, every
//               mask sliced the lead labels through the middle of their
//               glyphs ("aVR" -> "R"). And the safe zone is a CIRCLE, not a
//               square: fitting the content to the 72dp SQUARE still clipped
//               it under Pixel's round mask, because a 683 px box has a
//               914 px diagonal. So scripts/make-adaptive-foreground.js
//               rebuilds that layer - the artwork's own gradient, with its own
//               six leads added back at 50 % of the frame, fitted by the
//               DIAGONAL and feathered at the edges so the content box leaves
//               no visible step. iOS is untouched and stays full-bleed: it
//               does not crop an icon, it only rounds its corners.
//           (2) THE MONOCHROME LAYER WAS A HEART. Android 13+ tints that
//               layer flat, and leaving v0.67.0's heart there would have put a
//               DIFFERENT MARK on a themed home screen than the one in the app
//               drawer - a brand disagreeing with itself depending on a display
//               setting, which nobody would have caught from Windows. It is now
//               three bold ECG traces (three, not six: at six the strokes are
//               hairlines at 48dp, which is the same failure the artwork has at
//               60 px and must not be repeated in the one layer we draw
//               ourselves). Its block size is SOLVED from the safe radius
//               rather than chosen, and the script fails the build if the runs
//               are the wrong count, too thin, or reach past the circle.
//
//           All five files were rendered under a circular mask, a rounded-square
//           mask and an iOS squircle, and LOOKED AT, before this was built
//           (CLAUDE.md §6.4 applies to pictures as much as to code). Nobody has
//           yet seen it on a real home screen.

// v0.71.0 - THE RANDOM SIGN-OUT. JS ONLY - OTA onto runtime 0.37.0.
//           Server half ships separately as CYPHIX_SERVER v0.7.0.
//
//           Reported as: "sometimes the app just logs me out and sends me back
//           to the login screen, and then I have to sign in again - probably
//           something on the server." Half right. There were SIX causes across
//           the two sides; four of them are in this bundle.
//
//           ★ THE WHOLE SURFACE IS FOUR LINES. A session can only end via
//           logoutUser, `sessionExpired` from the transport, revalidate
//           returning `rejected`, or the cold-start gate giving up. The middle
//           two both reduce to refreshSession() answering `rejected`, which
//           tokenStore produces in exactly two places. That is what made this
//           tractable rather than a hunt.
//
//           (a) ONLY 401/403 END A SESSION (tokenStore v2.3.0). The rule was
//               "any 4xx", which also covered:
//                 429 - /auth/refresh inherits the server's GLOBAL 300/min
//                       limiter keyed on req.ip with trustProxy, so clinic
//                       Wi-Fi and carrier CGNAT share one bucket. A "not right
//                       now" was signing people out permanently.
//                 404 - a rollback, a proxy answering mid-deploy, a base-URL
//                       typo. That one would have signed out EVERY user at once.
//               Those are `offline` now, which is what they always meant.
//
//           (b) A FAILED ENCLAVE WRITE IS NO LONGER FATAL (tokenStore v2.3.0).
//               With rotation the server retires the presented token the moment
//               it answers, so a swallowed SecureStore write left a REVOKED
//               token on disk - while storeSession reported success and the app
//               behaved perfectly for the ~15 minutes the access token had left,
//               then hit the server's replay detection. `memoryRefreshToken`
//               holds the newest token this process has seen and is preferred
//               over the enclave, which becomes what it should always have
//               been: the COLD-START source. Still recorded when the write
//               fails, because a cold start after one is still exposed.
//
//           (c) ONE REVALIDATION AT A TIME (httpAuthService v2.4.0 + the thunk's
//               `condition`). refreshSession was single-flight but released the
//               instant one exchange settled, and AuthGate dispatches
//               revalidateSession from three places that fire in the same second
//               on a foreground (boot, AppState->active, the offline backoff).
//               Three probes returning 401 a few hundred ms apart therefore
//               chained three SEQUENTIAL rotations - three more chances for a
//               reply to go missing. The lock had to move up to `revalidate`
//               itself, because the probe is where that 401 comes from.
//
//           (d) A STALE-TOKEN 401 IS RETRIED, NOT REFRESHED (httpBaseQuery
//               v1.4.0). prepareHeaders reads the access token at SEND time, so
//               any request in flight when a refresh lands comes back 401
//               through no fault of the session - and each one used to start its
//               own rotation. One tap fanning out to four queries could chain
//               four token exchanges.
//
//           (e) RECOVERY_TIMEOUT_MS 20 s -> 60 s (AuthGate v1.5.0). The comment
//               beside it already said a Render free-tier container takes ~50 s
//               to wake and that a ceiling under that "is not a timeout, it is a
//               guaranteed loss" - and then set one at 20 s. The gate lost that
//               race every time and put the sign-in screen in front of somebody
//               who was signed in, with their refresh still in flight.
//
//           ⚠️ WHAT THIS IS NOT. `tsc`, both bundles and expo-doctor cannot see
//           any of it: every one of these is a timing race or an error path that
//           only fires against a cold server, a locked screen or a lost packet.
//           It stays 🔬 in PARITY.md until it has gone a stretch on the phone
//           without a surprise sign-in. Settings -> About prints the last
//           session event, which is how to tell WHICH cause if it recurs.
//
//           KNOWN REMAINING, written down rather than quietly left: the web app
//           still signs out on ANY refresh failure (its httpBaseQuery is on the
//           old two-outcome contract, mobile's pre-v1.2.0 bug), which is a
//           parity violation of root CLAUDE.md 2.2; and `isPrincipalUsable` in
//           CYPHIX_SHARED has no clock-skew allowance - harmless at a 30-day
//           refresh TTL, real if that TTL is ever shortened.

// v0.70.0 - THE TOP BAR IS GONE FROM HISTORY AND INSIGHTS. JS ONLY - OTA
//           onto runtime 0.37.0.
//
//           Both tabs carried their title (and History its count and Import
//           button) on a frosted GlassSurface pinned to the top, with the page
//           scrolling behind it. Asked for as: "in Insights and History there
//           is no need for a top bar - it can be part of the page and fade out
//           as you scroll down."
//
//           ★ IT IS RENDERED INSIDE THE SCROLLER, NOT ANIMATED OVER IT.
//           The obvious implementation keeps the absolute bar and animates
//           `translateY: -scrollY` so it appears to scroll away. That is the
//           wrong one: it makes the title's POSITION a 60 Hz animation driven
//           by a throttled JS onScroll, and a position that lags the content
//           it belongs to reads as the title sliding on its own - exactly the
//           thing it is pretending not to do. As a ListHeaderComponent (and
//           as EcgIdentityPanel's new `header` first child) it travels with
//           the page for free, at the scroller's own frame rate, leaving
//           OPACITY as the only animated property. A lagging opacity is
//           invisible; a lagging position is not.
//
//           What the bar's removal DELETES, which is the real win:
//             - the measured header height, carried on every scroller's
//               content inset;
//             - `estimateHeaderH()`, which existed only to cover the first
//               frame before that measurement existed and was wrong by ~35 pt
//               on a notched phone when it was a flat constant;
//             - the `onLayout` that added the bar's own padding back by hand;
//             - the `scrolled` state and the hairline it switched;
//             - HEADER_PAD_BOTTOM, HEADER_SHADOW_AT and the Liquid-Glass tint
//               pair that had to be kept in step with the dock's.
//           Three numbers that had to agree, with no way of failing loudly
//           when they did not, in service of restating the name of the tab
//           the dock already highlights.
//
//           Two details that are not obvious and are therefore written down:
//             - a faded-out Import button must stop being a TARGET. Pointer
//               events are not animatable, so the screens keep one boolean,
//               flipped at the same threshold the fade uses (exported as
//               TITLE_FADE_DISTANCE so the two cannot drift).
//             - History's refresh badge used to hang off the measured header
//               height. It now sits level with the title row and centred -
//               the one part of that line nothing occupies, since the heading
//               hugs the leading edge and Import is a square on the trailing
//               one. It has to be a fixed position rather than one that
//               assumes the page has been pulled down, because `refreshing`
//               is also true during a background sync.
//
//           Fifth of five changes asked for in one sitting.

// v0.69.0 - THE ROLE PREVIEW STARTS AT ADMIN. JS ONLY - OTA onto runtime
//           0.37.0.
//
//           Settings -> Account -> "Preview as role" was being set to Admin by
//           hand on every launch, because the slice booted it at `null`. It now
//           boots at DEFAULT_PREVIEW_ROLE ('admin', config/featureFlags.ts),
//           and the two paths that used to reset it to null - sign-out and a
//           server-rejected session - reset it to that default instead.
//
//           ★ IT STILL GRANTS NOTHING, and that is the design rather than a
//           caveat. The server authorises every request against the session's
//           REAL role, and an account made through registration is written
//           `patient` literally (CYPHIX_SERVER/src/routes/auth.ts). So this
//           draws the admin affordances; a genuinely admin-only request behind
//           one still returns 403.
//
//           The one thing worth checking before shipping it, checked: an admin
//           has `history:read`, so History and Insights stop sending a
//           patientId and call GET /recordings instead of
//           GET /patients/:id/recordings. That is NOT a 403 for a patient
//           account - the server's `listFor` falls through to
//           assertCanOrSelf(..., 'history:read:self', req.user.patientId),
//           which a patient satisfies against their own id, and then scopes
//           the rows with allowedPatientIds(). Same studies, different URL.

// v0.68.0 - THE HOME SUBTITLE IS GONE. JS ONLY - app.json stays 0.37.0, so
//           this is an OTA onto the build-10 binary (CLAUDE.md 5A.2).
//
//           "Performing a Home ECG Test" (`homeSubPatient`) sat between the
//           greeting and the hero button. Removed at the user's instruction,
//           and it earns the removal on its own: it narrated the screen to
//           somebody already standing on it, one line above a button that
//           says "Start Test". The greeting stays - it is the only thing up
//           there the patient did not already know.
//
//           The key is deleted from BOTH locales rather than left orphaned.
//           `he.ts` is `Record<TranslationKey, string>`, so removing it from
//           `en.ts` alone would not compile - which is the shape working as
//           intended, not an obstacle.
//
//           First of five changes asked for in one sitting; each ships as its
//           own update so a regression has one candidate, not five.

// v0.67.0 - THE APP ICON IS THE ECG HEART.
//           ⚠️ NATIVE REBUILD: app.json 0.36.0 -> 0.37.0. An icon is compiled
//           into the binary's asset catalog (iOS) and res/mipmap (Android) -
//           there is no OTA that can change it, so `npm run ship:rebuild`.
//           ★ AND THE 0.66.0 LEAD DEBUG SCREEN RIDES ALONG. It was published
//           OTA to runtime 0.36.0; this binary is 0.37.0, so that update can
//           never reach it - but the code is in this bundle, baked in, which
//           is the correct outcome and not a loss.
//
//           Five files, from ONE square artwork, via `npm run icons`:
//             icon.png                    iOS + legacy Android, full bleed,
//                                         and deliberately NO ALPHA CHANNEL -
//                                         the App Store rejects one outright.
//             android-icon-foreground.png the adaptive foreground.
//             android-icon-background.png the same colour field with the heart
//                                         averaged out of it.
//             android-icon-monochrome.png Android 13+ themed icon.
//             favicon.png                 web.
//
//           ★ THE MONOCHROME ONE IS DRAWN, NOT DERIVED. Android tints that
//           layer flat and throws its colour away, so a threshold of the
//           artwork gives a ragged blob. It is a filled heart with the pulse
//           trace punched out of it - and the punch is CHECKED: the script
//           reads the centre column and fails if the R spike has reached the
//           heart's own notch, because when those two gaps merge the lobes
//           read as two separate blobs. The first two attempts did exactly
//           that (the spike was sized against the canvas instead of the
//           heart), which is why the check exists rather than an opinion.
//
//           Geometry that had to be true and now is: an adaptive layer is
//           108dp and a launcher may crop everything outside the middle 72dp,
//           so only 66.7 % of the frame is safe. The heart occupies ~54 %, so
//           it survives a circular mask with room to spare; only the
//           horizontal pulse line runs off the edge, which it does in the
//           artwork too. Rendered and LOOKED AT under both masks before
//           shipping (§6.4 applies to pictures as much as to code).
//
//           `adaptiveIcon.backgroundColor` went #FFFFFF -> #9971D8, the mean
//           of the artwork's own field. It is only a fallback, but a white
//           flash behind a purple icon is not this palette.
//
//           The splash screen is untouched and still carries the old mark -
//           a separate decision, not an oversight.

// v0.66.0 - A TEMPORARY SCREEN THAT DRAWS THE CHANNEL NOTHING ELSE DRAWS.
// v0.66.0 - A TEMPORARY SCREEN THAT DRAWS THE CHANNEL NOTHING ELSE DRAWS.
//           JS ONLY: app.json stayed 0.36.0, so this shipped as an OTA onto
//           the dual-Lead-II binary (build 9) - NOT a rebuild (CLAUDE.md
//           5A.2). ⚠️ v0.67.0 has since moved app.json to 0.37.0, so that
//           update no longer reaches anything; the code is baked into the
//           0.37.0 binary instead.
//
//           Asked for the day firmware v3 went on the board: "how can I see
//           that it records two leads? Maybe a debug screen where I see only
//           Lead I, Lead II and the second Lead II - no intros, no timed
//           recording, just to see the signal is live. Only for this debug,
//           and then we switch it off as if it had never been."
//
//           The question is a fair one and v0.65.0 made it unanswerable ON
//           PURPOSE: the second copy is recorded and never drawn (bleClient
//           header), because a patient holding still does not need a monitor
//           that changed. The person who just wired a fifth electrode does.
//           Until now the only evidence the third channel arrived was a fusion
//           caption on a finished report - ten seconds and a save later.
//
//           Settings > ECG Device > "Lead debug" (the row wears a DEBUG chip):
//             * Connect, and three stacked traces on ONE shared scale - Lead I,
//               II-a, and II-b in its own ink so a screenshot of this screen
//               cannot pass for the exam monitor. Filtered (the exam's own
//               display chain) or Raw.
//             * What the stream IS: 3-channel (fw v3) or 2-channel (legacy),
//               the MEASURED sample rate (not the nominal 320), lost packets,
//               RLD / LL#2 / rail states.
//             * ★ THE TWO NUMBERS THAT MATTER: the II-a vs II-b correlation and
//               the RMS of their difference. The same lead from two electrodes
//               should correlate near 1 - and the difference must be small BUT
//               NOT ZERO. Exactly zero means one measurement duplicated
//               somewhere in the pipeline: the one failure that would look
//               perfect on a trace, so the screen says so in words.
//             * No recording, no timer, no gate, no save.
//
//           IT IS A FLAG, AND THE FLAG IS THE OFF SWITCH:
//           LEAD_DEBUG_SCREEN_ENABLED (config/featureFlags.ts). False = the
//           route is not registered and the Settings row is not rendered; the
//           three new files become unreachable. English only and outside the
//           i18n tables on purpose (like the About diagnostics) - so removing
//           it orphans no keys. Mobile-only; recorded in PARITY.md.
//
//           It reads the SAME ring buffer every other screen reads - no second
//           path into the hardware - so what it shows is what gets recorded.
//
//           ⚠️ 6.4: typechecks and bundles. It has not been seen on a phone,
//           and neither has anything else in the 0.36.0 binary.

// v0.65.0 - ★ LEAD II, MEASURED TWICE. ⚠️ NATIVE REBUILD: app.json 0.35.0 →
//           0.36.0 (`modules/cyphix-ble`, both halves). Ship with `npm run
//           ship:rebuild`; do NOT `eas update` until the 0.36.0 binary is
//           installed (mobile CLAUDE.md §5A.2) - it would reach nobody.
//
//           Firmware v3 puts a SECOND left-leg electrode on the ADS1293 and
//           gives the right-leg drive an electrode of its own. The device now
//           measures Lead II twice - copy A is LL#1-RA, the pair every device
//           has ever measured; copy B is LL#2-RA. Same heart in both. NOT the
//           same noise: each leg electrode has its own contact noise, its own
//           motion artefact, its own patch of muscle under it. That
//           redundancy is the only source of noise reduction this product is
//           allowed to use, because the usual one is forbidden - ischaemia
//           lives anywhere from 0.05 to 150 Hz, muscle noise sits right on top
//           of it, and a 40 Hz low-pass takes both. `fuseLeadII` (shared)
//           removes noise WITHOUT a frequency filter: it weights the quieter
//           copy, and averages what does not repeat from beat to beat, never
//           inside the QRS.
//
//           WHAT THE APP DOES WITH IT, in one sentence: records the second
//           copy, never draws it, and fuses it at READING time.
//
//           1. THE LIVE SCREEN DOES NOT CHANGE, and that is a decision, not an
//              omission. `leadII` is copy A on every device, so SixLeadMonitor,
//              EcgWave and the heartbeat gate read exactly what they read
//              yesterday. Fusion needs the whole recording (it estimates beats,
//              gain and a noise reference from all of it), so there is nothing
//              honest to draw live - and a monitor that looked different on a
//              new device would be one more thing to explain to a patient
//              holding still.
//
//           2. IT IS STORED RAW, LIKE THE OTHER TWO. The fused trace is an
//              OPINION about two measurements, so it is recomputed by whoever
//              opens the record and can be switched off in the viewer - the
//              same argument that has kept the filters out of storage since
//              v1.0.0. A third channel is kept for a recording only if it was
//              there from the first captured sample to the last; appear or
//              vanish part-way and that recording is a normal two-channel one.
//
//           3. ONE FUNCTION DECIDES FUSE-OR-NOT, for every reader: the
//              end-of-exam report, the History viewer, the PDF and the list
//              digest all go through the shared `limbLeadsFromRaw` (stored
//              records via `limbLeadsFromRecording`, which adds the one gate
//              the samples cannot know: LIMB ONLY - in the chest protocol the
//              probe electrode moves and copy B does not follow it). Five
//              hand-rolled decode loops were five chances for the list, the
//              screen and the paper to describe one recording differently.
//              The PDF and the digest PIN fusion on, as they pin the filters;
//              the viewer opens with it on, so all three agree by default.
//
//           4. ★ THE ONE EXCEPTION, DELIBERATE: THE ECG ID STAYS ON COPY A.
//              An identity is a baseline across months of recordings, and
//              every one made before the second electrode existed has only
//              copy A. Fuse the new ones and they are systematically quieter
//              than the old ones - which the ECG ID would report as a change
//              in the patient's HEART on the day they changed DEVICE.
//
//           5. IT SAYS WHAT IT DID. One quiet line where the recording's
//              metadata already lives (viewer header, end-of-exam report) and
//              a paragraph on the PDF's processing section: "Lead II fused from
//              two electrodes · noise 26 → 9 µV" - or, when the fusion ran and
//              DECLINED, that it did and why. A second channel that was
//              silently ignored looks exactly like one that was used. A
//              recording with one copy says nothing at all, so every study
//              made before today keeps the screen it had.
//
//           6. THE ONE LIVE CHANGE (asked for): two new contact notes on the
//              limb exam, in the rail note's own slot and style. Reference
//              electrode off - nothing on screen can be trusted. Second leg
//              electrode off - the recording will use a single copy. Both
//              gated on the 3-channel stream being ACTIVE: LOD bit 3 is
//              ADS1293 input IN4, which on older hardware is not an electrode.
//
//           NATIVE, BOTH HALVES IN LOCKSTEP: a second GATT characteristic
//           (the legacy one stays byte-identical, so every build ever shipped
//           still works against v3 firmware), subscribe to ONE of the two, a
//           STRICT 13-byte parser mirroring `parseEcgPacket3`, `leadIIb` in
//           every batch (EMPTY on a legacy device - that is how JS tells), and
//           `onDeviceFlags` on change of the flags byte.
//
//           ★ FOUND WHILE THERE: ANDROID NEVER REQUESTED AN MTU. A GATT link
//           opens at ATT MTU 23 - a 20-byte notification - and only the
//           client may ask for more; iOS does it unprompted, Android does
//           not. So by the spec every 146 B legacy packet has been arriving
//           cut to 20 bytes and dropped by the stride check: "connected, no
//           signal". PARITY has carried Android BLE as never-run since
//           v0.23.0, which is how this survived. Kotlin now requests 185
//           BEFORE service discovery (GATT operations must not overlap).
//
//           ⚠️ WHAT "VERIFIED" MEANS HERE (§6.4): tsc is clean, the bundle
//           builds, and `verify-pdf` builds twelve reports including three
//           dual-Lead-II ones (fused 30 → 7 µV on synthetic noise; a
//           disconnected second electrode correctly DECLINED). NOT ONE LINE
//           of the Swift or the Kotlin has been compiled - this is a Windows
//           machine - and none of it has met a v3 device.

// v0.64.0 - THE TITLE STAYS, THE SENTENCE UNDER IT DOES NOT.
//
//           Reported one release after it was added: "the whole 'one beat
//           average' thing, three unnecessary lines!! why the rambling - the
//           first line, 'your heart's fingerprint', is enough, that's it. If
//           you tap on it, an explanation opens from the bottom like the
//           other things."
//
//           Both halves are right, and v0.62.0 had got one of them. Its
//           argument was that the figure needed a TITLE, because nothing
//           about one clean ECG trace says it is an average of many
//           recordings rather than the last one. That still holds and the
//           title stays. What it then did was answer the question the title
//           raises IN PLACE, permanently, for every reader on every visit -
//           which is the v0.44.0 mistake in a smaller font. A TITLE is
//           navigation: read every visit, costs one glance. An EXPLANATION is
//           read once, ever. Charging every future visit for a question that
//           was answered on the first one is exactly what this screen was
//           stripped of. And at 13.5 pt on a phone it was not "a line", it
//           wrapped to three.
//
//           So the heading is a control now, on the pattern this app already
//           has in three places (every Values tile, every interval row, every
//           finding): tap, and a BottomSheet comes up. The sheet can hold far
//           MORE than the screen line could, so the explanation is finally
//           complete rather than compressed into a clause - what it is, why
//           averaging is the whole point (what repeats is the heart; a shaky
//           hand and a loose electrode cancel themselves out), and that the
//           "usually" figures below are what YOUR baseline says is normal,
//           not what is normal for people in general.
//
//           The tap target is the width of the words, not the column: a
//           full-width invisible button directly above the ECG would swallow
//           the start of a horizontal drag on the sheet below it, and that
//           drag is the gesture the caliper lives on.
//
// v0.63.0 - ★ THE APP HAD expo-updates INSTALLED, CONFIGURED, DELIVERING -
//           AND NEVER CALLED IT ONCE.
//
//           Reported: "I opened and closed twice and it is still stuck on 61.
//           Why?" The publish was correct - the newest group was on branch
//           production at the same runtime that had just delivered 0.61.0 -
//           and the phone was right too. The gap between them is the
//           library's defaults, which nothing here had ever overridden or
//           supplemented:
//
//             checkAutomatically      ON_LOAD  - check on every cold launch
//             fallbackToCacheTimeout  0        - never make the user wait
//
//           So the app launches instantly on the bundle it already has,
//           downloads the new one in the BACKGROUND, and applies it on the
//           NEXT cold launch. Every published update costs two cold launches,
//           and the second only helps if the first stayed open long enough to
//           finish downloading. Worse: from the phone, THREE different
//           situations look identical - downloading, downloaded-and-waiting,
//           and never-published. The reported bug was the middle one, and no
//           screen in the app could show it.
//
//           `useOtaUpdate` + a row in About now name the state, check on
//           resume as well as on cold launch (expo-updates only does the
//           latter, which is how a resumed app sits for days on a stale
//           bundle), and turn the waiting update into a tap.
//
//           ★ IT NEVER RELOADS BY ITSELF. reloadAsync() tears down the JS
//           context; on a device that may be holding - or streaming - a
//           recording, an automatic reload is data loss with a friendly name,
//           fired at whatever moment the CDN happens to answer. The reload is
//           a tap, on the one screen where nothing is being recorded, and the
//           library's passive apply-on-next-launch is left exactly as it was.
//
// v0.62.0 - INSIGHTS SAYS WHAT IT IS SHOWING.
//
//           1. V1-V6 ARE HIDDEN, behind PRECORDIAL_LEADS_ENABLED. The
//              coverage grid was built to print all TWELVE leads with the six
//              un-measured ones drawn empty, and the argument was deliberate:
//              a table listing only what exists shows six confident leads and
//              says nothing about the SHAPE of the record - a reader would
//              have to already know that a limb-lead device cannot produce
//              V1. That argument is addressed to a clinician and is the wrong
//              one for the person whose heart it is. On a patient's screen
//              six permanently grey cells are not "un-measured territory",
//              they are six things that look broken, on a device that is
//              never going to fill them.
//              A FLAG and not a deletion, because the seam is real: nothing
//              in the grid knows how many leads the hardware has. When a
//              12-lead device ships, flip the constant and the cells return -
//              empty at first, then filling in on their own.
//
//           2. THE CURVE GETS A NAME. Reported: "nobody will understand that
//              this is a BASELINE or an average beat over time if it isn't
//              written above it."
//              This is NOT a reversal of v0.44.0, which stripped a confidence
//              ring, three figures, a three-line explainer, a legend row and
//              every explanatory paragraph off this screen. Those were a
//              TUTORIAL: they described things the reader could already see,
//              at greater length than the things themselves. What was missing
//              after them is the line that was never there - the figure's
//              TITLE. A chart with no title is not minimal, it is anonymous.
//              And this chart is not self-evident in the way that matters
//              most: nothing about one clean ECG trace says it is the AVERAGE
//              OF MANY recordings rather than the last one, and every number
//              under it - the match percentage, "usually 128", the whole
//              timeline - means something different depending on which of
//              those the reader believes they are looking at.
//              So it passes this screen's own rule ("if a line does not
//              change what the reader does next, it is not on the screen") on
//              the strongest grounds available: without it, the reader
//              misreads everything below it.
//              "Fingerprint" is the metaphor the feature already runs on -
//              this panel IS the ECG ID - and it carries both facts a bare
//              trace cannot: unique to this person, and BUILT UP rather than
//              captured.
//
//           3. The lead row is labelled too, for the same reason: six cells
//              reading "I 12 - II 12" are a picker and a per-lead evidence
//              count, and a bare figure under a lead name could just as
//              easily be a measurement.
//              The two new lines are roughly paid for by the row of cells
//              that left, which matters: everything from the trace down to
//              the plain reading is sized to exactly ONE viewport.
//
// v0.61.0 - "TAKE INSPIRATION FROM IT, DO NOT DO IT 1:1." Four corrections to
//           v0.60.0, three of them the user's and one of them mine.
//
//           1. THE SIX-LEAD SHEET IS PAGE 1 AGAIN. v0.60.0 moved it to page 2
//              on the reasoning that a clinical document opens with a summary.
//              The user's answer - "the six-lead report is the most important
//              thing, that is page 1" - is the stronger argument here, and not
//              only because it is theirs: every number on the measurements
//              page is a claim ABOUT the signal made by this app's own
//              delineator, and the trace is the only page in the document a
//              second reader can check independently. A report that opens with
//              its derived summary asks to be believed; one that opens with
//              the trace asks to be read.
//
//           2. THE MASTHEAD LOSES ITS SLAB. Reported as ugly, and it was: a
//              44 mm plum-to-navy card carrying the rate and the trace, sitting
//              3 mm under a 26 mm navy letterhead. Two dark bands stacked at
//              the top of a sheet is a poster, not a clinical page. The rate is
//              now set straight on the paper in the wordmark's navy over a
//              hairline, and the trace under it is drawn in the SAME navy as
//              the six-lead sheets - it is the same signal, and a second colour
//              on a second page implied it was a second thing.
//              The gradient-clipped headline went with the band.
//              background-clip:text existed only to make light rose type
//              legible on plum, and it is the most fragile declaration in the
//              stylesheet (without it the headline number renders INVISIBLE,
//              which is why it needed an @supports guard at all). Deleting a
//              load-bearing guard is safe here only because the thing it was
//              guarding is gone too.
//
//           3. THE AXIS NEEDLE: 1.1 mm to 0.45 mm, with a 0.85 mm head. Not
//              merely heavy - measurably wrong. One viewBox unit is one
//              millimetre in that figure, so the needle was drawn thicker than
//              the sector boundary it is meant to be read against, on a figure
//              whose entire job is to report an ANGLE. A fat needle covers
//              several degrees of the thing it is reporting.
//
//           4. THE CHROME GOES BACK TO CYPHIX. The rule, in one sentence: the
//              measurements page keeps the redesign's SECTIONING - a hue per
//              family of measurement, the tinted tiles, the reference bands,
//              the axis and quality cards - and everything that is CHROME
//              (letterhead, section rules, table headers, figure panels,
//              footers) returns to white stock, the wordmark's navy and the
//              report's blue. Those elements are the document's identity, and
//              it already had one. The lighter weights v0.60.0 introduced were
//              right and are kept; only the hues came home.
//
//           MY OWN REGRESSION, FIXED: page 4 ended two-fifths of the way down.
//           v0.60.0 removed the empty blind-spots section (correctly) and gave
//           its 41 mm to nothing. What fills it is the one thing this report
//           has never said and should have - HOW THE SIGNAL WAS PROCESSED.
//           Every trace here is baseline-corrected, notch-filtered and
//           smoothed before it is drawn OR measured, and four of the six leads
//           are DERIVED rather than recorded. A reader measuring an interval
//           off page 1 is entitled to know that. It is provenance, never a
//           finding, so it is allowed on a report that no longer interprets.
//
//           AND A FIFTH CLIPPING BUG, same family as v0.60.0's four and found
//           the same way: a four-line device subtitle printed OUTSIDE the
//           letterhead, in grey on white paper, across the blue keyline and
//           into the first section heading. Every block in this report is
//           overflow:hidden except the one that is full-bleed and
//           negative-margined.
//
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
