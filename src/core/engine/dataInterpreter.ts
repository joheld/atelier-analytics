import * as XLSX from 'xlsx';

export interface DataInterpreterResult {
  hasMessyLayout: boolean;
  headerRowIndex: number;
  footerStartIndex: number;
  skippedHeaderRows: number;
  skippedFooterRows: number;
  report: string;
  cleanCsv: string;
  rawCsv: string;
}

/**
 * Summary / footer keywords commonly found in human-edited Excel workbooks
 */
const SUMMARY_KEYWORDS_REGEX =
  /^(total|grand\s*total|totales|subtotal|resumen|promedio|media|average|sum|\*|nota|notas?|fuente:|source:)/i;

/**
 * Analyzes an Excel worksheet using Tableau-style Data Interpreter heuristics.
 * Detects and skips metadata/title rows at the top, trims trailing total/subtotal rows,
 * and formats clean headers to prevent aggregation anomalies.
 */
export function analyzeAndCleanSheet(worksheet: XLSX.WorkSheet): DataInterpreterResult {
  const rawCsv = XLSX.utils.sheet_to_csv(worksheet, { rawNumbers: true, blankrows: false });
  const raw2D = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: null });

  if (raw2D.length <= 1) {
    return {
      hasMessyLayout: false,
      headerRowIndex: 0,
      footerStartIndex: raw2D.length,
      skippedHeaderRows: 0,
      skippedFooterRows: 0,
      report: 'La hoja de cálculo contiene una única fila o está vacía.',
      cleanCsv: rawCsv,
      rawCsv,
    };
  }

  // 1. Detect Header Row
  let headerRowIndex = 0;
  const maxHeaderSearch = Math.min(25, raw2D.length - 1);

  for (let r = 0; r <= maxHeaderSearch; r++) {
    const row = raw2D[r];
    if (!row || !Array.isArray(row)) continue;

    const nonNullCells = row.filter(
      (c) => c !== null && c !== undefined && String(c).trim() !== ''
    );

    // If row has at least 2 non-empty cells
    if (nonNullCells.length >= 2) {
      // Check if subsequent row exists and has at least some populated cells
      const nextRow = raw2D[r + 1];
      const nextNonNullCount =
        nextRow && Array.isArray(nextRow)
          ? nextRow.filter((c) => c !== null && c !== undefined && String(c).trim() !== '').length
          : 0;

      // If this row has multiple cells and next row has data, this is our table header!
      if (nextNonNullCount >= 1) {
        headerRowIndex = r;
        break;
      }
    }
  }

  // 2. Detect Footer / Summary Rows (e.g. Total General, Subtotales, Notas)
  let footerStartIndex = raw2D.length;
  for (let r = raw2D.length - 1; r > headerRowIndex; r--) {
    const row = raw2D[r];
    if (!row || !Array.isArray(row)) {
      footerStartIndex = r;
      continue;
    }

    const firstNonEmpty = row.find(
      (c) => c !== null && c !== undefined && String(c).trim() !== ''
    );

    if (!firstNonEmpty) {
      footerStartIndex = r;
      continue;
    }

    const firstStr = String(firstNonEmpty).trim();
    if (SUMMARY_KEYWORDS_REGEX.test(firstStr)) {
      footerStartIndex = r;
    } else {
      // Stop walking upwards as soon as we hit standard tabular data
      break;
    }
  }

  const skippedHeaderRows = headerRowIndex;
  const skippedFooterRows = raw2D.length - footerStartIndex;
  const hasMessyLayout = skippedHeaderRows > 0 || skippedFooterRows > 0;

  // 3. Extract and normalize header columns
  const rawHeaders = raw2D[headerRowIndex] || [];
  const cleanHeaders: string[] = [];
  const seenHeaderCounts = new Map<string, number>();

  for (let c = 0; c < rawHeaders.length; c++) {
    let headerName = String(rawHeaders[c] || '').trim();
    if (!headerName) {
      headerName = `Columna_${c + 1}`;
    }

    const count = seenHeaderCounts.get(headerName) || 0;
    if (count > 0) {
      cleanHeaders.push(`${headerName}_${count}`);
    } else {
      cleanHeaders.push(headerName);
    }
    seenHeaderCounts.set(headerName, count + 1);
  }

  // 4. Construct clean rows slice
  const cleanDataRows = raw2D.slice(headerRowIndex + 1, footerStartIndex);
  // Filter out any intermediate blank rows
  const filteredDataRows = cleanDataRows.filter((r) => {
    if (!r || !Array.isArray(r)) return false;
    return r.some((c) => c !== null && c !== undefined && String(c).trim() !== '');
  });

  const clean2D = [cleanHeaders, ...filteredDataRows];
  const cleanSheet = XLSX.utils.aoa_to_sheet(clean2D);
  const cleanCsv = XLSX.utils.sheet_to_csv(cleanSheet, { rawNumbers: true, blankrows: false });

  // 5. Generate human-readable report
  let report = 'La estructura de la hoja es tabular y limpia desde la primera fila.';
  if (hasMessyLayout) {
    const parts: string[] = [];
    if (skippedHeaderRows > 0) {
      parts.push(
        `encabezados detectados en la fila ${headerRowIndex + 1} (se omitieron ${skippedHeaderRows} filas de títulos o notas superiores)`
      );
    }
    if (skippedFooterRows > 0) {
      parts.push(
        `se recortaron ${skippedFooterRows} filas de subtotales o resúmenes al pie para evitar duplicación de agregaciones`
      );
    }
    report = `El Intérprete de datos limpió la hoja: ${parts.join(' y ')}.`;
  }

  return {
    hasMessyLayout,
    headerRowIndex,
    footerStartIndex,
    skippedHeaderRows,
    skippedFooterRows,
    report,
    cleanCsv,
    rawCsv,
  };
}
