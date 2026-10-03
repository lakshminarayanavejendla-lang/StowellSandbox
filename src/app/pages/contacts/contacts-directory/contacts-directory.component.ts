import { ChangeDetectorRef, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ContactService } from '../../../core/services/contact.service';
import { ContactGroup, ContactGroupMember } from '../../../core/models/contacts/contact-group.model';

/**
 * The Contacts page (/Contacts in Blazor): a directory with a chip for each group.
 *
 * The group list (just ids and names) loads first, and a group's members load only when it is opened
 * (Blazor loaded all ~280 groups' members at once). The service keeps what it has loaded, so going back
 * to a group is instant.
 *
 * As in IndexBase.razor.cs, GetAllGroups() returns every Azure AD group, and the page keeps only 11
 * directory groups (Accounting, BlockConcrete, Executive, HR, PM-*, Security Team, Stowell Team).
 * The list is copied exactly.
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

/** Soft background and text colours for the initials avatar, picked from the name so a person keeps theirs. */
const AVATAR_TONES = [
  ['#e8f0fc', '#2563c9'],
  ['#e3f6ec', '#14804a'],
  ['#fdeee2', '#c2570c'],
  ['#f0e8fb', '#6d3fc0'],
  ['#e1f4f7', '#12788a'],
  ['#fbe6ee', '#b8325f'],
];

@Component({
  selector: 'app-contacts-directory',
  standalone: true,
  templateUrl: './contacts-directory.component.html',
  styleUrl: './contacts-directory.component.scss',
})
export class ContactsDirectoryComponent implements OnInit {
  private contactService = inject(ContactService);
  private cdr = inject(ChangeDetectorRef);

  groups: ContactGroup[] = [];
  groupsLoaded = false;

  selectedGroup: ContactGroup | null = null;
  membersLoaded = false;
  /** A number of placeholder cards to show while members load. */
  readonly skeletons = [1, 2, 3, 4, 5, 6, 7, 8];

  readonly members = signal<ContactGroupMember[]>([]);
  readonly query = signal('');
  /** Photo URLs by user id, filled in as they arrive after the list has shown. */
  readonly photos = signal<Record<string, string>>({});
  /** The email that was just copied, to show a tick for a moment. */
  readonly copied = signal<string | null>(null);

  /** The members matching the search (name, title, email, phone or city). */
  readonly shown = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.members();
    return this.members().filter((m) => [m.displayName, m.jobTitle, m.mail, m.phone, m.city, m.state].some((v) => (v ?? '').toLowerCase().includes(q)));
  });

  ngOnInit(): void {
    this.contactService.getAllGroups().subscribe((groups) => {
      this.groups = groups.filter((g) => CONTACT_GROUP_IDS.includes(g.id)).sort((a, b) => a.displayName.localeCompare(b.displayName));
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
    this.members.set([]);
    this.query.set('');
    this.contactService.getGroupUsers(group.id).subscribe((members) => {
      // a slower reply for an earlier tab must not replace the one now open
      if (this.selectedGroup?.id !== group.id) return;
      this.members.set(members);
      this.membersLoaded = true;
      this.loadPhotos(members);
      this.cdr.detectChanges();
    });
  }

  photo(member: ContactGroupMember): string | null {
    return this.photos()[member.id] ?? null;
  }

  /** The list shows first; each photo fills in when it arrives. */
  private loadPhotos(members: ContactGroupMember[]): void {
    for (const m of members) {
      this.contactService.getPhoto(m.id).subscribe((url) => {
        if (url) this.photos.update((p) => ({ ...p, [m.id]: url }));
      });
    }
  }

  initials(member: ContactGroupMember): string {
    const parts = (member.displayName ?? '').split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }

  tone(member: ContactGroupMember): { background: string; color: string } {
    const name = member.displayName ?? '';
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    const [background, color] = AVATAR_TONES[h % AVATAR_TONES.length];
    return { background, color };
  }

  /** "Austin, TX 78701", from whichever parts exist. */
  place(member: ContactGroupMember): string {
    const region = [member.state, member.postalCode].filter(Boolean).join(' ');
    return [member.city, region].filter(Boolean).join(', ');
  }

  phoneHref(member: ContactGroupMember): string {
    return 'tel:' + (member.phone ?? '').replace(/[^\d+]/g, '');
  }

  copy(email: string): void {
    navigator.clipboard?.writeText(email).then(
      () => {
        this.copied.set(email);
        setTimeout(() => this.copied.set(null), 1500);
      },
      () => undefined
    );
  }
}
