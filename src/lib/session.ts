export const SESSION_COOKIE_NAME = 'promo_track_session';

/**
 * สร้าง HMAC Signature เพื่อความปลอดภัยของ Cookie Session
 */
async function generateHmac(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * สร้าง Session Token (timestamp + hmac signature)
 */
export async function createSessionToken(passwordSecret: string): Promise<string> {
  const timestamp = Date.now().toString();
  const signature = await generateHmac(timestamp, passwordSecret);
  return `${timestamp}.${signature}`;
}

/**
 * ตรวจสอบความถูกต้องของ Session Token
 */
export async function verifySessionToken(token: string | undefined | null, passwordSecret: string): Promise<boolean> {
  if (!token || !passwordSecret) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [timestamp, signature] = parts;
  const expectedSignature = await generateHmac(timestamp, passwordSecret);

  if (signature !== expectedSignature) return false;

  // อายุการใช้งาน 30 วัน
  const tokenAge = Date.now() - parseInt(timestamp, 10);
  const maxAge = 30 * 24 * 60 * 60 * 1000;
  return tokenAge > 0 && tokenAge < maxAge;
}

