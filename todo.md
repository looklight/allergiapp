# AllergiApp - TODO

## Prossime feature

### Feature ristoranti (branch: feature/restaurants)
- Caricamento geo-based con query 50km + fallback globale
- "Cerca in quest'area" + ricerca citta con geocoding
- Dettaglio ristorante con info allergeni

### Lingue scaricabili: valutare pre-traduzione
Attualmente le lingue vengono tradotte on-demand via MyMemory API (79 chiamate sequenziali per lingua, ~40-60s, limite 5.000 char/giorno/IP). Valutare se conviene:
- Pre-tradurre tutte le 65 lingue una tantum (con DeepL, ChatGPT/Claude, o MyMemory da locale)
- Verificare manualmente la qualita
- Hostare i JSON su Firebase Storage (~3-4KB per lingua)
- L'app scarica un singolo file JSON gia pronto invece di chiamare l'API 79 volte

Vantaggi: download istantaneo, qualita garantita, nessun limite quota, nessuna dipendenza API runtime.

## Pre-merge

### Committare cartella admin/
La cartella `admin/` (dashboard Next.js) non è ancora committata. Il `.gitignore` copre già:
- `admin/service-account-key.json` ✅
- `admin/node_modules/` ✅
- `admin/.next/` ✅

Da fare: `git add admin/` e committare.

## Completati (branch feature/other-restrictions)

- ✅ Sezione "Altri alimenti" con 13 cibi (aglio, cipolla, pomodoro, funghi, peperone, mais, fragole, kiwi, frutta a nocciolo, agrumi, banana, grano saraceno, spezie piccanti) — traduzioni in 15 lingue
- ✅ Modalità dieta: vegetariano (3 livelli), gravidanza, allergia al nichel
- ✅ Visualizzazione su card (portrait + landscape)
- ✅ Fix traduzioni: svedese molluschi, tedesco du/Sie
- ✅ Supporto other foods nelle lingue scaricabili
