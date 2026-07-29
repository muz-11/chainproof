import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { verifySessionToken } from "~/auth";
import { sql } from "~/db";
import { randomUUID } from "node:crypto";

const VALID_RISK_LEVELS = ["low", "medium", "high"];

interface SupplierRow {
  name: string;
  contactEmail: string;
  country: string;
  spendCategory: string;
  riskLevel: string;
}

interface UploadResult {
  added: number;
  skipped: { row: number; reason: string }[];
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = parseLine(lines[0]).map((h) => h.trim().toLowerCase());
  const rows = lines.slice(1).map(parseLine);

  return { headers, rows };
}

function parseLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

function validateRow(
  row: string[],
  columnIndex: Record<string, number>,
  rowNumber: number,
): { valid: true; data: SupplierRow } | { valid: false; reason: string } {
  const get = (col: string): string | undefined => {
    const idx = columnIndex[col];
    if (idx === undefined || idx >= row.length) return undefined;
    return row[idx] || undefined;
  };

  const name = get("name");
  const contactEmail = get("contact_email");
  const country = get("country") || "";
  const spendCategory = get("spend_category") || "";
  const riskLevel = get("risk_level");

  if (!name || name.length === 0) {
    return { valid: false, reason: `Row ${rowNumber}: name is required` };
  }

  if (!contactEmail || contactEmail.length === 0) {
    return { valid: false, reason: `Row ${rowNumber}: contact_email is required` };
  }

  if (!contactEmail.includes("@") || contactEmail.length < 5) {
    return { valid: false, reason: `Row ${rowNumber}: invalid contact_email "${contactEmail}"` };
  }

  if (!riskLevel || !VALID_RISK_LEVELS.includes(riskLevel.toLowerCase())) {
    return {
      valid: false,
      reason: `Row ${rowNumber}: risk_level must be one of ${VALID_RISK_LEVELS.join(", ")}, got "${riskLevel || ""}"`,
    };
  }

  return {
    valid: true,
    data: {
      name: name.trim(),
      contactEmail: contactEmail.trim().toLowerCase(),
      country: country.trim(),
      spendCategory: spendCategory.trim(),
      riskLevel: riskLevel.trim().toLowerCase(),
    },
  };
}

export const uploadSuppliersCSV = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const body = data as { csv?: string };
    if (!body.csv || typeof body.csv !== "string" || body.csv.trim().length === 0) {
      throw new Error("CSV data is required.");
    }
    return body;
  })
  .handler(async ({ data }) => {
    const token = getCookie("chainproof_session");
    if (!token) {
      throw new Error("Not authenticated.");
    }

    const session = await verifySessionToken(token);
    if (!session) {
      throw new Error("Invalid session.");
    }

    const { headers, rows } = parseCSV(data.csv);

    if (headers.length === 0) {
      throw new Error("CSV must have a header row.");
    }

    const required = ["name", "contact_email", "risk_level"];
    const columnIndex: Record<string, number> = {};
    for (const col of required) {
      const idx = headers.indexOf(col);
      if (idx === -1) {
        throw new Error(`Missing required column: "${col}". Expected columns: ${required.join(", ")}`);
      }
      columnIndex[col] = idx;
    }
    // Optional columns
    for (const col of ["country", "spend_category"]) {
      const idx = headers.indexOf(col);
      if (idx !== -1) {
        columnIndex[col] = idx;
      }
    }

    const db = sql();
    const now = new Date();
    const result: UploadResult = { added: 0, skipped: [] };
    const validRows: SupplierRow[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.length === 0 || (row.length === 1 && row[0] === "")) continue; // skip empty rows

      const validation = validateRow(row, columnIndex, i + 2); // +2: 1-indexed + header row
      if (!validation.valid) {
        result.skipped.push({ row: i + 2, reason: validation.reason });
        continue;
      }
      validRows.push(validation.data);
    }

    // Batch insert valid rows
    for (const supplier of validRows) {
      const id = randomUUID();
      await db`
        INSERT INTO "Supplier" (id, "organizationId", name, "contactEmail", country, "spendCategory", "riskLevel", "createdAt", "updatedAt")
        VALUES (${id}, ${session.organizationId}, ${supplier.name}, ${supplier.contactEmail}, ${supplier.country || null}, ${supplier.spendCategory || null}, ${supplier.riskLevel}, ${now}, ${now})
      `;
      result.added++;
    }

    return result;
  });

export const getSuppliers = createServerFn({ method: "GET" }).handler(async () => {
  const token = getCookie("chainproof_session");
  if (!token) {
    throw new Error("Not authenticated.");
  }

  const session = await verifySessionToken(token);
  if (!session) {
    throw new Error("Invalid session.");
  }

  const db = sql();

  const suppliers = await db`
    SELECT id, name, "contactEmail", country, "spendCategory", "riskLevel", "createdAt"
    FROM "Supplier"
    WHERE "organizationId" = ${session.organizationId}
    ORDER BY "createdAt" DESC
  `;

  return suppliers.map((s) => ({
    id: s.id as string,
    name: s.name as string,
    contactEmail: s.contactEmail as string | null,
    country: s.country as string | null,
    spendCategory: s.spendCategory as string | null,
    riskLevel: s.riskLevel as string,
    createdAt: String(s.createdAt as Date),
  }));
});
