/* ==================================================================
   useReplayOnFocus — run an entrance on arrival, every time, from
   anywhere in the tree.

   ══ WHY THIS EXISTS ══
   Asked for as: *"can the animation happen every time I switch tab, and
   not only the first time I enter the tab in a session?"*

   It only happened once because the entrances (`FadeUpView`,
   `PageTitle`) start from `useEffect` on MOUNT — and a bottom-tab screen
   mounts once and then stays mounted for the life of the session.
   Leaving a tab does not unmount it; that is the whole point of a tab
   bar, and it is what makes coming back instant. So the second visit had
   nothing to animate: the effect had already run, hours ago. The event
   that means "I am looking at this now" is FOCUS, not mount.

   ══ ★ WHY NOT `useIsFocused()` / `useFocusEffect()` ══
   Both call `useNavigation()`, which THROWS when there is no navigator
   above the component — and the animated surfaces here include three
   that are in exactly that position:

     • **The auth flow.** `AuthGate` stands in FRONT of the navigator
       (see `App.tsx`), so the sign-in and registration steps — where
       `SuccessStep` uses `FadeUpView` — have no navigation context at
       all. A bare `useIsFocused()` in that atom would take down the app
       on launch for a signed-out user.
     • **Every sheet.** Overlays are portalled to the app root, which is
       deliberately OUTSIDE the navigator; `OverlayPortal`'s own header
       states that an overlay's content may not call `useNavigation()`.
       `EcgScreeningSheet` and `ScreeningVerdict` animate in there.
     • Anything mounted above the navigator in future.

   So the context is read with a plain `useContext`, which returns
   `undefined` rather than throwing, and **no navigator means mount
   only** — the component keeps exactly its old behaviour instead of
   losing its animation or crashing. Degrading to what it did before is
   the only safe direction for a presentation hook.

   ══════════════════════════════════════════════════════════════════
   ★ AND WHY THIS IS NOT A `focused` BOOLEAN IN REACT STATE
   ══════════════════════════════════════════════════════════════════
   The obvious shape is `const focused = useScreenFocus()` and an effect
   keyed on it. It was written that way first, and it puts the reset ONE
   COMMIT LATE:

     tab becomes visible (commit 1, content still at its finished state)
       → focus event → setState → re-render (commit 2) → effect → reset to 0

   Between those two commits the screen is on screen, fully drawn, in the
   state it was left in. Then it blanks and rises. That is a FLASH, and
   this app has had precisely that reported before — *"the tab is glitchy,
   it appears for a split second"*. An entrance animation that introduces
   a flash is worse than no entrance animation.

   Writing the shared value straight from the navigation listener has no
   commit in it at all: the listener runs in the same JS tick as the
   commit that made the screen visible, and Reanimated flushes the write
   to the UI thread at the end of that tick — the same frame. It is also
   free of the re-render that a boolean would cost on every row of a list
   (`FadeUpView` is per-row in History).

   ⚠️ `play` MUST be memoised (`useCallback`). It is an effect dependency,
   so a fresh closure every render re-subscribes and replays on every
   render — an animation that never finishes.
   ================================================================== */

import { NavigationContext } from '@react-navigation/native';
import { useContext, useEffect } from 'react';

/**
 * Call `play` now, and again every time this screen is focused.
 *
 * ```ts
 * const play = useCallback(() => {
 *   p.value = 0;                       // ★ withTiming starts from the CURRENT
 *   p.value = withTiming(1, …);        //   value, which on a return visit is 1
 * }, [p]);
 * useReplayOnFocus(play);
 * ```
 *
 * @param play Memoised. Re-running it must be safe: on the first visit it
 * fires on mount AND on the focus event that follows a frame later. Both
 * happen while the value is still ~0, so the second is invisible — but a
 * `play` with a side effect other than restarting an animation does not
 * belong here.
 */
export function useReplayOnFocus(play: () => void): void {
  const navigation = useContext(NavigationContext);

  useEffect(() => {
    play();
    /* No navigator above us — the auth flow, a portalled sheet. Mount-only,
       exactly as before this hook existed. */
    if (!navigation) return;
    return navigation.addListener('focus', play);
  }, [navigation, play]);
}

// v1.0.0 — Entrances replay on every visit instead of once per session. A tab
//          screen mounts once and stays mounted, so a mount-time animation
//          plays for the first arrival and never again; focus is the event
//          that means "I am looking at this now". Reads the navigation context
//          directly rather than through `useIsFocused()`, which throws where
//          there is no navigator — the auth flow and every portalled sheet are
//          in exactly that position, so the idiomatic hook would have crashed
//          the sign-in screen. Drives the animation from the listener rather
//          than from a `focused` boolean in state, because state puts the
//          reset one commit after the screen is already visible: the content
//          would be seen in its finished state for a frame and then blank.
