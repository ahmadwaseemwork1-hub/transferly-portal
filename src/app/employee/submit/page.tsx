import { LeadPasteForm } from "@/components/lead-paste-form";

export default function EmployeeSubmitPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Submit a lead</h1>
        <p className="mt-1 text-sm text-muted">
          Paste the lead data, confirm it parsed correctly, then submit.
        </p>
      </div>
      <LeadPasteForm />
    </div>
  );
}
