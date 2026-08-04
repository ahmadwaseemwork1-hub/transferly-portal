"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { approveEmployeeTransfer, rejectEmployeeTransfer } from "@/app/admin/actions";
import { Button } from "@/components/ui";

export function ApprovalButtons({ transferId }: { transferId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);

  async function handle(action: "approve" | "reject") {
    setLoading(action);
    if (action === "approve") await approveEmployeeTransfer(transferId);
    else await rejectEmployeeTransfer(transferId);
    setLoading(null);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="success"
        onClick={() => handle("approve")}
        disabled={loading !== null}
      >
        <CheckCircle2 className="h-4 w-4" />
        Approve
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => handle("reject")}
        disabled={loading !== null}
      >
        <XCircle className="h-4 w-4" />
        Reject
      </Button>
    </div>
  );
}
