import { describe, it, expect } from "vitest";
import { parseLeadPaste } from "../lead-parser";

const LEGACY_SAMPLE_LINE =
  "Michael D Pratt\t12/10/1973\t7557 Arlington Expy, Jacksonville, FL 32211\t" +
  "8323637961\t32211\tRenter \t2\t2024 Kia Forte / 2002 Lincoln Town Car\t" +
  "Progressive 1 Year";

// The real, authoritative format — copied verbatim from the user's spreadsheet.
const REAL_SAMPLE_LINE =
  "Erin\tHundley\t02/18/1972\tehundley72@hotmail.com\t7195522545\t404 Homer Ave\t" +
  "Rocky Ford\tCO\t81067\tNA\tNA\tNA\t2015 Nissan Rogue\tNA\tNA\tProgressive\tRent";

describe("parseLeadPaste — real 17-column format", () => {
  it("parses the exact real-world Erin Hundley sample line correctly", () => {
    const result = parseLeadPaste(REAL_SAMPLE_LINE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.lead.first_name).toBe("Erin");
    expect(result.lead.last_name).toBe("Hundley");
    expect(result.lead.full_name).toBe("Erin Hundley");
    expect(result.lead.date_of_birth).toBe("1972-02-18");
    expect(result.lead.email).toBe("ehundley72@hotmail.com");
    expect(result.lead.phone).toBe("7195522545");
    expect(result.lead.address).toBe("404 Homer Ave");
    expect(result.lead.city).toBe("Rocky Ford");
    expect(result.lead.state).toBe("CO");
    expect(result.lead.zip_code).toBe("81067");
    expect(result.lead.vehicles).toBe("2015 Nissan Rogue");
    expect(result.lead.vehicle_count).toBe(1);
    expect(result.lead.current_carrier).toBe("Progressive");
    expect(result.lead.home_status).toBe("Rent");
    expect(result.lead.policy_term).toBeNull();
  });

  it("treats NA placeholder columns as null, not literal text", () => {
    const result = parseLeadPaste(REAL_SAMPLE_LINE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lead.extra).toHaveLength(5);
    expect(result.lead.extra.every((f) => f.value === "NA")).toBe(true);
  });

  it("detects the new format via the email column even with fewer trailing columns", () => {
    const truncated =
      "John\tSmith\t01/01/1980\tjohn@example.com\t5551234567\t1 Main St\tAustin\tTX\t78701";
    const result = parseLeadPaste(truncated);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lead.first_name).toBe("John");
    expect(result.lead.email).toBe("john@example.com");
    expect(result.lead.city).toBe("Austin");
  });

  it("counts multiple vehicles separated by / in the single vehicle column", () => {
    const twoCars =
      "Jane\tDoe\t01/01/1990\tjane@example.com\t5551234567\t1 Main St\tAustin\tTX\t78701\t" +
      "NA\tNA\tNA\t2015 Honda Civic / 2020 Toyota Camry\tNA\tNA\tGeico\tOwn";
    const result = parseLeadPaste(twoCars);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lead.vehicle_count).toBe(2);
  });

  it("rejects when both first and last name are missing", () => {
    const result = parseLeadPaste(
      "\t\t01/01/1990\tjane@example.com\t5551234567\t1 Main St\tAustin\tTX\t78701\t" +
        "NA\tNA\tNA\tHonda Civic\tNA\tNA\tGeico\tOwn"
    );
    expect(result.ok).toBe(false);
  });

  it("warns when the email column doesn't look like an email", () => {
    const result = parseLeadPaste(
      "Jane\tDoe\t01/01/1990\tnotanemail\t5551234567\t1 Main St\tAustin\tTX\t78701\t" +
        "NA\tNA\tNA\tHonda Civic\tNA\tNA\tGeico\tOwn"
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lead.warnings.some((w) => w.includes("email"))).toBe(true);
  });
});

describe("parseLeadPaste — legacy 9-column format (fallback)", () => {
  it("still parses the original combined-field sample line correctly", () => {
    const result = parseLeadPaste(LEGACY_SAMPLE_LINE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.lead.full_name).toBe("Michael D Pratt");
    expect(result.lead.date_of_birth).toBe("1973-12-10");
    expect(result.lead.address).toBe("7557 Arlington Expy, Jacksonville, FL 32211");
    expect(result.lead.city).toBe("Jacksonville");
    expect(result.lead.state).toBe("FL");
    expect(result.lead.zip_code).toBe("32211");
    expect(result.lead.phone).toBe("8323637961");
    expect(result.lead.home_status).toBe("Renter");
    expect(result.lead.vehicle_count).toBe(2);
    expect(result.lead.vehicles).toBe("2024 Kia Forte / 2002 Lincoln Town Car");
    expect(result.lead.current_carrier).toBe("Progressive");
    expect(result.lead.policy_term).toBe("1 Year");
    expect(result.lead.warnings).toHaveLength(0);
  });

  it("rejects empty input", () => {
    const result = parseLeadPaste("");
    expect(result.ok).toBe(false);
  });

  it("rejects input with too few columns", () => {
    const result = parseLeadPaste("Just A Name\t12/10/1973");
    expect(result.ok).toBe(false);
  });

  it("requires a full name even if other columns are present", () => {
    const result = parseLeadPaste("\t12/10/1973\t123 Main St, Tampa, FL 33601\t8323637961\t33601");
    expect(result.ok).toBe(false);
  });

  it("pads missing optional trailing columns instead of failing", () => {
    const result = parseLeadPaste(
      "Jane Doe\t01/01/1990\t100 Main St, Austin, TX 78701\t5551234567\t78701"
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lead.home_status).toBeNull();
    expect(result.lead.current_carrier).toBeNull();
  });

  it("warns instead of failing when the date of birth is unparseable", () => {
    const result = parseLeadPaste(
      "Jane Doe\tnot-a-date\t100 Main St, Austin, TX 78701\t5551234567\t78701"
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lead.date_of_birth).toBeNull();
    expect(result.lead.warnings.some((w) => w.includes("date of birth"))).toBe(true);
  });

  it("flags a phone number that isn't 10 digits without rejecting the row", () => {
    const result = parseLeadPaste(
      "Jane Doe\t01/01/1990\t100 Main St, Austin, TX 78701\t555-1234\t78701"
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lead.warnings.some((w) => w.includes("Phone"))).toBe(true);
  });

  it("falls back to double-space splitting when tabs are missing", () => {
    const spaced =
      "Michael D Pratt  12/10/1973  7557 Arlington Expy, Jacksonville, FL 32211  " +
      "8323637961  32211  Renter  2  2024 Kia Forte / 2002 Lincoln Town Car  Progressive 1 Year";
    const result = parseLeadPaste(spaced);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lead.full_name).toBe("Michael D Pratt");
    expect(result.lead.zip_code).toBe("32211");
  });

  it("stores the whole carrier string when no term pattern is found", () => {
    const result = parseLeadPaste(
      "Jane Doe\t01/01/1990\t100 Main St, Austin, TX 78701\t5551234567\t78701\tOwner\t1\tHonda Civic\tGeico"
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lead.current_carrier).toBe("Geico");
    expect(result.lead.policy_term).toBeNull();
  });
});
