import { describe, it, expect } from 'vitest';
import { compileFilter } from '../compiler/sqlCompiler';
import { FilterExpression } from '../ast/types';

describe('Tableau Data Source Filters & Data Prep Compilation', () => {
  it('compiles categorical Data Source Filters (IN and NOT IN) into clean SQL WHERE predicates', () => {
    const inFilter: FilterExpression = {
      id: 'ds_f1',
      columnName: 'Region',
      role: 'dimension',
      dataType: 'string',
      operator: 'in',
      values: ['Norte', 'Sur'],
    };

    const notInFilter: FilterExpression = {
      id: 'ds_f2',
      columnName: 'Status',
      role: 'dimension',
      dataType: 'string',
      operator: 'not_in',
      values: ['Cancelado', 'Rechazado'],
    };

    expect(compileFilter(inFilter)).toBe("Region IN ('Norte', 'Sur')");
    expect(compileFilter(notInFilter)).toBe("Status NOT IN ('Cancelado', 'Rechazado')");
  });

  it('compiles quantitative range Data Source Filters into bound predicates', () => {
    const rangeFilter: FilterExpression = {
      id: 'ds_f3',
      columnName: 'Ventas Totales',
      role: 'measure',
      dataType: 'number',
      operator: 'range',
      rangeMin: 100,
      rangeMax: 5000,
    };

    expect(compileFilter(rangeFilter)).toBe('"Ventas Totales" >= 100 AND "Ventas Totales" <= 5000');
  });

  it('compiles multiple Data Source Filters joined with AND into root view predicate', () => {
    const filters: FilterExpression[] = [
      {
        id: 'f1',
        columnName: 'Anio',
        role: 'dimension',
        dataType: 'number',
        operator: 'greater_than',
        values: [2021],
      },
      {
        id: 'f2',
        columnName: 'Pais',
        role: 'dimension',
        dataType: 'string',
        operator: 'equals',
        values: ['Mexico'],
      },
    ];

    const whereClauses = filters.map(f => compileFilter(f));
    const combined = whereClauses.join(' AND ');

    expect(combined).toBe("Anio > 2021 AND Pais = 'Mexico'");
  });

  it('builds robust multi-format SQL cast expressions for number, date and boolean', () => {
    const colName = 'Monto Total';
    const safeCol = colName.replace(/"/g, '""');

    // Number cast handles currency signs, thousand commas and spaces
    const numberCast = `COALESCE(
      TRY_CAST("${safeCol}" AS DOUBLE),
      TRY_CAST(REPLACE(REPLACE(REPLACE(REPLACE(CAST("${safeCol}" AS VARCHAR), '$', ''), '€', ''), ',', ''), ' ', '') AS DOUBLE)
    )`;
    expect(numberCast).toContain('TRY_CAST("Monto Total" AS DOUBLE)');
    expect(numberCast).toContain("REPLACE(REPLACE(REPLACE(REPLACE(CAST(\"Monto Total\" AS VARCHAR), '$', ''), '€', ''), ',', ''), ' ', '')");

    // Date cast handles ISO, Spanish DD/MM/YYYY and US MM/DD/YYYY formats
    const dateCast = `COALESCE(
      TRY_CAST("${safeCol}" AS DATE),
      TRY_STRPTIME(CAST("${safeCol}" AS VARCHAR), '%Y-%m-%d')::DATE,
      TRY_STRPTIME(CAST("${safeCol}" AS VARCHAR), '%d/%m/%Y')::DATE
    )`;
    expect(dateCast).toContain('%d/%m/%Y');

    // Boolean cast handles spanish and english true/false terms
    const boolCast = `COALESCE(
      TRY_CAST("${safeCol}" AS BOOLEAN),
      CASE
        WHEN LOWER(TRIM(CAST("${safeCol}" AS VARCHAR))) IN ('true', '1', 'si', 'sí', 'yes', 'verdadero', 't', 'y') THEN TRUE
        WHEN LOWER(TRIM(CAST("${safeCol}" AS VARCHAR))) IN ('false', '0', 'no', 'falso', 'f', 'n') THEN FALSE
        ELSE NULL
      END
    )`;
    expect(boolCast).toContain("'sí'");
    expect(boolCast).toContain("'verdadero'");
  });

  it('preserves exact original column ordering when casting columns', () => {
    const originalColumns = [
      { name: 'id', dataType: 'string' as const, role: 'dimension' as const },
      { name: 'fecha', dataType: 'string' as const, role: 'dimension' as const },
      { name: 'monto', dataType: 'string' as const, role: 'dimension' as const },
      { name: 'cliente', dataType: 'string' as const, role: 'dimension' as const },
    ];

    const targetColumn = 'fecha';
    const castExpr = `TRY_CAST("fecha" AS DATE)`;

    const colExprs = originalColumns.map((c) => {
      const sName = c.name.replace(/"/g, '""');
      if (c.name === targetColumn) {
        return `${castExpr} AS "${sName}"`;
      }
      return `"${sName}"`;
    });

    expect(colExprs[0]).toBe('"id"');
    expect(colExprs[1]).toBe('TRY_CAST("fecha" AS DATE) AS "fecha"');
    expect(colExprs[2]).toBe('"monto"');
    expect(colExprs[3]).toBe('"cliente"');
  });
});
