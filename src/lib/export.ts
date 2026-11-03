/* ============================================================================
 * Export helpers.
 *  - exportToCsv    : real .csv download built client-side (no dependency)
 *  - exportToExcel  : SpreadsheetML 2003 (.xls) — opens directly in Excel
 *  - downloadText    : plain text / markdown downloads
 *  - printSection    : "Download PDF" via the browser print pipeline
 * ==========================================================================*/

export interface ExportColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

function escapeXml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeCsv(value: unknown): string {
  const s = String(value ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const stamp = (): string => new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

export function exportToCsv<T>(filename: string, rows: T[], columns: ExportColumn<T>[]): void {
  const header = columns.map((c) => escapeCsv(c.header)).join(',');
  const body = rows.map((row) => columns.map((c) => escapeCsv(c.value(row))).join(','));
  // BOM keeps Excel happy with UTF-8 content.
  const csv = `\uFEFF${[header, ...body].join('\r\n')}`;
  triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${filename}-${stamp()}.csv`);
}

export function exportToExcel<T>(filename: string, sheetName: string, rows: T[], columns: ExportColumn<T>[]): void {
  const head = columns
    .map((c) => `<Cell><Data ss:Type="String">${escapeXml(c.header)}</Data></Cell>`)
    .join('');
  const body = rows
    .map(
      (row) =>
        `<Row>${columns
          .map((c) => {
            const v = c.value(row);
            const type = typeof v === 'number' && Number.isFinite(v) ? 'Number' : 'String';
            return `<Cell><Data ss:Type="${type}">${escapeXml(v)}</Data></Cell>`;
          })
          .join('')}</Row>`,
    )
    .join('');

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
          xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
    <Title>${escapeXml(filename)}</Title>
    <Author>EHS Command Centre (Demo Data)</Author>
  </DocumentProperties>
  <Worksheet ss:Name="${escapeXml(sheetName.slice(0, 31))}">
    <Table>
      <Row>${head}</Row>
      ${body}
    </Table>
    <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
      <FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal>
      <TopRowBottomPane>1</TopRowBottomPane>
    </WorksheetOptions>
  </Worksheet>
</Workbook>`;

  triggerDownload(
    new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' }),
    `${filename}-${stamp()}.xls`,
  );
}

export function downloadText(filename: string, content: string, mime = 'text/plain;charset=utf-8;'): void {
  triggerDownload(new Blob([content], { type: mime }), `${filename}-${stamp()}.txt`);
}

/** Browser print dialog — the "Download PDF" button for the prototype. */
export function printDocument(title: string): void {
  const previous = document.title;
  document.title = title;
  window.print();
  setTimeout(() => {
    document.title = previous;
  }, 800);
}

export function downloadJson(filename: string, data: unknown): void {
  triggerDownload(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' }),
    `${filename}-${stamp()}.json`,
  );
}
