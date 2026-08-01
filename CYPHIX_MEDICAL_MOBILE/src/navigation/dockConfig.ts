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

export interface DockConfigItem {
  name: string;
  label: string;
  Icon: ComponentType<NavIconProps>;
  /** The centre "home" anchor — larger, and navy even when unselected. */
  emphasized?: boolean;
}

export const DOCK_ITEMS: DockConfigItem[] = [
  { name: 'History', label: 'History', Icon: HistoryNavIcon },
  { name: 'Tests', label: 'My Tests', Icon: TestsNavIcon },
  { name: 'Home', label: 'Home', Icon: HomeNavIcon, emphasized: true },
  { name: 'Chat', label: 'Chat', Icon: ChatNavIcon },
  { name: 'Profile', label: 'Profile', Icon: ProfileNavIcon },
];

// v0.1.0 — Dock order + emphasized Home, mirroring the web dockConfig.
