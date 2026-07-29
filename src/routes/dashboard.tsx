import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { verifySessionToken } from "~/auth";
import { sql } from "~/db";
import { useState } from "react";
import { logout } from "~/server-fns/auth";

const getDashboardData = createServerFn({ method: "GET" }).handler(async () => {
  const token = getCookie("chainproof_session");
  if (!token) {
    throw redirect({ to: "/login" });
  }

  const session = await verifySessionToken(token);
  if (!session) {
    throw redirect({ to: "/login" });
  }

  const db = sql();

  const users = await db`
    SELECT u.id, u.email, u.name, u."organizationId", o.name as "orgName",
           o."reportingYear", o."filingDeadline"
    FROM "User" u
    JOIN "Organization" o ON o.id = u."organizationId"
    WHERE u.id = ${session.userId} AND u."organizationId" = ${session.organizationId}
  `;

  if (users.length === 0) {
    throw redirect({ to: "/login" });
  }

  const user = users[0];

  const counts = await db`
    SELECT
      COUNT(*)::int as "totalSuppliers",
      COUNT(*) FILTER (WHERE "riskLevel" = 'high')::int as "flaggedSuppliers"
    FROM "Supplier"
    WHERE "organizationId" = ${session.organizationId}
  `;

  return {
    email: user.email as string,
    name: user.name as string | null,
    orgName: user.orgName as string,
    reportingYear: user.reportingYear as number,
    filingDeadline: String(user.filingDeadline as Date),
    totalSuppliers: counts[0].totalSuppliers as number,
    flaggedSuppliers: counts[0].flaggedSuppliers as number,
    responseRate: 0,
  };
});

export const Route = createFileRoute("/dashboard")({
  loader: () => getDashboardData(),
  component: Dashboard,
});

function Dashboard() {
  const data = Route.useLoaderData();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      // continue with redirect even if server fn fails
    }
    window.location.href = "/login";
  }

  const deadline = new Date(data.filingDeadline);
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="min-h-dvh bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold tracking-tight text-indigo-700">ChainProof</span>
            <span className="hidden rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 sm:inline">
              {data.orgName}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {data.name || data.email}
            </span>
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
        <h1 className="mb-2 text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mb-8 text-gray-600">
          Supply chain transparency report for {data.orgName} — reporting year {data.reportingYear}
        </p>

        {/* Stats grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Filing deadline"
            value={`${daysLeft} days left`}
            detail={deadline.toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          />
          <StatCard
            label="Suppliers"
            value={String(data.totalSuppliers)}
            detail="in your supply chain"
          />
          <StatCard
            label="Response rate"
            value={`${data.responseRate}%`}
            detail="questionnaires completed"
          />
          <StatCard
            label="Flagged suppliers"
            value={String(data.flaggedSuppliers)}
            detail="high risk indicators"
            highlight={data.flaggedSuppliers > 0}
          />
        </div>

        {/* Supplier section placeholder */}
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
            <svg
              className="h-6 w-6 text-indigo-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v12m6-6H6"
              />
            </svg>
          </div>
          <h2 className="mb-1 text-lg font-semibold">Upload your supplier list</h2>
          <p className="mb-4 text-sm text-gray-600">
            Import your suppliers via CSV to begin the due diligence process. Supplier
            upload will be available in the next release.
          </p>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  highlight,
}: {
  label: string;
  value: string;
  detail: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border bg-white p-5 ${
        highlight ? "border-red-200 bg-red-50" : "border-gray-200"
      }`}
    >
      <p className="mb-1 text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? "text-red-700" : "text-gray-900"}`}>
        {value}
      </p>
      <p className="text-xs text-gray-500">{detail}</p>
    </div>
  );
}
