/* ==================================================================
   Metro config — wires the out-of-tree @cyphix/shared package
   (root CLAUDE.md §2.1). Shared is consumed as raw TS source; Metro
   watches its folder and resolves the alias to its package.json main.
   ================================================================== */

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const sharedRoot = path.resolve(projectRoot, '..', 'CYPHIX_SHARED');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [...(config.watchFolders ?? []), sharedRoot];
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  '@cyphix/shared': sharedRoot,
};

module.exports = config;

// v1.0.0 — Adds CYPHIX_SHARED watch folder + alias.
