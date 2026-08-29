/**
 * Casi limite del confronto versioni del gate aggiornamento (utils/version.ts).
 *
 * Il progetto non ha un test runner: questo e' uno script node autonomo, da
 * lanciare a mano quando si tocca utils/version.ts.
 *
 *   node --experimental-strip-types scripts/test-version-compare.mjs
 */
import { parseVersion, compareVersions, isOlderThan } from '../utils/version.ts';

let failed = 0;

function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) {
    failed++;
    console.error(`FAIL  ${label}\n      atteso ${JSON.stringify(expected)}, ottenuto ${JSON.stringify(actual)}`);
  } else {
    console.log(`ok    ${label}`);
  }
}

// --- parse ---
check('parse 1.4.0', parseVersion('1.4.0'), [1, 4, 0]);
check('parse forma corta 1.4', parseVersion('1.4'), [1, 4, 0]);
check('parse solo major', parseVersion('2'), [2, 0, 0]);
check('parse spazi ai bordi', parseVersion('  1.4.0 '), [1, 4, 0]);
check('parse zeri iniziali', parseVersion('1.04.0'), [1, 4, 0]);
check('parse stringa vuota -> null', parseVersion(''), null);
check('parse solo spazi -> null', parseVersion('   '), null);
check('parse suffisso beta -> null', parseVersion('1.4.0-beta'), null);
check('parse componente vuota -> null', parseVersion('1..0'), null);
check('parse negativo -> null', parseVersion('-1.0.0'), null);
check('parse 4 componenti -> null', parseVersion('1.4.0.1'), null);
check('parse non stringa -> null', parseVersion(140), null);
check('parse null -> null', parseVersion(null), null);
check('parse undefined -> null', parseVersion(undefined), null);
check('parse testo -> null', parseVersion('latest'), null);

// --- confronto: il caso che rompe l'ordinamento per stringa ---
check('1.10.0 > 1.9.0', compareVersions('1.10.0', '1.9.0'), 1);
check('1.9.0 < 1.10.0', compareVersions('1.9.0', '1.10.0'), -1);
check('2.0.0 > 1.99.99', compareVersions('2.0.0', '1.99.99'), 1);
check('uguali', compareVersions('1.3.1', '1.3.1'), 0);
check('1.3 == 1.3.0', compareVersions('1.3', '1.3.0'), 0);
check('patch maggiore', compareVersions('1.3.2', '1.3.1'), 1);
check('malformata a sinistra -> null', compareVersions('boh', '1.0.0'), null);
check('malformata a destra -> null', compareVersions('1.0.0', ''), null);

// --- isOlderThan: la forma usata dal gate (il dubbio non blocca) ---
check('1.3.1 piu vecchia di 1.4.0', isOlderThan('1.3.1', '1.4.0'), true);
check('1.4.0 non piu vecchia di 1.4.0', isOlderThan('1.4.0', '1.4.0'), false);
check('1.4.1 non piu vecchia di 1.4.0', isOlderThan('1.4.1', '1.4.0'), false);
check('1.10.0 non piu vecchia di 1.9.0', isOlderThan('1.10.0', '1.9.0'), false);
check('soglia dormiente 0.0.0 non blocca', isOlderThan('1.3.1', '0.0.0'), false);
check('versione app assente -> non blocca', isOlderThan(undefined, '1.4.0'), false);
check('soglia malformata -> non blocca', isOlderThan('1.3.1', 'boh'), false);
check('soglia vuota -> non blocca', isOlderThan('1.3.1', ''), false);

console.log(failed === 0 ? '\nTutti i casi passano.' : `\n${failed} caso/i fallito/i.`);
process.exit(failed === 0 ? 0 : 1);
