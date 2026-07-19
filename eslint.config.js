// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  // Nota: l'override che declassava a warn le regole react-hooks
  // "compiler-powered" (refs, immutability, set-state-in-effect,
  // preserve-manual-memoization) è stato rimosso con eslint-config-expo 10
  // (plugin react-hooks tornato a v5, quelle regole non esistono più).
  // Ripristinarlo se/quando il plugin tornerà alla v6+.
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
