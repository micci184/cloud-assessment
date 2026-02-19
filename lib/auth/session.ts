import crypto from "node:crypto";

export type SessionPayload = {
  userId: string;
  tokenVersion: number;
  exp: number;
};

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf-8").toString("base64url");
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf-8");
}

function createHmacSignature(payloadBase64: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payloadBase64).digest("base64url");
}

export function signSession(payload: SessionPayload, secret: string): string {
  const payloadBase64 = toBase64Url(JSON.stringify(payload));
  const signature = createHmacSignature(payloadBase64, secret);

  return `${payloadBase64}.${signature}`;
}

export function verifySession(token: string, secret: string): SessionPayload | null {
  const [payloadBase64, signature] = token.split(".");

  if (!payloadBase64 || !signature) {
    return null;
  }

  const expectedSignature = createHmacSignature(payloadBase64, secret);
  const signatureBuffer = Buffer.from(signature, "utf-8");
  const expectedSignatureBuffer = Buffer.from(expectedSignature, "utf-8");

  if (signatureBuffer.length !== expectedSignatureBuffer.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(signatureBuffer, expectedSignatureBuffer)) {
    return null;
  }

  try {
    const parsed = JSON.parse(fromBase64Url(payloadBase64)) as SessionPayload;

    if (!parsed.userId || typeof parsed.tokenVersion !== "number" || typeof parsed.exp !== "number") {
      return null;
    }

    if (parsed.exp <= Date.now()) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
