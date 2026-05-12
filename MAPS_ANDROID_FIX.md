# Fix Google Maps Android — schermo bianco

Tracking del lavoro per risolvere il problema della mappa che non si carica su Android (build 1.1.0 / versionCode 15 in Internal testing).

## Problema riscontrato

- Su Android: mappa = schermo bianco
- Su iOS: funziona (usa Apple Maps di default, no chiavi Google necessarie per display)
- Errore nei log: `Google Android Maps SDK: Authorization failure`

## Diagnosi (12 mag 2026)

Server-side tutto OK dopo verifica via `gcloud`:
- Maps SDK for Android & Places API abilitate sul progetto `allergiapp-488223`
- Billing attivo (account `01C160-19C7B9-ECB112` di Luca)
- API key "Places API Key - Android" (`AIzaSyA-1SY...WMjw`) ha restrizioni corrette: SHA-1 `739f2289...d1a2`, package `com.allergiapp.mobile`, API consentite Places + Maps SDK for Android (Maps SDK aggiunto oggi alle 19:43 UTC)
- SHA-1 nelle restrizioni corrisponde esattamente al Play App Signing certificate

Nonostante questo, l'app riceve ancora `INVALID_ARGUMENT` da Google Maps SDK. Sospetto: incompatibilità Places API + Maps SDK sulla stessa chiave o propagazione anomala.

## Account coinvolti (per chiarezza)

| Servizio | Account |
|---|---|
| Google Cloud project `allergiapp-488223` | `lucapuliga@gmail.com` (proprietario) |
| Billing account | Luca |
| Google Play Console | Marta `martadmuro@gmail.com` |
| Apple Developer / App Store | Marta (Apple ID `martadmuro@gmail.com`) |
| Firebase project `allergiapp-7bdf3` | (non toccato, contiene Firebase config) |

Il fatto che Cloud project sia di Luca e Play Console di Marta NON è la causa del problema. Maps SDK verifica solo che il SHA-1 del Play App Signing corrisponda alla restrizione della chiave (corrisponde).

## Fix in corso

### Step completati

- [x] Aggiunto "Maps SDK for Android" alle API restrictions della chiave esistente `Places API Key - Android` (commit silenzioso su Cloud Console)
- [x] Verificato SHA-1 di Play App Signing su Play Console (`73:9F:22:89:ED:4F:9A:56:93:E6:3B:8C:2A:06:B0:C0:D0:F3:D1:A2`) — corrisponde alla restrizione
- [x] Confermato fatturazione collegata e Maps SDK API enabled via gcloud CLI
- [x] **Creata nuova chiave dedicata `Maps SDK - Android`** (UID `eb66e008-8210-40ff-b763-1c6ee4d637a9`)
   - Valore: `AIzaSyBlQI2PgbW_XYyeFtQn-TdfVi6k9LzV_Cs`
   - Restrizioni: package `com.allergiapp.mobile` + SHA-1 corretto + solo Maps SDK for Android

### Step pendenti

- [x] Aggiornata env var EAS `GOOGLE_MAPS_API_KEY_ANDROID` con il nuovo valore (environment `production`, visibility `secret`)
- [x] Bumpato `versionCode` in `app.config.ts` da 15 a 16
- [ ] **[Eventuali altre modifiche grafiche / bug fix richieste dall'utente in sessione successiva — IN ATTESA]**
- [ ] Nuovo build EAS Android `--profile beta`
- [ ] Upload AAB su Play Console → Internal testing
- [ ] Tester aggiorna app, verifica mappa
- [ ] Se mappa funziona: confermato fix, considerare di rimuovere "Maps SDK for Android" dalla vecchia chiave `Places API Key - Android` per pulizia (non urgente)
- [ ] Se mappa NON funziona: ulteriore investigazione (propagazione, billing, etc.)

## Impatto iOS

**Nessuno**. iOS non viene ricompilato. Le sue env var (`GOOGLE_PLACES_API_KEY_IOS`, `GOOGLE_SERVICES_PLIST`) non vengono toccate. La chiave "Places API Key - iOS" nel progetto Cloud è separata e non modificata.

## Comandi utili (Mac, autenticato come Luca)

```bash
# Stato chiavi
gcloud services api-keys list --format=json

# Verifica API abilitate
gcloud services list --enabled --filter="name:maps OR name:places"

# Verifica billing
gcloud beta billing projects describe allergiapp-488223

# Log Android dal dispositivo del tester
adb logcat -d | grep -iE "Maps|API_KEY|Authorization|geo"
```
