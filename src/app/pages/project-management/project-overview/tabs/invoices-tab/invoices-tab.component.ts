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
 * The Invoices tab (Moqups page TAB-Invoices), laid out like the PO and CO tabs. "New Invoice" is a
 * plain button, not a link, because the mockup has no New Invoice form to open. Ask the product owner
 * whether one is coming.
 *
 * It has the same Total Budget / Paid / Remaining box and pie as the PO and CO tabs (Mike Smith,
 * 2026-09-16: "budget needs to pull in here... and on PO, CO and Invoice tabs"). costSummary,
 * asCurrency and paidPercent are copied from po-tab.component.ts. There's no Set Budget link; that's
 * only on the Budget tab now.
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

  // The grid is only created once its data is here, because EJ2 grids created empty can stay blank
  // (see po-tab.component.ts). It's rebuilt on every phase change, as on the PO tab.
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

  // All phases or one phase at a time, with the same dropdown and budget box as the PO tab (Mike
  // Smith, 2026-09-23: "For PO, CO, Invoices tabs we need 2 options: show all phases together or show
  // 1 phase at a time"). InvoicesController.GetJobInvoices (added 2026-09-23; it used to return 404)
  // gives each invoice's Sage phase (acrinv.phsnum), so a picked phase shows only its invoices.
  phases: Phase[] = [];
  selectedPhaseId = '';

  /** Phase figures only apply when the job has more than one phase. With a single phase the amounts
   * mustn't change when it's picked (Mike Smith, 2026-09-23). */
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
