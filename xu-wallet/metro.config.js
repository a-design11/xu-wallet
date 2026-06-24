const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// The top-level /src/ tree is the legacy Vite/web build (uses react-router +
// import.meta). Block only the project's own src/ directory from the React
// Native bundle — not any src/ folder inside node_modules (e.g. RN's own
// react-native/src). Anchoring to __dirname avoids collisions.
const projectSrcDir = path.resolve(__dirname, 'src').replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
config.resolver.blockList = new RegExp(`^${projectSrcDir}[\\\\/].*`);

config.resolver.extraNodeModules = {
  crypto: path.resolve(__dirname, 'node_modules/crypto-browserify'),
  stream: path.resolve(__dirname, 'node_modules/readable-stream'),
  'stream/web': path.resolve(__dirname, 'node_modules/readable-stream'),
  buffer: path.resolve(__dirname, 'node_modules/buffer'),
  http: path.resolve(__dirname, 'node_modules/stream-http'),
  https: path.resolve(__dirname, 'node_modules/https-browserify'),
  os: path.resolve(__dirname, 'node_modules/os-browserify'),
  path: path.resolve(__dirname, 'node_modules/path-browserify'),
  vm: path.resolve(__dirname, 'node_modules/vm-browserify'),
  zlib: path.resolve(__dirname, 'node_modules/browserify-zlib'),
  util: path.resolve(__dirname, 'node_modules/util'),
  events: path.resolve(__dirname, 'node_modules/events'),
};

module.exports = config;
