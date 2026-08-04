import { LeadPasteForm } from "@/components/lead-paste-form";

export default function AdminTransferLeadPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Transfer a lead</h1>
        <p className="mt-1 text-sm text-muted">
          Paste lead data, confirm it parsed correctly, assign it to a client and agent.
        </p>
      </div>
      <LeadPasteForm />
    </div>
  );
}
