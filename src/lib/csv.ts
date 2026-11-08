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

const MONTH_PREFIXES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Builds YYYY-MM-DD, or null when the month/day isn't a real calendar date. */
function toISODate(y: number, m: number, d: number): string | null {
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1) return null;
  if (d > new Date(Date.UTC(y, m, 0)).getUTCDate()) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** 2-digit years up to the current year are 20XX, later ones 19XX (so "72" is 1972). */
function expandYear(yRaw: string): number {
  if (yRaw.length === 4) return Number(yRaw);
  const yy = Number(yRaw);
  return yy <= new Date().getFullYear() % 100 ? 2000 + yy : 1900 + yy;
}

function monthFromName(name: string): number | null {
  const index = MONTH_PREFIXES.indexOf(name.slice(0, 3).toLowerCase());
  return index === -1 ? null : index + 1;
}

/**
 * Accepts YYYY-MM-DD (also with / or .), M/D/YYYY and M/D/YY (also with - or .),
 * MMDDYYYY, and written months ("Jan 5, 1990", "5 January 1990").
 * Returns YYYY-MM-DD, or null if it isn't a real calendar date.
 */
export function normalizeDate(raw: string): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;

  const yearFirst = value.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (yearFirst) return toISODate(Number(yearFirst[1]), Number(yearFirst[2]), Number(yearFirst[3]));

  const monthFirst = value.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})$/);
  if (monthFirst) {
    return toISODate(expandYear(monthFirst[3]), Number(monthFirst[1]), Number(monthFirst[2]));
  }

  const compact = value.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (compact) return toISODate(Number(compact[3]), Number(compact[1]), Number(compact[2]));

  const monthName = value.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/);
  if (monthName) {
    const m = monthFromName(monthName[1]);
    return m ? toISODate(Number(monthName[3]), m, Number(monthName[2])) : null;
  }

  const dayFirstName = value.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})$/);
  if (dayFirstName) {
    const m = monthFromName(dayFirstName[2]);
    return m ? toISODate(Number(dayFirstName[3]), m, Number(dayFirstName[1])) : null;
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
