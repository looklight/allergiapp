// Il mobile salva in profiles.avatar_url:
// - una URL http(s) per avatar caricati via Storage
// - un id preset tipo 'plate_<nome>' per gli avatar della galleria
// I PNG preset sono serviti da /public/avatars/ e tenuti allineati a
// main:assets/avatars/ via admin/scripts/sync-avatars-from-main.sh.
// Se un PNG manca, il <img onError> fa fallback all'iniziale.

export function resolveAvatarSrc(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl;
  }
  if (avatarUrl.startsWith('plate_')) {
    return `/avatars/${avatarUrl}.png`;
  }
  return null;
}
