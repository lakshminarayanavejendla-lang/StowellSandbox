import { ChangeDetectorRef, Component, Input, NgZone, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { ProjectOverviewService } from '../../../../../core/services/project-overview.service';
import { CurrentCostSummaryViewModel } from '../../../../../core/models/project-management/cost-summary.model';
import { BidInfoDto, BidPhase } from '../../../../../core/models/project-management/bid-info.model';
import { FormsModule } from '@angular/forms';
// The Overview tab, from OverviewTab.razor: a read-only summary (job id and name, division, status,
// address, dates, contract amount) and a bid phases grid. Changes are made in the Edit Bid form
// through the "Update" button, as in Blazor.
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

  // Blazor read this from the ProjectFolderLibrary setting, which the app doesn't have yet. It's empty
  // until we decide where settings like this go (environment.ts or an API call).
  projectFolderLibraryUrl = '';
selectedDivision: string = 'selectDivision';
selectedBidStatus: string = '';
  ngOnChanges(): void {
    if (!this.projectId) return;
    // The tab stayed on "Loading..." even though the data arrived. The MSAL interceptor can run the
    // response callback outside Angular's zone, so detectChanges() didn't update the page: `model`
    // was filled in, but `@if (!model)` never changed. Each subscribe body runs inside ngZone.run(),
    // as in admin-panel.component.ts, so the render goes through.
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
