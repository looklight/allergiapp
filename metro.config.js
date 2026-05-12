// Estende la config Metro default di Expo per consentire l'import di file .svg
// come componenti React (via react-native-svg-transformer). I file .svg sono
// rimossi dagli asset e aggiunti alle source extensions, così il transformer li
// elabora come moduli JS che esportano un componente Svg.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};

config.resolver = {
  ...config.resolver,
  assetExts: config.resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...config.resolver.sourceExts, 'svg'],
};

module.exports = config;
