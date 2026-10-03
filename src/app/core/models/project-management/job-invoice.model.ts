// The Invoices tab on Project Overview (Moqups page TAB-Invoices). Since 2026-09-23 the data comes
// from InvoicesController.GetJobInvoices, which reads the job's Sage invoices (acrinv). Shaped like
// job-po.model.ts.
export interface JobInvoiceRecord {
  invoiceId: string;
  name: string;
  amount: number;
  status: string;
  // Sage phase number (acrinv.phsnum), so the Invoices tab can show one phase at a time.
  phase?: number | null;
  invoiceDate?: string;
}

export interface JobInvoicesData {
  invoices: JobInvoiceRecord[];
}
