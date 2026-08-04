"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "./ui";

/**
 * Snapshots the invoice document DOM and saves a real .pdf file — a better
 * UX than the browser print dialog (print-button.tsx), which stays available
 * as a secondary option.
 */
export function DownloadInvoiceButton({
  invoiceNumber,
  targetId = "invoice-document",
}: {
  invoiceNumber: string;
  targetId?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const node = document.getElementById(targetId);
      if (!node) return;

      const canvas = await html2canvas(node, { scale: 2, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [canvas.width, canvas.height] });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`${invoiceNumber}.pdf`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleDownload} disabled={loading}>
      <Download className="h-4 w-4" />
      {loading ? "Preparing PDF..." : "Download PDF"}
    </Button>
  );
}
