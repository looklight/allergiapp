# Immagini del sito

Questa cartella contiene le immagini utilizzate nel sito web allergiapp.com

## Come usare le immagini

Nel file HTML, usa il percorso relativo:

```html
<img src="images/nome-immagine.png" alt="Descrizione">
```

Nel file CSS, per i background:

```css
.elemento {
    background-image: url('../images/nome-immagine.png');
}
```

## Formati consigliati

- **PNG**: per loghi, icone, immagini con trasparenza
- **JPG/JPEG**: per foto, screenshot
- **SVG**: per icone vettoriali (scalabili senza perdita di qualità)
- **WebP**: formato moderno, più leggero (supportato da tutti i browser moderni)

## Ottimizzazione

Prima di caricare le immagini, ottimizzale per il web:
- Riduci dimensioni (max 1920px larghezza per immagini full-width)
- Comprimi (usa tinypng.com o squoosh.app)
- Usa formati moderni come WebP quando possibile

## Esempi di utilizzo

### Screenshot app
```html
<img src="images/screenshot-home.png" alt="Screenshot homepage AllergiApp">
```

### Logo nel hero
```html
<img src="images/logo-hero.png" alt="AllergiApp logo" class="hero-logo">
```

### Background sezione
```css
.section {
    background-image: url('../images/pattern-bg.png');
}
```
