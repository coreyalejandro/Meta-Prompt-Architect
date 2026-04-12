import { get, set } from 'idb-keyval';

const KEY_STORE = 'architect_crypto_key';

export async function getOrCreateKey(): Promise<CryptoKey> {
  let key = await get<CryptoKey>(KEY_STORE);
  if (!key) {
    key = await window.crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256
      },
      false, // Non-extractable for better security
      ["encrypt", "decrypt"]
    );
    await set(KEY_STORE, key);
  }
  return key;
}

export async function encryptData(data: any): Promise<Uint8Array> {
  const key = await getOrCreateKey();
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV is standard for AES-GCM
  const encodedData = new TextEncoder().encode(JSON.stringify(data));

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    key,
    encodedData
  );

  // Combine IV and encrypted data
  const encryptedArray = new Uint8Array(encryptedBuffer);
  const combined = new Uint8Array(iv.length + encryptedArray.length);
  combined.set(iv, 0);
  combined.set(encryptedArray, iv.length);

  return combined;
}

export async function decryptData(combined: Uint8Array): Promise<any> {
  const key = await getOrCreateKey();
  const iv = combined.slice(0, 12);
  const encryptedData = combined.slice(12);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    key,
    encryptedData
  );

  const decodedString = new TextDecoder().decode(decryptedBuffer);
  return JSON.parse(decodedString);
}
