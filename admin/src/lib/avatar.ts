// Il mobile salva in profiles.avatar_url:
// - una URL http(s) per avatar caricati via Storage
// - un id preset tipo 'plate_forks' per gli avatar della galleria
// I PNG preset disponibili sono serviti da /public/avatars/.

const PRESET_IDS_WITH_IMAGE = new Set([
  'plate_forks',
  'plate_language',
  'plate_passport',
]);

export function resolveAvatarSrc(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl;
  }
  if (PRESET_IDS_WITH_IMAGE.has(avatarUrl)) {
    return `/avatars/${avatarUrl}.png`;
  }
  return null;
}
