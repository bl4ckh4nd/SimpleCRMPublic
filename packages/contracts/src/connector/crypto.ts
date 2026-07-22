const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

async function keyFromBase64(secret: string, usage: KeyUsage[]) {
  const bytes = base64ToBytes(secret);
  if (bytes.byteLength !== 32) throw new Error("CONNECTOR_ENCRYPTION_KEY must be 32 bytes encoded as base64");
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, usage);
}

export async function encryptJson(value: unknown, secret: string) {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const key = await keyFromBase64(secret, ["encrypt"]);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, encoder.encode(JSON.stringify(value))));
  return `v1.${bytesToBase64(nonce)}.${bytesToBase64(ciphertext)}`;
}

export async function decryptJson<T>(envelope: string, secret: string): Promise<T> {
  const [version, nonce, ciphertext] = envelope.split(".");
  if (version !== "v1" || !nonce || !ciphertext) throw new Error("INVALID_ENCRYPTED_ENVELOPE");
  const key = await keyFromBase64(secret, ["decrypt"]);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(nonce) }, key, base64ToBytes(ciphertext));
  return JSON.parse(decoder.decode(plaintext)) as T;
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return bytesToBase64(new Uint8Array(digest));
}
