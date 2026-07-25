"use client";

import { useState } from "react";
import { submitDailyUpload } from "@/app/employee/actions";
import { Button, Card, CardHeader, Input, Label } from "@/components/ui";
import { Upload, PenLine, CheckCircle } from "lucide-react";

export default function EmployeeUploadPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [mode, setMode] = useState<"manual" | "csv">("manual");

  // Manual entry state
  const [date, setDate] = useState(today);
  const [count, setCount] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // CSV state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<Array<{ date: string; count: number; notes: string }>>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvResult, setCsvResult] = useState<{ ok: boolean; msg: string } | null>(null);

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!count || Number(count) < 1) { setResult({ ok: false, msg: "Enter at least 1 transfer." }); return; }
    setLoading(true); setResult(null);
    const r = await submitDailyUpload({ transfer_count: Number(count), upload_date: date, notes });
    setResult({ ok: r.ok, msg: r.ok ? `Logged ${count} transfers for ${date}!` : (r as { ok: false; error: string }).error });
    if (r.ok) { setCount(""); setNotes(""); }
    setLoading(false);
  }

  function handleCSVChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCsvError(null); setCsvPreview([]); setCsvResult(null);
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) { setCsvError("CSV must have a header row and at least one data row."); return; }
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
      const dateIdx = headers.findIndex(h => h.includes("date"));
      const countIdx = headers.findIndex(h => h.includes("count") || h.includes("transfer") || h.includes("total"));
      const notesIdx = headers.findIndex(h => h.includes("note"));

      if (dateIdx === -1 || countIdx === -1) {
        setCsvError("CSV must have columns for 'date' and 'transfer count' (or 'count' / 'total').");
        return;
      }

      const rows = lines.slice(1).map(line => {
        const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
        return {
          date: cols[dateIdx] || today,
          count: parseInt(cols[countIdx]) || 0,
          notes: notesIdx >= 0 ? cols[notesIdx] || "" : "",
        };
      }).filter(r => r.count > 0);

      if (!rows.length) { setCsvError("No valid rows found (count must be > 0)."); return; }
      setCsvPreview(rows);
    };
    reader.readAsText(file);
  }

  async function handleCSVSubmit() {
    if (!csvPreview.length) return;
    setCsvLoading(true); setCsvResult(null);
    const { submitCSVUploads } = await import("@/app/employee/actions");
    const r = await submitCSVUploads(csvPreview);
    setCsvResult({ ok: r.ok, msg: r.ok ? `Imported ${(r as { ok: true; data: { inserted: number } }).data.inserted} day(s) of transfers!` : (r as { ok: false; error: string }).error });
    if (r.ok) { setCsvPreview([]); setCsvFile(null); }
    setCsvLoading(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Log transfers</h1>
        <p className="mt-1 text-sm text-muted">Record your daily transfer count. Your admin can see these in real time.</p>
      </div>

      {/* Mode toggle */}
      <div className="flex rounded-lg border border-border bg-surface p-1 w-fit gap-1">
        {([["manual", "Manual entry", PenLine], ["csv", "Upload CSV", Upload]] as const).map(([m, label, Icon]) => (
          <button key={m} onClick={() => { setMode(m); setResult(null); setCsvResult(null); }}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${mode === m ? "bg-primary text-white shadow-sm" : "text-muted hover:text-foreground"}`}>
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      {mode === "manual" && (
        <Card>
          <CardHeader title="Log today's transfers" description="Enter how many transfers you completed for a given date." />
          <form onSubmit={handleManualSubmit} className="flex flex-col gap-4 p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Date *</Label>
                <Input type="date" required value={date} max={today} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <Label>Number of transfers *</Label>
                <Input type="number" required min="1" value={count} onChange={(e) => setCount(e.target.value)} placeholder="e.g. 8" />
              </div>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. All FL leads, good day" />
            </div>
            {result && (
              <div className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm ${result.ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
                {result.ok && <CheckCircle className="h-4 w-4 shrink-0" />}
                {result.msg}
              </div>
            )}
            <Button type="submit" disabled={loading} className="mt-1">
              {loading ? "Logging..." : "Log transfers"}
            </Button>
          </form>
        </Card>
      )}

      {mode === "csv" && (
        <Card>
          <CardHeader title="Upload CSV" description="CSV must have a date column and a transfer count column." />
          <div className="p-6 flex flex-col gap-4">
            <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
              <Upload className="mx-auto h-8 w-8 text-muted mb-2" />
              <p className="text-sm text-muted mb-3">Drop your CSV here or click to browse</p>
              <input type="file" accept=".csv" onChange={handleCSVChange}
                className="mx-auto block text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20 cursor-pointer" />
            </div>

            <div className="rounded-lg bg-neutral-50 p-3 text-xs text-muted">
              <strong>Expected columns:</strong> date, transfer_count (or &quot;count&quot; / &quot;total&quot;), notes (optional)
              <br />
              <strong>Example:</strong> date,transfer_count,notes / 2026-07-15,8,Good FL leads
            </div>

            {csvError && <p className="text-sm text-danger rounded-lg bg-danger-soft px-3 py-2">{csvError}</p>}

            {csvPreview.length > 0 && (
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Preview ({csvPreview.length} rows)</p>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border bg-neutral-50">
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted uppercase">Date</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted uppercase">Transfers</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted uppercase">Notes</th>
                    </tr></thead>
                    <tbody>
                      {csvPreview.map((r, i) => (
                        <tr key={i} className="border-b border-border">
                          <td className="px-3 py-2">{r.date}</td>
                          <td className="px-3 py-2 font-semibold text-primary">{r.count}</td>
                          <td className="px-3 py-2 text-muted">{r.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button onClick={handleCSVSubmit} disabled={csvLoading} className="mt-3">
                  {csvLoading ? "Importing..." : `Import ${csvPreview.length} row(s)`}
                </Button>
              </div>
            )}

            {csvResult && (
              <div className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm ${csvResult.ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
                {csvResult.ok && <CheckCircle className="h-4 w-4 shrink-0" />}
                {csvResult.msg}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
