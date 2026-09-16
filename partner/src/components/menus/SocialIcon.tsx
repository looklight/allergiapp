// Il simbolo del servizio, dedotto dall'indirizzo (v. lib/socials.ts).
//
// Decorativo per definizione: accanto c'è sempre il nome scritto, che è
// quello che legge chi ascolta la pagina. Se l'icona fosse l'unica cosa, un
// lettore di schermo direbbe «link» e basta.
import { socialIcon } from '@/lib/socials';

export default function SocialIcon({ url, className = 'h-4 w-4' }: { url: string; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {socialIcon(url).map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
