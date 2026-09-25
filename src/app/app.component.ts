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
  // NEW - see PageTitleService's header comment: nothing was setting document.title on
  // navigation, so every page showed index.html's static "Stowell App" tab title.
  private pageTitleService = inject(PageTitleService);

  ngOnInit(): void {
    this.pageTitleService.init();
  }
}
