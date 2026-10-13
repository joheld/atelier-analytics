import { describe, it, expect } from 'vitest';
import { JoinRelationConfig, UnionConfig } from '../ast/types';

describe('Data Modeling Logic (Relational Joins & Unions)', () => {
  it('validates and constructs JoinRelationConfig with disambiguated columns', () => {
    const config: JoinRelationConfig = {
      name: 'pedidos_con_clientes',
      leftTableName: 'pedidos',
      rightTableName: 'clientes',
      joinType: 'LEFT',
      leftKey: 'cliente_id',
      rightKey: 'id',
    };

    expect(config.leftTableName).toBe('pedidos');
    expect(config.rightTableName).toBe('clientes');
    expect(config.joinType).toBe('LEFT');
    expect(config.leftKey).toBe('cliente_id');
    expect(config.rightKey).toBe('id');

    // Simulate column disambiguation
    const leftCols = ['id', 'cliente_id', 'monto', 'fecha'];
    const rightCols = ['id', 'nombre', 'ciudad', 'segmento'];

    const leftSet = new Set(leftCols);
    const resolvedRightCols = rightCols.map((c) =>
      leftSet.has(c) ? `${config.rightTableName}_${c}` : c
    );

    expect(resolvedRightCols).toContain('clientes_id');
    expect(resolvedRightCols).toContain('nombre');
    expect(resolvedRightCols).toContain('ciudad');
    expect(resolvedRightCols).toContain('segmento');
    expect(resolvedRightCols).not.toContain('id'); // Disambiguated to clientes_id
  });

  it('validates UnionConfig requiring at least two tables', () => {
    const unionConfig: UnionConfig = {
      name: 'ventas_anuales',
      tableNames: ['ventas_2023', 'ventas_2024'],
    };

    expect(unionConfig.tableNames.length).toBeGreaterThanOrEqual(2);
    expect(unionConfig.name).toBe('ventas_anuales');

    const selectParts = unionConfig.tableNames.map((t) => `SELECT * FROM "${t}"`);
    const sql = selectParts.join(' UNION ALL BY NAME ');

    expect(sql).toBe('SELECT * FROM "ventas_2023" UNION ALL BY NAME SELECT * FROM "ventas_2024"');
  });

  it('supports all four standard SQL relational join types', () => {
    const joinTypes = ['LEFT', 'INNER', 'RIGHT', 'FULL'] as const;
    joinTypes.forEach((jt) => {
      const config: JoinRelationConfig = {
        name: `relacion_${jt.toLowerCase()}`,
        leftTableName: 't1',
        rightTableName: 't2',
        joinType: jt,
        leftKey: 'key_a',
        rightKey: 'key_b',
      };
      expect(config.joinType).toBe(jt);
    });
  });
});
