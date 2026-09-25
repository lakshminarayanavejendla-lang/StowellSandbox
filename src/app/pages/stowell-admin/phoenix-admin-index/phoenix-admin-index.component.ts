import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// Port of Components/Pages/StowellAdmin/Index.razor (@page "/StowellAdmin") - "Phoenix Admin"
// landing page, per NavMenu.razor's nav link of the same name. No matching *Base.cs; the source
// has only an empty `@code { }` block - this page is pure static markup, no data loading.
//
// Three tile links in the source: "Invoice Upload", "Project Access Management" (-> AdminPanel),
// "Sage Session Disconnect" (-> DisconnectUsers). Ported all three as router links to this
// module's own routes.
//
// NOT PORTED - two Bootstrap modals (#invoiceUpload, #projectAccessMgmt) with hardcoded fake
// rows ("Job Roles and Employees" table: Job 10123/10128/10130/10132, "Employee 1/2/3", etc.)
// and a jQuery-style chevron-toggle <script>. FLAG: neither modal is opened by any
// data-toggle="modal"/data-target attribute on the three visible tile links in the source - they
// appear to be dead/orphaned demo markup (both rendered with Bootstrap's "show" class, which
// would make them permanently visible rather than triggered), not wired to any service or real
// data. Treating this as leftover scaffolding rather than a real feature; flagging in case a real
// "Invoice Upload" or "Additional Resources" modal feature was intended and just never finished/
// wired up in the source - confirm before building UI against it.
@Component({
  selector: 'app-phoenix-admin-index',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './phoenix-admin-index.component.html',
  styleUrl: './phoenix-admin-index.component.scss',
})
export class PhoenixAdminIndexComponent {}
