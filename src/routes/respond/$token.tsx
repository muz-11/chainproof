import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { sql } from "~/db";
import { getQuestionnaire, submitQuestionnaireResponse } from "~/server-fns/campaigns";

// ---------------------------------------------------------------------------
// Server-side: lookup the CampaignSupplier by token
// ---------------------------------------------------------------------------
const lookupToken = createServerFn({ method: "GET" })
  .validator((data: unknown) => {
    const d = data as { token?: string };
    if (!d.token || typeof d.token !== "string") {
      throw new Error("Invalid link.");
    }
    return d;
  })
  .handler(async ({ data }) => {
    const db = sql();
    const rows = await db`
      SELECT
        cs."id",
        cs."status",
        cs."responseToken",
        s."name" as "supplierName",
        o."name" as "orgName"
      FROM "CampaignSupplier" cs
      JOIN "Supplier" s ON s."id" = cs."supplierId"
      JOIN "Campaign" c ON c."id" = cs."campaignId"
      JOIN "Organization" o ON o."id" = c."organizationId"
      WHERE cs."responseToken" = ${data.token}
    `;
    if (rows.length === 0) {
      throw new Error("Invalid or expired response link.");
    }
    const r = rows[0];
    return {
      id: r.id as string,
      status: r.status as string,
      supplierName: r.supplierName as string,
      orgName: r.orgName as string,
    };
  });

export const Route = createFileRoute("/respond/$token")({
  loader: async ({ params }) => {
    const token = params.token;
    const csData = await lookupToken({ data: { token } });
    const questionnaire = await getQuestionnaire();
    return { ...csData, questionnaire, token };
  },
  component: RespondPage,
});

function RespondPage() {
  const data = Route.useLoaderData();
  const { supplierName, orgName, questionnaire, token, status: initialStatus } = data;

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(initialStatus === "responded");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(initialStatus === "responded");

  function handleChange(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await submitQuestionnaireResponse({ data: { token, answers } });
      setSubmitted(true);
      setSuccess(true);
    } catch (e: any) {
      setError(e?.message || "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-dvh bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-xl border border-green-200 bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <svg className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Response Submitted</h1>
          <p className="text-gray-600">
            Thank you, {supplierName}. Your due diligence questionnaire for <strong>{orgName}</strong> has been received.
          </p>
          {submitted && initialStatus !== "responded" && (
            <p className="mt-2 text-sm text-green-700">Your submission was recorded successfully.</p>
          )}
          {initialStatus === "responded" && (
            <p className="mt-2 text-sm text-gray-500">This questionnaire was previously completed.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gray-50">
      {/* Public header — no auth */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold tracking-tight text-indigo-700">ChainProof</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Supply Chain Due Diligence Questionnaire
          </h1>
          <p className="mt-2 text-gray-600">
            <strong>{orgName}</strong> is requesting this information as part of their supply chain
            transparency and forced-labour reporting obligations.
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Completing this questionnaire on behalf of <strong>{supplierName}</strong>.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-8">
            {questionnaire.map((section) => (
              <section
                key={section.section}
                className="rounded-xl border border-gray-200 bg-white p-6"
              >
                <h2 className="mb-1 text-lg font-semibold text-gray-900">
                  Section {section.section}: {section.sectionLabel}
                </h2>
                <div className="mt-4 space-y-5">
                  {section.questions.map((q) => (
                    <div key={q.id}>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        {q.questionText}
                      </label>
                      {q.questionType === "text" && (
                        <input
                          type="text"
                          value={answers[q.id] || ""}
                          onChange={(e) => handleChange(q.id, e.target.value)}
                          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                      )}
                      {q.questionType === "textarea" && (
                        <textarea
                          rows={3}
                          value={answers[q.id] || ""}
                          onChange={(e) => handleChange(q.id, e.target.value)}
                          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                      )}
                      {q.questionType === "yesno" && (
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type="radio"
                              name={q.id}
                              value="Yes"
                              checked={answers[q.id] === "Yes"}
                              onChange={(e) => handleChange(q.id, e.target.value)}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                            />
                            Yes
                          </label>
                          <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type="radio"
                              name={q.id}
                              value="No"
                              checked={answers[q.id] === "No"}
                              onChange={(e) => handleChange(q.id, e.target.value)}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                            />
                            No
                          </label>
                        </div>
                      )}
                      {q.questionType === "multiselect" && q.options && (
                        <div className="space-y-2">
                          {q.options.map((opt) => {
                            const current = answers[q.id] || "";
                            const selected = current.split(",").includes(opt);
                            return (
                              <label
                                key={opt}
                                className="flex items-center gap-2 text-sm text-gray-700"
                              >
                                <input
                                  type="checkbox"
                                  value={opt}
                                  checked={selected}
                                  onChange={(e) => {
                                    const vals = current
                                      .split(",")
                                      .filter(Boolean);
                                    if (e.target.checked) {
                                      vals.push(opt);
                                    } else {
                                      const idx = vals.indexOf(opt);
                                      if (idx >= 0) vals.splice(idx, 1);
                                    }
                                    handleChange(q.id, vals.join(","));
                                  }}
                                  className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                                />
                                {opt}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Questionnaire"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
