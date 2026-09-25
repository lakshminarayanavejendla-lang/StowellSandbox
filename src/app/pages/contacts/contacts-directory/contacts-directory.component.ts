import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ContactService } from '../../../core/services/contact.service';
import { ContactGroup, ContactGroupMember } from '../../../core/models/contacts/contact-group.model';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';

/**
 * Port of Contacts/Index.razor + IndexBase.razor.cs (@page "/Contacts") - restored to the
 * original group-tabs directory (previously narrowed to a flat all-users list, see git history).
 *
 * Groups are fetched up front (cheap - just id/displayName), but a group's MEMBERS are only
 * fetched when its tab is selected, one group at a time. This avoids the original Blazor page's
 * performance problem (eagerly loading every group's members - each member needs two sequential
 * Graph calls for profile + photo - across all ~280 groups at once); lazy, per-group loading
 * keeps that same per-member cost but pays it for one group at a time instead of all of them.
 *
 * CONFIRMED against IndexBase.razor.cs: GetAllGroups() returns every Azure AD group in the
 * tenant (~280), and the source filters that down to this exact hardcoded whitelist of 11
 * "contact directory" groups (Accounting, BlockConcrete, Executive, HR, PM-*, Security Team,
 * Stowell Team) before rendering tabs. Reproduced verbatim rather than guessed at.
 */
const CONTACT_GROUP_IDS = [
  '00c89364-0f28-402e-a905-3080af09b97b',
  '3e93348e-a38a-4fff-b4f4-7fc5d7b59d2e',
  '9b10cfc1-1de4-47a5-ba0c-6e11fa60493f',
  'a539add2-52ab-4545-acb6-5d23c703403f',
  '0a6836b5-aa1f-4c7e-b1e9-77be7b5a85d1',
  '3d76dbfb-27c8-4c95-836e-e5caed001a0b',
  'b222364a-0ca8-4415-ac9e-36ba0bfcabe1',
  '1446eb90-6189-47cf-b242-b6f84f9f1d56',
  'e322ddc9-e2d3-468f-bbd2-c7a4bb86908b',
  '4220517b-c129-4baa-8a4c-7c408a44414d',
  '21e5091d-cb71-4bdb-8d63-f98d8bce3017',
];

@Component({
  selector: 'app-contacts-directory',
  standalone: true,
  imports: [PageHeaderComponent],
  templateUrl: './contacts-directory.component.html',
  styleUrl: './contacts-directory.component.scss',
})
export class ContactsDirectoryComponent implements OnInit {
  private contactService = inject(ContactService);
  private cdr = inject(ChangeDetectorRef);

  groups: ContactGroup[] = [];
  groupsLoaded = false;

  selectedGroup: ContactGroup | null = null;
  groupMembers: ContactGroupMember[] = [];
  membersLoaded = false;

  ngOnInit(): void {
    this.contactService.getAllGroups().subscribe((groups) => {
      this.groups = groups.filter((g) => CONTACT_GROUP_IDS.includes(g.id));
      this.groupsLoaded = true;
      if (this.groups.length > 0) {
        this.selectGroup(this.groups[0]);
      }
      this.cdr.detectChanges();
    });
  }

  selectGroup(group: ContactGroup): void {
    if (this.selectedGroup?.id === group.id) return;
    this.selectedGroup = group;
    this.membersLoaded = false;
    this.groupMembers = [];
    this.contactService.getGroupUsers(group.id).subscribe((members) => {
      this.groupMembers = members;
      this.membersLoaded = true;
      this.cdr.detectChanges();
    });
  }

  avatarSrc(member: ContactGroupMember): string {
    return member.photoBase64
      ? `data:image/jpeg;base64,${member.photoBase64}`
      : '/assets/img/demo/avatars/icon-dummy-user.png';
  }

  hasCityStateZip(member: ContactGroupMember): boolean {
    return !!(member.city || member.state || member.postalCode);
  }
}
