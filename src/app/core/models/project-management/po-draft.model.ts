// The Draft Purchase Orders and Draft Change Orders lists on the PO and CO queues, added because a
// saved PO or CO had no way back into the app.
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
  // The Sage phase the draft was saved under (missing if none). The PO tab filters drafts by it.
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
