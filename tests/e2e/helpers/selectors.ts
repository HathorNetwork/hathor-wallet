// The ONE place fragile DOM lives. Prefer roles/text; ids/placeholders where stable.
// Verified against src/screens/* and src/components/* at plan time.
export const SEL = {
  welcome: {
    heading: /Welcome to Hathor Wallet/i,
    agreeCheckbox: '#confirmAgree',
    getStarted: /Get started/i,
  },
  walletType: {
    software: /Software wallet/i,
  },
  softwareWarning: {
    confirmCheckbox: '#confirmWallet',
    continue: /Continue/i,
  },
  signin: {
    newWallet: /New wallet/i,
    importWallet: /Import wallet/i,
  },
  newWallet: {
    confirmCheckbox: '#confirmWallet',
    createWords: /Create my words/i,
    wordsCreatedHeading: /Your words have been created/i,
    doItLater: /Do it later/i,
    hiddenWords: '#hiddenWordsForTest',
  },
  loadWallet: {
    seedTextarea: 'textarea[placeholder="Words separated by single space"]',
    importData: /Import data/i,
  },
  pinPassword: {
    form: '#passwordWrapperForm',
    password: 'input[placeholder="Password"]',
    confirmPassword: 'input[placeholder="Confirm Password"]',
    pin: 'input[placeholder="PIN"]',
    confirmPin: 'input[placeholder="Confirm PIN"]',
    next: /Next/i,
  },
  loading: {
    loadingTransactions: /Loading transactions/i,
    syncing: /Loading token information, please wait/i,
  },
  dashboard: {
    balanceTotal: 'wallet-balance-total',
  },
  history: {
    // TokenHistory renders <table id="token-history"> with one <tr> per tx in the
    // tbody, but only once the token history download status is READY. Asserting
    // the table is visible AND at least one row is present proves real history
    // rendered (the funded testnet wallet has transactions) — not a tautology.
    table: '#token-history',
    rows: '#token-history tbody tr',
  },
  networkSettings: {
    select: 'select',
    pin: 'input[placeholder="PIN"]',
    connect: /^Connect$/i,
    testnetModal: '#modalConfirmTestnet',
    testnetModalInput: '#modalConfirmTestnet input[type="text"]',
    connectToTestnet: /Connect to testnet/i,
  },
  settings: {
    // Settings.js renders "Connected to <strong>Testnet</strong> (<live node URL>)"
    // from hathorLib.config, so the live testnet node URL is the strongest,
    // most reliable proof that the wallet actually switched to testnet.
    testnetNodeUrl: /node1\.testnet\.hathor\.network/i,
  },
} as const;

export const CREDENTIALS = { password: 'Abc1234%', pin: '123456' } as const;
