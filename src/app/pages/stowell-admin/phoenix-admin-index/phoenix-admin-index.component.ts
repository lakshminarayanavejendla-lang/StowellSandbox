import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';

// The Phoenix Admin landing page (/StowellAdmin in Blazor). It's just static tiles with no data:
// Invoice Upload, Project Access Management (AdminPanel) and Sage Session Disconnect
// (DisconnectUsers), all linking to this module's routes.
//
// Not ported: two Bootstrap popups (#invoiceUpload, #projectAccessMgmt) with made-up rows such as
// "Employee 1" and jobs 10123 to 10132, plus a jQuery chevron script. No tile opened them, so they
// look like leftover demo markup. Check before building a real Invoice Upload or resources feature.
@Component({
  selector: 'app-phoenix-admin-index',
  standalone: true,
  imports: [PageHeaderComponent, RouterLink],
  templateUrl: './phoenix-admin-index.component.html',
  styleUrl: './phoenix-admin-index.component.scss',
})
export class PhoenixAdminIndexComponent {}
