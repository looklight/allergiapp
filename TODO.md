# AllergiApp - TODO

## Da fare subito

### Merge `feature/restaurants-v2` → main

Il branch è maturo (11 commit, 197 file, 21 migration SQL). I ristoranti sono completamente su Supabase.

**Regola fondamentale: per tutto il sistema card/traduzioni, main vince sempre.**
Il codice card su restaurants-v2 è obsoleto (versione precedente a tutte le migliorie fatte su main:
accessibilità, migrazione traduzioni Supabase, 27 altri alimenti, fix traduzioni critiche).
In caso di conflitto su file legati a card, traduzioni, otherFoods, theme → prendere main senza eccezioni.
Il branch restaurants aggiunge solo funzionalità ristoranti (nuovi file, route, hooks, migration SQL).

#### Decisioni da prendere

1. **Firebase web SDK** — Il branch restaurants lo ha ancora per le traduzioni Firestore.
   Main l'ha già rimosso (traduzioni migrate a Supabase). Durante il merge va eliminato anche lì.

2. **Supabase client** (`services/supabase.ts`) — Due versioni:
   - Main: client minimale (solo lettura traduzioni, no auth)
   - Restaurants: client con auth + AsyncStorage (serve per login utenti)
   → Tenere la versione restaurants (più completa), funziona anche per le traduzioni.

3. **Supabase version** — Main ha v2.49, restaurants ha v2.99.
   → Usare la più recente (2.99).

4. **`constants/otherFoods.ts`** — Main ha ristrutturato con 27 cibi + categorie.
   Restaurants rimuove solo una funzione `getOtherFoodById()`.
   → Tenere la versione main, verificare che nessun codice restaurants usa quella funzione.

#### File con conflitto (10 file su ~197)

| File | Cosa fare |
|------|-----------|
| `app/_layout.tsx` | Combinare: AnnouncementPopup + analytics (main) + AuthProvider (restaurants) |
| `app.config.ts` | Combinare: version 1.0.2/build 5 (main) + permessi location + Google Maps (restaurants) |
| `package.json` | Supabase 2.99, rimuovere `firebase`, aggiungere deps maps/location da restaurants |
| `services/firebase.ts` | Eliminare (main l'ha già rimosso, restaurants non ne ha bisogno dopo merge) |
| `services/supabase.ts` | Tenere versione restaurants (con auth + AsyncStorage) |
| `constants/otherFoods.ts` | Tenere versione main (27 cibi + categorie) |
| `app/settings.tsx` | Main (accessibilità) + restaurants (semplifica state) → combinare |
| `constants/theme.ts` | Facile: main cambia textHint, restaurants aggiunge spacing/radius/typography |
| `utils/storage.ts` | Combinare: popup keys (main) + "for my needs" + refactor loadAll (restaurants) |
| `locales/*.json` | Combinare: popup keys (main) + map/leaderboard/profile keys (restaurants) |

#### Strategia merge

1. Creare branch temporaneo da restaurants-v2
2. Fare merge di main nel branch temporaneo (portare novità main nei ristoranti)
3. Risolvere i 10 conflitti (soprattutto _layout, package.json, supabase client)
4. Eliminare `services/firebase.ts` e aggiornare import
5. Far puntare le traduzioni al `translationService.supabase.ts` di main
6. `npx tsc --noEmit` — zero errori
7. Testare: card con accessibilità + ristoranti + traduzioni scaricabili
8. Merge fast-forward in main

#### Pre-requisiti Supabase (prima del merge)

- [ ] Verificare che bucket "images" sia Public in Supabase Storage
- [ ] Eseguire migration SQL 010–021 su Supabase (se non già fatte)
- [ ] Verificare RPC functions: `get_nearby_restaurants`, `get_restaurants_for_my_needs`

### Accessibilità (v1.0.3) — opzionale
P1–P3 completati. Rimanenti:
- [ ] P4: Dark mode (attualmente forzato light)
- [ ] P4: Reduce Motion per il carousel banner
- [ ] P4: `accessibilityLiveRegion` per contenuti dinamici

## v1.0.5 — da fare (1.0.4 approvata e pubblicata 2026-03-23)
- [ ] Incrementare version → `1.0.5`, buildNumber → `8`, versionCode → `8` in `app.config.ts`
- [ ] `npx eas-cli build --platform ios --profile production`
- [ ] `npx eas-cli build --platform android --profile production`
- [ ] Submit iOS: `npx eas-cli submit --platform ios --latest`
- [ ] Submit Android: scaricare AAB da EAS e caricare su Google Play Console
- Crashlytics già integrato nel codice (`services/crashlytics.ts`, plugin in `app.config.ts`, consent in `_layout.tsx`)

## Google Play / Android
In attesa: closed testing con 12 tester, revisione 14 giorni (inviato ~inizio mar 2026).
- [x] Fix safe area: padding bottom dinamico con `insets.bottom` su tutte le schermate (Android edge-to-edge)
- [x] Fix emoji: aggiunto `lineHeight` a tutti gli stili emoji per evitare clipping su Android
- [x] Fix TextInput: `underlineColorAndroid="transparent"` nei campi di ricerca
- [x] Fix BannerCarousel: aggiunto `getItemLayout` per auto-scroll affidabile su Android
- [ ] Attendere completamento revisione closed testing
- [ ] Aggiungere profilo Android production in `eas.json` (serviceAccount + track)
- [ ] `npx eas-cli build --platform android --profile production`
- [ ] Submit AAB su Google Play Console e pubblicare
- [ ] Aggiornare link Google Play nel sito (`index.html`) quando pubblicata

## Deploy
- [ ] **OTA update** per attivare analytics other foods, restrizioni e diete: `npx eas-cli update --branch production --message "Add comprehensive analytics tracking"`
- [ ] Decidere e configurare deploy admin dashboard (Vercel o altro)
- [ ] Deployare su Vercel le modifiche al sito landing (contacts redesign, pulsante "Scopri di più", link App Store)

## Completati
- [x] Accessibilità P1–P3: VoiceOver su card (portrait+landscape), banner, home, settings; contrasto WCAG AA
- [x] Migrazione traduzioni Firestore → Supabase + rimozione Firebase web SDK
- [x] "Altri alimenti" aggiornati a 27 cibi + traduzioni caricate su Supabase
- [x] Fix traduzioni critiche: 11 lingue, 33 correzioni (lao molluschi, khmer contaminazione, ecc.)
- [x] v1.0.2 buildata e inviata su App Store Connect
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
- [x] Fix Android: safe area dinamiche, emoji lineHeight, TextInput underline, BannerCarousel getItemLayout
