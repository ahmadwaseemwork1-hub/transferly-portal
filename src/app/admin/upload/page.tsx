"use client";

import { useEffect, useMemo, useState } from "react";
import { UploadCloud, CheckCircle2, AlertTriangle } from "lucide-react";
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
import { fetchClientLookup, commitTransferUpload } from "@/app/admin/actions";

export default function UploadPage() {
  const [clients, setClients] = useState<{ id: string; business_name: string }[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

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

      // Best-effort auto-mapping by matching header names to field labels.
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

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    const res = await commitTransferUpload(rows, mapping);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setResult(res.data);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">
          Upload today&apos;s transfers
        </h1>
        <p className="mt-1 text-sm text-muted">
          Upload any CSV, match its columns to VOXPACT&apos;s fields, then confirm.
        </p>
      </div>

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
                    <option key={h} value={h}>
                      {h}
                    </option>
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
              <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}
            {result && (
              <p className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success">
                Imported {result.inserted} transfers.
                {result.skipped > 0 && ` ${result.skipped} rows were skipped due to errors.`}
              </p>
            )}
            <Button
              onClick={handleSubmit}
              disabled={submitting || mappingErrors.length > 0 || validCount === 0}
              className="self-start"
            >
              {submitting ? "Uploading..." : `Import ${validCount} transfers`}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
