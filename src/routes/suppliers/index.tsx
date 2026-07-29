import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { verifySessionToken } from "~/auth";
import { sql } from "~/db";
import { useState } from "react";
import { logout } from "~/server-fns/auth";
import { createCampaign, sendCampaignEmails } from "~/server-fns/campaigns";

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

  // Get suppliers with latest campaign status
  const suppliers = await db`
    SELECT
      s.id, s.name, s."contactEmail", s.country, s."spendCategory", s."riskLevel", s."createdAt",
      cs."status" as "campaignStatus"
    FROM "Supplier" s
    LEFT JOIN LATERAL (
      SELECT cs2."status"
      FROM "CampaignSupplier" cs2
      JOIN "Campaign" c2 ON c2."id" = cs2."campaignId"
      WHERE cs2."supplierId" = s."id" AND c2."organizationId" = ${session.organizationId}
      ORDER BY cs2."createdAt" DESC
      LIMIT 1
    ) cs ON true
    WHERE s."organizationId" = ${session.organizationId}
    ORDER BY s."createdAt" DESC
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
      campaignStatus: (s.campaignStatus as string) || null,
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [campaignResult, setCampaignResult] = useState<{
    campaignId: string;
    sent: number;
    total: number;
    errors: string[];
  } | null>(null);
  const [campaignError, setCampaignError] = useState<string | null>(null);

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

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((s) => s.id)));
    }
  };

  async function handleCreateCampaign() {
    if (selectedIds.size === 0) return;
    setCreating(true);
    setCampaignError(null);
    setCampaignResult(null);

    try {
      const { campaignId } = await createCampaign({
        data: { supplierIds: Array.from(selectedIds) },
      });

      // Immediately send emails
      const sendResult = await sendCampaignEmails({ data: { campaignId } });
      setCampaignResult({ campaignId, ...sendResult });
      setSelectedIds(new Set());

      // Reload to show updated statuses
      window.location.reload();
    } catch (e: any) {
      setCampaignError(e?.message || "Failed to create campaign.");
    } finally {
      setCreating(false);
    }
  }

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

  const campaignStatusBadge = (status: string | null) => {
    if (!status || status === "not_sent") {
      return (
        <span className="inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
          Not contacted
        </span>
      );
    }
    const labels: Record<string, { label: string; className: string }> = {
      sent: { label: "Sent", className: "bg-blue-100 text-blue-800" },
      opened: { label: "Opened", className: "bg-indigo-100 text-indigo-800" },
      responded: { label: "Responded", className: "bg-green-100 text-green-800" },
      flagged: { label: "Flagged", className: "bg-red-100 text-red-800" },
    };
    const info = labels[status] || { label: status, className: "bg-gray-100 text-gray-800" };
    return (
      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${info.className}`}>
        {info.label}
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
          <div className="flex items-center gap-3">
            <Link
              to="/suppliers/upload"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
              </svg>
              Upload CSV
            </Link>
            <button
              onClick={handleCreateCampaign}
              disabled={selectedIds.size === 0 || creating}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              {creating ? "Sending..." : selectedIds.size > 0 ? `Send to ${selectedIds.size} supplier${selectedIds.size !== 1 ? "s" : ""}` : "Send Questionnaire"}
            </button>
          </div>
        </div>

        {campaignError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {campaignError}
          </div>
        )}

        {campaignResult && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm">
            <p className="font-medium text-green-800">
              Campaign sent: {campaignResult.sent} of {campaignResult.total} emails sent.
            </p>
            {campaignResult.errors.length > 0 && (
              <ul className="mt-2 space-y-1 text-red-700">
                {campaignResult.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        )}

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
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filtered.length && filtered.length > 0}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Contact Email</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Country</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Spend Category</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Risk Level</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Campaign</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(s.id)}
                        onChange={() => toggleSelect(s.id)}
                        className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                    <td className="px-4 py-3 text-gray-600">{s.contactEmail}</td>
                    <td className="px-4 py-3 text-gray-600">{s.country}</td>
                    <td className="px-4 py-3 text-gray-600">{s.spendCategory}</td>
                    <td className="px-4 py-3">{riskBadge(s.riskLevel)}</td>
                    <td className="px-4 py-3">{campaignStatusBadge(s.campaignStatus)}</td>
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
