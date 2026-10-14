import JSZip from 'jszip';
import * as XLSX from 'xlsx';

export interface TableauCalculatedField {
  name: string;
  formula: string;
  role: 'dimension' | 'measure';
  dataType: 'string' | 'number' | 'date' | 'boolean';
}

export interface TableauExtractedTable {
  tableName: string;
  displayName: string;
  csv: string;
  rowCount?: number;
}

export interface TableauWorksheetInfo {
  name: string;
  columns: string[];
  rows: string[];
}

export interface TableauWorkbookMetadata {
  calculatedFields: TableauCalculatedField[];
  columnCaptions: Record<string, string>;
  worksheets: TableauWorksheetInfo[];
}

export interface TableauIngestionResult {
  tables: TableauExtractedTable[];
  metadata: TableauWorkbookMetadata;
}

/**
 * Parses Tableau XML workbook (.twb) or data source (.tds) definition
 * Extracts calculated fields, formulas, column captions, and worksheet shelves.
 */
export function parseTableauXml(xmlContent: string): TableauWorkbookMetadata {
  const calculatedFields: TableauCalculatedField[] = [];
  const columnCaptions: Record<string, string> = {};

  // Extract <column ...> tags with attributes and inner content
  const columnTagRegex = /<column\b([^>]*)>(.*?)<\/column>|<column\b([^>]*)\/>/gis;
  let match: RegExpExecArray | null;

  while ((match = columnTagRegex.exec(xmlContent)) !== null) {
    const attrsStr = match[1] || match[3] || '';
    const innerContent = match[2] || '';

    // Extract attributes
    const nameMatch = attrsStr.match(/\bname=['"]([^'"]+)['"]/i);
    const captionMatch = attrsStr.match(/\bcaption=['"]([^'"]+)['"]/i);
    const datatypeMatch = attrsStr.match(/\bdatatype=['"]([^'"]+)['"]/i);
    const roleMatch = attrsStr.match(/\brole=['"]([^'"]+)['"]/i);

    if (!nameMatch) continue;
    const rawName = nameMatch[1];
    const cleanName = rawName.replace(/^\[|\]$/g, '');
    const caption = captionMatch ? captionMatch[1] : cleanName;

    columnCaptions[cleanName] = caption;

    // Check for <calculation ... formula='...' />
    const calcMatch =
      innerContent.match(/<calculation\b[^>]*\bformula=['"]([^'"]+)['"]/i) ||
      attrsStr.match(/<calculation\b[^>]*\bformula=['"]([^'"]+)['"]/i);

    if (calcMatch) {
      const formula = calcMatch[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");

      let dataType: 'string' | 'number' | 'date' | 'boolean' = 'number';
      const dt = (datatypeMatch?.[1] || '').toLowerCase();
      if (dt.includes('str') || dt.includes('char')) dataType = 'string';
      else if (dt.includes('date') || dt.includes('time')) dataType = 'date';
      else if (dt.includes('bool')) dataType = 'boolean';

      const role: 'dimension' | 'measure' =
        (roleMatch?.[1] || '').toLowerCase() === 'dimension' ? 'dimension' : 'measure';

      calculatedFields.push({
        name: caption || cleanName,
        formula,
        role,
        dataType,
      });
    }
  }

  // Extract worksheets (<worksheet name='...'>)
  const worksheetRegex = /<worksheet\b[^>]*\bname=['"]([^'"]+)['"][^>]*>(.*?)<\/worksheet>/gis;
  const worksheets: TableauWorksheetInfo[] = [];

  while ((match = worksheetRegex.exec(xmlContent)) !== null) {
    const sheetName = match[1];
    const sheetContent = match[2];

    const colsMatch = sheetContent.match(/<cols>(.*?)<\/cols>/is);
    const rowsMatch = sheetContent.match(/<rows>(.*?)<\/rows>/is);

    const extractPillNames = (s: string) => {
      const pills: string[] = [];
      const pMatches = s.matchAll(/\[([^\]]+)\]/g);
      for (const m of pMatches) {
        if (!pills.includes(m[1])) pills.push(m[1]);
      }
      return pills;
    };

    worksheets.push({
      name: sheetName,
      columns: colsMatch ? extractPillNames(colsMatch[1]) : [],
      rows: rowsMatch ? extractPillNames(rowsMatch[1]) : [],
    });
  }

  return { calculatedFields, columnCaptions, worksheets };
}

/**
 * Parses a packaged Tableau file (.twbx or .tdsx) using JSZip
 * Unpacks embedded data files (CSV, TSV, Excel) and extracts workbook metadata.
 */
export async function parseTableauPackage(
  buffer: ArrayBuffer | Uint8Array,
  baseTableName: string,
  fileName: string
): Promise<TableauIngestionResult> {
  const zip = await JSZip.loadAsync(buffer);
  let metadata: TableauWorkbookMetadata = {
    calculatedFields: [],
    columnCaptions: {},
    worksheets: [],
  };

  const tables: TableauExtractedTable[] = [];

  // 1. Locate and parse .twb or .tds XML inside the package
  for (const [path, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue;
    const lower = path.toLowerCase();
    if (lower.endsWith('.twb') || lower.endsWith('.tds')) {
      const xmlText = await zipEntry.async('string');
      metadata = parseTableauXml(xmlText);
      break;
    }
  }

  // 2. Locate and extract embedded data files
  for (const [path, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue;
    const lower = path.toLowerCase();
    const entryName = path.split('/').pop() || path;
    const cleanEntryName = entryName
      .replace(/\.[^/.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_');

    if (lower.endsWith('.csv') || lower.endsWith('.txt')) {
      const text = await zipEntry.async('string');
      if (text.trim()) {
        const duckdbTableName = tables.length === 0 ? baseTableName : `${baseTableName}_${cleanEntryName}`;
        tables.push({
          tableName: duckdbTableName,
          displayName: `${fileName} [${entryName}]`,
          csv: text,
        });
      }
    } else if (lower.endsWith('.tsv')) {
      const text = await zipEntry.async('string');
      if (text.trim()) {
        // Normalize TSV to CSV
        const lines = text.split('\n');
        const csvLines = lines.map((l) =>
          l
            .split('\t')
            .map((val) => {
              const str = val.trim();
              if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
              }
              return str;
            })
            .join(',')
        );
        const duckdbTableName = tables.length === 0 ? baseTableName : `${baseTableName}_${cleanEntryName}`;
        tables.push({
          tableName: duckdbTableName,
          displayName: `${fileName} [${entryName}]`,
          csv: csvLines.join('\n'),
        });
      }
    } else if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
      const ab = await zipEntry.async('arraybuffer');
      const workbook = XLSX.read(ab, { type: 'array', cellDates: true });
      for (const sheetName of workbook.SheetNames) {
        const ws = workbook.Sheets[sheetName];
        if (!ws) continue;
        const csv = XLSX.utils.sheet_to_csv(ws);
        if (csv.trim()) {
          const cleanSheet = sheetName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
          const duckdbTableName = `${baseTableName}_${cleanSheet}`;
          tables.push({
            tableName: duckdbTableName,
            displayName: `${fileName} [${sheetName}]`,
            csv,
          });
        }
      }
    }
  }

  return { tables, metadata };
}
