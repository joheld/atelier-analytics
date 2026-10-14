import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { analyzeAndCleanSheet } from './dataInterpreter';

describe('Tableau Data Interpreter (Excel Sheet Cleaning & Profiling)', () => {
  it('detects and cleans messy real-world Excel sheet with title rows, metadata, and totals', () => {
    // Human-style messy Excel spreadsheet
    const messyRows = [
      ['ACME GLOBAL CORPORATION - REPORTE DE VENTAS'],
      ['Generado el 15 de marzo de 2024 • Confidencial'],
      [],
      ['ID Pedido', 'Cliente', 'Region', 'Ventas', 'Margen'],
      ['ORD-101', 'TechCorp', 'Norte', 14500.5, 3200.0],
      ['ORD-102', 'BioHealth', 'Sur', 8900.0, 1850.5],
      ['ORD-103', 'EduSystem', 'Centro', 21300.0, 6100.0],
      ['Total General', null, null, 44700.5, 11150.5],
      ['* Cifras expresadas en dólares estadounidenses. Datos sujetos a auditoría.'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(messyRows);
    const result = analyzeAndCleanSheet(ws);

    expect(result.hasMessyLayout).toBe(true);
    expect(result.headerRowIndex).toBe(3); // Headers start at row 4 (index 3)
    expect(result.skippedHeaderRows).toBe(3); // 3 metadata/title rows skipped
    expect(result.skippedFooterRows).toBe(2); // 'Total General' and note footer trimmed
    expect(result.report).toContain('encabezados detectados en la fila 4');
    expect(result.report).toContain('se omitieron 3 filas de títulos');
    expect(result.report).toContain('se recortaron 2 filas de subtotales');

    // Clean CSV must have headers and data rows, without title and without total
    expect(result.cleanCsv).toContain('ID Pedido,Cliente,Region,Ventas,Margen');
    expect(result.cleanCsv).toContain('ORD-101,TechCorp,Norte,14500.5,3200');
    expect(result.cleanCsv).toContain('ORD-103,EduSystem,Centro,21300,6100');
    expect(result.cleanCsv).not.toContain('ACME GLOBAL CORPORATION');
    expect(result.cleanCsv).not.toContain('Total General');
    expect(result.cleanCsv).not.toContain('Cifras expresadas en dólares');
  });

  it('preserves already clean tabular sheets without modifying clean headers', () => {
    const cleanRows = [
      ['Producto', 'Categoria', 'Precio'],
      ['Silla', 'Muebles', 150],
      ['Mesa', 'Muebles', 350],
    ];

    const ws = XLSX.utils.aoa_to_sheet(cleanRows);
    const result = analyzeAndCleanSheet(ws);

    expect(result.hasMessyLayout).toBe(false);
    expect(result.headerRowIndex).toBe(0);
    expect(result.skippedHeaderRows).toBe(0);
    expect(result.skippedFooterRows).toBe(0);
    expect(result.cleanCsv).toContain('Producto,Categoria,Precio');
    expect(result.cleanCsv).toContain('Silla,Muebles,150');
  });

  it('handles empty header cells by synthesizing clean names and deduplicating', () => {
    const rowsWithGaps = [
      ['TITULO INFORME'],
      ['ID', '', 'Venta', 'Venta'],
      [1, 'Valor', 100, 200],
    ];

    const ws = XLSX.utils.aoa_to_sheet(rowsWithGaps);
    const result = analyzeAndCleanSheet(ws);

    expect(result.hasMessyLayout).toBe(true);
    expect(result.cleanCsv).toContain('Columna_2,Venta,Venta_1');
  });
});
