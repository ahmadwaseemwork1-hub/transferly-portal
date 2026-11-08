import { describe, it, expect } from "vitest";
import {
  parseCsvText,
  normalizeDate,
  normalizeValue,
  mapCsvRows,
  validateMapping,
} from "../csv";

describe("normalizeDate", () => {
  it("passes through ISO dates and pads single digits", () => {
    expect(normalizeDate("2026-7-1")).toBe("2026-07-01");
    expect(normalizeDate("2026-07-01")).toBe("2026-07-01");
  });

  it("parses MM/DD/YYYY", () => {
    expect(normalizeDate("7/1/2026")).toBe("2026-07-01");
    expect(normalizeDate("07/01/2026")).toBe("2026-07-01");
  });

  it("parses 2-digit years as 20XX", () => {
    expect(normalizeDate("7/1/26")).toBe("2026-07-01");
  });

  it("returns null for garbage input", () => {
    expect(normalizeDate("not a date")).toBeNull();
    expect(normalizeDate("")).toBeNull();
  });

  it("treats late 2-digit years as 19XX so birth dates aren't pushed into the future", () => {
    expect(normalizeDate("2/18/72")).toBe("1972-02-18");
    expect(normalizeDate("7/1/26")).toBe("2026-07-01");
  });

  it("accepts year-first, dotted, compact, and written-month formats", () => {
    expect(normalizeDate("1990/01/05")).toBe("1990-01-05");
    expect(normalizeDate("5.1.1990")).toBe("1990-05-01");
    expect(normalizeDate("01051990")).toBe("1990-01-05");
    expect(normalizeDate("Jan 5, 1990")).toBe("1990-01-05");
    expect(normalizeDate("January 5th 1990")).toBe("1990-01-05");
    expect(normalizeDate("5 Jan 1990")).toBe("1990-01-05");
  });

  it("rejects dates that don't exist on the calendar", () => {
    expect(normalizeDate("13/45/1990")).toBeNull();
    expect(normalizeDate("02/30/1990")).toBeNull();
    expect(normalizeDate("2026-02-29")).toBeNull();
    expect(normalizeDate("Foo 5, 1990")).toBeNull();
  });
});

describe("normalizeValue", () => {
  it("strips currency symbols and commas", () => {
    expect(normalizeValue("$1,250.50")).toBe(1250.5);
    expect(normalizeValue("45")).toBe(45);
  });

  it("returns 0 for blank or unparseable input", () => {
    expect(normalizeValue(undefined)).toBe(0);
    expect(normalizeValue("")).toBe(0);
    expect(normalizeValue("n/a")).toBe(0);
  });
});

describe("parseCsvText", () => {
  it("parses headers and rows, skipping blank lines", () => {
    const csv = "Name,Date\nJohn,2026-07-01\n\nJane,2026-07-02";
    const { headers, rows } = parseCsvText(csv);
    expect(headers).toEqual(["Name", "Date"]);
    expect(rows).toHaveLength(2);
    expect(rows[0].Name).toBe("John");
  });
});

describe("validateMapping", () => {
  it("flags missing required fields", () => {
    const errors = validateMapping({});
    expect(errors.length).toBeGreaterThan(0);
  });

  it("passes when required fields are mapped", () => {
    const errors = validateMapping({ client: "Client", transfer_date: "Date" });
    expect(errors).toHaveLength(0);
  });
});

describe("mapCsvRows", () => {
  const clients = [
    { id: "client-1", business_name: "Summit Auto Insurance" },
    { id: "client-2", business_name: "Coastal Coverage" },
  ];

  it("matches client names case-insensitively and normalizes fields", () => {
    const rows = [
      {
        Client: "summit auto insurance",
        Date: "7/1/2026",
        Lead: "Jane Doe",
        Value: "$50",
      },
    ];
    const mapping = {
      client: "Client",
      transfer_date: "Date",
      lead_name: "Lead",
      value: "Value",
    };
    const [result] = mapCsvRows(rows, mapping, clients);
    expect(result.clientId).toBe("client-1");
    expect(result.transfer_date).toBe("2026-07-01");
    expect(result.lead_name).toBe("Jane Doe");
    expect(result.value).toBe(50);
    expect(result.errors).toHaveLength(0);
  });

  it("collects errors independently per row instead of failing the batch", () => {
    const rows = [
      { Client: "Summit Auto Insurance", Date: "7/1/2026" },
      { Client: "Unknown Company", Date: "not-a-date" },
    ];
    const mapping = { client: "Client", transfer_date: "Date" };
    const results = mapCsvRows(rows, mapping, clients);

    expect(results[0].errors).toHaveLength(0);
    expect(results[1].errors.length).toBeGreaterThan(0);
    expect(results[1].errors.some((e) => e.includes("Unknown Company"))).toBe(true);
  });

  it("assigns 1-indexed row numbers accounting for the header row", () => {
    const rows = [
      { Client: "Summit Auto Insurance", Date: "7/1/2026" },
      { Client: "Coastal Coverage", Date: "7/2/2026" },
    ];
    const mapping = { client: "Client", transfer_date: "Date" };
    const results = mapCsvRows(rows, mapping, clients);
    expect(results[0].rowNumber).toBe(2);
    expect(results[1].rowNumber).toBe(3);
  });
});
