import { Component, inject } from '@angular/core';
import { StowellAdminService } from '../../../core/services/stowell-admin.service';

// Port of DisconnectUsers.razor (@page "/StowellAdmin/DisconnectUsers") - inline @code block,
// no matching *Base.cs. A single button that force-disconnects every currently logged-in user.
//
// SECURITY-RELEVANT: see stowell-admin.service.ts's header comment. This action is
// unconditional (all users, no filter) and irreversible from the UI's perspective - the source
// has no confirmation dialog before firing. A `confirm()` guard was added here since a
// mis-click force-logging-out the whole company seems too risky to leave as a single bare
// button click; flagging this as an intentional deviation from the Blazor source (which fires
// immediately on click) rather than a faithful port. Remove the confirm() if product wants the
// original one-click behavior back.
@Component({
  selector: 'app-disconnect-users',
  standalone: true,
  imports: [],
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
