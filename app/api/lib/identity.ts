import { InputError } from './validation';

export function normalizeUserId(value: unknown): string | null {
  const id = typeof value === 'number' || typeof value === 'string' ? String(value) : '';
  return /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id)) ? id : null;
}

export function assertUserId(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !normalizeUserId(value)) {
    throw new InputError('Invalid user id');
  }
}

export function assertSchool(value: string): string {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(value)) throw new InputError('Invalid school');
  return value;
}
