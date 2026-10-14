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
});
