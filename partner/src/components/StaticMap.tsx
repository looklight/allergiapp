// LA MAPPA FISSA DELLA CONFERMA: «è questo il tuo locale?» (scelta
// dell'utente, 18/09). Un'immagine della zona e basta — niente librerie,
// niente da trascinare: per riconoscere il proprio locale basta vedere dove
// sta.
//
// Nessun servizio di mappe statiche: si compongono a mano le mattonelle di
// OpenStreetMap (256 px l'una) attorno al punto, centrate con calc() così
// il riquadro può essere largo quanto vuole. Le mattonelle di Google no: le
// integrazioni Google si stanno togliendo, non se ne aggiungono di nuove.
//
// ⚠️ OpenStreetMap chiede due cose, e qui ci sono tutt'e due: l'attribuzione
// visibile, e un uso leggero dei suoi server (poche immagini, solo quando un
// ristoratore conferma il suo locale).
//
// 16 e non 17 (richiesta dell'utente, 19/09): a 17 si vedeva il palazzo e
// poco altro; a 16 compaiono le vie attorno e si capisce dov'è il locale.
const ZOOM = 16;
const TILE = 256;
// Quanto può essere largo e alto il riquadro, al massimo: serve solo a
// decidere quante mattonelle chiedere.
const MAX_W = 800;
const HEIGHT = 200;

function pixel(lat: number, lng: number) {
  const scala = TILE * 2 ** ZOOM;
  const rad = (lat * Math.PI) / 180;
  return {
    x: ((lng + 180) / 360) * scala,
    y: ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * scala,
  };
}

export default function StaticMap({ latitude, longitude, label }: { latitude: number; longitude: number; label: string }) {
  const { x, y } = pixel(latitude, longitude);
  const tiles: { tx: number; ty: number }[] = [];
  for (let tx = Math.floor((x - MAX_W / 2) / TILE); tx <= Math.floor((x + MAX_W / 2) / TILE); tx++) {
    for (let ty = Math.floor((y - HEIGHT / 2) / TILE); ty <= Math.floor((y + HEIGHT / 2) / TILE); ty++) {
      tiles.push({ tx, ty });
    }
  }

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl bg-gray-100"
      style={{ height: HEIGHT }}
      role="img"
      aria-label={label}
    >
      {tiles.map(({ tx, ty }) => (
        // eslint-disable-next-line @next/next/no-img-element -- mattonelle esterne: next/image le scaricherebbe dal nostro server
        <img
          key={`${tx}-${ty}`}
          src={`https://tile.openstreetmap.org/${ZOOM}/${tx}/${ty}.png`}
          alt=""
          width={TILE}
          height={TILE}
          draggable={false}
          className="absolute max-w-none select-none"
          style={{
            left: `calc(50% + ${Math.round(tx * TILE - x)}px)`,
            top: `calc(50% + ${Math.round(ty * TILE - y)}px)`,
          }}
        />
      ))}
      {/* Il segnaposto: la punta sta esattamente sul punto */}
      <svg
        className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-full drop-shadow"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7z"
          fill="#111827"
          stroke="#fff"
          strokeWidth="1.5"
        />
        <circle cx="12" cy="9" r="2.6" fill="#fff" />
      </svg>
      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-0 right-0 bg-white/80 px-1.5 py-0.5 text-[10px] text-gray-600 hover:text-gray-900"
      >
        © OpenStreetMap
      </a>
    </div>
  );
}
