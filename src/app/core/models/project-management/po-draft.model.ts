// NEW - Stowell PO Module. Backs the "Draft Purchase Orders" / "Draft Change Orders" sections
// on PO/CO Queue Home, added after Save PO/CO turned out to have no way back into the UI.
import { PoRequestItem } from './po-request.model';

export interface PoDraftSummary {
  draftId: number;
  jobId: string;
  vendor: string;
  poDescription: string;
  requester: string;
  totalAmount: number;
  createdBy: string;
  createdDate: string;
  status: string;
  // Sage phase the draft was saved under (null/absent = none chosen) - the PO tab filters drafts by it.
  phaseNumber?: number | null;
}

export interface PoDraftDetail {
  draftId: number;
  jobId: string;
  vendor: string;
  poDescription: string;
  requester: string;
  dateRequested: string;
  requiredOnSite: string;
  totalAmount: number;
  phaseNumber?: number | null;
  items: PoRequestItem[];
}

export interface CoDraftSummary {
  draftId: number;
  jobId: string;
  purchaseOrderId: string;
  vendor: string;
  coReason: string;
  requester: string;
  totalAmount: number;
  createdBy: string;
  createdDate: string;
  status: string;
}

export interface CoDraftDetail {
  draftId: number;
  jobId: string;
  purchaseOrderId: string;
  vendor: string;
  coReason: string;
  requester: string;
  dateRequested: string;
  requiredOnSite: string;
  totalAmount: number;
  items: PoRequestItem[];
}
