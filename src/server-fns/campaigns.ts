import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { verifySessionToken } from "~/auth";
import { sql } from "~/db";
import { randomUUID, randomBytes } from "node:crypto";

// ---------------------------------------------------------------------------
// Questionnaire seed data: 6 sections (A-F), hardcoded starter questions
// ---------------------------------------------------------------------------
export const QUESTIONNAIRE_SECTIONS = [
  {
    section: "A",
    sectionLabel: "Company & Structure",
    questions: [
      {
        id: "A1",
        questionText: "What is the legal name of your organization?",
        questionType: "text",
        options: null,
        sortOrder: 1,
      },
      {
        id: "A2",
        questionText: "What is your organization's primary business address?",
        questionType: "text",
        options: null,
        sortOrder: 2,
      },
      {
        id: "A3",
        questionText:
          "Please describe your organization's ownership structure (public, private, subsidiary, joint venture, etc.).",
        questionType: "textarea",
        options: null,
        sortOrder: 3,
      },
      {
        id: "A4",
        questionText: "How many employees does your organization have?",
        questionType: "text",
        options: null,
        sortOrder: 4,
      },
      {
        id: "A5",
        questionText:
          "Please list the countries where your organization has operations or subsidiaries.",
        questionType: "textarea",
        options: null,
        sortOrder: 5,
      },
    ],
  },
  {
    section: "B",
    sectionLabel: "Policies & Governance",
    questions: [
      {
        id: "B1",
        questionText:
          "Does your organization have a written policy prohibiting forced labour and child labour in its operations and supply chain?",
        questionType: "yesno",
        options: null,
        sortOrder: 1,
      },
      {
        id: "B2",
        questionText:
          "If yes, please provide a copy or link to this policy.",
        questionType: "text",
        options: null,
        sortOrder: 2,
      },
      {
        id: "B3",
        questionText:
          "Does your organization have a code of conduct for suppliers that addresses forced labour, child labour, and human rights?",
        questionType: "yesno",
        options: null,
        sortOrder: 3,
      },
      {
        id: "B4",
        questionText:
          "Does your organization conduct human rights due diligence for new and existing suppliers?",
        questionType: "yesno",
        options: null,
        sortOrder: 4,
      },
      {
        id: "B5",
        questionText:
          "Who within your organization is responsible for overseeing supply chain labour practices (title/department)?",
        questionType: "text",
        options: null,
        sortOrder: 5,
      },
    ],
  },
  {
    section: "C",
    sectionLabel: "Supply Chain Mapping",
    questions: [
      {
        id: "C1",
        questionText:
          "Please describe the goods or services your organization supplies.",
        questionType: "textarea",
        options: null,
        sortOrder: 1,
      },
      {
        id: "C2",
        questionText:
          "Do you have visibility into your Tier 2 and beyond suppliers (subcontractors, raw material sources)?",
        questionType: "yesno",
        options: null,
        sortOrder: 2,
      },
      {
        id: "C3",
        questionText:
          "Please list the countries where your direct suppliers are located.",
        questionType: "textarea",
        options: null,
        sortOrder: 3,
      },
      {
        id: "C4",
        questionText:
          "Do any of your suppliers or their subcontractors operate in regions identified as high-risk for forced labour?",
        questionType: "yesno",
        options: null,
        sortOrder: 4,
      },
      {
        id: "C5",
        questionText:
          "Do you maintain a register or map of your full supply chain?",
        questionType: "yesno",
        options: null,
        sortOrder: 5,
      },
    ],
  },
  {
    section: "D",
    sectionLabel: "Risk Assessment",
    questions: [
      {
        id: "D1",
        questionText:
          "Have you identified any forced labour or child labour risks within your operations or supply chain in the past reporting year?",
        questionType: "yesno",
        options: null,
        sortOrder: 1,
      },
      {
        id: "D2",
        questionText:
          "If yes, please describe the risks identified and the steps taken to address them.",
        questionType: "textarea",
        options: null,
        sortOrder: 2,
      },
      {
        id: "D3",
        questionText:
          "Do you conduct on-site audits or third-party assessments of your suppliers' labour practices?",
        questionType: "yesno",
        options: null,
        sortOrder: 3,
      },
      {
        id: "D4",
        questionText:
          "How frequently are supplier risk assessments conducted?",
        questionType: "multiselect",
        options: [
          "Annually",
          "Biannually",
          "Quarterly",
          "Upon onboarding only",
          "Never",
        ],
        sortOrder: 4,
      },
      {
        id: "D5",
        questionText:
          "Do you screen suppliers against any international sanctions or watch lists?",
        questionType: "yesno",
        options: null,
        sortOrder: 5,
      },
    ],
  },
  {
    section: "E",
    sectionLabel: "Remediation & Grievance Mechanisms",
    questions: [
      {
        id: "E1",
        questionText:
          "Does your organization have a grievance mechanism that allows workers (including those in your supply chain) to report concerns about forced labour or other human rights violations?",
        questionType: "yesno",
        options: null,
        sortOrder: 1,
      },
      {
        id: "E2",
        questionText:
          "If yes, please describe the grievance mechanism and how reports are handled.",
        questionType: "textarea",
        options: null,
        sortOrder: 2,
      },
      {
        id: "E3",
        questionText:
          "Have any grievances related to forced labour or child labour been reported in the past reporting year?",
        questionType: "yesno",
        options: null,
        sortOrder: 3,
      },
      {
        id: "E4",
        questionText:
          "If yes, what remediation actions were taken?",
        questionType: "textarea",
        options: null,
        sortOrder: 4,
      },
      {
        id: "E5",
        questionText:
          "Does your organization have a corrective action plan process for suppliers found to be non-compliant with labour standards?",
        questionType: "yesno",
        options: null,
        sortOrder: 5,
      },
    ],
  },
  {
    section: "F",
    sectionLabel: "Attestation",
    questions: [
      {
        id: "F1",
        questionText:
          "I certify that the information provided in this questionnaire is true and accurate to the best of my knowledge.",
        questionType: "yesno",
        options: null,
        sortOrder: 1,
      },
      {
        id: "F2",
        questionText: "Name of the person completing this questionnaire:",
        questionType: "text",
        options: null,
        sortOrder: 2,
      },
      {
        id: "F3",
        questionText: "Title/Position:",
        questionType: "text",
        options: null,
        sortOrder: 3,
      },
      {
        id: "F4",
        questionText: "Email address:",
        questionType: "text",
        options: null,
        sortOrder: 4,
      },
      {
        id: "F5",
        questionText: "Date of completion:",
        questionType: "text",
        options: null,
        sortOrder: 5,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Seed the Questionnaire table (idempotent — skips if already seeded)
// ---------------------------------------------------------------------------
export async function seedQuestionnaireIfNeeded(): Promise<void> {
  const db = sql();
  const existing = await db`SELECT COUNT(*)::int as count FROM "Questionnaire"`;
  if (existing[0].count > 0) return;

  const now = new Date();
  for (const section of QUESTIONNAIRE_SECTIONS) {
    for (const q of section.questions) {
      await db`
        INSERT INTO "Questionnaire" ("id", "section", "sectionLabel", "questionText", "questionType", "options", "sortOrder", "createdAt", "updatedAt")
        VALUES (${q.id}, ${section.section}, ${section.sectionLabel}, ${q.questionText}, ${q.questionType}, ${q.options ? JSON.stringify(q.options) : null}, ${q.sortOrder}, ${now}, ${now})
      `;
    }
  }
}

// ---------------------------------------------------------------------------
// Get questionnaire (public — no auth needed)
// ---------------------------------------------------------------------------
export const getQuestionnaire = createServerFn({ method: "GET" }).handler(async () => {
  await seedQuestionnaireIfNeeded();
  const db = sql();
  const questions = await db`
    SELECT "id", "section", "sectionLabel", "questionText", "questionType", "options", "sortOrder"
    FROM "Questionnaire"
    ORDER BY "section", "sortOrder"
  `;

  const sectionsMap: Record<
    string,
    {
      section: string;
      sectionLabel: string;
      questions: Array<{
        id: string;
        questionText: string;
        questionType: string;
        options: string[] | null;
      }>;
    }
  > = {};

  for (const q of questions) {
    const sec = q.section as string;
    if (!sectionsMap[sec]) {
      sectionsMap[sec] = {
        section: sec,
        sectionLabel: q.sectionLabel as string,
        questions: [],
      };
    }
    sectionsMap[sec].questions.push({
      id: q.id as string,
      questionText: q.questionText as string,
      questionType: q.questionType as string,
      options: (q.options as string[] | null),
    });
  }

  return Object.values(sectionsMap);
});

// ---------------------------------------------------------------------------
// Lookup CampaignSupplier by response token (public — no auth needed)
// ---------------------------------------------------------------------------
export const getCampaignSupplierByToken = createServerFn({ method: "GET" })
  .validator((data: unknown) => {
    const d = data as { token?: string };
    if (!d.token || typeof d.token !== "string") {
      throw new Error("Token is required.");
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
        cs."campaignId",
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
      campaignId: r.campaignId as string,
      supplierName: r.supplierName as string,
      orgName: r.orgName as string,
    };
  });

// ---------------------------------------------------------------------------
// Submit questionnaire response (public — no auth needed)
// ---------------------------------------------------------------------------
export const submitQuestionnaireResponse = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const d = data as { token?: string; answers?: Record<string, string> };
    if (!d.token || typeof d.token !== "string") {
      throw new Error("Token is required.");
    }
    if (!d.answers || typeof d.answers !== "object") {
      throw new Error("Answers are required.");
    }
    return d;
  })
  .handler(async ({ data }) => {
    const db = sql();

    // Look up CampaignSupplier by token
    const csRows = await db`
      SELECT "id", "status" FROM "CampaignSupplier" WHERE "responseToken" = ${data.token}
    `;
    if (csRows.length === 0) {
      throw new Error("Invalid or expired response link.");
    }
    const cs = csRows[0];

    // Only allow submission if not already responded (don't overwrite)
    // Actually, let's allow re-submission — they might want to update answers
    const responseId = randomUUID();
    const now = new Date();

    await db`
      INSERT INTO "QuestionnaireResponse" ("id", "campaignSupplierId", "answers", "createdAt", "updatedAt")
      VALUES (${responseId}, ${cs.id as string}, ${JSON.stringify(data.answers)}, ${now}, ${now})
    `;

    // Mark as responded
    await db`
      UPDATE "CampaignSupplier"
      SET "status" = 'responded', "respondedAt" = ${now}, "updatedAt" = ${now}
      WHERE "id" = ${cs.id as string}
    `;

    return { success: true };
  });

// ---------------------------------------------------------------------------
// Generate a secure random token for response links
// ---------------------------------------------------------------------------
function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

// ---------------------------------------------------------------------------
// Create a campaign (authenticated org-side)
// ---------------------------------------------------------------------------
export const createCampaign = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const d = data as { supplierIds?: string[]; responseDeadline?: string };
    if (!d.supplierIds || !Array.isArray(d.supplierIds) || d.supplierIds.length === 0) {
      throw new Error("At least one supplier must be selected.");
    }
    return d;
  })
  .handler(async ({ data }) => {
    const token = getCookie("chainproof_session");
    if (!token) throw new Error("Not authenticated.");

    const session = await verifySessionToken(token);
    if (!session) throw new Error("Invalid session.");

    const db = sql();
    const now = new Date();
    const campaignId = randomUUID();

    // Parse deadline if provided
    let deadline: Date | null = null;
    if (data.responseDeadline) {
      deadline = new Date(data.responseDeadline);
      if (isNaN(deadline.getTime())) deadline = null;
    }

    // Create the Campaign
    await db`
      INSERT INTO "Campaign" ("id", "organizationId", "status", "createdAt", "updatedAt", "responseDeadline")
      VALUES (${campaignId}, ${session.organizationId}, 'draft', ${now}, ${now}, ${deadline})
    `;

    // Create CampaignSupplier rows
    const campaignSuppliers: Array<{
      id: string;
      supplierId: string;
      supplierName: string;
      contactEmail: string;
      responseToken: string;
    }> = [];

    for (const supplierId of data.supplierIds) {
      const csId = randomUUID();
      const respToken = generateToken();

      // Get supplier info for email
      const supRows = await db`
        SELECT "name", "contactEmail" FROM "Supplier" WHERE "id" = ${supplierId} AND "organizationId" = ${session.organizationId}
      `;
      if (supRows.length === 0) continue; // Skip if supplier doesn't belong to this org

      await db`
        INSERT INTO "CampaignSupplier" ("id", "campaignId", "supplierId", "responseToken", "status", "createdAt", "updatedAt")
        VALUES (${csId}, ${campaignId}, ${supplierId}, ${respToken}, 'not_sent', ${now}, ${now})
      `;

      campaignSuppliers.push({
        id: csId,
        supplierId,
        supplierName: supRows[0].name as string,
        contactEmail: (supRows[0].contactEmail as string) || "",
        responseToken: respToken,
      });
    }

    return { campaignId, campaignSuppliers };
  });

// ---------------------------------------------------------------------------
// Send campaign emails via Knock
// ---------------------------------------------------------------------------
export const sendCampaignEmails = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const d = data as { campaignId?: string };
    if (!d.campaignId || typeof d.campaignId !== "string") {
      throw new Error("Campaign ID is required.");
    }
    return d;
  })
  .handler(async ({ data }) => {
    const sessionToken = getCookie("chainproof_session");
    if (!sessionToken) throw new Error("Not authenticated.");

    const session = await verifySessionToken(sessionToken);
    if (!session) throw new Error("Invalid session.");

    const db = sql();

    // Verify campaign belongs to this org
    const campaignRows = await db`
      SELECT "id", "organizationId", "status" FROM "Campaign" WHERE "id" = ${data.campaignId}
    `;
    if (campaignRows.length === 0) throw new Error("Campaign not found.");
    if (campaignRows[0].organizationId !== session.organizationId) {
      throw new Error("Access denied.");
    }

    // Get org name for email
    const orgRows = await db`
      SELECT "name" FROM "Organization" WHERE "id" = ${session.organizationId}
    `;
    const orgName = (orgRows[0]?.name as string) || "an organization";

    // Get all not_sent CampaignSuppliers for this campaign
    const csRows = await db`
      SELECT cs."id", cs."responseToken", s."name" as "supplierName", s."contactEmail"
      FROM "CampaignSupplier" cs
      JOIN "Supplier" s ON s."id" = cs."supplierId"
      WHERE cs."campaignId" = ${data.campaignId} AND cs."status" = 'not_sent'
    `;

    const knockApiKey = process.env.KNOCK_API_KEY;
    const knockSigningKey = process.env.KNOCK_SIGNING_KEY;
    const siteUrl = process.env.SITE_URL || "https://398a3029b2ade736e86b0ff56d20406a.ctonew.app";

    let sendCount = 0;
    const errors: string[] = [];

    const now = new Date();

    for (const cs of csRows) {
      const respondUrl = `${siteUrl}/respond/${cs.responseToken as string}`;

      try {
        if (knockApiKey) {
          // Use Knock to send the email
          const response = await fetch("https://api.knock.app/v1/workflows/questionnaire-invite/trigger", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${knockApiKey}`,
            },
            body: JSON.stringify({
              recipients: [{ email: cs.contactEmail as string, name: cs.supplierName as string }],
              data: {
                supplier_name: cs.supplierName as string,
                organization_name: orgName,
                respond_url: respondUrl,
              },
            }),
          });

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Knock API error (${response.status}): ${errText}`);
          }
        } else {
          // No Knock key configured — do NOT pretend the email went out.
          // Marking a supplier "sent" without a real send would misreport who
          // was actually contacted, undermining honest response-rate tracking.
          // Log it and throw so this row is caught below and stays "not_sent".
          console.log(
            `[NOT SENT — Knock not configured] Would send to ${cs.contactEmail} (${cs.supplierName}): ${respondUrl}`,
          );
          throw new Error(
            "Email service not configured yet (missing KNOCK_API_KEY) — no email was sent.",
          );
        }

        // Mark as sent (only reached when the Knock API call above actually succeeded)
        await db`
          UPDATE "CampaignSupplier"
          SET "status" = 'sent', "sentAt" = ${now}, "updatedAt" = ${now}
          WHERE "id" = ${cs.id as string}
        `;
        sendCount++;
      } catch (e: any) {
        console.error(`Failed to send email to ${cs.contactEmail}:`, e?.message || e);
        errors.push(`${cs.supplierName}: ${e?.message || "Unknown error"}`);
        // Leave status as not_sent — don't crash the entire batch
      }
    }

    // Update campaign status
    const newStatus = sendCount > 0 ? "active" : "draft";
    await db`
      UPDATE "Campaign" SET "status" = ${newStatus}, "updatedAt" = ${now} WHERE "id" = ${data.campaignId}
    `;

    return { sent: sendCount, total: csRows.length as number, errors };
  });

// ---------------------------------------------------------------------------
// Get campaigns for the org (authenticated)
// ---------------------------------------------------------------------------
export const getCampaigns = createServerFn({ method: "GET" }).handler(async () => {
  const sessionToken = getCookie("chainproof_session");
  if (!sessionToken) throw new Error("Not authenticated.");

  const session = await verifySessionToken(sessionToken);
  if (!session) throw new Error("Invalid session.");

  const db = sql();

  const campaigns = await db`
    SELECT
      c."id", c."status", c."createdAt", c."responseDeadline",
      COUNT(cs."id")::int as "totalSuppliers",
      COUNT(cs."id") FILTER (WHERE cs."status" = 'responded')::int as "respondedSuppliers",
      COUNT(cs."id") FILTER (WHERE cs."status" = 'sent')::int as "sentSuppliers"
    FROM "Campaign" c
    LEFT JOIN "CampaignSupplier" cs ON cs."campaignId" = c."id"
    WHERE c."organizationId" = ${session.organizationId}
    GROUP BY c."id"
    ORDER BY c."createdAt" DESC
  `;

  return campaigns.map((c) => ({
    id: c.id as string,
    status: c.status as string,
    createdAt: String(c.createdAt as Date),
    responseDeadline: c.responseDeadline ? String(c.responseDeadline as Date) : null,
    totalSuppliers: c.totalSuppliers as number,
    respondedSuppliers: c.respondedSuppliers as number,
    sentSuppliers: c.sentSuppliers as number,
  }));
});

// ---------------------------------------------------------------------------
// Get campaign supplier statuses for the supplier list view
// ---------------------------------------------------------------------------
export const getSupplierCampaignStatuses = createServerFn({ method: "GET" }).handler(async () => {
  const sessionToken = getCookie("chainproof_session");
  if (!sessionToken) throw new Error("Not authenticated.");

  const session = await verifySessionToken(sessionToken);
  if (!session) throw new Error("Invalid session.");

  const db = sql();

  // Get the latest campaign per supplier
  const rows = await db`
    SELECT DISTINCT ON (cs."supplierId")
      cs."supplierId",
      cs."status"
    FROM "CampaignSupplier" cs
    JOIN "Campaign" c ON c."id" = cs."campaignId"
    WHERE c."organizationId" = ${session.organizationId}
    ORDER BY cs."supplierId", cs."createdAt" DESC
  `;

  const statusMap: Record<string, string> = {};
  for (const r of rows) {
    statusMap[r.supplierId as string] = r.status as string;
  }

  return statusMap;
});

// ---------------------------------------------------------------------------
// Get dashboard campaign stats (response rate, etc.)
// ---------------------------------------------------------------------------
export const getCampaignStats = createServerFn({ method: "GET" }).handler(async () => {
  const sessionToken = getCookie("chainproof_session");
  if (!sessionToken) throw new Error("Not authenticated.");

  const session = await verifySessionToken(sessionToken);
  if (!session) throw new Error("Invalid session.");

  const db = sql();

  const stats = await db`
    SELECT
      COUNT(cs."id")::int as "totalSent",
      COUNT(cs."id") FILTER (WHERE cs."status" = 'responded')::int as "totalResponded",
      COUNT(cs."id") FILTER (WHERE cs."status" = 'flagged')::int as "totalFlagged"
    FROM "CampaignSupplier" cs
    JOIN "Campaign" c ON c."id" = cs."campaignId"
    WHERE c."organizationId" = ${session.organizationId}
  `;

  const s = stats[0];
  const totalSent = s.totalSent as number;
  const totalResponded = s.totalResponded as number;
  const totalFlagged = s.totalFlagged as number;

  return {
    totalSent,
    totalResponded,
    totalFlagged,
    responseRate: totalSent > 0 ? Math.round((totalResponded / totalSent) * 100) : 0,
  };
});
