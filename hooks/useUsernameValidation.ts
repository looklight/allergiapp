import { useState, useEffect, useRef } from 'react';
import { AuthService } from '../services/auth';

export type UsernameValidationState =
  | { kind: 'idle' }
  | { kind: 'too-short' }
  | { kind: 'too-long' }
  | { kind: 'invalid-format' }
  | { kind: 'checking' }
  | { kind: 'available' }
  | { kind: 'unavailable' };

// Stesso pattern della CHECK constraint in migration 053
const USERNAME_REGEX = /^[A-Za-z0-9][A-Za-z0-9_.]{1,28}[A-Za-z0-9_]$/;

const DEBOUNCE_MS = 300;

/**
 * Validazione live di uno username:
 * - Format check immediato lato client
 * - Disponibilita' via RPC `is_username_available` con debounce
 * - Se `initialValue` e' fornito e uguale al valore corrente, ritorna 'idle'
 *   (consente "salva senza cambiare")
 */
export function useUsernameValidation(
  username: string,
  options?: { initialValue?: string },
): { state: UsernameValidationState; canSubmit: boolean } {
  const [state, setState] = useState<UsernameValidationState>({ kind: 'idle' });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = username.trim();
    const initial = options?.initialValue;
    const isUnchanged = initial != null && trimmed === initial;

    if (!trimmed || isUnchanged) {
      setState({ kind: 'idle' });
      return;
    }
    if (trimmed.length < 3) {
      setState({ kind: 'too-short' });
      return;
    }
    if (trimmed.length > 30) {
      setState({ kind: 'too-long' });
      return;
    }
    if (!USERNAME_REGEX.test(trimmed) || /\.\./.test(trimmed)) {
      setState({ kind: 'invalid-format' });
      return;
    }

    setState({ kind: 'checking' });
    debounceRef.current = setTimeout(async () => {
      try {
        const available = await AuthService.isUsernameAvailable(trimmed);
        setState({ kind: available ? 'available' : 'unavailable' });
      } catch {
        setState({ kind: 'unavailable' });
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [username, options?.initialValue]);

  const trimmed = username.trim();
  const isUnchanged =
    options?.initialValue != null && trimmed === options.initialValue;
  const canSubmit =
    state.kind === 'available' || (isUnchanged && trimmed.length > 0);

  return { state, canSubmit };
}
