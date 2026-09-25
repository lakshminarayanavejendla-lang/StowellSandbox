import { ChangeDetectorRef, Component, Input, NgZone, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { ProjectOverviewService } from '../../../../../core/services/project-overview.service';
import { CurrentCostSummaryViewModel } from '../../../../../core/models/project-management/cost-summary.model';
import { BidInfoDto, BidPhase } from '../../../../../core/models/project-management/bid-info.model';
import { FormsModule } from '@angular/forms';
// Port of Components/Pages/ProjectManagement/OverviewTab.razor + OverviewTabBase.cs.
// Read-only summary form (Job Id/Name/Division/Status/Address/dates/Contract Amount) plus a
// "bid phases" grid - all fields are readonly in the source too (edits happen back in the
// Estimation module's Edit Bid Form, linked to via the "Update" button).
@Component({
  selector: 'app-overview-tab',
  standalone: true,
  imports: [CommonModule, GridModule,FormsModule, RouterLink],
  templateUrl: './overview-tab.component.html',
  styleUrl: './overview-tab.component.scss',
})
export class OverviewTabComponent implements OnChanges {
  @Input({ required: true }) projectId!: number;

  constructor(
    private overviewService: ProjectOverviewService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
  ) {}

  model?: CurrentCostSummaryViewModel;
  bidModel?: BidInfoDto;
  bidPhases: BidPhase[] = [];

  // FLAG: the Blazor version reads this from IConfiguration ("ProjectFolderLibrary"), which
  // has no direct Angular equivalent wired up yet. Hardcoded empty pending a decision on where
  // SPA-side app config like this should live (environment.ts vs. an API-served settings call).
  projectFolderLibraryUrl = '';
selectedDivision: string = 'selectDivision';
selectedBidStatus: string = '';
  ngOnChanges(): void {
    if (!this.projectId) return;
    // FIX - stuck on "Loading..." forever despite the data arriving correctly: the existing
    // detectChanges() calls below run, but this app's MSAL interceptor/zone.js interaction means
    // the HTTP response callback itself can execute outside Angular's zone, so the change
    // detection this triggers doesn't reliably reach the DOM (confirmed live - the component's
    // `model`/`bidModel` fields were both fully populated, but the template's `@if (!model)`
    // never flipped until a detectChanges() was invoked from a fresh macrotask). Wrapping each
    // subscribe body in ngZone.run() - the same fix admin-panel.component.ts already uses for
    // this exact class of issue - forces the callback back into Angular's zone before
    // detectChanges() runs, so the check-and-render actually commits.
    this.overviewService.getCurrentCostSummaryViewModel(String(this.projectId)).subscribe((m) => {
      this.ngZone.run(() => {
        this.model = m;
        this.cdr.detectChanges();
      });
    });
    this.overviewService.getBidDetails(this.projectId).subscribe((b) => {
      this.ngZone.run(() => {
        this.bidModel = b;
        this.selectedDivision = b.division || 'selectDivision';
        this.selectedBidStatus = b.bidStatus || '';
        this.cdr.detectChanges();
      });
    });
    this.overviewService.getBidPhases(this.projectId).subscribe((p) => {
      this.ngZone.run(() => {
        this.bidPhases = p;
        this.cdr.detectChanges();
      });
    });
  }
}
