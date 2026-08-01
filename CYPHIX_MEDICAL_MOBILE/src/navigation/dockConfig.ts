/* ==================================================================
   Bottom-dock config — mirrors the web app's
   components/organisms/BottomDock/dockConfig.tsx exactly:
   order History · Tests · HOME · Chat · Profile, with HOME emphasized in
   the centre so a lost patient always finds the main page.

   Live Scan is deliberately NOT here — on the web it moved to Settings
   as a debug tool, and the Cross-Platform Rule says mobile follows.
   ================================================================== */

import type { ComponentType } from 'react';
import {
  ChatNavIcon,
  HistoryNavIcon,
  HomeNavIcon,
  ProfileNavIcon,
  TestsNavIcon,
  type NavIconProps,
} from '@/components/atoms/NavIcon/NavIcons';
import type { TranslationKey } from '@/i18n/config';

export interface DockConfigItem {
  /** The route name — an identifier, never shown to anyone. */
  name: string;
  /** A locale KEY, not a sentence: this table is module scope and is
      evaluated once, so a literal here would freeze the dock in whatever
      language the app started in. `BottomDock` resolves it per render. */
  labelKey: TranslationKey;
  Icon: ComponentType<NavIconProps>;
  /** The centre "home" anchor — larger, and navy even when unselected. */
  emphasized?: boolean;
}

export const DOCK_ITEMS: DockConfigItem[] = [
  { name: 'History', labelKey: 'dockHistory', Icon: HistoryNavIcon },
  { name: 'Tests', labelKey: 'dockTests', Icon: TestsNavIcon },
  { name: 'Home', labelKey: 'dockHome', Icon: HomeNavIcon, emphasized: true },
  { name: 'Chat', labelKey: 'dockChat', Icon: ChatNavIcon },
  { name: 'Profile', labelKey: 'dockProfile', Icon: ProfileNavIcon },
];

// v0.2.0 — Labels are locale keys resolved at render, not baked-in strings.
