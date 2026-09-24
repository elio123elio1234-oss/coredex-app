/* ★ FIRST LINE, AND IT HAS TO BE. This module stamps T0 when it is
   evaluated, and it is the app's only handle on "when did JavaScript
   start". Imported anywhere later — App.tsx, a provider — it would stamp
   after everything above it had already run and quietly under-report the
   launch it exists to measure. */
/* Relative, not `@/`: this is the entry module, resolved before
   anything else, and it is not worth betting the app's startup on a
   tsconfig path alias here. */
import './src/services/boot/bootTimeline';

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

// v1.1.0 — Imports the boot timeline FIRST, so T0 is stamped as close to "JS
//          started" as this app can get from inside itself.
// v1.0.0 — Expo entry point: registers App as the root component.
