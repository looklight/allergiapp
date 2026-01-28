# 📊 Firebase Analytics per AllergiApp - Stato Implementazione

## ✅ Cosa è stato completato

### 1. **Installazione dipendenze**
- ✅ Installato `@react-native-firebase/app`
- ✅ Installato `@react-native-firebase/analytics`
- ✅ Plugin Firebase aggiunto a `app.json`

### 2. **Configurazione Firebase**
- ✅ Progetto Firebase creato su Firebase Console
- ✅ App Android configurata (`com.allergiapp`)
- ✅ App iOS configurata (`com.allergiapp`)
- ✅ File `google-services.json` scaricato e posizionato nella root
- ✅ File `GoogleService-Info.plist` scaricato e posizionato nella root
- ✅ File Firebase aggiunti al `.gitignore` (per sicurezza)

### 3. **Modulo Analytics implementato**
File creato: `utils/analytics.ts`

**Caratteristiche:**
- Import condizionale di Firebase (funziona sia in Expo Go che in build nativi)
- In Expo Go: analytics disabilitati (mock)
- In build nativo: analytics completamente funzionali
- Tutti i metodi gestiscono errori gracefully

### 4. **Eventi tracciati automaticamente**

#### Allergie (`app/add-allergy.tsx`)
- `allergy_added` - Quando un'allergia viene aggiunta
- `allergy_removed` - Quando un'allergia viene rimossa
- `allergies_saved` - Quando le allergie vengono salvate (con conteggi)

#### Lingue (`app/settings.tsx`, `app/index.tsx`)
- `language_downloaded` - Download lingua (con successo/fallimento e durata)
- `language_deleted` - Eliminazione lingua
- `app_language_changed` - Cambio lingua interfaccia app
- `card_language_changed` - Cambio lingua card allergie

#### Card (`app/card.tsx`)
- `card_viewed` - Visualizzazione card (con lingua, numero allergie, ecc.)
- `card_language_toggled` - Toggle tra lingua destinazione e lingua app

#### App Lifecycle (`app/_layout.tsx`)
- `app_opened` - Apertura app

#### Banner e Ads (`app/components/BannerCarousel.tsx`)
- `banner_viewed` - Banner visualizzato (tracciato solo alla prima vista)
- `ad_impression` - Impression ad/referral (per calcolo CTR)
- `banner_clicked` - Click su banner (info o ad)

#### Altro
- `data_cleared` - Reset completo dati app

### 5. **Dati raccolti automaticamente da Firebase**
Senza bisogno di input utente:
- 🌍 **Paese e città** (da indirizzo IP)
- 🗣️ **Lingua dispositivo**
- 📱 **Tipo dispositivo** (iOS/Android, modello, versione OS)
- 📦 **Versione app**
- ⏱️ **Durata sessioni**
- 🔁 **Retention** (quante volte l'utente torna)
- 📊 **Screen views** (automatici)

---

## 📍 Dove siamo ora

### Stato attuale: **CONFIGURAZIONE COMPLETA - PRONTO PER BUILD**

**L'app funziona normalmente in Expo Go**, ma Firebase Analytics è in modalità "mock" (disabilitato).

Per **attivare realmente Firebase Analytics**, è necessario fare un **build nativo**.

---

## 🚀 Prossimi passi (quando sei pronto)

### Opzione A: Test locale con build nativo

**Android** (richiede Android Studio):
```bash
cd /Users/z003ymfn/Dropbox/AllergiApp/allergiapp
npx expo prebuild --clean --platform android
npx expo run:android
```

**iOS** (richiede macOS con Xcode):
```bash
cd /Users/z003ymfn/Dropbox/AllergiApp/allergiapp
npx expo prebuild --clean --platform ios
npx expo run:ios
```

**Cosa aspettarsi:**
- L'app si compila e installa su emulatore/simulatore
- In console vedrai: `[Analytics] Firebase Analytics disponibile`
- Gli eventi analytics vengono inviati a Firebase

### Opzione B: Build con EAS (per distribuzione)

```bash
cd /Users/z003ymfn/Dropbox/AllergiApp/allergiapp

# Build development per Android
eas build --platform android --profile development

# Build development per iOS
eas build --platform ios --profile development

# Build production (per pubblicazione)
eas build --platform all --profile production
```

---

## 🔍 Come verificare che Firebase Analytics funziona

### 1. Durante il build
Controlla i log della console dell'app. Dovresti vedere:
```
[Analytics] Firebase Analytics disponibile
```

### 2. Testa gli eventi
- Apri l'app
- Aggiungi/rimuovi allergie
- Scarica una lingua
- Visualizza la card
- Cambia lingua

### 3. Verifica su Firebase Console

1. Vai su [Firebase Console](https://console.firebase.google.com/)
2. Seleziona il progetto "AllergiApp"
3. Vai su **Analytics** → **Dashboard**
4. Vai su **Analytics** → **Events**

**⚠️ IMPORTANTE**: I dati possono richiedere **24-48 ore** per apparire nella console Firebase.

Per debug in tempo reale:
- **Analytics** → **DebugView**
- Devi abilitare il debug mode (vedi sotto)

### 4. Abilita Debug Mode (opzionale)

**Android:**
```bash
adb shell setprop debug.firebase.analytics.app com.allergiapp
```

**iOS** (Xcode):
Aggiungi `-FIRDebugEnabled` agli argomenti di lancio in Xcode.

---

## 📁 File importanti

### File di configurazione Firebase (NON committare su Git!)
- `google-services.json` - Configurazione Android
- `GoogleService-Info.plist` - Configurazione iOS
- ✅ Già aggiunti a `.gitignore`

### File implementazione Analytics
- `utils/analytics.ts` - Modulo analytics con tutti gli eventi
- `app/_layout.tsx` - Track app opened
- `app/add-allergy.tsx` - Track allergie
- `app/settings.tsx` - Track lingue e settings
- `app/index.tsx` - Track cambio lingua card
- `app/card.tsx` - Track visualizzazione card

### Documentazione
- `FIREBASE_SETUP.md` - Guida completa configurazione Firebase
- `README_ANALYTICS.md` - Questo file (stato implementazione)

---

## 🔐 Privacy e GDPR

### Dati raccolti
- ✅ **Anonimi e aggregati** (nessun dato personale identificabile)
- ✅ **Non tracciamo**: nomi, email, telefoni, indirizzi
- ✅ **Tracciamo solo**: comportamento app, preferenze, statistiche aggregate

### Conformità GDPR
- ✅ Analytics anonime = conforme GDPR
- ⚠️ Aggiungi una privacy policy nell'app che spiega:
  - Quali dati raccogli (paese, dispositivo, comportamento app)
  - Perché li raccogli (migliorare l'app)
  - Che usi Firebase Analytics di Google

### Miglioramenti futuri (opzionali)
- Aggiungi opt-out nelle impostazioni
- Aggiungi banner di consenso (se richiesto per il tuo mercato)
- Raccogli dati demografici opzionali (età, sesso) con consenso esplicito

---

## 🐛 Troubleshooting

### L'app non parte in Expo Go
**Normale!** Firebase Analytics funziona solo in build nativi. In Expo Go vedrai:
```
[Analytics] Firebase non disponibile (probabilmente Expo Go), usando mock
```
L'app funziona normalmente, ma gli eventi non vengono inviati.

### Build fallisce
**Causa comune:** File Firebase mancanti o nel posto sbagliato

**Soluzione:**
```bash
# Verifica che i file esistano
ls -la google-services.json
ls -la GoogleService-Info.plist

# Se mancano, scaricali di nuovo da Firebase Console
# e mettili nella root del progetto
```

### Eventi non appaiono in Firebase Console
**Cause possibili:**
1. Stai testando in Expo Go (non supportato)
2. I dati richiedono 24-48 ore per apparire
3. Usa **DebugView** per vedere eventi in tempo reale

### Errore "Native module RNFBAppModule not found"
**Significa:** Stai usando Expo Go (Firebase non disponibile)

**Soluzione:** Fai un build nativo (vedi sopra)

---

## 📊 Metriche disponibili in Firebase

### Dashboard automatica
- Utenti attivi (giornalieri, settimanali, mensili)
- Retention (1 giorno, 7 giorni, 30 giorni)
- Durata sessioni
- Screen views più visti
- Dispositivi e OS più usati
- Paesi degli utenti

### Report custom disponibili
Puoi creare report per:
- Allergie più comuni (da evento `allergy_added`)
- Lingue più scaricate (da evento `language_downloaded`)
- Lingua card più usata (da evento `card_language_changed`)
- Tasso di completamento (utenti che aggiungono allergie e vedono la card)

---

## 💡 Funzionalità Analytics avanzate (future)

### Già implementato, pronto all'uso:
```typescript
import { Analytics } from './utils/analytics';

// Proprietà demografiche opzionali
Analytics.setDemographics('25-34', 'female', 'IT');

// Proprietà custom
Analytics.setUserProperty('favorite_language', 'it');
```

### Idee per eventi aggiuntivi:
- `onboarding_completed` - Utente completa il primo setup
- `card_shared` - Se aggiungi funzione di condivisione card
- `allergen_search` - Se aggiungi ricerca allergie
- `translation_error` - Se traduzione fallisce

### Analisi Ads/Referral (già implementato):
Con gli eventi banner puoi calcolare:
- **CTR (Click-Through Rate)**: `banner_clicked` / `ad_impression` × 100
- **Banner più efficaci**: Raggruppa per `banner_id`
- **Posizione migliore**: Analizza quale posizione nel carousel performa meglio
- **Revenue potenziale**: Se tracki conversioni, puoi calcolare EPC (Earnings Per Click)

---

## 📚 Risorse

- [Firebase Console](https://console.firebase.google.com/)
- [Firebase Analytics Docs](https://firebase.google.com/docs/analytics)
- [React Native Firebase Docs](https://rnfirebase.io/)
- [Expo Custom Dev Client](https://docs.expo.dev/develop/development-builds/introduction/)
- [EAS Build](https://docs.expo.dev/build/introduction/)

---

## ✅ Checklist finale prima del lancio

Quando sei pronto a pubblicare l'app:

- [ ] Build nativo testato su Android
- [ ] Build nativo testato su iOS
- [ ] Eventi analytics verificati in Firebase Console
- [ ] Privacy policy aggiornata con menzione analytics
- [ ] File `google-services.json` e `GoogleService-Info.plist` nel `.gitignore`
- [ ] (Opzionale) Opt-out analytics nelle impostazioni
- [ ] (Opzionale) Raccolta dati demografici con consenso

---

## 📝 Note finali

**Data implementazione:** 28 Gennaio 2026

**Stato:** Configurazione completa, pronto per build nativo

**Prossimo step:** Quando sei pronto, fare un build nativo (locale o EAS) per testare Firebase Analytics in azione.

**Domande?** Consulta `FIREBASE_SETUP.md` per la guida completa alla configurazione.

---

🎉 **Ottimo lavoro!** Il sistema di analytics è completamente implementato e pronto all'uso!
