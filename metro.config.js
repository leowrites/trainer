const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow bundling WASM files for expo-sqlite web support
config.resolver.assetExts = [...config.resolver.assetExts, 'wasm'];

module.exports = config;
