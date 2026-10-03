import { Component, inject } from '@angular/core';
import { StowellAdminService } from '../../../core/services/stowell-admin.service';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';

// Disconnect Users (/StowellAdmin/DisconnectUsers in Blazor): one button that signs out everyone who
// is logged in.
//
// Security (see stowell-admin.service.ts): it affects all users and can't be undone from here. Blazor
// did it on one click. This adds a confirm() first, because one mis-click would sign out the whole
// company. Remove it if you want the original one-click behaviour.
@Component({
  selector: 'app-disconnect-users',
  standalone: true,
  imports: [PageHeaderComponent, ],
  templateUrl: './disconnect-users.component.html',
  styleUrl: './disconnect-users.component.scss',
})
export class DisconnectUsersComponent {
  private stowellAdminService = inject(StowellAdminService);

  isLoading = false;
  errorMessage = '';
  successMessage = '';

  onDisconnectAllUsers(): void {
    if (!confirm('This will disconnect ALL currently logged-in users. Continue?')) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.stowellAdminService.processDisconnectUsers().subscribe((success) => {
      this.isLoading = false;
      if (success) {
        this.successMessage = 'All users have been disconnected successfully.';
      } else {
        this.errorMessage = 'Failed to disconnect users.';
      }
    });
  }
}
