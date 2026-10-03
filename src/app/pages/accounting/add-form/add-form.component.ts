import {
  ChangeDetectorRef,
  Component,
  OnInit,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  ActivatedRoute,
  Router
} from '@angular/router';

import {
  FormArray,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule
} from '@angular/forms';

import { AccountingService } from '../../../core/services/accounting.service';

import {
  AccountingBidInfoService
} from '../../../core/services/accounting-bid-info.service';

import {
  CostCodeService
} from '../../../core/services/cost-code.service';

import {
  DatePickerModule
} from '@syncfusion/ej2-angular-calendars';

import {
  ACCOUNTING_BID_STATUSES,
  ACCOUNTING_DEPARTMENTS,
  ACCOUNTING_DIVISIONS,
  ACCOUNTING_EMPLOYEE_ROLES,
  ACCOUNTING_JOB_PHASES,
  ACCOUNTING_JOB_TYPES_BY_DEPARTMENT,
  BidAmount,
  BidEmployee,
  BidInfoDto,
  BidPhase,
  ContractorClient
} from '../../../core/models/accounting/bid-info.model';

import {
  Phase
} from '../../../core/models/accounting/budget.model';
import { AuthService } from '../../../core/services/auth.service';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';


@Component({
  selector: 'app-accounting-add-form',
  standalone: true,

  imports: [PageHeaderComponent, 
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    DatePickerModule
  ],

  templateUrl: './add-form.component.html',
  styleUrl: './add-form.component.scss'
})
export class AddFormComponent implements OnInit {

  // ---- Dependency injection ----

  private route = inject(ActivatedRoute);

  private router = inject(Router);

  private fb = inject(FormBuilder);

  private accountingService =
    inject(AccountingService);

  private bidInfoService =
    inject(AccountingBidInfoService);

  private costCodeService =
    inject(CostCodeService);
private authService = inject(AuthService);

  // ---- Page variables ----

  jobId = 0;

  isLoading = false;

  errorMessage = '';

  successMessage = '';


  // ---- Dropdown data ----

  readonly jobPhases =
    ACCOUNTING_JOB_PHASES;

  readonly bidStatuses =
    ACCOUNTING_BID_STATUSES;

  readonly divisions =
    ACCOUNTING_DIVISIONS;

  readonly departments =
    ACCOUNTING_DEPARTMENTS;

  readonly employeeRoles =
    ACCOUNTING_EMPLOYEE_ROLES;


  jobTypeOptions: string[] = [];

  phases: Phase[] = [];

  contractorClients: ContractorClient[] = [];

  employeeOptions: ContractorClient[] = [];


  // ---- Main form ----

  form: FormGroup = this.fb.group({

    bidder: [
      {
        value: '',
        disabled: true
      }
    ],

    jobId: [
      {
        value: '',
        disabled: true
      }
    ],

    jobPhase: [''],

    bidStatus: [''],

    division: ['selectDivision'],

    department: [''],

    jobType: [
      {
        value: '',
        disabled: true
      }
    ],

    jobName: [''],

    shortName: [''],

    contractNumber: [''],

    contractDate: [''],

    contractAmount: [null],

    estStartDate: [''],

    estCompletionDate: [''],

    jobSite: [''],

    jobSiteAddress: [''],

    jobSiteAddress2: [''],

    jobSiteCity: [''],

    jobSiteState: [''],

    jobSiteSalesTaxDistrict: [''],

    clientId: [null],

    clientAddress1: [''],

    clientAddress2: [''],

    clientCity: [''],

    clientState: [''],

    clientZip: [''],

    insuranceType: [0],

    bonded: [0],

    taxExempt: [0],

    invoiceSubmittal: [0],

    certifiedPayroll: [0],

    netTermsDate: [''],

    retainagePerc: [null],

    bidAmounts: this.fb.array([]),

    bidPhases: this.fb.array([]),

    bidEmployees: this.fb.array([])

  });


  // ---- Add bid popup ----

  newBidAmount: {
    bidDate: string;
    bidAmount: number | null;
  } = {
    bidDate: '',
    bidAmount: null
  };


  showBidPopup = false;


  // ---- Add phase ----

  newBidPhase = {
    phaseNum: ''
  };
showPhasePopup = false;

  // ---- Add employee ----

newEmployee: {
  role: string | null;
  employeeId: number | null;
} = {
  role: null,
  employeeId: null
};

showEmployeePopup = false;


  // ---- Form array getters ----

  get bidAmounts(): FormArray {
    return this.form.get('bidAmounts') as FormArray;
  }


  get bidPhases(): FormArray {
    return this.form.get('bidPhases') as FormArray;
  }


  get bidEmployees(): FormArray {
    return this.form.get('bidEmployees') as FormArray;
  }


  get contractorClientList(): ContractorClient[] {

    return Array.isArray(this.contractorClients)
      ? this.contractorClients
      : [];

  }


  // ---- Init ----

  ngOnInit(): void {
    this.jobId =
      Number(
        this.route.snapshot.paramMap.get('jobId')
      ) || 0;


    this.form.patchValue({
      jobId: String(this.jobId)
    });


    // ---- Load phases ----

    this.costCodeService
      .getAllPhases()
      .subscribe({

        next: (phases) => {

          this.phases =
            Array.isArray(phases)
              ? phases
              : [];

        },

        error: (err) => {

          console.error(
            'Error loading phases:',
            err
          );

          this.phases = [];

        }

      });


    // ---- Load contractor clients ----

    // this.bidInfoService
    //   .getAllContractorClients()
    //   .subscribe({

    //     next: (clients) => {

    //       this.contractorClients =
    //         Array.isArray(clients)
    //           ? clients
    //           : [];

    //     },

    //     error: (err) => {

    //       console.error(
    //         'Error loading contractor clients:',
    //         err
    //       );

    //       this.contractorClients = [];

    //     }

    //   });
this.bidInfoService.getAllContractorClients().subscribe({
  next: (response: any) => {

    console.log('Contractor Clients API response:', response);
    console.log('Is Array:', Array.isArray(response));

    this.contractorClients = Array.isArray(response)
      ? response
      : Array.isArray(response?.data)
        ? response.data
        : [];

    console.log('contractorClients:', this.contractorClients);
    console.log('contractorClientList:', this.contractorClientList);
  },

  error: (err) => {
    console.error('Contractor Clients API ERROR:', err);
    this.contractorClients = [];
  }
});

    // ---- Load employees ----
   this.bidInfoService.getAllEmployees().subscribe({
  next: (response: any) => {

    console.log('Employees API response:', response);

    this.employeeOptions = Array.isArray(response)
      ? response
      : [];

    console.log('employeeOptions:', this.employeeOptions);
  },

  error: (err) => {
    console.error('Error loading employees:', err);
    this.employeeOptions = [];
  }
});

    // ---- Logged user ----

   
          this.form.patchValue({
            bidder: this.authService.getLoggedInUserEmail()  ?? ''
          });


    const jobIdStr =
      String(this.jobId);


    // ---- Load grid data ----

   this.reloadAllBidData()


    // ---- Load bid details ----

    this.bidInfoService
      .getBidDetails(this.jobId)
      .subscribe({

        next: (bid) => {

          console.log(
            'Job ID:',
            this.jobId
          );

          console.log(
            'Bid Details API Response:',
            bid
          );


          if (!bid) {

            console.warn(
              'No bid details returned for Job ID:',
              this.jobId
            );

            return;

          }


          this.applyBidDetails(bid);

        },

        error: (err) => {

          console.error(
            'Error loading bid details:',
            err
          );

        }

      });


    console.log(
      'AddFormComponent: ngOnInit() completed'
    );

  }

// ---- Reload all grid data ----

private reloadAllBidData(): void {

  const jobIdStr = String(this.jobId);

  console.log('Reloading all bid data for Job ID:', jobIdStr);

  this.reloadBidAmounts(jobIdStr);
  this.reloadBidPhases(jobIdStr);
  this.reloadBidEmployees(jobIdStr);
}
  // ---- Department ----

  onDepartmentChange(
    department: string
  ): void {

    this.jobTypeOptions =
      ACCOUNTING_JOB_TYPES_BY_DEPARTMENT[
        department
      ] ?? [];


    console.log(
      'Department changed:',
      department,
      'Job Types:',
      this.jobTypeOptions
    );


    this.form.patchValue({
      jobType: ''
    });

  }


  // ---- Date conversion ----

  convertToDateInput(
    date: string | null
  ): string {

    if (!date) {
      return '';
    }


    const parts =
      date.split('/');


    if (parts.length !== 3) {
      return date;
    }


    const [
      month,
      day,
      year
    ] = parts;


    return `${month.padStart(2, '0')}/${day.padStart(2, '0')}/${year}`;

  }


  // ---- Client ----

  onClientChange(
    clientId: number | string | null
  ): void {

    if (
      clientId === null ||
      clientId === ''
    ) {

      return;

    }


    this.bidInfoService
      .getContractorClientById(
        String(clientId)
      )
      .subscribe({

        next: (client) => {

          if (!client) {
            return;
          }


          this.form.patchValue({

            clientAddress1:
              client.address1,

            clientAddress2:
              client.address2,

            clientCity:
              client.city,

            clientState:
              client.state,

            clientZip:
              client.zipCode

          });

        },

        error: (err) => {

          console.error(
            'Error loading client:',
            err
          );

        }

      });

  }


  // ---- Open bid popup ----

  openBidPopup(): void {

    console.log(
      'OPEN BID POPUP'
    );


    this.errorMessage = '';


    this.newBidAmount = {

      bidDate: '',

      bidAmount: null

    };


    this.showBidPopup = true;


    console.log(
      'showBidPopup:',
      this.showBidPopup
    );

  }


  // ---- Close bid popup ----

  closeBidPopup(): void {

    console.log(
      'CLOSE BID POPUP'
    );


    this.showBidPopup = false;


    this.newBidAmount = {

      bidDate: '',

      bidAmount: null

    };

  }


  // ---- Save bid from popup ----

saveBidFromPopup(): void {

  this.errorMessage = '';

  if (!this.newBidAmount.bidDate) {
    this.errorMessage =
      'Please enter Bid Date.';
    return;
  }

  if (
    this.newBidAmount.bidAmount === null ||
    this.newBidAmount.bidAmount === undefined
  ) {
    this.errorMessage =
      'Please enter Bid Amount.';
    return;
  }
this.showBidPopup = false;
  this.addBidAmount();
}
 constructor(private cdr: ChangeDetectorRef) { }

  // ---- Add bid ----
addBidAmount(): void {

  if (!this.newBidAmount.bidDate) {
    this.errorMessage = 'Please enter Bid Date.';
    return;
  }

  if (
    this.newBidAmount.bidAmount === null ||
    this.newBidAmount.bidAmount === undefined
  ) {
    this.errorMessage = 'Please enter Bid Amount.';
    return;
  }

  this.errorMessage = '';

  const jobIdStr = String(this.jobId);

  const payload: BidAmount = {
    id: 0,
    jobId: jobIdStr,
    bidDate: this.convertDateForNewBid(this.newBidAmount.bidDate),
    bidAmount1: this.newBidAmount.bidAmount
  };

  console.log('Adding Bid:', payload);

  this.bidInfoService
    .insertBid(payload)
    .subscribe({

      next: (response) => {

        console.log(
          'Insert Bid Response:',
          response
        );

        if (response) {

          this.newBidAmount = {
            bidDate: '',
            bidAmount: null
          };

          this.showBidPopup = false;

          // Reload immediately after INSERT
          this.reloadBidAmounts(jobIdStr);
  
        }

      },

      error: (err) => {

        console.error(
          'Error adding bid amount:',
          err
        );

        this.errorMessage =
          'Error while adding bid amount.';
      }

    });
  
}

  // ---- Delete bid ----

deleteBidAmount(item: BidAmount): void {

  if (
    !confirm(
      'Are you sure you want to delete this record?'
    )
  ) {
    return;
  }

  const jobIdStr = String(this.jobId);
  console.log('Deleting Bid Amount:', item);
console.log('Deleting Bid Amount with ID:', item.id);
  this.bidInfoService
    .deleteBidAmount(String(item.id))
    .subscribe({

      next: (response) => {

        console.log(
          'Delete Bid Response:',
          response
        );

        this.reloadAllBidData();

      },

      error: (err) => {

        console.error(
          'Error deleting bid:',
          err
        );

      }

    });
}


  // ---- Add phase ----

addBidPhase(): void {

  if (!this.newBidPhase.phaseNum) {

    this.errorMessage =
      'Please select a Phase.';

    return;
  }

  const jobIdStr = String(this.jobId);

  const selectedPhase =
    this.phases.find(
      p =>
        String(p.phaseNum) ===
        String(this.newBidPhase.phaseNum)
    );

  if (!selectedPhase) {

    this.errorMessage =
      'Selected phase was not found.';

    return;
  }

  const payload: BidPhase = {

    id: 0,

    jobId: jobIdStr,

    phase:
      this.newBidPhase.phaseNum,

    description:
      selectedPhase.phaseName
  };

  console.log(
    'Adding Phase:',
    payload
  );

  this.bidInfoService
    .insertPhase(payload)
    .subscribe({

      next: (response) => {

        console.log(
          'Insert Phase Response:',
          response
        );

        if (response) {

          this.newBidPhase = {
            phaseNum: ''
          };

          this.showPhasePopup = false;

          // Reload all 3
          this.reloadAllBidData();
        }

      },

      error: (err) => {

        console.error(
          'Error adding phase:',
          err
        );

        this.errorMessage =
          'Error while adding phase.';
      }

    });
}

  // ---- Delete phase ----

deleteBidPhase(item: BidPhase): void {

  if (
    !confirm(
      'Are you sure you want to delete this record?'
    )
  ) {
    return;
  }

  this.bidInfoService
    .deletePhase(String(item.id))
    .subscribe({

      next: (response) => {

        console.log(
          'Delete Phase Response:',
          response
        );

        this.reloadAllBidData();

      },

      error: (err) => {

        console.error(
          'Error deleting phase:',
          err
        );

      }

    });
}

  // ---- Add employee ----

addEmployee(): void {

  if (
    this.newEmployee.role === null ||
    this.newEmployee.role === ''
  ) {

    this.errorMessage =
      'Please select Role.';

    return;
  }

  if (
    this.newEmployee.employeeId === null ||
    this.newEmployee.employeeId === undefined
  ) {

    this.errorMessage =
      'Please select Employee.';

    return;
  }

  const jobIdStr = String(this.jobId);

  const payload: BidEmployee = {

    id: 0,

    jobId: jobIdStr,

    role:
      this.newEmployee.role,

    employeeId:
      this.newEmployee.employeeId
  };

  console.log(
    'Adding Employee:',
    payload
  );

  this.bidInfoService
    .insertEmployee(payload)
    .subscribe({

      next: (response) => {

        console.log(
          'Insert Employee Response:',
          response
        );

        if (response) {

          this.newEmployee = {
            role: null,
            employeeId: null
          };

          this.showEmployeePopup = false;

          // Reload all 3
          this.reloadAllBidData();
        }

      },

      error: (err) => {

        console.error(
          'Error adding employee:',
          err
        );

        this.errorMessage =
          'Error while adding employee.';
      }

    });
}

  // ---- Delete employee ----

deleteEmployee(item: BidEmployee): void {

  if (
    !confirm(
      'Are you sure you want to delete this record?'
    )
  ) {
    return;
  }

  this.bidInfoService
    .deleteEmployee(String(item.id))
    .subscribe({

      next: (response) => {

        console.log(
          'Delete Employee Response:',
          response
        );

        this.reloadAllBidData();

      },

      error: (err) => {

        console.error(
          'Error deleting employee:',
          err
        );

      }

    });
}

  // ---- Submit bid ----

    submitBid(): void {

  this.isLoading = true;
  this.errorMessage = '';
  this.successMessage = '';

  const bid = this.buildBidInfoDto();

  console.log(
    'Submitting BidInfoDto:',
    JSON.stringify(bid, null, 2)
  );

  this.accountingService
    .submitToSage(bid)
    .subscribe({

      next: (response) => {

        console.log(
          'SubmitToSage response:',
          response
        );

        this.isLoading = false;

        if (response?.success === true) {

          if (response.isExist === false) {

            this.successMessage =
              response.message ??
              'Project Details updated Successfully';
  // Force UI update
          this.cdr.detectChanges();
            // Navigate only after successful API response
            // this.router.navigate([
            //   '/accounting'
            // ]);
  // Show success message first
            setTimeout(() => {
              this.router.navigate(['/accounting']);
            }, 2000);
          } else {

            this.successMessage =
              response.message ??
              'Project already exists.';
                // Force UI update
          this.cdr.detectChanges();
          }

        } else {

          this.errorMessage =
            response?.message ??
            'Error while updating project details.';
              // Force UI update
          this.cdr.detectChanges();
        }

      },

      error: (err) => {

        console.error(
          'Submit Bid Error:',
          err
        );

        this.isLoading = false;

        this.errorMessage =
          err?.error?.message ??
          'Error while updating project details.';
            // Force UI update
          this.cdr.detectChanges();
      }

    });
}

convertDateForNewBid(
  date: Date | string | null | undefined
): string | undefined {
  if (!date) {
    return undefined;
  }

  const d = new Date(date);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
  // ---- Reject bid ----

  rejectBid(): void {

    const bid =
      this.buildBidInfoDto();


    this.bidInfoService
      .updateBid(bid)
      .subscribe({

        next: (response) => {

          if (response?.success) {

            this.router.navigateByUrl(
              '/estimation/bid-queue'
            );

          }
          else {

            this.errorMessage =
              'Error while submitting project details.';

          }

        },

        error: (err) => {

          console.error(
            'Reject Bid Error:',
            err
          );


          this.errorMessage =
            'Error while submitting project details.';

        }

      });

  }


  // ---- Reload bid amounts ----

private reloadBidAmounts(jobId: string): void {

  console.log('Reloading Bid Amounts:', jobId);

  this.bidInfoService
    .getBidsAmount(jobId)
    .subscribe({

      next: (response: any) => {

        console.log(
          'Bid Amount API response:',
          response
        );

        const records: BidAmount[] =
          Array.isArray(response)
            ? response
            : Array.isArray(response?.data)
              ? response.data
              : [];

        console.log(
          'Bid Amount records:',
          records
        );

        this.bidAmounts.clear();

        records.forEach((record: BidAmount) => {

          this.bidAmounts.push(
            this.fb.group({
              ...record
            })
          );

        });

        console.log(
          'Bid Amount count:',
          this.bidAmounts.length
        );
this.cdr.detectChanges();
      },

      error: (err) => {

        console.error(
          'Error loading Bid Amounts:',
          err
        );

      }

    });
}



  // ---- Reload bid phases ----

private reloadBidPhases(jobId: string): void {

  console.log('Reloading Bid Phases:', jobId);

  this.bidInfoService
    .getPhases(jobId)
    .subscribe({

      next: (response: any) => {

        console.log(
          'Bid Phase API response:',
          response
        );

        const records: BidPhase[] =
          Array.isArray(response)
            ? response
            : Array.isArray(response?.data)
              ? response.data
              : [];

        console.log(
          'Bid Phase records:',
          records
        );

        this.bidPhases.clear();

        records.forEach((record: BidPhase) => {

          this.bidPhases.push(
            this.fb.group({
              ...record
            })
          );

        });

        console.log(
          'Bid Phase count:',
          this.bidPhases.length
        );

      },

      error: (err) => {

        console.error(
          'Error loading Bid Phases:',
          err
        );

      }

    });
}


  // ---- Reload employees ----

private reloadBidEmployees(jobId: string): void {

  console.log('Reloading Bid Employees:', jobId);

  this.bidInfoService
    .getBidEmployees(jobId)
    .subscribe({

      next: (response: any) => {

        console.log(
          'Bid Employee API response:',
          response
        );

        const records: BidEmployee[] =
          Array.isArray(response)
            ? response
            : Array.isArray(response?.data)
              ? response.data
              : [];

        console.log(
          'Bid Employee records:',
          records
        );

        this.bidEmployees.clear();

        records.forEach((record: BidEmployee) => {

          this.bidEmployees.push(
            this.fb.group({
              ...record
            })
          );

        });

        console.log(
          'Bid Employee count:',
          this.bidEmployees.length
        );

      },

      error: (err) => {

        console.error(
          'Error loading Bid Employees:',
          err
        );

      }

    });
}


  // ---- Apply bid details ----

  private applyBidDetails(
    bid: BidInfoDto | null
  ): void {

    if (!bid) {
      return;
    }


    this.form.patchValue({

      jobId:
        bid.jobID,

      bidder:
        bid.bidder,

      jobPhase:
        bid.phase,

      bidStatus:
        bid.bidStatus,

      division:
        bid.division,

      department:
        bid.department,

      jobName:
        bid.jobName,

      shortName:
        bid.shortName,

      contractNumber:
        bid.contractNumber,

      contractDate:
        this.convertToDateInput(
          bid.contractDate || null
        ),

      contractAmount:
        bid.contractAmount,

      estStartDate:
        bid.estStartDate,

      estCompletionDate:
        bid.estCompletionDate

    });


    // ---- Department to job type ----

    if (bid.department) {

      this.onDepartmentChange(
        bid.department
      );


      this.form.patchValue({

        jobType:
          bid.jobType

      });

    }


    // ---- Project location ----

    if (bid.projectLocation) {

      this.form.patchValue({

        jobSite:
          bid.projectLocation.jobsite,

        jobSiteAddress:
          bid.projectLocation.address,

        jobSiteAddress2:
          bid.projectLocation.address2,

        jobSiteCity:
          bid.projectLocation.city,

        jobSiteState:
          bid.projectLocation.state,

        jobSiteSalesTaxDistrict:
          bid.projectLocation.salesTaxDistrict

      });

    }


    // ---- Contractor ----
console.log("contractor info:", bid.contractorInfo);
    if (bid.contractorInfo) {

      this.form.patchValue({

        clientId:
          Number(
            bid.contractorInfo.client
          ) || null,

        clientAddress1:
          bid.contractorInfo.address,

        clientAddress2:
          bid.contractorInfo.address2,

        clientCity:
          bid.contractorInfo.city,

        clientState:
          bid.contractorInfo.state,

        clientZip:
          bid.contractorInfo.zip

      });

    }

console.log("project info:", bid.projectInfo);
    // ---- Project information ----

    if (bid.projectInfo) {

      this.form.patchValue({

        insuranceType:
          bid.projectInfo.insuranceType,

        bonded:
          bid.projectInfo.bonded,

        taxExempt:
          bid.projectInfo.taxExcempt,

        invoiceSubmittal:
          bid.projectInfo.invoiceSubmittal,

        certifiedPayroll:
          bid.projectInfo.certifiedPayroll,

        netTermsDate:
         
this.convertToDateInput(
          bid.projectInfo.netTermsDate || null
        ),
        retainagePerc:
          bid.projectInfo.retainagePerc

      });

    }

  }


  // ---- Build DTO ----
convertDateFromApi(
  date: string | null | undefined
): string | undefined {

  if (!date) {
    return undefined;
  }

  const [month, day, year] = date.split('/');

  return `${year}-${month}-${day}`;
}


  private buildBidInfoDto(): BidInfoDto {

    const v =
      this.form.getRawValue();


    return {

      jobID:
        v.jobId,

      bidder:
        v.bidder,

      phase:
        v.jobPhase,

      bidStatus:
        v.bidStatus,

      division:
        v.division,

      department:
        v.department,

      jobType:
        v.jobType,

      jobName:
        v.jobName,

      shortName:
        v.shortName,

      contractNumber:
        v.contractNumber,

      contractDate:
       this.convertDateFromApi(
          v.contractDate || null
        ), 

      contractAmount:
        v.contractAmount,

      estStartDate:
       this.convertDateFromApi(
          v.estStartDate || null
        ), 
        

      estCompletionDate:
       this.convertDateFromApi(
          v.estCompletionDate || null
        ), 
        


      projectLocation: {

        jobID:
          v.jobId,

        jobsite:
          v.jobSite,

        address:
          v.jobSiteAddress,

        address2:
          v.jobSiteAddress2,

        city:
          v.jobSiteCity,

        state:
          v.jobSiteState,

        salesTaxDistrict:
          v.jobSiteSalesTaxDistrict

      },


      contractorInfo: {

        jobID:
          v.jobId,

        client:
          v.clientId != null
            ? String(v.clientId)
            : undefined,

        address:
          v.clientAddress1,

        address2:
          v.clientAddress2,

        city:
          v.clientCity,

        state:
          v.clientState,

        zip:
          v.clientZip

      },


      projectInfo: {

        jobID:
          v.jobId,

        insuranceType:
          v.insuranceType,

        bonded:
          v.bonded,

        taxExcempt:
          v.taxExempt,

        invoiceSubmittal:
          v.invoiceSubmittal,

        certifiedPayroll:
          v.certifiedPayroll,

        netTermsDate:
        
this.convertDateFromApi(
          v.netTermsDate || null
        ),
        retainagePerc:
          v.retainagePerc

      }

    };

  }

  openPhasePopup(): void {
  console.log('OPEN PHASE POPUP');
  this.errorMessage = '';
  this.newBidPhase = {
    phaseNum: ''
  };
  this.showPhasePopup = true;
  console.log(
    'showPhasePopup:',
    this.showPhasePopup
  );
}

closePhasePopup(): void {

  console.log('CLOSE PHASE POPUP');

  this.showPhasePopup = false;

  this.newBidPhase = {
    phaseNum: ''
  };
}

savePhaseFromPopup(): void {

  this.errorMessage = '';

  if (!this.newBidPhase.phaseNum) {

    this.errorMessage =
      'Please select a Phase.';

    return;
  }

  this.addBidPhase();
}

openEmployeePopup(): void {

  console.log('OPEN EMPLOYEE POPUP');

  this.errorMessage = '';

  this.newEmployee = {
    role: null,
    employeeId: null
  };

  this.showEmployeePopup = true;

  console.log(
    'showEmployeePopup:',
    this.showEmployeePopup
  );
}

closeEmployeePopup(): void {

  console.log('CLOSE EMPLOYEE POPUP');

  this.showEmployeePopup = false;

  this.newEmployee = {
    role: null,
    employeeId: null
  };
}

saveEmployeeFromPopup(): void {

  this.errorMessage = '';

  if (!this.newEmployee.role) {

    this.errorMessage =
      'Please select Role.';

    return;
  }

  if (
    this.newEmployee.employeeId === null ||
    this.newEmployee.employeeId === undefined
    
  ) {

    this.errorMessage =
      'Please select Employee.';

    return;
  }

  this.addEmployee();
}
}