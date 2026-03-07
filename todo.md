# AllergiApp - TODO

## Prossime feature

### Allergeni extra (non-EU)
Aggiungere sezione separata "Intolleranze alimentari comuni" con:
- Aglio
- Cipolla
- Pomodoro
- Mais
- Funghi

Questi non rientrano nei 14 EU obbligatori ma sono molto presenti in cucina e causa di allergie/intolleranze reali. Tenerli separati dai 14 EU + favismo per chiarezza.

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

## In attesa

### Grano saraceno
Allergene obbligatorio in Giappone/Corea. Da valutare se il target si espande verso Asia.
Non si sovrappone col glutine (il grano saraceno non e un cereale, non contiene glutine).
