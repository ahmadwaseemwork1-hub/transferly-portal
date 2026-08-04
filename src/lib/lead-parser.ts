import { normalizeDate } from "./csv";
import type { LeadExtraField } from "./types";

export interface ParsedLead {
  first_name: string;
  last_name: string;
  full_name: string;
  date_of_birth: string | null;
  email: string | null;
  address: string;
  city: string | null;
  state: string | null;
  zip_code: string;
  phone: string;
  home_status: string | null;
  vehicle_count: number | null;
  vehicles: string | null;
  current_carrier: string | null;
  policy_term: string | null;
  extra: LeadExtraField[];
  warnings: string[];
}

export type ParseLeadResult =
  | { ok: true; lead: ParsedLead }
  | { ok: false; error: string };

const MIN_FIELDS = 5;

// ----------------------------------------------------------------------------
// Shared helpers
// ----------------------------------------------------------------------------

/** Spreadsheets export empty cells as blank OR a literal "NA" placeholder —
 * treat both as "no value" everywhere. */
function naToNull(raw: string | undefined): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  if (/^n\/?a$/i.test(value)) return null;
  return value;
}

function normalizePhone(raw: string): string {
  return raw.replace(/[^\d]/g, "");
}

/** Counts vehicles in a field that may list several separated by "/", "&", or "and". */
function countVehicles(vehicles: string | null): number | null {
  if (!vehicles) return 0;
  const parts = vehicles
    .split(/\s*(?:\/|&|,|\band\b)\s*/i)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length || 1;
}

function isValidStateCode(value: string): boolean {
  return /^[A-Za-z]{2}$/.test(value.trim());
}

// ----------------------------------------------------------------------------
// Format A (new, real spreadsheet layout — 17 columns):
// First, Last, DOB, Email, Phone, Address, City, State, Zip,
// <qualifier x3, usually blank/NA>, Vehicle(s), <extra x2, usually blank/NA>,
// Carrier, Home status
//
// Example (verbatim from the real sheet):
// Erin  Hundley  02/18/1972  ehundley72@hotmail.com  7195522545  404 Homer Ave
// Rocky Ford  CO  81067  NA  NA  NA  2015 Nissan Rogue  NA  NA  Progressive  Rent
// ----------------------------------------------------------------------------

const NEW_FORMAT_FIELD_COUNT = 17;
const NEW_EXTRA_LABELS = [
  { index: 9, label: "Any lapses (unconfirmed column)" },
  { index: 10, label: "Accidents (unconfirmed column)" },
  { index: 11, label: "Tickets (unconfirmed column)" },
  { index: 13, label: "Spouse (unconfirmed column)" },
  { index: 14, label: "Spouse name (unconfirmed column)" },
];

function looksLikeNewFormat(fields: string[]): boolean {
  if (fields.length >= 12) return true;
  const emailCandidate = fields[3] ?? "";
  return emailCandidate.includes("@");
}

function parseNewFormat(fieldsIn: string[]): ParseLeadResult {
  let fields = fieldsIn;
  const warnings: string[] = [];

  if (fields.length > NEW_FORMAT_FIELD_COUNT) {
    warnings.push(
      `Found ${fields.length} columns, expected ${NEW_FORMAT_FIELD_COUNT} — extra trailing columns were ignored.`
    );
    fields = fields.slice(0, NEW_FORMAT_FIELD_COUNT);
  }
  while (fields.length < NEW_FORMAT_FIELD_COUNT) fields.push("");

  const [
    firstRaw,
    lastRaw,
    dobRaw,
    emailRaw,
    phoneRaw,
    addressRaw,
    cityRaw,
    stateRaw,
    zipRaw,
    ,
    ,
    ,
    vehiclesRaw,
    ,
    ,
    carrierRaw,
    homeStatusRaw,
  ] = fields;

  const first_name = firstRaw.trim();
  const last_name = lastRaw.trim();
  if (!first_name && !last_name) {
    return { ok: false, error: "First name and last name (columns 1-2) are both missing." };
  }
  const full_name = [first_name, last_name].filter(Boolean).join(" ");

  const date_of_birth = normalizeDate(dobRaw);
  if (dobRaw.trim() && !date_of_birth) {
    warnings.push(`Could not parse date of birth "${dobRaw}" — left blank.`);
  }

  const email = naToNull(emailRaw);
  if (email && !email.includes("@")) {
    warnings.push(`"${email}" doesn't look like a valid email — check column 4.`);
  }

  const phone = normalizePhone(phoneRaw);
  if (phoneRaw.trim() && phone.length !== 10) {
    warnings.push(`Phone "${phoneRaw}" doesn't look like a 10-digit US number.`);
  }

  const address = addressRaw.trim();
  const city = naToNull(cityRaw);
  const stateTrimmed = stateRaw.trim();
  const state = stateTrimmed ? stateTrimmed.toUpperCase() : null;
  if (state && !isValidStateCode(state)) {
    warnings.push(`"${state}" doesn't look like a 2-letter state code — check column 8.`);
  }
  const zip_code = zipRaw.trim();

  const vehicles = naToNull(vehiclesRaw);
  const vehicle_count = countVehicles(vehicles);

  const current_carrier = naToNull(carrierRaw);
  const home_status = naToNull(homeStatusRaw);

  const extra: LeadExtraField[] = NEW_EXTRA_LABELS.map(({ index, label }) => ({
    label,
    value: fields[index] ?? "",
  }));
  if (extra.some((f) => naToNull(f.value) !== null)) {
    warnings.push(
      "Columns 10-12 and 14-15 have values but their exact meaning isn't confirmed — check the 'Additional columns' section below and relabel if needed."
    );
  }

  return {
    ok: true,
    lead: {
      first_name,
      last_name,
      full_name,
      date_of_birth,
      email,
      address,
      city,
      state,
      zip_code,
      phone,
      home_status,
      vehicle_count,
      vehicles,
      current_carrier,
      policy_term: null,
      extra,
      warnings,
    },
  };
}

// ----------------------------------------------------------------------------
// Format B (legacy, 9 columns — combined name/address, count+list vehicles):
// Full name, DOB, Address (incl. city/state/zip), Phone, Zip, Home status,
// Vehicle count, Vehicles, Carrier + term
// ----------------------------------------------------------------------------

const LEGACY_FIELD_COUNT = 9;
const LEGACY_FIELD_NAMES = [
  "Full name",
  "Date of birth",
  "Address",
  "Phone",
  "Zip code",
  "Home status",
  "Vehicle count",
  "Vehicles",
  "Carrier / term",
];

function extractState(address: string): string | null {
  const match = address.match(/,\s*([A-Za-z]{2})\s+\d{5}/);
  return match ? match[1].toUpperCase() : null;
}

function extractCity(address: string): string | null {
  const match = address.match(/,\s*([^,]+?)\s*,\s*[A-Za-z]{2}\s+\d{5}/);
  return match ? match[1].trim() : null;
}

function splitCarrierTerm(raw: string): { carrier: string | null; term: string | null } {
  const value = raw.trim();
  if (!value) return { carrier: null, term: null };
  const match = value.match(/^(.*?)\s+(\d+\s*(?:year|years|month|months))$/i);
  if (match) {
    return { carrier: match[1].trim() || null, term: match[2].trim() };
  }
  return { carrier: value, term: null };
}

function parseLegacyFormat(fieldsIn: string[]): ParseLeadResult {
  let fields = fieldsIn;
  const warnings: string[] = [];

  if (fields.length > LEGACY_FIELD_COUNT) {
    warnings.push(
      `Found ${fields.length} columns, expected ${LEGACY_FIELD_COUNT} — extra trailing columns were ignored.`
    );
    fields = fields.slice(0, LEGACY_FIELD_COUNT);
  }
  if (fields.length < MIN_FIELDS) {
    return {
      ok: false,
      error:
        `Only found ${fields.length} column(s), need at least ${MIN_FIELDS} ` +
        `(${LEGACY_FIELD_NAMES.slice(0, MIN_FIELDS).join(", ")}). Check that the data is ` +
        `tab-separated and try again.`,
    };
  }
  while (fields.length < LEGACY_FIELD_COUNT) fields.push("");

  const [
    fullNameRaw,
    dobRaw,
    addressRaw,
    phoneRaw,
    zipRaw,
    homeStatusRaw,
    vehicleCountRaw,
    vehiclesRaw,
    carrierTermRaw,
  ] = fields;

  const full_name = fullNameRaw.trim();
  if (!full_name) {
    return { ok: false, error: "Full name (column 1) is missing." };
  }
  const [first_name, ...rest] = full_name.split(/\s+/);
  const last_name = rest.join(" ");

  const date_of_birth = normalizeDate(dobRaw);
  if (dobRaw.trim() && !date_of_birth) {
    warnings.push(`Could not parse date of birth "${dobRaw}" — left blank.`);
  }

  const address = addressRaw.trim();
  const state = address ? extractState(address) : null;
  const city = address ? extractCity(address) : null;
  if (address && !state) {
    warnings.push("Could not detect a state from the address.");
  }

  const zip_code = zipRaw.trim();

  const phone = normalizePhone(phoneRaw);
  if (phoneRaw.trim() && phone.length !== 10) {
    warnings.push(`Phone "${phoneRaw}" doesn't look like a 10-digit US number.`);
  }

  const home_status = naToNull(homeStatusRaw);

  let vehicle_count: number | null = null;
  if (vehicleCountRaw.trim()) {
    const parsed = Number.parseInt(vehicleCountRaw.trim(), 10);
    vehicle_count = Number.isFinite(parsed) ? parsed : null;
    if (vehicle_count === null) {
      warnings.push(`Could not parse vehicle count "${vehicleCountRaw}".`);
    }
  }

  const vehicles = naToNull(vehiclesRaw);
  if (vehicle_count === null && vehicles) {
    vehicle_count = countVehicles(vehicles);
  }
  const { carrier: current_carrier, term: policy_term } = splitCarrierTerm(carrierTermRaw);

  return {
    ok: true,
    lead: {
      first_name,
      last_name,
      full_name,
      date_of_birth,
      email: null,
      address,
      city,
      state,
      zip_code,
      phone,
      home_status,
      vehicle_count,
      vehicles,
      current_carrier,
      policy_term,
      extra: [],
      warnings,
    },
  };
}

// ----------------------------------------------------------------------------
// Entry point — detects which of the two real-world formats was pasted and
// dispatches to the matching parser. Smart, but never silent: every soft
// uncertainty becomes a warning shown in the preview rather than a guess
// that quietly lands in the wrong field.
// ----------------------------------------------------------------------------
export function parseLeadPaste(raw: string): ParseLeadResult {
  // Only strip surrounding newlines here, not .trim() on the whole blob —
  // a plain .trim() would also eat leading/trailing TAB characters, which
  // would silently shift every column over by one if the first field ever
  // happened to be blank. Per-field trimming still happens below.
  const trimmed = (raw ?? "").replace(/^[\r\n]+|[\r\n]+$/g, "");
  if (!trimmed.trim()) {
    return { ok: false, error: "Paste the lead data first." };
  }

  // Some sources copy as tabs, others collapse to runs of spaces.
  let fields = trimmed.split("\t").map((f) => f.trim());
  if (fields.length < MIN_FIELDS) {
    fields = trimmed.split(/\s{2,}/).map((f) => f.trim());
  }

  if (fields.length < MIN_FIELDS) {
    return {
      ok: false,
      error:
        `Only found ${fields.length} column(s), need at least ${MIN_FIELDS}. ` +
        `Check that the data is tab-separated and try again.`,
    };
  }

  return looksLikeNewFormat(fields) ? parseNewFormat(fields) : parseLegacyFormat(fields);
}
