/* ==================================================================
   OverlayPortal (atom) — lifts an overlay out of the screen that owns
   it and renders it at the ROOT of the app, above the navigator.

   ══════════════════════════════════════════════════════════════════
   ★ WHY: A SHEET RENDERED INSIDE A SCREEN CANNOT COVER THE DOCK
   ══════════════════════════════════════════════════════════════════
   The floating dock is the tab navigator's `tabBar` — a SIBLING of the
   screen, rendered after it. Nothing inside a screen can paint above it:
   `zIndex` orders siblings within one parent, and these are in different
   parents. So `OverlayLayer`, mounted in the screen's own tree, was
   always underneath the dock, whatever it set.

   Three consequences, all of which were reported as separate bugs:

     1. **The sheet's footer lived under the dock.** The panel is
        bottom-anchored, so a pinned Save button lands in exactly the
        ~90 pt the dock occupies. Fixing the clipping in v0.39.1 moved
        the button from "off screen" to "behind the bar" — visible in
        neither case. "עדיין חבוי מתחת."
     2. **The scrim did not dim the dock**, so a modal left one bright,
        fully saturated control floating on top of it.
     3. **The dock stayed TAPPABLE through the scrim.** A patient could
        change tabs with an unsaved edit sheet open, which left the
        editor mounted and its draft alive on a screen they had left.

   A `Modal` would also paint above the dock — and is exactly what
   `OverlayLayer` had to stop using, because a Modal is its own window
   and the blur inside one has nothing to sample (see that file). A
   portal keeps the overlay in the SAME window — so the material still
   samples the real page — while moving it out of the screen's subtree.
   That is the whole trick: same window, different parent.

   ══ WHY A MODULE-LEVEL STORE AND NOT A CONTEXT ══
   A context provider holding the mounted overlays in state re-renders
   EVERY DESCENDANT — the whole app — each time a sheet re-renders. With
   an external store only the host is subscribed, so publishing costs one
   re-render of a `View` with one child.

   ★ Only the ELEMENTS move. Every hook, every `Animated.Value` and all
   state stay in the component that owns them, exactly where they were.
   What changes is the parent the elements are committed under — which
   means the contexts they read resolve at the HOST's position. The host
   is mounted inside every app-wide provider (Redux, i18n, theme, safe
   area, gesture handler) so that is the same set. It is NOT inside the
   navigator: an overlay's content may not call `useNavigation()`.
   ================================================================== */

import { Fragment, useEffect, useId, useSyncExternalStore, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

interface Entry {
  id: string;
  node: ReactNode;
}

/* Replaced, never mutated: `useSyncExternalStore` compares snapshots by
   identity, so a mutated array would be seen as unchanged — and a fresh
   one built per read would loop forever. */
let entries: Entry[] = [];
let hosts = 0;
const listeners = new Set<() => void>();

const emit = () => {
  listeners.forEach((l) => l());
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

function publish(id: string, node: ReactNode) {
  const i = entries.findIndex((e) => e.id === id);
  if (i === -1) {
    entries = [...entries, { id, node }];
  } else {
    const next = entries.slice();
    next[i] = { id, node };
    entries = next;
  }
  emit();
}

function withdraw(id: string) {
  if (!entries.some((e) => e.id === id)) return;
  entries = entries.filter((e) => e.id !== id);
  emit();
}

/**
 * Render `node` in the app-root host.
 *
 * @returns whether a host is mounted. When it is not — a component tree
 * without `OverlayPortalHost` — the caller must render `node` itself, so
 * an overlay can never silently vanish because of where it was used.
 */
export function useOverlayPortal(node: ReactNode): boolean {
  const id = useId();
  const hosted = useSyncExternalStore(subscribe, () => hosts > 0);

  useEffect(() => {
    if (hosted) publish(id, node);
  }, [hosted, id, node]);

  /* Separate, with no deps: the node must be withdrawn when the OWNER
     unmounts. Folding this into the effect above would withdraw and
     re-publish on every content change, unmounting the panel's native
     views mid-animation. */
  useEffect(() => () => withdraw(id), [id]);

  return hosted;
}

/**
 * Where portalled overlays are rendered. Mount ONCE, at the composition
 * root, AFTER the navigator — paint order is what puts it above the dock.
 */
export function OverlayPortalHost() {
  const list = useSyncExternalStore(subscribe, () => entries);

  useEffect(() => {
    hosts += 1;
    emit();
    return () => {
      hosts -= 1;
      emit();
    };
  }, []);

  /* Nothing at all while idle: a full-screen view that exists but is
     `box-none` is still a view the compositor walks every frame. */
  if (list.length === 0) return null;

  return (
    <View style={styles.host} pointerEvents="box-none">
      {list.map((e) => (
        <Fragment key={e.id}>{e.node}</Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    /* Paint order already puts this last on iOS. Android composites by
       elevation FIRST and sibling order second, so without this the
       dock's own elevation (12, and 24 on its shadowed bar) would lift
       it back over the sheet on exactly one of the two platforms. */
    zIndex: 1000,
    elevation: 1000,
  },
});

// v1.0.0 — Overlays render at the app root instead of inside the screen that
//          owns them. A screen cannot paint above the dock — the dock is the
//          navigator's tab bar, a sibling of the screen, and zIndex only orders
//          siblings — so a bottom-anchored sheet's pinned footer sat underneath
//          it, the scrim did not dim it, and it stayed tappable through a modal.
//          Same window as before (the blur still samples the real page); only
//          the parent changes.
