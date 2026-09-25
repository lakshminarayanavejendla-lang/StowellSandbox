import { ChangeDetectorRef, Component, Input, OnChanges, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GridModule, PageService, SortService } from '@syncfusion/ej2-angular-grids';
import { ProjectOverviewService } from '../../../../../core/services/project-overview.service';
import { JobInvoiceService } from '../../../../../core/services/job-invoice.service';
import { BidInfoDto } from '../../../../../core/models/project-management/bid-info.model';
import { JobInvoiceRecord } from '../../../../../core/models/project-management/job-invoice.model';
import { CurrentCostSummaryViewModel, Phase } from '../../../../../core/models/project-management/cost-summary.model';

/**
 * NEW tab - client-updated Moqups (page TAB-Invoices). Mirrors po-tab.component.ts's/
 * co-tab.component.ts's header + single-grid pattern. "New Invoice" is rendered as a plain
 * disabled-look button rather than a routerLink, since the mockup shows the button but no
 * corresponding "New Invoice" form page exists anywhere in the 17-page mockup to link it to -
 * confirm with product whether that form is coming in a future mockup update.
 *
 * FIX (2026-09-16, Mike Smith) - "budget needs to pull in here... and on PO, CO and Invoice
 * tabs" - this tab had no budget summary at all. Added the same Total Budget/Paid/Remaining +
 * pie summary PO/CO tabs already have (costSummary/asCurrency/paidPercent are verbatim copies of
 * po-tab.component.ts's), WITHOUT a "Set Budget" link - that action now lives only on the Budget
 * tab (also removed from PO/CO tabs, per the same feedback).
 */
@Component({
  selector: 'app-invoices-tab',
  standalone: true,
  imports: [GridModule, CurrencyPipe, FormsModule],
  providers: [PageService, SortService],
  templateUrl: './invoices-tab.component.html',
  styleUrl: './invoices-tab.component.scss',
})
export class InvoicesTabComponent implements OnChanges {
  @Input({ required: true }) projectId!: number;

  private overviewService = inject(ProjectOverviewService);
  private invoiceService = inject(JobInvoiceService);
  private cdr = inject(ChangeDetectorRef);

  bidModel?: BidInfoDto;
  invoices: JobInvoiceRecord[] = [];
  costSummary?: CurrentCostSummaryViewModel;

  pageSettings = { pageSize: 10, pageSizes: [10, 20, 50] };

  ngOnChanges(): void {
    if (!this.projectId) return;

    this.overviewService.getBidDetails(this.projectId).subscribe((b) => {
      this.bidModel = b;
      this.cdr.detectChanges();
    });

    this.selectedPhaseId = '';
    this.loadCostSummary();

    this.invoicesLoaded = false;
    this.invoiceService.getJobInvoices(this.projectId).subscribe((data) => {
      this.allInvoices = data.invoices ?? [];
      this.applyPhaseToInvoices();
    });
  }

  // Grid gated on this so it's built once already populated (EJ2 grids created empty and reassigned
  // later can stay blank - see po-tab.component.ts). Rebuilt on every phase change, as on the PO tab.
  invoicesLoaded = false;
  private allInvoices: JobInvoiceRecord[] = [];

  private applyPhaseToInvoices(): void {
    this.invoicesLoaded = false;
    this.cdr.detectChanges();
    const phase = this.phaseFilterActive ? Number(this.selectedPhaseId) : null;
    this.invoices = phase === null ? this.allInvoices : this.allInvoices.filter((i) => i.phase === phase);
    this.invoicesLoaded = true;
    this.cdr.detectChanges();
  }

  // NEW (2026-09-23, Mike Smith - "For PO, CO, Invoices tabs we need 2 options: show all phases
  // together or show 1 phase at a time"). Same dropdown/budget-box behavior as po-tab.component.ts.
  // The invoice list (InvoicesController.GetJobInvoices, added 2026-09-23 - the endpoint used to 404)
  // returns each invoice's Sage phase (acrinv.phsnum), so with a phase picked only that phase's
  // invoices show.
  phases: Phase[] = [];
  selectedPhaseId = '';

  /** Phase-specific figures apply only when the job really has more than one phase.
   * (Mike Smith, 2026-09-23: with a single phase the amounts must NOT change when it is picked.) */
  private get phaseFilterActive(): boolean {
    return this.selectedPhaseId !== '' && this.phases.length > 1;
  }

  private loadCostSummary(): void {
    this.overviewService
      .getCurrentCostSummaryViewModel(String(this.projectId), this.phaseFilterActive ? this.selectedPhaseId : '')
      .subscribe((m) => {
        this.costSummary = m;
        if (!this.phaseFilterActive) this.phases = m.phases ?? [];
        this.cdr.detectChanges();
      });
  }

  onPhaseChange(phaseId: string): void {
    this.selectedPhaseId = phaseId;
    this.loadCostSummary();
    this.applyPhaseToInvoices();
  }

  totalBudget(): number {
    const s = this.costSummary;
    return this.phaseFilterActive
      ? this.asCurrency(String(s?.costCodeSummaryModel?.sumOfBudgetAndChanges ?? 0))
      : this.asCurrency(s?.budgetPayment?.budget);
  }

  totalPaid(): number {
    const s = this.costSummary;
    return this.phaseFilterActive
      ? this.asCurrency(String(s?.costCodeSummaryModel?.sumOfToDate ?? 0))
      : this.asCurrency(s?.budgetPayment?.paid);
  }

  totalRemaining(): number {
    const s = this.costSummary;
    return this.phaseFilterActive
      ? this.asCurrency(String(s?.costCodeSummaryModel?.sumOfRemaining ?? 0))
      : this.asCurrency(s?.budgetPayment?.balance);
  }

  asCurrency(value: string | undefined): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  paidPercent(): number {
    const budget = this.totalBudget();
    const paid = this.totalPaid();
    if (budget <= 0) return 0;
    return Math.min(100, Math.max(0, (paid / budget) * 100));
  }
}
