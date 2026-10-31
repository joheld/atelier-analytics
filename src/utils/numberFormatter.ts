import { NumberFormatConfig } from '../core/ast/types';

/**
 * Universal Number & Currency Formatting Utility
 * Formats metrics with locale grouping, currency symbols, percentages and compact notation (K, M, B)
 */
export function formatMetricValue(
  value: number | null | undefined,
  config?: NumberFormatConfig
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '—';
  }

  if (!config || config.type === 'auto') {
    // Automatic intelligent formatting: format integers and decimals cleanly with grouping
    if (Number.isInteger(value)) {
      return value.toLocaleString();
    }
    return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  const decimals = config.decimals ?? 2;
  const useGrouping = config.useGrouping !== false;

  switch (config.type) {
    case 'currency': {
      const symbol = config.currencySymbol || '$';
      const formatted = value.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        useGrouping,
      });
      return `${symbol}${formatted}`;
    }
    case 'percent': {
      const formatted = value.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        useGrouping,
      });
      return `${formatted}%`;
    }
    case 'compact': {
      if (Math.abs(value) >= 1_000_000_000) {
        return (
          (value / 1_000_000_000).toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          }) + 'B'
        );
      }
      if (Math.abs(value) >= 1_000_000) {
        return (
          (value / 1_000_000).toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          }) + 'M'
        );
      }
      if (Math.abs(value) >= 1_000) {
        return (
          (value / 1_000).toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          }) + 'K'
        );
      }
      return value.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        useGrouping,
      });
    }
    case 'scientific':
      return value.toExponential(decimals);
    case 'number':
    default: {
      const prefix = config.prefix || '';
      const suffix = config.suffix || '';
      const formatted = value.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        useGrouping,
      });
      return `${prefix}${formatted}${suffix}`;
    }
  }
}
