// NEW - Stowell PO Module. Backs the real file upload on FORM-PO Request / FORM-CO Request
// (previously a static placeholder - see po-attachment.service.ts).
export interface PoAttachment {
  name: string;
  storedName: string;
  size: number;
  uploaded?: string;
}
