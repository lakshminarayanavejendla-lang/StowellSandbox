import { Directive, ElementRef, Input, OnChanges, booleanAttribute, forwardRef, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Shows a text input as US dollars ("$1,234.50") while ngModel or formControl gets a plain number,
 * or null when it's empty. A type="number" input can't show "$1,500,000.00". Mike Smith asked for
 * this on Change Order Budget Allocation, 2026-09-23: "All $ fields need to be formatted for $US".
 *
 *   Not focused: the formatted value, such as $1,234.50.
 *   Focused: the plain number (1234.5), so it's easy to edit.
 *   Typing: "$" and "," are ignored, and anything that isn't a number leaves the value as it was.
 *
 * Usage: <input type="text" appUsdInput [(ngModel)]="amount" />
 *
 * Add `usdDebit` to show the value as -($1,234.00) in red when not focused (Mike Smith, 2026-09-23:
 * "format the debit column to be -($0.00) in red font"). An empty field stays empty. It only changes
 * the display: the value stays the positive number typed, so totals and the submitted data are the same.
 *
 *   <input type="text" appUsdInput usdDebit [(ngModel)]="line.debit" />
 */
@Directive({
  selector: 'input[appUsdInput]',
  standalone: true,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => UsdInputDirective), multi: true }],
  host: {
    inputmode: 'decimal',
    '(input)': 'onInput($any($event.target).value)',
    '(focus)': 'onFocus()',
    '(blur)': 'onBlur()',
  },
})
export class UsdInputDirective implements ControlValueAccessor, OnChanges {
  private el = inject<ElementRef<HTMLInputElement>>(ElementRef);

  /** Show as -($1,234.00) in red (see the header comment). Set by the `usdDebit` attribute. */
  @Input({ transform: booleanAttribute }) usdDebit = false;

  private value: number | null = null;
  private focused = false;
  private onChange: (v: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(v: number | string | null): void {
    const n = v === null || v === undefined || v === '' ? null : Number(v);
    this.value = n === null || isNaN(n) ? null : n;
    this.render();
  }

  registerOnChange(fn: (v: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.el.nativeElement.disabled = disabled;
  }

  onInput(text: string): void {
    const cleaned = text.replace(/[$,\s]/g, '');
    if (cleaned === '' || cleaned === '-') {
      this.value = null;
      this.onChange(null);
      return;
    }
    const n = Number(cleaned);
    if (isNaN(n)) return; // ignore junk; the next blur restores the last good value
    this.value = n;
    this.onChange(n);
  }

  onFocus(): void {
    this.focused = true;
    this.render();
    this.el.nativeElement.select();
  }

  onBlur(): void {
    this.focused = false;
    this.render();
    this.onTouched();
  }

  private render(): void {
    const input = this.el.nativeElement;
    if (this.value === null) {
      input.value = '';
      input.style.color = '';
      return;
    }
    const money = '$' + Math.abs(this.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (this.focused) {
      input.value = String(this.value);
      input.style.color = ''; // plain, normal-coloured number while editing
      return;
    }
    // A negative amount is red and 0 or more is normal (Mike Smith, 2026-09-23). In debit style the typed
    // positive value shows as negative, -($1,234.00), so a $0 debit stays a normal $0.00.
    const shown = this.usdDebit ? -this.value : this.value;
    input.value = shown < 0 ? (this.usdDebit ? `-(${money})` : `-${money}`) : money;
    input.style.color = shown < 0 ? '#c0392b' : '';
  }

  ngOnChanges(): void {
    // usdDebit can be set after the first writeValue, so render again to apply it.
    this.render();
  }
}
