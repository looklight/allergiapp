# AllergiApp - TODO

## Da fare subito

### Branch e merge
- [ ] Merge `feature/other-restrictions` → main
- [ ] Committare cartella `admin/` — i sorgenti sono sul branch `feature/restaurants`

### Pre-traduzioni Firestore
Implementazione pronta (Firestore-first con fallback MyMemory). Da completare:
- [ ] Generare traduzioni mancanti per le nuove lingue aggiunte (pa, gu, kn, ml, ps, ku, dv, tg, ky, tk, so, mg, ht)
- [ ] Upload traduzioni su Firestore (`node scripts/uploadTranslations.js`)
- [ ] Verificare qualità traduzioni su un campione di lingue

## Google Play / Android
In attesa: closed testing con 12 tester, revisione 14 giorni (inviato ~inizio mar 2026).
- [ ] Attendere completamento revisione closed testing
- [ ] Aggiungere profilo Android submit in `eas.json` (serviceAccount + track)
- [ ] Caricare AAB su Google Play Console e pubblicare
- [ ] Aggiornare link Google Play nel sito (`index.html`) quando pubblicata

## Deploy
- [ ] Decidere e configurare deploy admin dashboard (Vercel o altro)
- [ ] Deployare su Vercel le modifiche al sito landing (contacts redesign, pulsante "Scopri di più", link App Store)

## Feature ristoranti (branch: feature/restaurants)
In sviluppo. Caricamento geo-based implementato.
- [ ] Dettaglio ristorante con info allergeni
- [ ] Migrare `DraggableBottomSheet` custom a `@gorhom/bottom-sheet` + `react-native-reanimated` (pre-rilascio)

### Futuri (quando il volume cresce)
- Clustering pin (`react-native-map-clustering`) — quando la densità di ristoranti lo richiede
- Scalabilità query geo — valutare Supabase (PostGIS) se i ristoranti arrivano a migliaia

## Completati
- [x] Pre-traduzioni Firestore: firebase.ts, firestoreTranslations.ts, 51 JSON, script, 13 nuove lingue
- [x] Eliminare variabili EAS orfane (3× GOOGLE_SERVICES_JSON / GOOGLE_SERVICES_JSON_ANDROID)
- [x] Pulizia file: privacy/terms markdown, google-services-2.json
- [x] Sincronizzare versionCode Android con buildNumber iOS (entrambi a 4)
- [x] Download lingua offline: pre-flight check + timeout 30s + alert localizzati
- [x] Box lingue scaricate: minHeight 56 + larghezza reattiva alla rotazione
- [x] Crediti MyMemory: check per 429 + rilevamento testo invariato
- [x] Sezione "Altri alimenti" con 13 cibi — traduzioni in 15 lingue
- [x] Modalità dieta: vegetariano (3 livelli), gravidanza, allergia al nichel
- [x] Visualizzazione su card (portrait + landscape)
- [x] Fix traduzioni: svedese molluschi, tedesco du/Sie
- [x] Supporto other foods nelle lingue scaricabili
