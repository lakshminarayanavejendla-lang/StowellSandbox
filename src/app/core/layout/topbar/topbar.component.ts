import { Component, ElementRef, HostListener, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { JobService } from '../../services/job.service';
import { PoQueueService } from '../../services/po-queue.service';
import { CoQueueService } from '../../services/co-queue.service';
import { DensityService } from '../../../shared/responsive/density.service';
import { QuickShortcutComponent } from '../../../layout/quick-shortcut/quick-shortcut.component';
import { ThemeService } from '../theme.service';

interface SearchHit {
  type: 'Job' | 'PO' | 'CO';
  label: string;
  sub: string;
  route: string[];
}

interface Notice {
  title: string;
  sub: string;
  route: string;
}

/**
 * Top bar (Portal Responsive Display Standard): menu button (below 1024px, or always while the sidebar auto-hides), search, then the global
 * actions (quick shortcuts, density, Copilot, document management, password, support, notifications, theme, logout, app launcher). Below
 * 768px the secondary actions (`.hide-sm`) are hidden and only the essentials stay. The shell decides what the menu / launcher buttons do
 * (see `menuToggle` / `launcherToggle`).
 *
 * Search looks through the user's current jobs and the active purchase / change orders (Ctrl K focuses it); the bell lists what is
 * waiting in the PO and CO queues. Both load their data the first time they are used.
 */
@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [QuickShortcutComponent],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
})
export class TopbarComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private jobService = inject(JobService);
  private poQueue = inject(PoQueueService);
  private coQueue = inject(CoQueueService);
  private host = inject(ElementRef<HTMLElement>);

  /** Screen density: comfortable, standard or compact (see shared/responsive/density.service.ts). */
  readonly density = inject(DensityService);
  readonly themeService = inject(ThemeService);

  /** Show the menu button at every width while the sidebar auto-hides; otherwise only below 1024px. */
  readonly showMenu = input(false);
  /** The menu (hamburger) button. Opens and closes the navigation drawer. */
  readonly menuToggle = output<void>();
  /** The app launcher button. Shows and hides the app column on the right. */
  readonly launcherToggle = output<void>();

  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  readonly query = signal('');
  readonly searchOpen = signal(false);
  readonly notifOpen = signal(false);
  readonly activeHit = signal(0);

  private readonly hits$ = signal<SearchHit[]>([]);
  private readonly notices$ = signal<Notice[]>([]);
  private loaded = false;

  readonly results = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return [];
    return this.hits$()
      .filter((h) => `${h.label} ${h.sub}`.toLowerCase().includes(q))
      .slice(0, 8);
  });

  readonly notices = this.notices$.asReadonly();

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      this.searchInput()?.nativeElement.focus();
    } else if (e.key === 'Escape') {
      this.searchOpen.set(false);
      this.notifOpen.set(false);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    const target = e.target as Node;
    if (!(this.host.nativeElement as HTMLElement).querySelector('.search-wrap')?.contains(target)) this.searchOpen.set(false);
    if (!(this.host.nativeElement as HTMLElement).querySelector('.notif-wrap')?.contains(target)) this.notifOpen.set(false);
  }

  onSearchInput(value: string): void {
    this.load();
    this.query.set(value);
    this.activeHit.set(0);
    this.searchOpen.set(!!value.trim());
  }

  onSearchKey(e: KeyboardEvent): void {
    const n = this.results().length;
    if (!n) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      this.activeHit.set((this.activeHit() + (e.key === 'ArrowDown' ? 1 : -1) + n) % n);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      this.open(this.results()[this.activeHit()]);
    }
  }

  open(hit: SearchHit): void {
    this.searchOpen.set(false);
    this.query.set('');
    const input = this.searchInput()?.nativeElement;
    if (input) input.value = '';
    this.router.navigate(hit.route);
  }

  toggleNotifications(): void {
    this.load();
    this.notifOpen.set(!this.notifOpen());
  }

  goTo(route: string): void {
    this.notifOpen.set(false);
    this.router.navigateByUrl(route);
  }

  /** Loads the search data once, the first time search or the bell is used. */
  private load(): void {
    if (this.loaded) return;
    this.loaded = true;

    const email = this.authService.getLoggedInUserEmail();
    if (email) {
      this.jobService.getCurrentJobs(email).subscribe((jobs) => {
        const hits = jobs.map<SearchHit>((j) => ({ type: 'Job', label: `${j.jobID} · ${j.jobName}`, sub: j.address ?? '', route: ['/project-management/project-overview', j.jobID] }));
        this.hits$.update((h) => [...h, ...hits]);
      });
    }

    this.poQueue.getPoQueueData().subscribe((d) => {
      const active = d?.activePOs ?? [];
      this.hits$.update((h) => [...h, ...active.map<SearchHit>((p) => ({ type: 'PO', label: `${p.masterJobPoId} · ${p.jobName}`, sub: p.poStatus, route: ['/project-management/po-queue'] }))]);
      if (active.length) this.notices$.update((n) => [...n, { title: `${active.length} active purchase orders`, sub: 'Open the PO queue', route: '/project-management/po-queue' }]);
    });

    this.coQueue.getCoQueueData().subscribe((d) => {
      const active = d?.activeCOs ?? [];
      this.hits$.update((h) => [...h, ...active.map<SearchHit>((c) => ({ type: 'CO', label: `${c.masterJobCoId} · ${c.jobName}`, sub: c.poStatus, route: ['/project-management/co-queue'] }))]);
      if (active.length) this.notices$.update((n) => [...n, { title: `${active.length} active change orders`, sub: 'Open the CO queue', route: '/project-management/co-queue' }]);
    });
  }

  logout(): void {
    this.authService.logout();
  }

  goToPasswordPage(): void {
    window.open('https://stowell.proserv360.tech/RDWeb/Pages/en-US/password.aspx', '_blank');
  }

  emailSupport(): void {
    window.location.href = 'mailto:support@proserv360.tech';
  }
}
