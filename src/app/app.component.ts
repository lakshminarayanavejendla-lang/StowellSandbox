import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PageTitleService } from './core/services/page-title.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`,
})
export class AppComponent implements OnInit {
  // Sets the browser tab title on each page (see PageTitleService).
  private pageTitleService = inject(PageTitleService);

  ngOnInit(): void {
    this.pageTitleService.init();
  }
}
