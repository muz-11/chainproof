import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { verifySessionToken } from "~/auth";
import { sql } from "~/db";
import { useState } from "react";
import { logout } from "~/server-fns/auth";
import { uploadSuppliersCSV } from "~/server-fns/suppliers";

const getUserInfo = createServerFn({ method: "GET" }).handler(async () => {
  const token = getCookie("chainproof_session");
  if (!token) throw redirect({ to: "/login" });
  const session = await verifySessionToken(token);
  if (!session) throw redirect({ to: "/login" });

  const db = sql();
  const users = await db`
    SELECT u.email, u.name, o.name as "orgName"
    FROM "User" u JOIN "Organization" o ON o.id = u."organizationId"
    WHERE u.id = ${session.userId}
  `;
  return {
    email: users[0].email as string,
    name: users[0].name as string | null,
    orgName: users[0].orgName as string,
  };
});

export const Route = createFileRoute("/suppliers/upload")({
  loader: () => getUserInfo(),
  component: UploadPage,
});

const SAMPLE_CSV = `name,contact_email,country,spend_category,risk_level
Acme Corp,acme@example.com,USA,raw_materials,low
Global Parts,parts@global.com,Germany,components,medium
Pacific Imports,pacific@example.com,China,electronics,low`;

function UploadPage() {
  const data = Route.useLoaderData();
  const [loggingOut, setLoggingOut] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ added: number; skipped: { row: number; reason: string }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    setLoggingOut(true);
    try { await logout(); } catch { /* */ }
    window.location.href = "/login";
  }

  async function handleUpload() {
    setError(null);
    setResult(null);

    if (!csvText.trim()) {
      setError("Please enter CSV content first.");
      return;
    }

    setUploading(true);
    try {
      const res = await uploadSuppliersCSV({ data: { csv: csvText } });
      setResult(res);
      setCsvText("");
    } catch (e: any) {
      setError(e?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-xl font-bold tracking-tight text-indigo-700 hover:text-indigo-800">
              ChainProof
            </Link>
            <span className="hidden rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 sm:inline">
              {data.orgName}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-sm text-gray-600 hover:text-indigo-600">Dashboard</Link>
            <Link to="/suppliers" className="text-sm text-gray-600 hover:text-indigo-600">Suppliers</Link>
            <span className="text-sm text-gray-600">{data.name || data.email}</span>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {loggingOut ? "..." : "Log out"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6">
          <Link to="/suppliers" className="text-sm text-indigo-600 hover:text-indigo-800">
            &larr; Back to suppliers
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Upload Supplier CSV</h1>
          <p className="text-sm text-gray-600">
            Paste your CSV data below. Required columns: <code className="rounded bg-gray-100 px-1 text-xs">name</code>,{" "}
            <code className="rounded bg-gray-100 px-1 text-xs">contact_email</code>,{" "}
            <code className="rounded bg-gray-100 px-1 text-xs">risk_level</code> (low/medium/high). Optional:{" "}
            <code className="rounded bg-gray-100 px-1 text-xs">country</code>,{" "}
            <code className="rounded bg-gray-100 px-1 text-xs">spend_category</code>.
          </p>
        </div>

        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
          <label className="mb-2 block text-sm font-medium text-gray-700">CSV Content</label>
          <textarea
            value={csvText}
            onChange={(e) => {
              setCsvText(e.target.value);
              setError(null);
              setResult(null);
            }}
            placeholder={SAMPLE_CSV}
            rows={10}
            className="block w-full rounded-lg border border-gray-300 bg-white p-3 text-sm font-mono text-gray-700 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          <p className="mt-2 text-xs text-gray-500">
            Paste CSV data with headers. First row must be the header:{" "}
            <code className="rounded bg-gray-100 px-1 text-xs">name,contact_email,country,spend_category,risk_level</code>
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {result && (
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-3 text-lg font-semibold text-gray-900">Upload Complete</h3>
            <div className="mb-4 flex gap-4">
              <div className="rounded-lg bg-green-50 px-4 py-3">
                <p className="text-2xl font-bold text-green-700">{result.added}</p>
                <p className="text-xs text-green-600">rows added</p>
              </div>
              <div className="rounded-lg bg-yellow-50 px-4 py-3">
                <p className="text-2xl font-bold text-yellow-700">{result.skipped.length}</p>
                <p className="text-xs text-yellow-600">rows skipped</p>
              </div>
            </div>
            {result.skipped.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-medium text-gray-700">Skipped rows</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  {result.skipped.map((s: any, i: number) => (
                    <li key={i} className="rounded bg-yellow-50 px-3 py-1">
                      {s.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-4">
              <Link
                to="/suppliers"
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                View supplier list
              </Link>
            </div>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!csvText.trim() || uploading}
          className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {uploading ? "Uploading..." : "Upload Suppliers"}
        </button>
      </main>
    </div>
  );
}
