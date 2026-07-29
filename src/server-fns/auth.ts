import { createServerFn } from "@tanstack/react-start";
import { setCookie, deleteCookie } from "@tanstack/react-start/server";
import { randomUUID } from "node:crypto";
import { hashPassword, verifyPassword, createSessionToken, sessionCookieHeader } from "~/auth";
import { sql } from "~/db";

export const signup = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const body = data as {
      email?: string;
      password?: string;
      name?: string;
      organizationName?: string;
    };
    if (!body.email || !body.password || !body.organizationName) {
      throw new Error("Email, password, and organization name are required.");
    }
    if (body.password.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }
    if (!body.email.includes("@")) {
      throw new Error("Invalid email address.");
    }
    return body;
  })
  .handler(async ({ data }) => {
    const { email, password, name, organizationName } = data;
    const db = sql();

    const existing = await db`SELECT id FROM "User" WHERE email = ${email.toLowerCase().trim()}`;
    if (existing.length > 0) {
      throw new Error("An account with this email already exists.");
    }

    const orgId = randomUUID();
    const now = new Date();
    const filingDeadline = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

    await db`
      INSERT INTO "Organization" (id, name, "createdAt", "updatedAt", "filingDeadline", "reportingYear")
      VALUES (${orgId}, ${organizationName.trim()}, ${now}, ${now}, ${filingDeadline}, ${now.getFullYear()})
    `;

    const userId = randomUUID();
    const passwordHash = await hashPassword(password);

    await db`
      INSERT INTO "User" (id, "organizationId", email, "passwordHash", name, role, "createdAt", "updatedAt")
      VALUES (${userId}, ${orgId}, ${email.toLowerCase().trim()}, ${passwordHash}, ${name?.trim() || null}, 'admin', ${now}, ${now})
    `;

    const token = await createSessionToken(userId, orgId);
    const maxAge = 60 * 60 * 24 * 7;

    setCookie("chainproof_session", token, {
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
      maxAge,
    });

    return { success: true };
  });

export const login = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const body = data as { email?: string; password?: string };
    if (!body.email || !body.password) {
      throw new Error("Email and password are required.");
    }
    return body;
  })
  .handler(async ({ data }) => {
    const { email, password } = data;
    const db = sql();

    const users = await db`
      SELECT id, "passwordHash", "organizationId"
      FROM "User"
      WHERE email = ${email.toLowerCase().trim()}
    `;

    if (users.length === 0) {
      throw new Error("Invalid email or password.");
    }

    const user = users[0];
    const valid = await verifyPassword(password, user.passwordHash as string);

    if (!valid) {
      throw new Error("Invalid email or password.");
    }

    const token = await createSessionToken(user.id as string, user.organizationId as string);
    const maxAge = 60 * 60 * 24 * 7;

    setCookie("chainproof_session", token, {
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
      maxAge,
    });

    return { success: true };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  deleteCookie("chainproof_session", { path: "/" });
  return { success: true };
});
