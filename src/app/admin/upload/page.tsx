"use client";

import { useEffect, useMemo, useState } from "react";
import { UploadCloud, CheckCircle2, AlertTriangle, FileText, PenLine } from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  Select,
  Label,
  Badge,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  mapCsvRows,
  parseCsvText,
  validateMapping,
  type ColumnMapping,
} from "@/lib/csv";
import {
  TRANSFER_FIELDS,
  TRANSFER_FIELD_LABELS,
  REQUIRED_TRANSFER_FIELDS,
} from "@/lib/types";
import { fetchClientLookup, commitTransferUpload, submitManualLeads } from "@/app/admin/actions";

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse raw lead text pasted by the user.
 * Expected format (one lead per line or blank-line-separated):
 *   John Smith | 555-123-4567 | john@email.com | 45 | Male | TX
 *   OR freeform – we do our best to extract name, phone, email.
 */
function parseLeadText(text: string): Array<{ lead_name: string; phone?: string; email?: string; raw: string }> {
  const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean);
  return lines.map(line => {
    const parts = line.split(/[|,\t]+/).map(p => p.trim());
    const emailMatch = line.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
    const phoneMatch = line.match(/(?:\+1[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
    return {
      lead_name: parts[0] ?? line,
      phone: phoneMatch?.[0],
      email: emailMatch?.[0],
      raw: line,
    };
  });
}

// ─── component ────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const [clients, setClients] = useState<{ id: string; business_name: string }[]>([]);
  const [mode, setMode] = useState<"csv" | "manual">("csv");

  // CSV state
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Manual state
  const [manualClientId, setManualClientId] = useState("");
  const [leadText, setLeadText] = useState("");
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 10));
  const [manualResult, setManualResult] = useState<string | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualSubmitting, setManualSubmitting] = useState(false);

  useEffect(() => {
    fetchClientLookup().then(setClients);
  }, []);

  function handleFile(file: File) {
    setError(null);
    setResult(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const parsed = parseCsvText(text);
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      const auto: ColumnMapping = {};
      for (const field of TRANSFER_FIELDS) {
        const guess = parsed.headers.find((h) =>
          h.toLowerCase().replace(/[^a-z]/g, "").includes(field.replace(/_/g, ""))
        );
        if (guess) auto[field] = guess;
      }
      setMapping(auto);
    };
    reader.readAsText(file);
  }

  const preview = useMemo(() => {
    if (rows.length === 0) return [];
    return mapCsvRows(rows.slice(0, 25), mapping, clients);
  }, [rows, mapping, clients]);

  const mappingErrors = validateMapping(mapping);
  const validCount = useMemo(() => {
    if (rows.length === 0 || mappingErrors.length > 0) return 0;
    return mapCsvRows(rows, mapping, clients).filter((r) => r.errors.length === 0).length;
  }, [rows, mapping, clients, mappingErrors.length]);

  async function handleCsvSubmit() {
    setSubmitting(true);
    setError(null);
    const res = await commitTransferUpload(rows, mapping);
    setSubmitting(false);
    if (!res.ok) { setError(res.error); return; }
    setResult(res.data);
  }

  const parsedLeads = useMemo(() => parseLeadText(leadText), [leadText]);

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualClientId) { setManualError("Please select a client."); return; }
    if (parsedLeads.length === 0) { setManualError("Enter at least one lead."); return; }
    setManualSubmitting(true);
    setManualError(null);
    setManualResult(null);
    const res = await submitManualLeads(
      manualClientId,
      parsedLeads.map((l) => ({ lead_name: l.lead_name, phone: l.phone, email: l.email, transfer_date: manualDate }))
    );
    setManualSubmitting(false);
    if (!res.ok) { setManualError(res.error); return; }
    setManualResult(`${res.data.inserted} lead${res.data.inserted !== 1 ? "s" : ""} submitted successfully.`);
    setLeadText("");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Transfer Lead Form</h1>
        <p className="mt-1 text-sm text-muted">Upload a CSV file or paste raw lead data for a specific client.</p>
      </div>

      {/* Mode toggle */}
      <div className="flex rounded-xl border border-border bg-neutral-50 p-1 w-fit gap-1">
        <button
          type="button"
          onClick={() => setMode("csv")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            mode === "csv"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted hover:text-foreground"
          )}
        >
          <UploadCloud className="h-4 w-4" /> CSV Upload
        </button>
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            mode === "manual"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted hover:text-foreground"
          )}
        >
          <PenLine className="h-4 w-4" /> Manual Entry
        </button>
      </div>

      {/* ── Manual Entry Mode ── */}
      {mode === "manual" && (
        <form onSubmit={handleManualSubmit} className="flex flex-col gap-4">
          <Card>
            <CardHeader title="1. Select client" />
            <div className="p-6">
              <Label>Client</Label>
              <Select
                value={manualClientId}
                onChange={(e) => setManualClientId(e.target.value)}
                required
              >
                <option value="">— Choose a client —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.business_name}</option>
                ))}
              </Select>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="2. Transfer date"
              description="Date these leads were transferred."
            />
            <div className="p-6">
              <Label>Date</Label>
              <input
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>
          </Card>

          <Card>
            <CardHeader
              title="3. Paste lead data"
              description="One lead per line. Separate fields with | or comma. E.g.: John Smith | 555-100-2000 | john@email.com"
            />
            <div className="p-6 flex flex-col gap-4">
              <textarea
                rows={10}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder={"John Smith | 555-100-2000 | john@email.com\nJane Doe | 555-200-3000 | jane@email.com\n..."}
                value={leadText}
                onChange={(e) => setLeadText(e.target.value)}
              />

              {parsedLeads.length > 0 && (
                <div>
                  <p className="mb-2 text-xs text-muted font-medium uppercase tracking-wide">
                    Preview — {parsedLeads.length} lead{parsedLeads.length !== 1 ? "s" : ""} detected
                  </p>
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-neutral-50 text-xs uppercase tracking-wide text-muted">
                          <th className="px-3 py-2 text-left font-medium">#</th>
                          <th className="px-3 py-2 text-left font-medium">Name</th>
                          <th className="px-3 py-2 text-left font-medium">Phone</th>
                          <th className="px-3 py-2 text-left font-medium">Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedLeads.slice(0, 20).map((l, i) => (
                          <tr key={i} className="border-b border-border last:border-0">
                            <td className="px-3 py-2 text-muted">{i + 1}</td>
                            <td className="px-3 py-2 text-foreground">{l.lead_name}</td>
                            <td className="px-3 py-2 text-muted">{l.phone ?? "—"}</td>
                            <td className="px-3 py-2 text-muted">{l.email ?? "—"}</td>
                          </tr>
                        ))}
                        {parsedLeads.length > 20 && (
                          <tr>
                            <td colSpan={4} className="px-3 py-2 text-center text-xs text-muted">
                              … and {parsedLeads.length - 20} more
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {manualError && (
                <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{manualError}</p>
              )}
              {manualResult && (
                <p className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success">{manualResult}</p>
              )}

              <Button
                type="submit"
                disabled={manualSubmitting || parsedLeads.length === 0 || !manualClientId}
                className="self-start"
              >
                {manualSubmitting ? "Submitting..." : `Submit ${parsedLeads.length || 0} lead${parsedLeads.length !== 1 ? "s" : ""}`}
              </Button>
            </div>
          </Card>
        </form>
      )}

      {/* ── CSV Upload Mode ── */}
      {mode === "csv" && (
        <>
          <Card>
            <CardHeader title="1. Choose file" />
            <div className="p-6">
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border px-6 py-10 text-center hover:border-primary">
                <UploadCloud className="h-8 w-8 text-muted" />
                <span className="text-sm font-medium text-foreground">
                  {fileName ?? "Click to select a CSV file"}
                </span>
                <span className="text-xs text-muted">
                  {rows.length > 0 ? `${rows.length} rows detected` : "Any column layout works"}
                </span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </label>
            </div>
          </Card>

          {headers.length > 0 && (
            <Card>
              <CardHeader
                title="2. Match columns"
                description="Tell us which CSV column maps to each field. Required fields are marked."
              />
              <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
                {TRANSFER_FIELDS.map((field) => (
                  <div key={field}>
                    <Label>
                      {TRANSFER_FIELD_LABELS[field]}
                      {REQUIRED_TRANSFER_FIELDS.includes(field) && (
                        <span className="text-danger"> *</span>
                      )}
                    </Label>
                    <Select
                      value={mapping[field] ?? ""}
                      onChange={(e) =>
                        setMapping((m) => ({ ...m, [field]: e.target.value || undefined }))
                      }
                    >
                      <option value="">— Not mapped —</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </Select>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {rows.length > 0 && (
            <Card>
              <CardHeader
                title="3. Preview & confirm"
                description={`Showing the first ${preview.length} of ${rows.length} rows.`}
                action={
                  <Badge
                    className={
                      validCount === rows.length
                        ? "bg-success-soft text-success"
                        : "bg-warning-soft text-warning"
                    }
                  >
                    {validCount} / {rows.length} valid
                  </Badge>
                }
              />
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                      <th className="px-6 py-3 font-medium">Row</th>
                      <th className="px-4 py-3 font-medium">Client</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Lead</th>
                      <th className="px-4 py-3 font-medium">Value</th>
                      <th className="px-4 py-3 font-medium">Issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row) => (
                      <tr
                        key={row.rowNumber}
                        className={cn(
                          "border-b border-border last:border-0",
                          row.errors.length > 0 && "bg-danger-soft/40"
                        )}
                      >
                        <td className="px-6 py-3 text-muted">{row.rowNumber}</td>
                        <td className="px-4 py-3 text-foreground">{row.clientRaw || "—"}</td>
                        <td className="px-4 py-3 text-foreground">{row.transfer_date ?? "—"}</td>
                        <td className="px-4 py-3 text-foreground">{row.lead_name ?? "—"}</td>
                        <td className="px-4 py-3 text-foreground">{row.value}</td>
                        <td className="px-4 py-3 text-danger">
                          {row.errors.length > 0 ? row.errors.join(" ") : (
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-border p-6">
                {mappingErrors.length > 0 && (
                  <p className="flex items-center gap-2 text-sm text-danger">
                    <AlertTriangle className="h-4 w-4" />
                    {mappingErrors.join(" ")}
                  </p>
                )}
                {error && (
                  <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
                )}
                {result && (
                  <p className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success">
                    Imported {result.inserted} transfers.
                    {result.skipped > 0 && ` ${result.skipped} rows were skipped due to errors.`}
                  </p>
                )}
                <Button
                  onClick={handleCsvSubmit}
                  disabled={submitting || mappingErrors.length > 0 || validCount === 0}
                  className="self-start"
                >
                  {submitting ? "Uploading..." : `Import ${validCount} transfers`}
                </Button>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
