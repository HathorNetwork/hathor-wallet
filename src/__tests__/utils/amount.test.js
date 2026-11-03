// Mocked to avoid pulling in @hathor/wallet-lib's full index (and its axios
// import), which this project's Jest version cannot parse. Delegates to the
// library's real numeric formatter, same convention as networkTokensPersistence.test.js.
jest.mock('@hathor/wallet-lib', () => ({
  numberUtils: require('@hathor/wallet-lib/lib/utils/numbers'),
}));

import { compressAmountString, formatAmount, resolveAmountFormat } from '../../utils/amount';
import { AMOUNT_FORMAT } from '../../constants';

describe('compressAmountString', () => {
  it('compresses a leading run of fractional zeros', () => {
    expect(compressAmountString('0.0000005195')).toBe('0.0₆5195');
  });

  it('compresses only the leading run, keeping inner zeros verbatim', () => {
    expect(compressAmountString('0.000000045600000123')).toBe('0.0₇45600000123');
  });

  it('trims trailing zeros before scanning', () => {
    expect(compressAmountString('0.00000051950000')).toBe('0.0₆5195');
  });

  it('leaves runs shorter than 3 alone', () => {
    expect(compressAmountString('0.005195')).toBe('0.005195');
  });

  it('leaves values greater than or equal to 1 alone', () => {
    expect(compressAmountString('1.0000005195')).toBe('1.0000005195');
    expect(compressAmountString('12,345.0000005195')).toBe('12,345.0000005195');
  });

  it('leaves integers and zero alone', () => {
    expect(compressAmountString('42')).toBe('42');
    expect(compressAmountString('0.00000000')).toBe('0.00000000');
  });

  it('preserves the sign', () => {
    expect(compressAmountString('-0.0000005195')).toBe('-0.0₆5195');
  });

  it('uses multi-digit subscripts for long runs', () => {
    expect(compressAmountString('0.0000000000005195')).toBe('0.0₁₂5195');
  });
});

describe('formatAmount', () => {
  it('expands by default', () => {
    expect(formatAmount(519n, { decimalPlaces: 8 })).toBe('0.00000519');
  });

  it('compresses when the format is COMPRESSED', () => {
    expect(
      formatAmount(519n, { decimalPlaces: 8, amountFormat: AMOUNT_FORMAT.COMPRESSED })
    ).toBe('0.0₅519');
  });

  it('never compresses NFTs, which have no decimal places', () => {
    expect(
      formatAmount(5n, { decimalPlaces: 8, isNFT: true, amountFormat: AMOUNT_FORMAT.COMPRESSED })
    ).toBe('5');
  });

  it('honours a non-default decimal places value', () => {
    expect(formatAmount(100n, { decimalPlaces: 2 })).toBe('1.00');
  });

  it('groups thousands in the integer part', () => {
    expect(formatAmount(123456789n, { decimalPlaces: 2 })).toBe('1,234,567.89');
  });
});

describe('resolveAmountFormat', () => {
  it('returns the stored format when the feature is enabled', () => {
    expect(resolveAmountFormat(AMOUNT_FORMAT.COMPRESSED, true)).toBe(AMOUNT_FORMAT.COMPRESSED);
  });

  it('masks a stored compressed preference back to expanded when disabled', () => {
    expect(resolveAmountFormat(AMOUNT_FORMAT.COMPRESSED, false)).toBe(AMOUNT_FORMAT.EXPANDED);
  });

  it('returns expanded when disabled and nothing is stored', () => {
    expect(resolveAmountFormat(undefined, false)).toBe(AMOUNT_FORMAT.EXPANDED);
  });
});
