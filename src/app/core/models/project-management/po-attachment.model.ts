// File uploads on the PO Request and CO Request forms (see po-attachment.service.ts).
export interface PoAttachment {
  name: string;
  storedName: string;
  size: number;
  uploaded?: string;
}
