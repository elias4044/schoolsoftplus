# app/api/lib/serverCrypto.ts

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/serverCrypto.ts#L1) | [Contract index](README.md) | [Architecture](../architecture.md)

Source SHA-256: `4e0756e2313f0e660b9628d193d813244c3c974834d9a159e7f203e8060923e2`. These are source-derived declarations, not a claim that TypeScript types alone validate runtime data. Read the domain guides for semantics and side effects. Non-ASCII text is escaped in excerpts.

## EncryptedValue

```ts
export interface EncryptedValue {
  ciphertext: string; // base64
  iv: string; // base64
}
```

## encrypt

```ts
export function encrypt(plaintext: string): EncryptedValue;
```

## decrypt

```ts
export function decrypt({ ciphertext, iv }: EncryptedValue): string;
```
