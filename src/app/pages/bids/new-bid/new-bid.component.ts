import { Component, OnInit, inject,ChangeDetectorRef,ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { BidService } from '../../../core/services/bid.service';
import { CreateBidRequest } from '../../../core/models/bids/create-bid-request.model';
import { ToastModule, ToastComponent } from '@syncfusion/ej2-angular-notifications';
import { AuthService } from '../../../core/services/auth.service';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';
// The New Bid page, from NewBid.razor, using a reactive form. The Department, Division and State
// lists are fixed, as in Blazor.
//
// CreatedBy isn't set here. Blazor set it on the server from the signed-in user; see the note at
// the top of bid.service.ts.
@Component({
  selector: 'app-new-bid',
  standalone: true,
  imports: [PageHeaderComponent,   
    ReactiveFormsModule,
    ToastModule],
  templateUrl: './new-bid.component.html',
  styleUrl: './new-bid.component.scss',
})
export class NewBidComponent implements OnInit {
  @ViewChild('toast')
toast!: ToastComponent;
  private fb = inject(FormBuilder);
  private bidService = inject(BidService);
  private router = inject(Router);
  private authService = inject(AuthService);
  nextBidId: string | null = null;
  isSaving = false;
  errorMessage = '';
  successMessage = '';

  readonly departments = ['Drywall', 'Block/Concrete'];
  readonly divisions = ['Orlando', 'Naples', 'Jacksonville', 'Tampa', 'Texas'];
  // All 50 states plus DC. Blazor only had NC, SC and FL, which couldn't even hold Mike's test bid
  // in Dallas, TX (Mike Smith, 2026-09-16: "the states from blazor").
  readonly states = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL',
    'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME',
    'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH',
    'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI',
    'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  ];

  form = this.fb.nonNullable.group({
    department: [''],
    division: [''],
    bidName: ['', Validators.required],
    address1: [''],
    city: [''],
    state: [''],
    zipCode: [''],
  });
constructor(
  private cdr: ChangeDetectorRef,

  ) {}
  ngOnInit(): void {
    const userEmail = this.authService.getLoggedInUserEmail();

  console.log('Logged-in user:', userEmail);

  if (!userEmail) {
    console.warn('No logged-in MSAL account found.');
    return;
  }
    this.loadNextBidId();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.show({
  title: 'Warning',
  content: 'Please fill all required fields.',
  cssClass: 'e-toast-warning',
   icon: 'e-warning toast-icons' 
});
      
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const request: CreateBidRequest = {
      bidId: this.nextBidId ?? undefined,
      createdBy:this.authService.getLoggedInUserEmail() ?? undefined,
      ...this.form.getRawValue(),
    };

    this.bidService.createNewBid(request).subscribe((success) => {
      this.isSaving = false;
      if (success) {
              this.toast.show({
  title: 'Success',
  content: 'Bid created successfully.',
  cssClass: 'e-toast-success',
   icon: 'fa fa-check-circle' 
});
       // this.successMessage = 'Bid created successfully.';
        setTimeout(() => this.router.navigateByUrl('/bids/current-bids'), 1500);
      } else {
          this.toast.show({
  title: 'Warning',
  content: 'Unable to create Bid.',
  cssClass: 'e-toast-warning',
   icon: 'e-warning toast-icons' 
});
       // this.errorMessage = 'Unable to create Bid.';
      }
    });
  }

  cancel(): void {
    this.form.reset({ department: '', division: '', bidName: '', address1: '', city: '', state: '', zipCode: '' });
    this.loadNextBidId();
    this.cdr.detectChanges();
  }

  private loadNextBidId(): void {
      const userEmail = this.authService.getLoggedInUserEmail();
    // Blazor passed the signed-in user as createdBy (see the note at the top).
    //this.bidService.getNextDisplayBidId(userEmail).subscribe((id) => (this.nextBidId = id));
    this.bidService.getNextDisplayBidId(this.authService.getLoggedInUserEmail() ?? '')
  .subscribe(displayBidID => {

    console.log('Received Display Bid ID:', displayBidID);

    this.nextBidId = displayBidID;

    this.cdr.detectChanges();
  });
  }
  public position = {
  X: 'Center',
  Y: 'Top'
};

}
