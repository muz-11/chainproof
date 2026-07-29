import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { verifySessionToken } from "~/auth";
import { sql } from "~/db";
import { useState } from "react";
import { logout } from "~/server-fns/auth";

const getSuppliersData = createServerFn({ method: "GET" }).handler(async () => {
  const token = getCookie("chainproof_session");
  if (!token) {
    throw redirect({ to: "/login" });
  }

  const session = await verifySessionToken(token);
  if (!session) {
    throw redirect({ to: "/login" });
  }

  const db = sql();

  const userRows = await db`
    SELECT u.email, u.name, o.name as "orgName"
    FROM "User" u
    JOIN "Organization" o ON o.id = u."organizationId"
    WHERE u.id = ${session.userId}
  `;

  const suppliers = await db`
    SELECT id, name, "contactEmail", country, "spendCategory", "riskLevel", "createdAt"
    FROM "Supplier"
    WHERE "organizationId" = ${session.organizationId}
    ORDER BY "createdAt" DESC
  `;

  return {
    email: userRows[0].email as string,
    name: userRows[0].name as string | null,
    orgName: userRows[0].orgName as string,
    suppliers: suppliers.map((s) => ({
      id: s.id as string,
      name: s.name as string,
      contactEmail: (s.contactEmail as string) || "—",
      country: (s.country as string) || "—",
      spendCategory: (s.spendCategory as string) || "—",
      riskLevel: s.riskLevel as string,
      createdAt: String(s.createdAt as Date),
    })),
  };
});

export const Route = createFileRoute("/suppliers/")({
  loader: () => getSuppliersData(),
  component: SuppliersPage,
});

function SuppliersPage() {
  const data = Route.useLoaderData();
  const [loggingOut, setLoggingOut] = useState(false);
  const [countryFilter, setCountryFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState("");

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      // continue
    }
    window.location.href = "/login";
  }

  const { suppliers } = data;

  // Get unique countries for filter dropdown
  const countries = [...new Set(suppliers.map((s) => s.country).filter((c) => c !== "—"))].sort();

  const filtered = suppliers.filter((s) => {
    if (countryFilter && s.country !== countryFilter) return false;
    if (riskFilter && s.riskLevel !== riskFilter) return false;
    return true;
  });

  const riskBadge = (level: string) => {
    const colors: Record<string, string> = {
      low: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-red-100 text-red-800",
    };
    return (
      <span
        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[level] || "bg-gray-100 text-gray-800"}`}
      >
        {level}
      </span>
    );
  };

  return (
    <div className="min-h-dvh bg-gray-50">
      {/* Header */}
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
            <Link to="/dashboard" className="text-sm text-gray-600 hover:text-indigo-600">
              Dashboard
            </Link>
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

      {/* Main content */}
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Suppliers</h1>
            <p className="text-sm text-gray-600">
              {suppliers.length} supplier{suppliers.length !== 1 ? "s" : ""} in your supply chain
            </p>
          </div>
          <Link
            to="/suppliers/upload"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
            </svg>
            Upload CSV
          </Link>
        </div>

        {/* Filters */}
        {suppliers.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-3">
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
            >
              <option value="">All countries</option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
            >
              <option value="">All risk levels</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            {(countryFilter || riskFilter) && (
              <button
                onClick={() => {
                  setCountryFilter("");
                  setRiskFilter("");
                }}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                Clear filters
              </button>
            )}
            <span className="self-center text-xs text-gray-500">
              Showing {filtered.length} of {suppliers.length}
            </span>
          </div>
        )}

        {/* Table */}
        {suppliers.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
              <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v12m6-6H6"
                />
              </svg>
            </div>
            <h2 className="mb-1 text-lg font-semibold">No suppliers yet</h2>
            <p className="mb-4 text-sm text-gray-600">
              Upload your supplier list via CSV to get started.
            </p>
            <Link
              to="/suppliers/upload"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Upload CSV
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Contact Email</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Country</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Spend Category</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Risk Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                    <td className="px-4 py-3 text-gray-600">{s.contactEmail}</td>
                    <td className="px-4 py-3 text-gray-600">{s.country}</td>
                    <td className="px-4 py-3 text-gray-600">{s.spendCategory}</td>
                    <td className="px-4 py-3">{riskBadge(s.riskLevel)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="p-8 text-center text-sm text-gray-500">
                No suppliers match the current filters.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
