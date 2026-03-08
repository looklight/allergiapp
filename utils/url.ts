/** Returns true if the string is a remote URL (http:// or https://) */
export function isRemoteUrl(uri: string | undefined): boolean {
  return !!uri && (uri.startsWith('http://') || uri.startsWith('https://'));
}
