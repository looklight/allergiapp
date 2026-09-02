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
├── menu-page.css       # Stili del menù al tavolo (/menu/[slug])
├── menu-page.js        # Filtro allergeni e fogli del menù al tavolo
├── lib/                # Render server-side delle pagine pubbliche
└── images/             # Immagini del sito
```

### Il menù al tavolo — `/menu/[slug]` (in costruzione)

La pagina che il cliente apre col QR sul tavolo. **Non è ancora collegata**:
non c'è la rotta in `vercel.json` né la funzione in `api/`, e i dati vengono
da `lib/menu-sample.js` — un menù finto che serve anche da **contratto**, cioè
la forma esatta che `get_public_menu(slug)` restituirà (migration 708
nell'altro repo). Per guardarla:

```bash
node -e "const{renderMenuPage}=require('./lib/render-menu.js'),{createT}=require('./lib/i18n.js');require('fs').writeFileSync('_preview-menu.html',renderMenuPage(require('./lib/menu-sample.js'),'it',createT('it')))"
python3 -m http.server 8099   # poi apri /_preview-menu.html
```

Tre cose da non disfare:

- **Il filtro riordina, non nasconde.** I piatti esclusi sbiadiscono, scendono
  in fondo alla loro sezione e dicono perché. Farli sparire direbbe che quel
  che resta è stato *verificato*, e il dato lo dichiara il ristorante.
- **Niente disclaimer in fondo**: al tavolo è il ristorante che porge il suo
  menù. Resta una riga minuscola attaccata al **filtro**, che è l'unica cosa
  nostra in quella pagina. Il fondo è del ristoratore (coperto, servizio).
- **Due copie a mano dal portale**, e vanno tenute allineate o il ristoratore
  vede nell'anteprima una cosa e il suo cliente ne trova un'altra:
  `lib/menu-order.js` (la graduatoria delle pastiglie, da
  `partner/src/lib/menuFilters.ts`) e la tavolozza `ACCENTI` dentro
  `lib/render-menu.js` (da `menuBrand.ts`) — il database tiene il **codice**
  del colore, qui serve la tinta. Aggiungendo un colore di là e non qui, quel
  locale finisce col colore di ripiego **senza nessun errore**.

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
