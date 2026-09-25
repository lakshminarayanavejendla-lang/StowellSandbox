import { Component } from '@angular/core';

@Component({
  selector: 'app-logged-out',
  standalone: true,
  template: `
    <div class="container text-center mt-5" style="text-align:center; margin-top:3rem;">
      <h2>Thank you!</h2>
      <p>You have been successfully logged out.</p>
      <a class="btn btn-primary mt-3" href="/">Login Again</a>
    </div>
  `,
})
export class LoggedOutComponent {}
