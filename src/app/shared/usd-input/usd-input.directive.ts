import { Directive, ElementRef, Input, OnChanges, booleanAttribute, forwardRef, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * NEW (2026-09-23, Mike Smith - Change Order Budget Allocation: "All $ fields need to be formatted
 * for $US"). Browsers can't show "$1,500,000.00" in a type="number" input, so this puts a plain text
 * input into US-dollar display format ("$1,234.50") while still giving ngModel/formControl a clean
 * number (or null when empty).
 *
 *   - Not focused: shows the formatted value, e.g. $1,234.50.
 *   - Focused: shows the plain number (1234.5) so it's easy to edit.
 *   - Typing: "$" and "," are ignored; anything that isn't a number leaves the model unchanged.
 *
 * Usage: <input type="text" appUsdInput [(ngModel)]="amount" />
 *
 * Debit style (2026-09-23, Mike Smith - "format the debit column to be -($0.00) in red font"): add
 * the `usdDebit` attribute and the field displays its value as -($1,234.00) in red when not focused
 * (an empty field stays empty). Display only - the underlying model value stays the positive number
 * the user typed, so nothing downstream (Budget Change Total, submit payload) changes.
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
    // Rule (Mike Smith, 2026-09-23): a MINUS amount is red; 0 or more is normal. In Debit style the
    // typed (positive) value is shown as a negative, -($1,234.00), so a debit of $0 stays $0.00 normal.
    const shown = this.usdDebit ? -this.value : this.value;
    input.value = shown < 0 ? (this.usdDebit ? `-(${money})` : `-${money}`) : money;
    input.style.color = shown < 0 ? '#c0392b' : '';
  }

  ngOnChanges(): void {
    // The usdDebit attribute can arrive after the first writeValue - re-render so it takes effect.
    this.render();
  }
}
