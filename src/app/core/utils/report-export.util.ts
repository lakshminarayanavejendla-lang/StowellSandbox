import { GridComponent } from '@syncfusion/ej2-angular-grids';

/**
 * Export helpers shared by the report pages.
 *
 * PDF and Excel use the Syncfusion grid's own pdfExport() and excelExport(), which the grid package
 * already includes. Each report still needs PdfExportService and ExcelExportService in its
 * providers, a #grid reference with @ViewChild, and [allowPdfExport] / [allowExcelExport] set to
 * true on the grid. Syncfusion wants those set even when the export is called from code.
 *
 * Word has no grid export, and the document editor package is far too heavy for a table. So this
 * saves an HTML table as an application/msword file, the same plain-Blob approach exportCsv() uses.
 * Word opens it fine, but it's HTML in a .doc, not a real .docx.
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
 * Builds a .doc Word can open from a header row and data rows, the same arrays exportCsv() uses.
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
