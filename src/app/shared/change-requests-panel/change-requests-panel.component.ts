import { ChangeDetectorRef, Component, Input, OnInit, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChangeRequest, ChangeRequestService } from '../../core/services/change-request.service';

interface CompareField {
  label: string;
  before: string;
  after: string;
  changed: boolean;
}

interface Line {
  item: string;
  cost: number | null;
  note: string;
}

/** A change request opened for review: what the record looks like now (in Sage) against what the PM wants. */
interface Review {
  fields: CompareField[];
  beforeLines: Line[];
  afterLines: Line[];
  isDelete: boolean;
}

function parse(json: string | null): any {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

const text = (v: unknown): string => (v === null || v === undefined ? '' : String(v).trim());

/**
 * Accounting's list of changes waiting for approval ("everything goes through approval"). A PM's edit of a PO or CO, or
 * the deletion of a posted CO budget allocation, is saved as a change request instead of being written to Sage at once.
 * Opening one shows how the record is in Sage today against the new values; Approve then applies it to Sage, and Reject
 * (with a reason) leaves Sage exactly as it is.
 */
@Component({
  selector: 'app-change-requests-panel',
  standalone: true,
  imports: [FormsModule, DatePipe, CurrencyPipe],
  templateUrl: './change-requests-panel.component.html',
  styleUrl: './change-requests-panel.component.scss',
})
export class ChangeRequestsPanelComponent implements OnInit {
  /** Which records to list: 'PO', 'CO' and/or 'COALLOC'. */
  @Input() entities: string[] = [];
  @Input() title = 'Changes waiting for approval';

  private service = inject(ChangeRequestService);
  private cdr = inject(ChangeDetectorRef);

  requests: ChangeRequest[] = [];
  loaded = false;
  loadFailed = false;
  openId: number | null = null;
  review: Review | null = null;
  rejectingId: number | null = null;
  rejectReason = '';
  busyId: number | null = null;
  message = '';
  messageIsError = false;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.service.getList('Pending').subscribe((rows) => {
      this.loadFailed = rows === null;
      this.requests = (rows ?? []).filter((r) => !this.entities.length || this.entities.includes(r.entity));
      this.loaded = true;
      this.cdr.detectChanges();
    });
  }

  kind(r: ChangeRequest): string {
    const what = r.entity === 'PO' ? 'PO' : r.entity === 'CO' ? 'Change order' : 'CO budget allocation';
    return `${r.changeType} ${what}`;
  }

  toggle(r: ChangeRequest): void {
    this.message = '';
    this.rejectingId = null;
    if (this.openId === r.id) {
      this.openId = null;
      this.review = null;
      return;
    }
    this.openId = r.id;
    this.review = this.buildReview(r);
  }

  startReject(r: ChangeRequest): void {
    this.rejectingId = r.id;
    this.rejectReason = '';
    this.message = '';
  }

  cancelReject(): void {
    this.rejectingId = null;
    this.rejectReason = '';
  }

  approve(r: ChangeRequest): void {
    if (this.busyId !== null) return;
    const ok = window.confirm(`Approve this change? ${r.summary ?? ''}\n\nSage is updated as soon as you approve.`);
    if (!ok) return;
    this.busyId = r.id;
    this.message = '';
    this.service.approve(r.id).subscribe((result) => {
      this.busyId = null;
      if (result.succeeded) {
        this.finish(r, `Approved: ${r.summary ?? r.entityId}. Sage has been updated.`, false);
      } else {
        this.message = `Could not approve: ${result.error ?? 'unknown error'} The change is still waiting.`;
        this.messageIsError = true;
        this.cdr.detectChanges();
      }
    });
  }

  confirmReject(r: ChangeRequest): void {
    if (this.busyId !== null || !this.rejectReason.trim()) return;
    this.busyId = r.id;
    this.service.reject(r.id, this.rejectReason.trim()).subscribe((result) => {
      this.busyId = null;
      if (result.succeeded) {
        this.finish(r, `Rejected: ${r.summary ?? r.entityId}. Sage was not changed.`, false);
      } else {
        this.message = `Could not reject: ${result.error ?? 'unknown error'}`;
        this.messageIsError = true;
        this.cdr.detectChanges();
      }
    });
  }

  private finish(r: ChangeRequest, message: string, isError: boolean): void {
    this.requests = this.requests.filter((x) => x.id !== r.id);
    this.openId = null;
    this.review = null;
    this.rejectingId = null;
    this.rejectReason = '';
    this.message = message;
    this.messageIsError = isError;
    this.cdr.detectChanges();
  }

  /** Lines as shown in the review, from either the Sage snapshot (before) or the PM's payload (after). */
  private lines(items: any[] | null | undefined, before: boolean): Line[] {
    return (items ?? []).map((i) => ({
      item: text(i?.item),
      cost: i?.itemCost === null || i?.itemCost === undefined || i?.itemCost === '' ? null : Number(i.itemCost),
      note: text(i?.itemNote),
    })).filter((l) => before || l.item || l.cost !== null);
  }

  private buildReview(r: ChangeRequest): Review {
    const before = parse(r.beforeJson) ?? {};
    const after = parse(r.payloadJson);
    const fields: CompareField[] = [];
    const add = (label: string, b: unknown, a: unknown) => {
      const bs = text(b);
      const as = text(a);
      fields.push({ label, before: bs, after: as, changed: bs !== as });
    };

    if (r.changeType === 'Delete' || !after) {
      if (r.entity === 'COALLOC') {
        add('Change order', before.CoNumber, '(deleted)');
        add('Job', before.JobName, '');
        add('Type', before.CoType, '');
        add('Description', before.CoDescription, '');
        add('Requested amount', before.RequestedAmount, '');
        add('Approved amount', before.ApprovedAmount, '');
      } else if (r.changeType === 'Complete') {
        add('Status in Sage', before.sageStatus, 'Completed');
      }
      return { fields, beforeLines: [], afterLines: [], isDelete: true };
    }

    const afterLines = this.lines(after.items, false);
    const afterTotal = afterLines.reduce((s, l) => s + (l.cost ?? 0), 0);
    if (r.entity === 'PO') {
      add('Vendor', before.vendor, after.vendor);
      add('Description', before.poDescription, after.poDescription);
      add('Phase', before.phaseNumber, after.phaseNumber);
      add('Required on site', text(before.requiredOnSite).slice(0, 10), text(after.requiredOnSite).slice(0, 10));
    } else {
      add('Purchase order', before.purchaseOrder, after.purchaseOrderId);
      add('Reason', before.coReason, after.coReason);
      add('Date requested', text(before.dateRequested).slice(0, 10), text(after.dateRequested).slice(0, 10));
    }
    add('Total', before.total === undefined ? '' : Number(before.total).toFixed(2), afterTotal.toFixed(2));
    return { fields, beforeLines: this.lines(before.items, true), afterLines, isDelete: false };
  }
}
