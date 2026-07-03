// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // Le regole react-hooks "compiler-powered" (v6) non capiscono i pattern
    // legittimi di questo codebase: Reanimated `sharedValue.value = x`
    // (immutability/preserve-manual-memoization), latest-ref nel render
    // (refs) e setState di init all'apertura di sheet/modal
    // (set-state-in-effect). Declassate a warn: restano visibili ma non
    // annegano gli errori veri. Da rivalutare se/quando si adotta React
    // Compiler.
    rules: {
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
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
