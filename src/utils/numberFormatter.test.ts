import { describe, it, expect } from 'vitest';
import { formatMetricValue } from './numberFormatter';

describe('Universal Number Formatter', () => {
  it('handles null, undefined and NaN values safely', () => {
    expect(formatMetricValue(null)).toBe('—');
    expect(formatMetricValue(undefined)).toBe('—');
    expect(formatMetricValue(NaN)).toBe('—');
  });

  it('formats with auto mode cleanly for large and small numbers', () => {
    expect(formatMetricValue(1500000)).toBe('1,500,000');
    expect(formatMetricValue(25000)).toBe('25,000');
    expect(formatMetricValue(42)).toBe('42');
    expect(formatMetricValue(12.3456)).toBe('12.35');
  });

  it('formats currency correctly with customizable symbols and decimals', () => {
    expect(
      formatMetricValue(1234.56, { type: 'currency', currencySymbol: '$', decimals: 2 })
    ).toBe('$1,234.56');

    expect(
      formatMetricValue(5000, { type: 'currency', currencySymbol: '€', decimals: 0 })
    ).toBe('€5,000');
  });

  it('formats percentages correctly', () => {
    expect(formatMetricValue(45.678, { type: 'percent', decimals: 1 })).toBe('45.7%');
    expect(formatMetricValue(100, { type: 'percent', decimals: 0 })).toBe('100%');
  });

  it('formats compact metric units (K, M, B)', () => {
    expect(formatMetricValue(2500000000, { type: 'compact', decimals: 1 })).toBe('2.5B');
    expect(formatMetricValue(3400000, { type: 'compact', decimals: 2 })).toBe('3.40M');
    expect(formatMetricValue(15000, { type: 'compact', decimals: 1 })).toBe('15.0K');
  });

  it('formats scientific notation correctly', () => {
    expect(formatMetricValue(12345, { type: 'scientific', decimals: 2 })).toBe('1.23e+4');
  });
});
