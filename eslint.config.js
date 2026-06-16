// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/*',
      'ios/*',
      'android/*',
      '.expo/*',
      'node_modules/*',
      'patches/*',
      'scripts/*',
      'translate-builder.js',
      // admin/ e' un progetto Next.js separato (branch admin-prod) con la sua config
      'admin/*',
      // supabase/functions e' codice Deno (import via URL), non lintabile qui
      'supabase/*',
      // asset, traduzioni e file di design: nessun codice da lintare
      'locales/*',
      '_design/*',
      'assets/*',
    ],
  },
]);
