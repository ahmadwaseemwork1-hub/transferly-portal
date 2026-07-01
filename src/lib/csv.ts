import Papa from "papaparse";
import { REQUIRED_TRANSFER_FIELDS, type TransferField } from "./types";

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

export function parseCsvText(text: string): ParsedCsv {
  const result = Papa.parse<Record<string, string>>(text.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  const headers = result.meta.fields ?? [];
  const rows = (result.data ?? []).filter(
    (row) => Object.values(row).some((v) => (v ?? "").toString().trim().length > 0)
  );
  return { headers, rows };
}

/** Maps canonical transfer fields -> the CSV header the admin selected for it. */
export type ColumnMapping = Partial<Record<TransferField, string>>;

export function validateMapping(mapping: ColumnMapping): string[] {
  const errors: string[] = [];
  for (const field of REQUIRED_TRANSFER_FIELDS) {
    if (!mapping[field]) {
      errors.push(`Please map a column for "${field}".`);
    }
  }
  return errors;
}

/** Accepts YYYY-MM-DD, MM/DD/YYYY, M/D/YY, MM-DD-YYYY. Returns YYYY-MM-DD or null. */
export function normalizeDate(raw: string): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;

  const isoMatch = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  const slashOrDash = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (slashOrDash) {
    const [, m, d, yRaw] = slashOrDash;
    const y = yRaw.length === 2 ? `20${yRaw}` : yRaw;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  return null;
}

/** Strips currency symbols/commas and parses a number. Returns 0 for blank. */
export function normalizeValue(raw: string | undefined): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^0-9.-]/g, "");
  if (!cleaned) return 0;
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

export interface MappedTransferRow {
  rowNumber: number;
  clientRaw: string;
  clientId: string | null;
  transfer_date: string | null;
  transfer_time: string | null;
  lead_name: string | null;
  phone: string | null;
  state: string | null;
  insurance_type: string | null;
  value: number;
  notes: string | null;
  errors: string[];
}

export interface ClientLookupEntry {
  id: string;
  business_name: string;
}

function findClientId(raw: string, clients: ClientLookupEntry[]): string | null {
  const needle = raw.trim().toLowerCase();
  if (!needle) return null;
  const match = clients.find((c) => c.business_name.trim().toLowerCase() === needle);
  return match ? match.id : null;
}

/**
 * Turns raw CSV rows into validated transfer records using the admin's
 * column mapping. Every row is checked independently and carries its own
 * error list, so one bad row never blocks the rest of the upload.
 */
export function mapCsvRows(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
  clients: ClientLookupEntry[]
): MappedTransferRow[] {
  return rows.map((row, index) => {
    const errors: string[] = [];

    const clientRaw = mapping.client ? (row[mapping.client] ?? "").trim() : "";
    const clientId = findClientId(clientRaw, clients);
    if (!clientRaw) errors.push("Missing client.");
    else if (!clientId) errors.push(`No client matches "${clientRaw}".`);

    const dateRaw = mapping.transfer_date ? row[mapping.transfer_date] : "";
    const transfer_date = normalizeDate(dateRaw ?? "");
    if (!transfer_date) errors.push(`Could not parse date "${dateRaw ?? ""}".`);

    const value = normalizeValue(mapping.value ? row[mapping.value] : undefined);

    return {
      rowNumber: index + 2, // +1 for header row, +1 for 1-indexing
      clientRaw,
      clientId,
      transfer_date,
      transfer_time: mapping.transfer_time ? row[mapping.transfer_time] || null : null,
      lead_name: mapping.lead_name ? row[mapping.lead_name] || null : null,
      phone: mapping.phone ? row[mapping.phone] || null : null,
      state: mapping.state ? row[mapping.state] || null : null,
      insurance_type: mapping.insurance_type ? row[mapping.insurance_type] || null : null,
      value,
      notes: mapping.notes ? row[mapping.notes] || null : null,
      errors,
    };
  });
}
