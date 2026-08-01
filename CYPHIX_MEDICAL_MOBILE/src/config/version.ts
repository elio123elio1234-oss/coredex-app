/* App version — rendered in the visible badge (web CLAUDE.md §8 convention). */

export const APP_VERSION = '0.9.0';
export const APP_BUILD_LABEL =
  'phone-sized exam: photo 2.5x bigger, traces 68-84pt, capture clock in the bar';

// v0.9.0 — v0.8.0 ported the web's layouts faithfully and then rendered them at
//          the web's DESKTOP sizes on a 390pt-tall landscape phone, where the
//          chrome ate the content. Chrome now shrinks on a short stage and the
//          capture clock lives in the bar.
