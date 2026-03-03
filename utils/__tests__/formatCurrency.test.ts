import { formatAmount, parseAmount } from '@/utils/current';

describe('parseAmount', () => {
  it('parses a Colombian peso formatted string to integer', () => {
    expect(parseAmount('1.500.000')).toBe(1500000);
  });

  it('handles zero', () => {
    expect(parseAmount('0')).toBe(0);
  });

  it('returns 0 for non-numeric input', () => {
    expect(parseAmount('abc')).toBe(0);
  });

  it('handles plain unformatted numbers', () => {
    expect(parseAmount('150000')).toBe(150000);
  });

  it('handles empty string', () => {
    expect(parseAmount('')).toBe(0);
  });
});

describe('formatAmount', () => {
  it('formats integer to Colombian dot-separated string', () => {
    expect(formatAmount(1500000)).toBe('1.500.000');
  });

  it('formats zero', () => {
    expect(formatAmount(0)).toBe('0');
  });

  it('formats large numbers', () => {
    expect(formatAmount(10000000)).toBe('10.000.000');
  });

  it('round-trips: parseAmount(formatAmount(n)) === n', () => {
    const value = 2_750_000;
    expect(parseAmount(formatAmount(value))).toBe(value);
  });
});
