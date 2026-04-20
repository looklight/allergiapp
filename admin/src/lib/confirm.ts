export function confirmDestructive(message: string, confirmWord = 'ok'): boolean {
  const input = prompt(`${message}\n\nDigita "${confirmWord}" per confermare.`);
  return input?.trim().toLowerCase() === confirmWord.toLowerCase();
}
