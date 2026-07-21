jest.mock('@hathor/wallet-lib', () => ({
  MemoryStore: class MemoryStore {},
  Storage: class Storage {},
  walletUtils: {},
  config: {},
  cryptoUtils: {},
  WalletType: {},
  constants: {},
}));

// reducers/index.js -> sagas/tokens.js -> sagas/helpers.js -> utils/tokens.js
// imports the real redux store bootstrap, which wires the Reown (WalletConnect)
// saga and pulls in @walletconnect/core. That package breaks under this Jest
// environment independently of the axios/wallet-lib issue, so it is stubbed too.
jest.mock('../../store/index', () => ({ default: {} }));

import reducer from '../../reducers/index';
import { setAmountFormat } from '../../actions';
import { AMOUNT_FORMAT } from '../../constants';

describe('amountFormat reducer', () => {
  it('defaults to expanded', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    expect(state.amountFormat).toBe(AMOUNT_FORMAT.EXPANDED);
  });

  it('stores the selected format', () => {
    const state = reducer(undefined, setAmountFormat(AMOUNT_FORMAT.COMPRESSED));
    expect(state.amountFormat).toBe(AMOUNT_FORMAT.COMPRESSED);
  });
});
