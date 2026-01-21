import { calculateExhibitionData } from "../../utils/atomicSwap";
import { PROPOSAL_DOWNLOAD_STATUS } from "../../constants";
import { PartialTxProposal } from "@hathor/wallet-lib";

const customTokenUid = '00003b47ce1a6774cfc132169122c38c15fbc4a7f43487cf1041ff4826c1842e';

const mockNetwork = {
  name: "privatenet",
};
const mockStorage = {
  config: {
    getNetwork: () => mockNetwork,
  },
  isAddressMine: async (address) => {
    return address.startsWith('mine-');
  },
}

/**
 * Mocked wallet to help with the tests
 * @type {HathorWallet}
 */
const wallet = {
  getNetworkObject: () => mockNetwork,
  isAddressMine: async (address) => {
    return address.startsWith('mine-');
  },
  storage: mockStorage,
};

function createNewProposal() {
  const np = new PartialTxProposal(mockStorage);

  // Mock another wallet sending 200 HTR and receiving 1 of a custom token
  np.partialTx.inputs = [
    {
      hash: "000000e5924f0b07a626fd47839f85983a0faf14a337ac85e53cc6bb877bd14a",
      index: 0,
      data: null,
      value: 6400n,
      authorities: 0,
      token: "00",
      address: "other-1"
    }
  ]
  np.partialTx.outputs = [
    {
      value: 6200n,
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
      value: 1n,
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

  it('should return an empty array when there is no interaction with the wallet', async () => {
    deserializeSpy.mockImplementationOnce(() => createNewProposal())
    const cachedTokens = {};
    const results = await calculateExhibitionData(fakePartialTx, cachedTokens, wallet);
    expect(results).toStrictEqual([]);
  })

  it('should return the correct balance for a single receive', async () => {
    // Mock receiving 200 HTR
    deserializeSpy.mockImplementationOnce(() => {
      const np = createNewProposal();
      np.partialTx.outputs.push({
        value: 200n,
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
    const results = await calculateExhibitionData(fakePartialTx, cachedTokens, wallet);
    expect(results).toStrictEqual([
      expect.objectContaining({
        tokenUid: '00',
        receiving: 200n,
      })
    ]);
  })

  it('should return the correct balance for a single send', async () => {
    // Mock sending 1 custom token
    deserializeSpy.mockImplementationOnce(() => {
      const np = createNewProposal();
      np.partialTx.inputs.push({
        hash: "000000e5924f0b07a626fd47839f85983a0faf14a337ac85e53cc6bb877bd14a",
        index: 0,
        data: null,
        value: 1n,
        authorities: 0,
        token: customTokenUid,
        address: "mine-1",
        isAuthority: () => false,
      })
      return np;
    })
    const cachedTokens = {};
    const results = await calculateExhibitionData(fakePartialTx, cachedTokens, wallet);
    expect(results).toStrictEqual([
      expect.objectContaining({
        tokenUid: customTokenUid,
        sending: 1n,
      })
    ]);
  })

  it('should return the correct balance for sending and receiving multiple tokens', async () => {
    // Mock sending 1 custom token
    deserializeSpy.mockImplementationOnce(() => {
      const np = createNewProposal();
      np.partialTx.inputs.push({
        hash: "000000e5924f0b07a626fd47839f85983a0faf14a337ac85e53cc6bb877bd14a",
        index: 0,
        data: null,
        value: 1n,
        authorities: 0,
        token: customTokenUid,
        address: "mine-1",
        isAuthority: () => false,
      })
      np.partialTx.outputs.push({
        value: 200n,
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
    const results = await calculateExhibitionData(fakePartialTx, cachedTokens, wallet);
    expect(results).toStrictEqual(expect.arrayContaining([
      expect.objectContaining({
        tokenUid: customTokenUid,
        sending: 1n,
      }),
      expect.objectContaining({
        tokenUid: '00',
        receiving: 200n,
      })
    ]));
  })

  it('should return the correct balance for sending and receiving zero tokens', async () => {
    // Mock sending 1 custom token
    deserializeSpy.mockImplementationOnce(() => {
      const np = createNewProposal();
      np.partialTx.inputs.push({
        hash: "000000e5924f0b07a626fd47839f85983a0faf14a337ac85e53cc6bb877bd14a",
        index: 0,
        data: null,
        value: 1n,
        authorities: 0,
        token: '00',
        address: "mine-1",
        isAuthority: () => false,
      })
      np.partialTx.outputs.push({
        value: 1n,
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
    const results = await calculateExhibitionData(fakePartialTx, cachedTokens, wallet);
    expect(results).toStrictEqual([
      expect.objectContaining({
        tokenUid: '00',
      })
    ]);
  })

  it('should return the correct balance for all conditions above simultaneously', async () => {
    deserializeSpy.mockImplementationOnce(() => {
      const np = createNewProposal();
      // Token '00' has zero balance
      np.partialTx.inputs.push({
        hash: "000000e5924f0b07a626fd47839f85983a0faf14a337ac85e53cc6bb877bd14a",
        index: 0,
        data: null,
        value: 1n,
        authorities: 0,
        token: '00',
        address: "mine-1",
        isAuthority: () => false,
      })
      np.partialTx.outputs.push({
        value: 1n,
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
        value: 2n,
        authorities: 0,
        token: 'fake1',
        address: "mine-3",
        isAuthority: () => false,
      })

      // Token 'fake2' has receiving balance
      np.partialTx.outputs.push({
        value: 3n,
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
        value: 4n,
        authorities: 0,
        token: 'fake3',
        address: "other-1",
        isAuthority: () => false,
      })
      np.partialTx.outputs.push({
        value: 3n,
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
    const results = await calculateExhibitionData(fakePartialTx, cachedTokens, wallet);
    expect(results).toStrictEqual([
      expect.objectContaining({
        tokenUid: '00',
      }),
      expect.objectContaining({
        tokenUid: 'fake1',
        sending: 2n
      }),
      expect.objectContaining({
        tokenUid: 'fake2',
        receiving: 3n
      }),
    ]);
    expect(results).not.toContain(
      expect.objectContaining({
        tokenUid: 'fake3',
      }),)
  })
})
