import { ChangeDetectorRef, Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { FormsModule } from '@angular/forms';

import { ProjectOverviewService } from '../../../../../core/services/project-overview.service';
import { BidInfoDto, EmployeeDetails, ContractorClient } from '../../../../../core/models/project-management/bid-info.model';

// The Details tab, from ProjectDetailsTab.razor. DetailsTab.razor, just an "<h4>Project Details</h4>"
// heading, isn't used by the Overview page, so it isn't ported.
// The Project Resources list is a few rows with no sorting or filtering in Blazor, so it's a plain
// ejs-grid without paging.
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

  /** Loads the employees for the current project. */
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

  /** Deletes an employee. */
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


          if (
            message &&
            message.toLowerCase() !== 'error'
          ) {

            // Reload the employee grid after the delete.
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
