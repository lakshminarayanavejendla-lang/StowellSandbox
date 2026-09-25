// NEW model - Stowell PO/CO Module mockup update (page TAB-Invoices, the new "Invoices" tab on
// the Project Overview page). Backed (since 2026-09-23) by InvoicesController.GetJobInvoices, which
// reads the job's Sage invoices (acrinv). Mirrors job-po.model.ts's shape/status.
export interface JobInvoiceRecord {
  invoiceId: string;
  name: string;
  amount: number;
  status: string;
  // Sage phase number (acrinv.phsnum) - lets the Invoices tab show one phase at a time.
  phase?: number | null;
  invoiceDate?: string;
}

export interface JobInvoicesData {
  invoices: JobInvoiceRecord[];
}
