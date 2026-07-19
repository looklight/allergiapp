module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
    env: {
      production: {
        // console.error/warn restano nel bundle: sono i segnali utili
        // se serve diagnosticare un problema in produzione
        plugins: [['transform-remove-console', { exclude: ['error', 'warn'] }]],
      },
    },
  };
};
