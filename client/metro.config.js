const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure tflite is treated as an asset
config.resolver.assetExts = [...config.resolver.assetExts, 'tflite'];

module.exports = config;
