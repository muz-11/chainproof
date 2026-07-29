import { sql } from "~/db";
import bcrypt from "bcryptjs";

const SESSION_COOKIE = "chainproof_session";

function getSecret(): string {
  return process.env.SESSION_SECRET || "chainproof-dev-secret-change-in-production";
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(userId: string, organizationId: string): Promise<string> {
  const payload = JSON.stringify({ userId, organizationId, iat: Date.now() });
  const payloadB64 = Buffer.from(payload).toString("base64url");
  const sig = await sign(payloadB64, getSecret());
  return `${payloadB64}.${sig}`;
}

export async function verifySessionToken(
  token: string,
): Promise<{ userId: string; organizationId: string } | null> {
  try {
    const [payloadB64, signature] = token.split(".");
    if (!payloadB64 || !signature) return null;
    const expectedSig = await sign(payloadB64, getSecret());
    if (signature !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    return { userId: payload.userId as string, organizationId: payload.organizationId as string };
  } catch {
    return null;
  }
}

export function sessionCookieHeader(token: string, maxAge: number = 60 * 60 * 24 * 7): string {
  return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

export function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name && rest.length > 0) {
      cookies[name] = rest.join("=");
    }
  }
  return cookies;
}

export async function getUserFromSession(
  cookieHeader: string | null,
): Promise<{ userId: string; organizationId: string; email: string; orgName: string } | null> {
  const cookies = parseCookies(cookieHeader);
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;

  const session = await verifySessionToken(token);
  if (!session) return null;

  const db = sql();
  const users = await db`
    SELECT u.id, u.email, u."organizationId", o.name as "orgName"
    FROM "User" u
    JOIN "Organization" o ON o.id = u."organizationId"
    WHERE u.id = ${session.userId}
  `;
  if (users.length === 0) return null;

  const u = users[0];
  return {
    userId: u.id as string,
    organizationId: u.organizationId as string,
    email: u.email as string,
    orgName: u.orgName as string,
  };
}

async function sign(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Buffer.from(sig).toString("base64url");
}
