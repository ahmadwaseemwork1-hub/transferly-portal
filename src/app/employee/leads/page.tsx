"use client";

import { useEffect, useState } from "react";
import { Button, Card, CardHeader, Input, Label, Select, Textarea } from "@/components/ui";
import { RealtimeClientStatusList } from "@/components/realtime-client-status-list";
import {
  fetchClientLookupForEmployee,
  submitEmployeeLead,
  type ClientLookupForEmployee,
} from "@/app/employee/actions";
import { CheckCircle } from "lucide-react";

const HOME_OWNER_OPTIONS = [
  { value: "", label: "— Select —" },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

export default function SubmitLeadPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [clients, setClients] = useState<ClientLookupForEmployee[]>([]);

  const [clientId, setClientId] = useState("");
  const [leadName, setLeadName] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  const [numCars, setNumCars] = useState("1");
  const [cars, setCars] = useState("");
  const [currentCarrier, setCurrentCarrier] = useState("");
  const [homeOwner, setHomeOwner] = useState("");
  const [transferDate, setTransferDate] = useState(today);
  const [state, setState] = useState("");
  const [insuranceType, setInsuranceType] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    fetchClientLookupForEmployee().then(setClients);
  }, []);

  function resetForm() {
    setClientId(""); setLeadName(""); setPhone(""); setDob(""); setAddress("");
    setNumCars("1"); setCars(""); setCurrentCarrier(""); setHomeOwner("");
    setState(""); setInsuranceType(""); setNotes("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    const r = await submitEmployeeLead({
      client_id: clientId,
      lead_name: leadName,
      phone,
      dob,
      address,
      num_cars: Number(numCars),
      cars,
      current_carrier: currentCarrier,
      home_owner: homeOwner === "yes",
      transfer_date: transferDate,
      state: state || undefined,
      insurance_type: insuranceType || undefined,
      notes: notes || undefined,
    });
    setSubmitting(false);
    if (!r.ok) {
      setResult({ ok: false, msg: r.error });
      return;
    }
    setResult({ ok: true, msg: "Lead submitted successfully!" });
    resetForm();
  }

  const activeClients = clients.filter((c) => c.status === "active");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Submit a lead</h1>
        <p className="mt-1 text-sm text-muted">
          All fields marked * are required before a lead can be sent to a client.
        </p>
      </div>

      <RealtimeClientStatusList clients={clients} onChange={setClients} />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Card>
          <CardHeader title="Client & date" />
          <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
            <div>
              <Label>Client *</Label>
              <Select value={clientId} onChange={(e) => setClientId(e.target.value)} required>
                <option value="">— Choose a client —</option>
                {activeClients.map((c) => (
                  <option key={c.id} value={c.id}>{c.business_name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Transfer date *</Label>
              <Input type="date" required max={today} value={transferDate} onChange={(e) => setTransferDate(e.target.value)} />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Lead details" description="Required for every lead." />
          <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
            <div>
              <Label>Name *</Label>
              <Input required value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="John Smith" />
            </div>
            <div>
              <Label>Phone *</Label>
              <Input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="555-123-4567" />
            </div>
            <div>
              <Label>Date of birth *</Label>
              <Input type="date" required value={dob} onChange={(e) => setDob(e.target.value)} />
            </div>
            <div>
              <Label>Address *</Label>
              <Input required value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, City, State" />
            </div>
            <div>
              <Label>Number of cars *</Label>
              <Input type="number" min="1" required value={numCars} onChange={(e) => setNumCars(e.target.value)} />
            </div>
            <div>
              <Label>Current carrier *</Label>
              <Input required value={currentCarrier} onChange={(e) => setCurrentCarrier(e.target.value)} placeholder="e.g. State Farm" />
            </div>
            <div>
              <Label>Home owner *</Label>
              <Select required value={homeOwner} onChange={(e) => setHomeOwner(e.target.value)}>
                {HOME_OWNER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Car(s) *</Label>
              <Textarea rows={2} required value={cars} onChange={(e) => setCars(e.target.value)}
                placeholder={"2018 Honda Civic\n2020 Toyota Corolla"} />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Optional details" />
          <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
            <div>
              <Label>State</Label>
              <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="e.g. Texas" />
            </div>
            <div>
              <Label>Insurance type</Label>
              <Input value={insuranceType} onChange={(e) => setInsuranceType(e.target.value)} placeholder="e.g. Auto" />
            </div>
            <div className="sm:col-span-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything else about this lead" />
            </div>
          </div>
        </Card>

        {result && (
          <div className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm ${result.ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
            {result.ok && <CheckCircle className="h-4 w-4 shrink-0" />}
            {result.msg}
          </div>
        )}

        <Button type="submit" disabled={submitting} className="self-start">
          {submitting ? "Submitting..." : "Submit lead"}
        </Button>
      </form>
    </div>
  );
}
