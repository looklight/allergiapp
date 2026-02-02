# AllergiApp - Note di Sviluppo

## Configurazioni manuali dopo `expo prebuild`

Dopo aver eseguito `npx expo prebuild` o `npx expo prebuild --clean`, applica queste modifiche in Xcode:

### 1. Disabilitare User Script Sandboxing

Questo è necessario per evitare errori di build con React Native.

1. Apri `ios/AllergiApp.xcworkspace` in Xcode
2. Seleziona il progetto **AllergiApp** (icona blu, in cima a sinistra)
3. Vai su **Build Settings**
4. Cerca "User Script Sandboxing"
5. Imposta su **No** (per Debug e Release)

**Motivo:** React Native ha script che scrivono file durante la build. Le versioni recenti di Xcode bloccano questa operazione con la sandbox attiva.

---

## Build locale su iPhone (senza Apple Developer Program)

### Requisiti
- Apple ID gratuito
- iPhone collegato via cavo
- Xcode installato

### Passi
1. Apri `ios/AllergiApp.xcworkspace`
2. Configura il Team (Signing & Capabilities → seleziona il tuo Apple ID)
3. Seleziona il tuo iPhone come destinazione
4. Per build standalone: Product → Scheme → Edit Scheme → Run → Build Configuration: **Release**
5. Premi ▶️

### Limitazioni
- L'app scade dopo **7 giorni** (poi reinstalla con ▶️)
- Devi autorizzare lo sviluppatore: iPhone → Impostazioni → Generali → Gestione dispositivo

---

## Struttura repository

Il progetto usa `git worktree` per separare i branch:

```
/Dropbox/AllergiApp/
├── allergiapp/     ← branch main (app React Native)
└── landing/        ← branch landing (sito web)
```

---

## Comandi utili

```bash
# Avvia in sviluppo
npx expo start

# Prebuild iOS (rigenera cartella ios/)
npx expo prebuild --platform ios

# Build EAS (quando avrai Apple Developer)
eas build --platform ios --profile production
```
