"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { parseLeadPaste } from "@/lib/lead-parser";
import { fetchLeadFormLookup, submitLeadTransfer, type EditableLeadInput } from "@/app/lead-actions";
import { Button, Card, CardHeader, Input, Label, Select, Textarea } from "@/components/ui";
import type { LeadExtraField } from "@/lib/types";

const EMPTY_LEAD: EditableLeadInput = {
  first_name: "",
  last_name: "",
  date_of_birth: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  zip_code: "",
  home_status: "",
  vehicle_count: "",
  vehicles: "",
  current_carrier: "",
  policy_term: "",
  extra: [],
};

const FIELD_ROWS: { label: string; key: keyof Omit<EditableLeadInput, "extra"> }[] = [
  { label: "First name", key: "first_name" },
  { label: "Last name", key: "last_name" },
  { label: "Date of birth", key: "date_of_birth" },
  { label: "Email", key: "email" },
  { label: "Phone", key: "phone" },
  { label: "Address", key: "address" },
  { label: "City", key: "city" },
  { label: "State", key: "state" },
  { label: "Zip", key: "zip_code" },
  { label: "Home owner / renter?", key: "home_status" },
  { label: "No. of cars", key: "vehicle_count" },
  { label: "Make and model of car(s)", key: "vehicles" },
  { label: "Current insurance carrier", key: "current_carrier" },
  { label: "Policy term", key: "policy_term" },
];

export function LeadPasteForm() {
  const router = useRouter();
  const [raw, setRaw] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [hasParsed, setHasParsed] = useState(false);
  const [lead, setLead] = useState<EditableLeadInput>(EMPTY_LEAD);

  const [clientId, setClientId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [time, setTime] = useState("");
  const [clients, setClients] = useState<{ id: string; business_name: string; campaign_status: string }[]>([]);
  const [employees, setEmployees] = useState<{ id: string; full_name: string }[]>([]);
  const [role, setRole] = useState<"admin" | "employee" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchLeadFormLookup().then((data) => {
      setClients(data.clients);
      setEmployees(data.employees);
      setRole(data.self.role);
      if (data.self.role === "employee" && data.self.employeeId) {
        setAgentId(data.self.employeeId);
      }
    });
  }, []);

  // Re-parses whenever the pasted text changes and seeds the editable fields
  // from it. Editing the fields below after that does NOT get overwritten
  // unless the pasted text itself changes again.
  useEffect(() => {
    if (!raw.trim()) {
      setHasParsed(false);
      setParseError(null);
      setParseWarnings([]);
      return;
    }
    const result = parseLeadPaste(raw);
    setHasParsed(true);
    if (!result.ok) {
      setParseError(result.error);
      setParseWarnings([]);
      return;
    }
    setParseError(null);
    setParseWarnings(result.lead.warnings);
    setLead({
      first_name: result.lead.first_name,
      last_name: result.lead.last_name,
      date_of_birth: result.lead.date_of_birth ?? "",
      email: result.lead.email ?? "",
      phone: result.lead.phone,
      address: result.lead.address,
      city: result.lead.city ?? "",
      state: result.lead.state ?? "",
      zip_code: result.lead.zip_code,
      home_status: result.lead.home_status ?? "",
      vehicle_count: result.lead.vehicle_count != null ? String(result.lead.vehicle_count) : "",
      vehicles: result.lead.vehicles ?? "",
      current_carrier: result.lead.current_carrier ?? "",
      policy_term: result.lead.policy_term ?? "",
      extra: result.lead.extra,
    });
  }, [raw]);

  function updateField<K extends keyof Omit<EditableLeadInput, "extra">>(key: K, value: string) {
    setLead((l) => ({ ...l, [key]: value }));
  }

  function updateExtra(index: number, patch: Partial<LeadExtraField>) {
    setLead((l) => ({
      ...l,
      extra: l.extra.map((f, i) => (i === index ? { ...f, ...patch } : f)),
    }));
  }

  // Every field is freely editable and none are required — only a client
  // and agent must be chosen before a transfer can be submitted.
  const canSubmit = Boolean(clientId) && Boolean(agentId);

  async function handleSubmit() {
    setError(null);
    setSuccess(false);
    if (!clientId || !agentId) {
      setError("Choose a client and agent before submitting.");
      return;
    }
    setSubmitting(true);
    const result = await submitLeadTransfer({
      lead,
      clientId,
      agentEmployeeId: agentId,
      transferTime: time,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccess(true);
    setRaw("");
    setLead(EMPTY_LEAD);
    setHasParsed(false);
    setTime("");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader
          title="1. Paste the lead"
          description="Paste the row exactly as copied from the sheet — tab-separated, NA placeholders and all. Both the new and old column layouts are recognized automatically."
        />
        <div className="p-6">
          <Textarea
            rows={4}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={
              "Erin\tHundley\t02/18/1972\tehundley72@hotmail.com\t7195522545\t404 Homer Ave\t" +
              "Rocky Ford\tCO\t81067\tNA\tNA\tNA\t2015 Nissan Rogue\tNA\tNA\tProgressive\tRent"
            }
            className="font-mono text-xs"
          />
          {parseError && (
            <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {parseError}
            </p>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="2. Review and correct every field"
          description="Paste a lead above and this fills in automatically — everything below is editable, so fix anything the parser got wrong before submitting."
          action={
            hasParsed && !parseError ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
                <CheckCircle2 className="h-4 w-4" /> Parsed
              </span>
            ) : undefined
          }
        />
        <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          {FIELD_ROWS.map(({ label, key }) => (
            <div key={key}>
              <Label>{label}</Label>
              <Input
                value={lead[key]}
                onChange={(e) => updateField(key, e.target.value)}
                placeholder="—"
                autoComplete="off"
              />
            </div>
          ))}
        </div>

        {lead.extra.length > 0 && (
          <div className="border-t border-border p-6">
            <p className="mb-3 text-sm font-medium text-foreground">
              Additional columns (unconfirmed meaning — relabel if you know what these actually are)
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {lead.extra.map((field, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={field.label}
                    onChange={(e) => updateExtra(i, { label: e.target.value })}
                    className="max-w-[55%] text-xs"
                  />
                  <Input
                    value={field.value}
                    onChange={(e) => updateExtra(i, { value: e.target.value })}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {parseWarnings.length > 0 && (
          <div className="border-t border-border p-6">
            <ul className="flex flex-col gap-1">
              {parseWarnings.map((w, i) => (
                <li key={i} className="text-xs text-warning">
                  ⚠ {w}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="3. Assign & confirm" />
        <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-3">
          <div>
            <Label>Client</Label>
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">Select client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.business_name}
                  {c.campaign_status === "paused" ? " (campaign paused)" : ""}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Agent</Label>
            {role === "employee" ? (
              <Input
                disabled
                value={employees.find((e) => e.id === agentId)?.full_name ?? "You"}
              />
            ) : (
              <Select value={agentId} onChange={(e) => setAgentId(e.target.value)}>
                <option value="">Select agent</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.full_name}
                  </option>
                ))}
              </Select>
            )}
          </div>
          <div>
            <Label>Time</Label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-border p-6">
          {error && (
            <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
          )}
          {success && (
            <p className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success">
              Submitted. It's now pending admin approval and waiting on the client.
            </p>
          )}
          <Button onClick={handleSubmit} disabled={submitting || !canSubmit} className="self-start">
            {submitting ? "Submitting..." : "Submit transfer"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
