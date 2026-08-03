/**
 * Minimal Web Push (RFC 8291 aes128gcm + RFC 8292 VAPID) implementation
 * built on WebCrypto so it runs in the edge/Worker runtime.
 */

function b64urlToBytes(input: string): Uint8Array {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const bin = atob(b64 + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

async function hmac(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey(
    "raw",
    key as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data as BufferSource));
}

const enc = new TextEncoder();

async function createVapidHeader(audience: string): Promise<string> {
  const privateKeyB64 = process.env["VAPID_PRIVATE_KEY"];
  const publicKeyB64 = process.env["VAPID_PUBLIC_KEY"];
  const subject = process.env["VAPID_SUBJECT"] ?? "mailto:noreply@example.com";
  if (!privateKeyB64 || !publicKeyB64) throw new Error("VAPID keys are not configured");

  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: subject,
  };
  const unsigned = `${bytesToB64url(enc.encode(JSON.stringify(header)))}.${bytesToB64url(
    enc.encode(JSON.stringify(payload)),
  )}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    b64urlToBytes(privateKeyB64) as BufferSource,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(unsigned)),
  );
  return `vapid t=${unsigned}.${bytesToB64url(sig)}, k=${publicKeyB64}`;
}

async function encryptPayload(
  payload: string,
  uaPublicKeyB64: string,
  authSecretB64: string,
): Promise<Uint8Array> {
  const uaPublic = b64urlToBytes(uaPublicKeyB64);
  const authSecret = b64urlToBytes(authSecretB64);

  const localKeys = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
    "deriveBits",
  ]);
  const localPublic = new Uint8Array(await crypto.subtle.exportKey("raw", localKeys.publicKey));
  const uaKey = await crypto.subtle.importKey(
    "raw",
    uaPublic as BufferSource,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, localKeys.privateKey, 256),
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prkKey = await hmac(authSecret, shared);
  const keyInfo = concat(enc.encode("WebPush: info\0"), uaPublic, localPublic, new Uint8Array([1]));
  const ikm = await hmac(prkKey, keyInfo);
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, concat(enc.encode("Content-Encoding: aes128gcm\0"), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, concat(enc.encode("Content-Encoding: nonce\0"), new Uint8Array([1])))).slice(0, 12);

  const aesKey = await crypto.subtle.importKey("raw", cek as BufferSource, "AES-GCM", false, [
    "encrypt",
  ]);
  const record = concat(enc.encode(payload), new Uint8Array([2]));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce as BufferSource },
      aesKey,
      record as BufferSource,
    ),
  );

  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  return concat(salt, rs, new Uint8Array([localPublic.length]), localPublic, ciphertext);
}

export interface PushSubscriptionRecord {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushResult {
  ok: boolean;
  status: number;
  /** true when the subscription is gone and should be deleted */
  expired: boolean;
}

export async function sendWebPush(
  subscription: PushSubscriptionRecord,
  payload: { title: string; body: string; url?: string; tag?: string },
): Promise<PushResult> {
  const audience = new URL(subscription.endpoint).origin;
  const [authorization, body] = await Promise.all([
    createVapidHeader(audience),
    encryptPayload(JSON.stringify(payload), subscription.p256dh, subscription.auth),
  ]);

  const res = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: "86400",
      Urgency: "normal",
    },
    body: body as BodyInit,
  });

  return { ok: res.ok, status: res.status, expired: res.status === 404 || res.status === 410 };
}