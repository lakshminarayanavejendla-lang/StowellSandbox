import { ChangeDetectorRef, Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { FormsModule } from '@angular/forms';

import { ProjectOverviewService } from '../../../../../core/services/project-overview.service';
import { BidInfoDto, EmployeeDetails, ContractorClient } from '../../../../../core/models/project-management/bid-info.model';

// Port of Components/Pages/ProjectManagement/ProjectDetailsTab.razor + ProjectDetailsTabBase.cs.
// NOTE: Components/Pages/ProjectManagement/DetailsTab.razor (a bare "<h4>Project Details</h4>"
// stub inheriting a near-empty ProjectTabBase) is a separate, unused file - ProjectOverView.razor
// switches to THIS component ("details" case renders <ProjectDetailsTab>), not DetailsTab.razor.
// Skipped porting DetailsTab.razor/ProjectTabBase.cs as dead duplicates.
// The "Project Resources" employees list is a small, unpaginated grid (no sort/filter in the
// source) - kept simple with just the base ejs-grid (no Page/Sort/Filter services) rather than
// adding paging chrome to a handful of rows.
@Component({
  selector: 'app-project-details-tab',
  standalone: true,
  imports: [CommonModule, GridModule,
    FormsModule, RouterLink],
  templateUrl: './project-details-tab.component.html',
  styleUrl: './project-details-tab.component.scss',
})
export class ProjectDetailsTabComponent implements OnChanges {

  @Input({ required: true }) projectId!: number;

  constructor(
    private overviewService: ProjectOverviewService,
    private cdr: ChangeDetectorRef
  ) {}

  bidModel?: BidInfoDto;

  employees: EmployeeDetails[] = [];

  contractorClients: ContractorClient[] = [];

  selectedClientId: number | null = null;

  selectedInsuranceType: string = '0';

  selectedBonded: string = '0';

  selectedTaxExempt: string = '0';

  selectedInvoiceSubmittal: string = '0';

  selectedCertifiedPayroll: string = '0';

  projectFolderLibraryUrl = '';

  message = '';

  ngOnChanges(): void {

    if (!this.projectId) {
      return;
    }

    // Load project/bid details
    this.overviewService
      .getBidDetails(this.projectId)
      .subscribe({
        next: (b) => {

          this.bidModel = b;

          this.selectedClientId =
            b.contractorInfo?.client != null
              ? Number(b.contractorInfo.client)
              : null;

          this.selectedInsuranceType =
            b.projectInfo?.insuranceType != null
              ? String(b.projectInfo.insuranceType)
              : '0';

          this.selectedBonded =
            b.projectInfo?.bonded != null
              ? String(b.projectInfo.bonded)
              : '0';

          this.selectedTaxExempt =
            b.projectInfo?.taxExcempt != null
              ? String(b.projectInfo.taxExcempt)
              : '0';

          this.selectedInvoiceSubmittal =
            b.projectInfo?.invoiceSubmittal != null
              ? String(b.projectInfo.invoiceSubmittal)
              : '0';

          this.selectedCertifiedPayroll =
            b.projectInfo?.certifiedPayroll != null
              ? String(b.projectInfo.certifiedPayroll)
              : '0';

          console.log('Bid model:', this.bidModel);
          console.log('Selected client ID:', this.selectedClientId);
          console.log(
            'Selected insurance type:',
            this.selectedInsuranceType
          );
          console.log(
            'Selected bonded:',
            this.selectedBonded
          );
          console.log(
            'Selected tax exempt:',
            this.selectedTaxExempt
          );
          console.log(
            'Selected invoice submittal:',
            this.selectedInvoiceSubmittal
          );
          console.log(
            'Selected certified payroll:',
            this.selectedCertifiedPayroll
          );

          this.cdr.detectChanges();
        },

        error: (error) => {
          console.error(
            'Get Bid Details API error:',
            error
          );
        }
      });

    // Load employees
    this.loadEmployees();

    // Load contractor clients
    this.overviewService
      .getAllContractorClients()
      .subscribe({
        next: (c) => {

          console.log(
            'Contractor clients:',
            c
          );

          this.contractorClients =
            Array.isArray(c) ? c : [];

          console.log(
            'Contractor clients after assignment:',
            this.contractorClients
          );

          console.log(
            'Current selected client:',
            this.selectedClientId
          );

          this.cdr.detectChanges();
        },

        error: (error) => {

          console.error(
            'Get Contractor Clients API error:',
            error
          );

          this.contractorClients = [];
        }
      });
  }

  /**
   * Load employees for the current project.
   */
  private loadEmployees(): void {

    if (!this.projectId) {
      return;
    }

    console.log(
      'Loading employees for project:',
      this.projectId
    );

    this.overviewService
      .getEmployees(this.projectId)
      .subscribe({

        next: (employees) => {

          console.log(
            'Employees:',
            employees
          );

          this.employees =
            Array.isArray(employees)
              ? employees
              : [];

          console.log(
            'Employees after assignment:',
            this.employees
          );

          this.cdr.detectChanges();
        },

        error: (error) => {

          console.error(
            'Get Employees API error:',
            error
          );

          this.employees = [];

          this.cdr.detectChanges();
        }
      });
  }

  /**
   * Delete employee.
   */
  deleteEmployee(item: EmployeeDetails): void {

    if (!item || !item.id) {

      console.error(
        'Invalid Employee:',
        item
      );

      return;
    }

    const confirmed = confirm(
      'Are you sure you want to delete this employee?'
    );

    if (!confirmed) {
      return;
    }

    const id: string = item.id;

    console.log(
      'Deleting Employee ID:',
      id
    );

    this.overviewService
      .deleteEmployee(item)
      .subscribe({

        next: (message) => {

          console.log(
            'DeleteEmployee result:',
            message
          );

          debugger;

          if (
            message &&
            message.toLowerCase() !== 'error'
          ) {

            // Reload employee grid after successful delete
            this.loadEmployees();

            this.message =
              message ||
              'Employee deleted successfully.';

          } else {

            this.message =
              'Unable to delete employee.';
          }
        },

        error: (error) => {

          console.error(
            'Delete Employee API error:',
            error
          );

          this.message =
            error?.error?.Message ||
            error?.error?.message ||
            'Unable to delete employee.';
        }

      });
  }
}
