import { GridComponent } from '@syncfusion/ej2-angular-grids';

/**
 * FIX - shared export helpers for the Reporting Dashboard module. Every report page had
 * "Export PDF"/"Export Excel" buttons statically `disabled` with a title claiming they need "a
 * client-side PDF/XLSX library" (see e.g. job-summary-report.component.ts's old comment) - that
 * was never true: @syncfusion/ej2-angular-grids (already a dependency of every report's
 * ejs-grid) ships PdfExportService/ExcelExportService that export the grid's current data
 * natively, no extra package needed. job-summary-report.component.ts already proved this works;
 * this file generalizes that pattern so all 9 report pages share one implementation instead of
 * copy-pasting it.
 *
 * PDF/Excel: call the Syncfusion grid's own pdfExport()/excelExport() - each report component
 * still needs `providers: [PdfExportService, ExcelExportService, ...]`, a `#grid` template ref +
 * `@ViewChild` on its `<ejs-grid>`, and `[allowPdfExport]="true" [allowExcelExport]="true"` on
 * that grid (Syncfusion requires the property set even for a programmatic, non-toolbar export
 * call).
 *
 * Word: there's no Syncfusion grid-to-Word export, and pulling in a full document-authoring
 * library (e.g. this project's own @syncfusion/ej2-angular-documenteditor, which is a heavy
 * WYSIWYG editor component meant for the separate Document Management module, not a
 * headless table export) would be a large, inconsistent addition just for this. Instead this
 * uses the standard "HTML-in-a-.doc" technique: a Blob typed `application/msword` containing an
 * HTML table with the MS-Office XML namespace hints Word expects - the same dependency-free,
 * plain-Blob approach every report's existing exportCsv() already uses, just producing a table
 * Word can open instead of a text file. It's a real, widely-used technique (not a hack unique to
 * this codebase), though the output is HTML-as-.doc rather than genuine OOXML .docx - Word opens
 * it correctly, but other tools reading raw .docx internals would not.
 */

export function exportGridPdf(grid: GridComponent | undefined, fileName: string): void {
  if (!grid) return;
  grid.pdfExport({ fileName });
}

export function exportGridExcel(grid: GridComponent | undefined, fileName: string): void {
  if (!grid) return;
  grid.excelExport({ fileName });
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Builds a Word-openable .doc from a header row + data rows - the same shape every report's
 * exportCsv() already builds its CSV from, so callers can reuse their existing header/row
 * mapping arrays verbatim.
 */
export function exportWordTable(title: string, headers: string[], rows: (string | number | null | undefined)[][], fileName: string): void {
  const theadHtml = `<tr>${headers
    .map((h) => `<th style="background:#00355f;color:#ffffff;padding:6px 10px;text-align:left;border:1px solid #dcdcdc;">${escapeHtml(h)}</th>`)
    .join('')}</tr>`;

  const bodyHtml = rows
    .map(
      (row) =>
        `<tr>${row.map((v) => `<td style="padding:6px 10px;border:1px solid #dcdcdc;">${escapeHtml(v)}</td>`).join('')}</tr>`
    )
    .join('');

  const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset='utf-8'>
<title>${escapeHtml(title)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
</head>
<body>
<h2 style="font-family:Arial, sans-serif;color:#00355f;">${escapeHtml(title)}</h2>
<table style="border-collapse:collapse;width:100%;font-family:Arial, sans-serif;font-size:10pt;">${theadHtml}${bodyHtml}</table>
</body>
</html>`;

  downloadBlob(new Blob(['﻿', html], { type: 'application/msword' }), fileName);
}
