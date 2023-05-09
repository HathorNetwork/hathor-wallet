import { calculateExhibitionData, PROPOSAL_DOWNLOAD_STATUS } from "../../utils/atomicSwap";
import { PartialTxProposal } from "@hathor/wallet-lib";

const customTokenUid = '00003b47ce1a6774cfc132169122c38c15fbc4a7f43487cf1041ff4826c1842e';
/**
 * Mocked wallet to help with the tests
 * @type {HathorWallet}
 */
const wallet = {
  getNetworkObject: () => ({ name: 'privatenet' }),
  isAddressMine: (address) => {
    return address.startsWith('mine-');
  },
};

const mockNetwork = {
  name: "privatenet",
};

function createNewProposal() {
  const np = new PartialTxProposal(mockNetwork);

  // Mock another wallet sending 200 HTR and receiving 1 of a custom token
  np.partialTx.inputs = [
    {
      hash: "000000e5924f0b07a626fd47839f85983a0faf14a337ac85e53cc6bb877bd14a",
      index: 0,
      data: null,
      value: 6400,
      authorities: 0,
      token: "00",
      address: "other-1"
    }
  ]
  np.partialTx.outputs = [
    {
      value: 6200,
      tokenData: 0,
      decodedScript: {
        address: { base58: "other-2" },
        timelock: null
      },
      token: "00",
      isChange: true,
      authorities: 0
    },
    {
      value: 1,
      tokenData: 1,
      decodedScript: {
        address: { base58: "other-2" },
        timelock: null
      },
      token: customTokenUid,
      isChange: false,
      authorities: 0
    }
  ]

  return np;
}

describe('calculateExhibitionData', () => {
  const deserializeSpy = jest.spyOn(PartialTxProposal, 'fromPartialTx');
  const fakePartialTx = { serialize: () => 'fakeSerializedPartialTx' };

  it('should return an empty array when there is no interaction with the wallet', () => {
    deserializeSpy.mockImplementationOnce(() => createNewProposal())
    const cachedTokens = {};
    const results = calculateExhibitionData(fakePartialTx, cachedTokens, wallet);
    expect(results).toStrictEqual([]);
  })

  it('should return the correct balance for a single receive', () => {
    // Mock receiving 200 HTR
    deserializeSpy.mockImplementationOnce(() => {
      const np = createNewProposal();
      np.partialTx.outputs.push({
        value: 200,
        tokenData: 0,
        decodedScript: {
          address: { base58: "mine-1" },
          timelock: null
        },
        token: "00",
        isChange: false,
        authorities: 0,
        isAuthority: () => false,
      })
      return np;
    })
    const cachedTokens = {};
    const results = calculateExhibitionData(fakePartialTx, cachedTokens, wallet);
    expect(results).toStrictEqual([
      expect.objectContaining({
        tokenUid: '00',
        receiving: 200,
      })
    ]);
  })

  it('should return the correct balance for a single send', () => {
    // Mock sending 1 custom token
    deserializeSpy.mockImplementationOnce(() => {
      const np = createNewProposal();
      np.partialTx.inputs.push({
        hash: "000000e5924f0b07a626fd47839f85983a0faf14a337ac85e53cc6bb877bd14a",
        index: 0,
        data: null,
        value: 1,
        authorities: 0,
        token: customTokenUid,
        address: "mine-1",
        isAuthority: () => false,
      })
      return np;
    })
    const cachedTokens = {};
    const results = calculateExhibitionData(fakePartialTx, cachedTokens, wallet);
    expect(results).toStrictEqual([
      expect.objectContaining({
        tokenUid: customTokenUid,
        sending: 1,
      })
    ]);
  })

  it('should return the correct balance for sending and receiving multiple tokens', () => {
    // Mock sending 1 custom token
    deserializeSpy.mockImplementationOnce(() => {
      const np = createNewProposal();
      np.partialTx.inputs.push({
        hash: "000000e5924f0b07a626fd47839f85983a0faf14a337ac85e53cc6bb877bd14a",
        index: 0,
        data: null,
        value: 1,
        authorities: 0,
        token: customTokenUid,
        address: "mine-1",
        isAuthority: () => false,
      })
      np.partialTx.outputs.push({
        value: 200,
        tokenData: 0,
        decodedScript: {
          address: { base58: "mine-1" },
          timelock: null
        },
        token: "00",
        isChange: false,
        authorities: 0,
        isAuthority: () => false,
      })
      return np;
    })
    const cachedTokens = {};
    const results = calculateExhibitionData(fakePartialTx, cachedTokens, wallet);
    expect(results).toStrictEqual(expect.arrayContaining([
      expect.objectContaining({
        tokenUid: customTokenUid,
        sending: 1,
      }),
      expect.objectContaining({
        tokenUid: '00',
        receiving: 200,
      })
    ]));
  })

  it('should return the correct balance for sending and receiving zero tokens', () => {
    // Mock sending 1 custom token
    deserializeSpy.mockImplementationOnce(() => {
      const np = createNewProposal();
      np.partialTx.inputs.push({
        hash: "000000e5924f0b07a626fd47839f85983a0faf14a337ac85e53cc6bb877bd14a",
        index: 0,
        data: null,
        value: 1,
        authorities: 0,
        token: '00',
        address: "mine-1",
        isAuthority: () => false,
      })
      np.partialTx.outputs.push({
        value: 1,
        tokenData: 0,
        decodedScript: {
          address: { base58: "mine-2" },
          timelock: null
        },
        token: "00",
        isChange: false,
        authorities: 0,
        isAuthority: () => false,
      })
      return np;
    })
    const cachedTokens = {};
    const results = calculateExhibitionData(fakePartialTx, cachedTokens, wallet);
    expect(results).toStrictEqual([
      expect.objectContaining({
        tokenUid: '00',
      })
    ]);
  })

  it('should return the correct balance for all conditions above simultaneously', () => {
    deserializeSpy.mockImplementationOnce(() => {
      const np = createNewProposal();
      // Token '00' has zero balance
      np.partialTx.inputs.push({
        hash: "000000e5924f0b07a626fd47839f85983a0faf14a337ac85e53cc6bb877bd14a",
        index: 0,
        data: null,
        value: 1,
        authorities: 0,
        token: '00',
        address: "mine-1",
        isAuthority: () => false,
      })
      np.partialTx.outputs.push({
        value: 1,
        tokenData: 0,
        decodedScript: {
          address: { base58: "mine-2" },
          timelock: null
        },
        token: "00",
        isChange: false,
        authorities: 0,
        isAuthority: () => false,
      })

      // Token 'fake1' has sending balance
      np.partialTx.inputs.push({
        hash: "000000e5924f0b07a626fd47839f85983a0faf14a337ac85e53cc6bb877bd14a",
        index: 0,
        data: null,
        value: 2,
        authorities: 0,
        token: 'fake1',
        address: "mine-3",
        isAuthority: () => false,
      })

      // Token 'fake2' has receiving balance
      np.partialTx.outputs.push({
        value: 3,
        tokenData: 0,
        decodedScript: {
          address: { base58: "mine-4" },
          timelock: null
        },
        token: "fake2",
        isChange: false,
        authorities: 0,
        isAuthority: () => false,
      })

      // Is not participating in token 'fake3'
      np.partialTx.inputs.push({
        hash: "000000e5924f0b07a626fd47839f85983a0faf14a337ac85e53cc6bb877bd14a",
        index: 0,
        data: null,
        value: 4,
        authorities: 0,
        token: 'fake3',
        address: "other-1",
        isAuthority: () => false,
      })
      np.partialTx.outputs.push({
        value: 3,
        tokenData: 0,
        decodedScript: {
          address: { base58: "other-2" },
          timelock: null
        },
        token: "fake3",
        isChange: false,
        authorities: 0,
        isAuthority: () => false,
      })

      return np;
    })
    const cachedTokens = {};
    const results = calculateExhibitionData(fakePartialTx, cachedTokens, wallet);
    expect(results).toStrictEqual([
      expect.objectContaining({
        tokenUid: '00',
      }),
      expect.objectContaining({
        tokenUid: 'fake1',
        sending: 2
      }),
      expect.objectContaining({
        tokenUid: 'fake2',
        receiving: 3
      }),
    ]);
    expect(results).not.toContain(
      expect.objectContaining({
        tokenUid: 'fake3',
      }),)
  })
})
