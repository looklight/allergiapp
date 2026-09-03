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

### Il menù al tavolo — `/menu/[slug]`

La pagina che il cliente apre col QR sul tavolo, **online dal 2026-09-02**:
rotta in `vercel.json`, funzione in `api/menu/[slug].js`, resa in
`lib/render-menu.js`. Legge `get_public_menu` (migration 708/709), cioè
**solo lo scatto pubblicato** dal ristoratore: la bozza non esce mai di lì.
`/menu/<slug>/<lingua>` esiste per la condivisione e l'indicizzazione, e
l'indirizzo canonico resta senza lingua.

Per guardarla **senza database**, con i dati finti di `lib/menu-sample.js`
(che serve anche da contratto: è, campo per campo, quello che la funzione
restituisce):

```bash
node -e "const{renderMenuPage}=require('./lib/render-menu.js'),{createT}=require('./lib/i18n.js');require('fs').writeFileSync('_preview-menu.html',renderMenuPage(require('./lib/menu-sample.js'),'it',createT('it')))"
python3 -m http.server 8099   # poi apri /_preview-menu.html
```

Quattro cose da non disfare:

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
  locale finisce col colore di ripiego **senza nessun errore**. La terza copia
  sono i **fattori della grandezza dei testi** (`textScale` in
  `render-menu.js`, da `TEXT_SCALE_FACTORS` in `partner/src/lib/venues.ts`).
  La quarta sono le **misure di base** del contenuto: i `calc(Npx * var(--ms))`
  di `menu-page.css` e quelli dell'anteprima (`MenuPreview`,
  `DishDetailSheet`). Dal 2026-09-03 i numeri sono **identici**, non più "uno
  sotto per via della cornice del telefono": lo sconto non era uguale per
  tutti i ruoli, e nel portale il nome del piatto stava a un punto dal titolo
  di sezione mentre al tavolo ne stava a due — cioè il ristoratore giudicava
  proporzioni che il suo cliente non avrebbe visto. **L'unica differenza
  voluta che resta** è la compensazione di mezzo punto sulle descrizioni nei
  pacchetti serif e leggero (`.font-classic .menu-item-desc`, 13.5px): c'è
  qui e non nell'anteprima, e mezzo pixel non vale una classe in più da
  tenere allineata.
- **Una marcatura sola per due impaginazioni.** L'impaginazione a blocco
  (`.layout-block`, DIGITAL_MENU Tema 29) è tutta nel CSS, sulla stessa
  marcatura della riga: `display: contents` su `.menu-item-line` scioglie nome
  e prezzo dentro il corpo, e `order` porta il prezzo sotto la descrizione.
  Due marcature avrebbero voluto dire due dettagli da tenere allineati, e uno
  di quei dettagli è **la riga degli allergeni** — che in nessuna
  impaginazione cambia. A blocco le miniature non si rendono affatto; la foto
  grande del dettaglio invece resta.
- **La scheda del piatto è un popup, e il filtro non è agganciato**
  (2026-09-03, DIGITAL_MENU Tema 28). Il popup sta al centro con la sua X, si
  chiude toccando fuori e ha le **freccine** che scorrono la carta
  nell'ordine in cui si vede — col filtro acceso è già riordinata. La fascia
  dei filtri **non è più `sticky`**: ferma in cima, la carta sembrava
  passarle dietro. Chi la rimette sticky si ricordi che sotto ci passano le
  fasce colorate delle sezioni.

**La grandezza dei testi e l'interlinea** non sono classi ma due numeri:
`--ms` e `--lh` nello style di `<body>`, e in `menu-page.css` ogni misura del
contenuto è `calc(Npx * var(--ms, 1))` e ogni interlinea
`calc(N * var(--lh, 1))`. Così due manopole muovono tutta la carta e non c'è
un secondo elenco da tenere allineato. Sono indipendenti: la grandezza cambia
quanto sono grandi le lettere, l'interlinea quanto respirano fra loro — e su
un menù di una pagina sola la seconda si nota più della prima.

⚠️ **La riga degli allergeni ha un pavimento** (11px dal 2026-09-03, era 10):
usa `max()`, quindi la carta Compatta non la rimpicciolisce — cresce con Ampia
e basta. La legge una
persona con un'allergia, in una sala poco illuminata, mentre qualcuno le
chiede cosa ordina. Chi toglie il `max()` si tiene quella riga. Per vedere le
tre grandezze una accanto all'altra:

```bash
node -e "const{renderMenuPage}=require('./lib/render-menu.js'),{createT}=require('./lib/i18n.js'),s=require('./lib/menu-sample.js'),fs=require('fs');for(const g of ['compact','normal','roomy'])fs.writeFileSync('_preview-scala-'+g+'.html',renderMenuPage({...s,textScale:g},'it',createT('it')))"
node -e "const{renderMenuPage}=require('./lib/render-menu.js'),{createT}=require('./lib/i18n.js'),s=require('./lib/menu-sample.js'),fs=require('fs');for(const g of ['tight','normal','airy'])fs.writeFileSync('_preview-interlinea-'+g+'.html',renderMenuPage({...s,lineHeight:g},'it',createT('it')))"
```

Le due impaginazioni e i separatori:

```bash
node -e "const{renderMenuPage}=require('./lib/render-menu.js'),{createT}=require('./lib/i18n.js'),s=require('./lib/menu-sample.js'),fs=require('fs');for(const l of ['row','block'])for(const sep of ['none','rule','ornament'])fs.writeFileSync('_preview-'+l+'-'+sep+'.html',renderMenuPage({...s,menuLayout:l,dishSeparator:sep,showDescriptions:l==='block'},'it',createT('it')))"
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
