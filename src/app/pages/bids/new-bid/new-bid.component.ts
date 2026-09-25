import { Component, OnInit, inject,ChangeDetectorRef,ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { BidService } from '../../../core/services/bid.service';
import { CreateBidRequest } from '../../../core/models/bids/create-bid-request.model';
import { ToastModule, ToastComponent } from '@syncfusion/ej2-angular-notifications';
import { AuthService } from '../../../core/services/auth.service';
// Port of NewBid.razor/NewBidBase.cs. Reactive Forms replace Blazor's <EditForm>+@bind; the
// hardcoded Department/Division/State option lists are ported as-is from the source (no
// dedicated lookup endpoints were used there either).
//
// CreatedBy is left unset here - the Blazor version set it server-side via
// BidService.CreateNewBid -> GetUserEmail(); see BidService's header comment for the
// MSAL-identity open question carried over from Phase 1's JobService/CurrentJobsComponent.
@Component({
  selector: 'app-new-bid',
  standalone: true,
  imports: [  
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
  // FIX (2026-09-16, Mike Smith - "the states from blazor") - the Blazor source only ever
  // hardcoded NC/SC/FL here too (confirmed in NewBid.razor), but that's clearly incomplete for a
  // real US-wide bid form - it couldn't even represent his own test bid ("Texas BBQ House",
  // Dallas, TX). Expanded to the full 50 states + DC.
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
    debugger;
      const userEmail = this.authService.getLoggedInUserEmail();
    // The Blazor original passes GetUserEmail() as createdBy - see the class-level auth note.
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
