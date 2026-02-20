# AllergiApp Landing Page

Landing page per [allergiapp.com](https://allergiapp.com)

## 📁 Struttura

```
landing/
├── index.html          # Homepage
├── contacts.html       # Chi siamo / Contatti (linkata dall'app)
├── privacy.html        # Privacy Policy
├── terms.html          # Termini di Servizio
├── styles.css          # Stili CSS condivisi
├── script.js           # JavaScript homepage
├── i18n-site.js        # Sistema traduzioni IT/EN
├── translations.json   # Testi tradotti per tutte le pagine
├── vercel.json         # Configurazione deploy Vercel
└── images/             # Immagini del sito
```

## 🚀 Deployment su Vercel

### 1. Setup iniziale

1. Vai su [vercel.com](https://vercel.com) e fai login con GitHub
2. Clicca su "Add New Project"
3. Importa il repository `looklight/allergiapp`
4. Seleziona il branch `landing`
5. Vercel rileverà automaticamente la configurazione da `vercel.json`
6. Clicca su "Deploy"

### 2. Configurazione dominio custom

1. Nel dashboard del progetto Vercel, vai su "Settings" > "Domains"
2. Aggiungi `allergiapp.com` e `www.allergiapp.com`
3. Vercel ti fornirà i record DNS da configurare:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21

   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```
4. Vai al pannello del tuo registrar di domini e aggiungi questi record DNS
5. Attendi la propagazione DNS (può richiedere fino a 48 ore, ma solitamente pochi minuti)
6. Vercel configurerà automaticamente SSL/HTTPS

### 3. Deploy automatici

Ogni volta che fai push su questo branch `landing`, Vercel farà automaticamente il deploy della nuova versione.

## 🎨 Personalizzazione

### Colori

Modifica le variabili CSS in `styles.css`:
```css
:root {
    --primary: #4CAF50;
    --primary-dark: #388E3C;
    --primary-light: #C8E6C9;
    /* ... */
}
```

### Contenuti

Modifica direttamente i file HTML per cambiare testi e contenuti.

### Newsletter

Per integrare una newsletter vera, modifica la funzione in `script.js` per connetterti a servizi come:
- Mailchimp
- ConvertKit
- Buttondown
- Substack

## 📱 Link Store

Quando l'app sarà pubblicata, aggiorna i link negli store in `index.html`:
```html
<a href="https://apps.apple.com/..." class="store-button">
<a href="https://play.google.com/..." class="store-button">
```

## 🔧 Sviluppo locale

Apri semplicemente `landing/index.html` in un browser, oppure usa un server locale:

```bash
# Con Python
python3 -m http.server 8000

# Con Node.js
npx serve landing
```

Poi visita `http://localhost:8000`
