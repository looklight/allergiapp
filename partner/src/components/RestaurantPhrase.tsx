// Una frase col nome del ristorante dell'app dentro, e il nome che porta alla
// sua pagina pubblica (allergiapp.com/r/…): «Associato a Linfa Milano.».
//
// Nel dizionario la frase sta intera, col segnaposto {restaurant}: montarla a
// pezzi nel JSX vorrebbe dire tenere preposizioni sciolte che in inglese
// finiscono altrove (v. fill in lib/i18n.tsx). Qui si spezza sul segnaposto
// e al suo posto va il link. Senza slug — prima che arrivi, o per un
// ristorante che non l'ha — il nome resta in evidenza, senza link.
import { restaurantPageUrl } from '@/lib/association';

export default function RestaurantPhrase({
  template,
  name,
  slug,
}: {
  template: string;
  name: string;
  slug: string;
}) {
  const [prima, dopo = ''] = template.split('{restaurant}');
  return (
    <>
      {prima}
      {slug ? (
        <a href={restaurantPageUrl(slug)} target="_blank" rel="noopener noreferrer" className="font-medium underline">
          {name}
        </a>
      ) : (
        <span className="font-medium">{name}</span>
      )}
      {dopo}
    </>
  );
}
