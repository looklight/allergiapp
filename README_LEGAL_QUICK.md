# 🎯 Quick Start - Documenti Legali

## ✅ Cosa è fatto

1. **Privacy Policy** completa (IT + EN) nei file `.md`
2. **Termini di Servizio** completi (IT + EN) nei file `.md`
3. **Disclaimer medico** rafforzato nell'app (5 lingue)
4. **Link "Leggi documento completo"** nei dialog dell'app

## 🚀 Cosa fare ORA (10 minuti)

### 1. Compila i tuoi dati nei documenti

Apri e modifica:
- `PRIVACY_POLICY.md`
- `PRIVACY_POLICY_EN.md`
- `TERMS_OF_SERVICE.md`
- `TERMS_OF_SERVICE_EN.md`

**Cerca e sostituisci:**
```
[Inserisci tua email]         → info@tuoemail.com
[Inserisci nome sviluppatore] → Tuo Nome
[Inserisci città]              → Roma
```

### 2. Pubblica documenti online

Scegli uno:

**A) GitHub Pages (GRATIS, 5 minuti)**
1. Crea repo pubblico su GitHub
2. Copia file `.md` nel repo
3. Settings → Pages → Abilita
4. URL: `https://tuousername.github.io/repo/PRIVACY_POLICY.md`

**B) Google Sites (GRATIS, 10 minuti)**
1. Vai su sites.google.com
2. Nuovo sito
3. Copia/incolla contenuto documenti
4. Pubblica

**C) Tuo sito web**
Se già ce l'hai, ancora meglio!

### 3. Aggiorna URL nell'app

**File**: `constants/legalUrls.ts`

Sostituisci:
```typescript
'https://tuosito.com/allergiapp/privacy'
```
Con:
```typescript
'https://TUO-URL-REALE.com/privacy'
```

### 4. Testa nell'app

1. Apri app
2. Impostazioni → Privacy → "Leggi documento completo"
3. Deve aprire browser con tuo documento

✅ **FATTO!**

---

## 📱 Per pubblicare su store

Aggiungi in `app.json`:
```json
{
  "expo": {
    "privacyPolicy": "https://tuo-url.com/privacy"
  }
}
```

---

## ❓ Problemi?

- Link non funziona? → Controlla URL in `constants/legalUrls.ts`
- Mostra "Non pubblicato"? → URL ancora con "tuosito.com"
- Documenti incompleti? → Compila `[Inserisci...]` nei file `.md`

---

## 📚 Documentazione completa

Vedi: `LEGAL_SETUP_GUIDE.md`
