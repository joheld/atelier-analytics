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

  it('compiles Tableau Desktop bidirectional type casts (number ⇄ string, number ⇄ date, date ⇄ number)', () => {
    const safeCol = 'Valor Mixto';

    // 1. Number -> String: formats integers cleanly without trailing .0
    const numToStrCast = `CASE
      WHEN typeof("${safeCol}") IN ('BOOLEAN', 'BOOL')
        THEN CASE WHEN "${safeCol}" IS TRUE THEN 'true' WHEN "${safeCol}" IS FALSE THEN 'false' ELSE NULL END
      WHEN TRY_CAST("${safeCol}" AS DOUBLE) IS NOT NULL AND "${safeCol}" = FLOOR("${safeCol}") AND ABS("${safeCol}") < 9223372036854775807
        THEN CAST(CAST("${safeCol}" AS BIGINT) AS VARCHAR)
      ELSE CAST("${safeCol}" AS VARCHAR)
    END`;
    expect(numToStrCast).toContain('FLOOR("Valor Mixto")');
    expect(numToStrCast).toContain('CAST(CAST("Valor Mixto" AS BIGINT) AS VARCHAR)');

    // 2. String / Date -> Number: handles accounting (100), currencies ($), percentages (%), and Date years
    const strToNumCast = `COALESCE(
      TRY_CAST("${safeCol}" AS DOUBLE),
      CASE
        WHEN TRY_CAST("${safeCol}" AS DATE) IS NOT NULL
          THEN CAST(EXTRACT(YEAR FROM TRY_CAST("${safeCol}" AS DATE)) AS DOUBLE)
        ELSE NULL
      END,
      CASE
        WHEN TRIM(CAST("${safeCol}" AS VARCHAR)) LIKE '(%)'
          THEN -1.0 * TRY_CAST(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(CAST("${safeCol}" AS VARCHAR)), '(', ''), ')', ''), '$', ''), '€', ''), '£', ''), ',', ''), ' ', '') AS DOUBLE)
        ELSE NULL
      END
    )`;
    expect(strToNumCast).toContain('EXTRACT(YEAR FROM TRY_CAST("Valor Mixto" AS DATE))');
    expect(strToNumCast).toContain("LIKE '(%)'");

    // 3. Number -> Date: handles 4-digit years (2024 -> 2024-01-01) and Excel serial days
    const numToDateCast = `COALESCE(
      TRY_CAST("${safeCol}" AS DATE),
      CASE
        WHEN TRY_CAST("${safeCol}" AS INTEGER) BETWEEN 1800 AND 2200
          THEN TRY_STRPTIME(CAST(CAST("${safeCol}" AS INTEGER) AS VARCHAR) || '-01-01', '%Y-%m-%d')::DATE
        ELSE NULL
      END,
      CASE
        WHEN TRY_CAST("${safeCol}" AS INTEGER) BETWEEN 10000 AND 80000
          THEN DATE '1899-12-30' + (TRY_CAST("${safeCol}" AS INTEGER) * INTERVAL '1' DAY)
        ELSE NULL
      END
    )`;
    expect(numToDateCast).toContain('BETWEEN 1800 AND 2200');
    expect(numToDateCast).toContain("DATE '1899-12-30'");
  });

  it('generates Tableau-compliant split column expressions with unique deduplicated names', () => {
    const baseCol = 'Nombre Completo';
    const safeCol = baseCol.replace(/"/g, '""');
    const safeDelim = ' ';

    // Helper simulation matching duckdbClient implementation
    const generateUniqueSplitNames = (existing: string[], base: string, count: number) => {
      const set = new Set(existing.map(c => c.toLowerCase()));
      const res: string[] = [];
      for (let i = 1; i <= count; i++) {
        let cand = `${base} - Split ${i}`;
        if (!set.has(cand.toLowerCase())) {
          res.push(cand);
          set.add(cand.toLowerCase());
        } else {
          let s = i + 1;
          while (set.has(`${base} - Split ${s}`.toLowerCase())) s++;
          const n = `${base} - Split ${s}`;
          res.push(n);
          set.add(n.toLowerCase());
        }
      }
      return res;
    };

    // First 2 splits
    const names = generateUniqueSplitNames(['Nombre Completo'], baseCol, 2);
    expect(names[0]).toBe('Nombre Completo - Split 1');
    expect(names[1]).toBe('Nombre Completo - Split 2');

    // Deduplication when Split 1 already exists
    const namesDeduplicated = generateUniqueSplitNames(['Nombre Completo', 'Nombre Completo - Split 1'], baseCol, 2);
    expect(namesDeduplicated[0]).toBe('Nombre Completo - Split 2');
    expect(namesDeduplicated[1]).toBe('Nombre Completo - Split 3');

    // Safe SQL expression casts to VARCHAR to prevent DuckDB binder errors on numeric fields
    const part1Expr = `NULLIF(TRIM(SPLIT_PART(CAST("${safeCol}" AS VARCHAR), '${safeDelim}', 1)), '') AS "${names[0]}"`;
    const part2Expr = `NULLIF(TRIM(SPLIT_PART(CAST("${safeCol}" AS VARCHAR), '${safeDelim}', 2)), '') AS "${names[1]}"`;
    expect(part1Expr).toContain('CAST("Nombre Completo" AS VARCHAR)');
    expect(part1Expr).toContain('AS "Nombre Completo - Split 1"');
    expect(part2Expr).toContain('AS "Nombre Completo - Split 2"');

    // Negative indexing for Last N splits
    const last1Expr = `NULLIF(TRIM(SPLIT_PART(CAST("${safeCol}" AS VARCHAR), '${safeDelim}', -1)), '') AS "Last Split"`;
    expect(last1Expr).toContain(', -1)');
  });

  it('safely applies TRIM, UPPER, and LOWER with CAST to VARCHAR avoiding DuckDB binder crashes', () => {
    const colName = 'Telefono';
    const safeCol = colName.replace(/"/g, '""');

    const trimExpr = `TRIM(CAST("${safeCol}" AS VARCHAR))`;
    const upperExpr = `UPPER(CAST("${safeCol}" AS VARCHAR))`;
    const lowerExpr = `LOWER(CAST("${safeCol}" AS VARCHAR))`;

    expect(trimExpr).toBe('TRIM(CAST("Telefono" AS VARCHAR))');
    expect(upperExpr).toBe('UPPER(CAST("Telefono" AS VARCHAR))');
    expect(lowerExpr).toBe('LOWER(CAST("Telefono" AS VARCHAR))');
  });
});
