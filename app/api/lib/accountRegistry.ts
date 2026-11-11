import { normalizeUserId } from './identity';
import { InputError } from './validation';

export function isAccountReference(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[a-zA-Z0-9][a-zA-Z0-9._@-]{0,199}$/.test(value) &&
    value !== '__proto__'
  );
}

export async function resolveAccountReference(value: string): Promise<string> {
  if (!isAccountReference(value)) throw new InputError('Invalid account reference');
  if (normalizeUserId(value)) return value;
  const { getDb } = await import('./firebaseAdmin');
  const alias = await getDb().collection('account_aliases').doc(value.toLowerCase()).get();
  return alias.data()?.userId ?? value.toLowerCase();
}

export async function assertCurrentAccountReferences(
  transaction: FirebaseFirestore.Transaction,
  references: string[]
) {
  const legacy = [...new Set(references)].filter((value) => !normalizeUserId(value));
  if (!legacy.length) return;
  const { getDb } = await import('./firebaseAdmin');
  for (const value of legacy) {
    const alias = (await transaction.get(getDb().collection('account_aliases').doc(value))).data();
    if (alias && alias.userId !== value)
      throw new InputError('An account was updated. Refresh and try again.', 409);
  }
}
