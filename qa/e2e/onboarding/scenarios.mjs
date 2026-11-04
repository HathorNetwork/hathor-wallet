/**
 * Onboarding scenarios, keyed by their id in qa/graph/onboarding.yaml, on the
 * Electron production build.
 *
 * Elements are found by data-testid; what the user sees is checked by text
 * (cdp.expectText), so a reviewer can tell which checks depend on copy.
 */
import { assert, eq, sleep } from '../lib/harness.mjs';

const PASSWORD = 'Abc1234%';
const PIN = '123456';
const reverse = (s) => s.split('').reverse().join('');

/** Setup builders: bring an empty profile to each setup of the graph. */
export const SETUPS = {
  fresh: async () => {},
  started: async (ctx) => {
    await ctx.launch();
    await ctx.getStarted();
    await ctx.quit();
  },
};

/** The form with this test id refused to submit and shows it (the outcomes' "marked invalid"). */
async function expectInvalid(cdp, formId) {
  eq(await cdp.formValid(formId), false, `${formId} validity`);
  eq(await cdp.formMarked(formId), true, `${formId} marked was-validated`);
}

/** Wallet type > Software wallet > confirm > Continue, landing on Signin. */
async function toSignin(cdp) {
  await cdp.clickTestId('wallet-type-software');
  await cdp.checkTestId('software-warning-checkbox', true);
  await cdp.clickTestId('software-warning-continue');
  await cdp.byTestId('signin-new-wallet');
}

/** Signin > New wallet > confirm > Create my words, landing on step 2. */
async function createWords(cdp) {
  await cdp.clickTestId('signin-new-wallet');
  await cdp.checkTestId('new-wallet-checkbox', true);
  await cdp.clickTestId('new-wallet-create-words');
  await cdp.byTestId('new-wallet-backup-now');
}

/** Types into a ChoosePassword/ChoosePin pair; `next` presses its Next. */
async function fill(cdp, prefix, value, confirm = value, { next = true } = {}) {
  await cdp.typeTestId(`${prefix}-input`, value);
  await cdp.typeTestId(`${prefix}-confirm`, confirm);
  if (next) await cdp.clickTestId(`${prefix}-next`);
}

/** The options of the current backup check step, by position. */
async function wordOptions(cdp) {
  const options = [];
  for (let i = 0; ; i += 1) {
    const text = await cdp.textOfTestId(`backup-word-option-${i}`);
    if (text === null) return options;
    options.push(text);
  }
}

/** Picks the correct word of the current step (or a wrong one) by its position. */
async function answerStep(cdp, words, { wrong = false } = {}) {
  const index = Number(await cdp.textOfTestId('backup-words-step-index'));
  assert(index >= 1 && index <= 24, `backup step index ${index}`);
  const correct = words[index - 1];
  const options = await wordOptions(cdp);
  const pick = options.findIndex((w) => (wrong ? w !== correct : w === correct));
  assert(pick >= 0, `no ${wrong ? 'wrong' : 'correct'} option for word ${index} among ${options.length}`);
  await cdp.clickTestId(`backup-word-option-${pick}`);
  return index;
}

/** Waits until the step index differs from `previous`, or the check is over. */
async function nextStep(cdp, previous) {
  await cdp.waitFor(`(() => {
    const el = window.__e2e.byTestId('backup-words-step-index');
    return !el || el.offsetParent === null || Number(el.innerText) !== ${previous};
  })()`, { timeout: 10000, what: 'the next backup step' });
}

export const SCENARIOS = {
  // ok-welcome
  'welcome-render:fresh': async (ctx) => {
    await ctx.launch();
    await ctx.cdp.expectText('Welcome to Hathor Wallet!');
  },

  // err-terms-required, ok-wallet-type
  'welcome-terms:fresh': async (ctx) => {
    await ctx.launch();
    const { cdp } = ctx;
    await cdp.clickTestId('welcome-get-started');
    await sleep(300);
    await expectInvalid(cdp, 'welcome-terms-form');
    await cdp.expectText('Welcome to Hathor Wallet!');
    await cdp.checkTestId('welcome-terms-checkbox', true);
    await cdp.clickTestId('welcome-get-started');
    await cdp.byTestId('wallet-type-software');
    await cdp.byTestId('wallet-type-hardware');
    await cdp.expectText('Software wallet');
    await cdp.expectText('Hardware wallet');
  },

  // ok-no-welcome
  'welcome-skipped:started': async (ctx) => {
    await ctx.launch();
    const { cdp } = ctx;
    await cdp.byTestId('wallet-type-software');
    await cdp.expectText('Software wallet');
    await cdp.expectText('Hardware wallet');
    await cdp.expectNoText('Welcome to Hathor Wallet!');
  },

  // ok-warning, err-confirm-required, ok-signin
  'software-warning:started': async (ctx) => {
    await ctx.launch();
    const { cdp } = ctx;
    await cdp.clickTestId('wallet-type-software');
    await cdp.expectText('Using a software wallet is not the safest way to secure your tokens.');
    await cdp.clickTestId('software-warning-continue');
    await sleep(300);
    await expectInvalid(cdp, 'software-warning-form');
    await cdp.checkTestId('software-warning-checkbox', true);
    await cdp.clickTestId('software-warning-continue');
    await cdp.expectText('You can start a new wallet or import data from a wallet that already exists.');
  },

  // ok-step1 … ok-backup-warning
  'new-wallet-no-backup:started': async (ctx) => {
    await ctx.launch();
    const { cdp } = ctx;
    await toSignin(cdp);
    await cdp.clickTestId('signin-new-wallet');
    await cdp.expectText('. A new wallet is generated by 24 words.');
    await cdp.clickTestId('new-wallet-create-words');
    await sleep(300);
    await expectInvalid(cdp, 'new-wallet-form');
    await cdp.checkTestId('new-wallet-checkbox', true);
    await cdp.clickTestId('new-wallet-create-words');
    await cdp.expectText('Your words have been created!');
    await cdp.clickTestId('new-wallet-backup-later');

    await cdp.expectText('Please, choose a password to encrypt your sensitive data while using the wallet.');
    await fill(cdp, 'choose-password', 'abc');
    await expectInvalid(cdp, 'choose-password-form');
    await fill(cdp, 'choose-password', PASSWORD, reverse(PASSWORD));
    await cdp.expectText('Both fields must be equal');
    await cdp.expectText('Please, choose a password');
    await fill(cdp, 'choose-password', PASSWORD);

    await cdp.expectText('The PIN is a 6-digit password');
    await fill(cdp, 'choose-pin', 'abc');
    await expectInvalid(cdp, 'choose-pin-form');
    await fill(cdp, 'choose-pin', PIN, reverse(PIN));
    await cdp.expectText('Both fields must be equal');
    await cdp.expectText('The PIN is a 6-digit password');
    await fill(cdp, 'choose-pin', PIN);
    await cdp.expectText('Loading transactions');

    // The full node answers the empty history of a new wallet.
    await cdp.expectText('Total: 0.00 HTR', { timeout: 90000 });
    await cdp.expectText('You haven\'t done the backup of your wallet yet.');
    return 'wallet loaded from the mainnet full node; backup warning shown';
  },

  // err-wrong-word, ok-backup-done, err-load-failed
  'new-wallet-backup:started': async (ctx) => {
    await ctx.launch();
    const { cdp } = ctx;
    await toSignin(cdp);
    await createWords(cdp);
    await cdp.clickTestId('new-wallet-backup-now');

    const words = [];
    await cdp.byTestId('backup-words-word-1');
    for (let n = 1; n <= 24; n += 1) words.push(await cdp.textOfTestId(`backup-words-word-${n}`));
    assert(words.every((w) => typeof w === 'string' && /^[a-z]+$/.test(w)), `backup words: ${words.length} read, not all words`);
    await cdp.clickTestId('backup-words-saved');

    // One right word, then a wrong one.
    await cdp.byTestId('backup-words-step-index');
    const first = await answerStep(cdp, words);
    await nextStep(cdp, first);
    await answerStep(cdp, words, { wrong: true });
    await cdp.expectText('Wrong word. Please double check the words you saved.');

    // Start again and answer all five.
    await cdp.clickTestId('backup-words-restart');
    await cdp.clickTestId('backup-words-saved');
    for (let step = 0; step < 5; step += 1) {
      await cdp.byTestId('backup-words-step-index');
      const index = await answerStep(cdp, words);
      await nextStep(cdp, index);
    }

    await cdp.byTestId('choose-password-input');
    await fill(cdp, 'choose-password', PASSWORD);
    await fill(cdp, 'choose-pin', PIN, PIN, { next: false });
    // A failing full node: the history request gets HTTP 500, and nothing reaches the real node's history.
    await ctx.stub('thin_wallet/address_history', 500);
    await cdp.clickTestId('choose-pin-next');
    // The wallet library retries a failed request up to 5 times, 5 s apart.
    await cdp.expectText('There has been a problem loading your wallet', { timeout: 60000 });
    const stubbed = ctx.shimLog().filter((e) => e.kind === 'stub');
    assert(stubbed.length > 0, 'no address_history request was stubbed');
    return `backup checked; ${stubbed.length} address_history request(s) answered 500; failure screen shown`;
  },
};

/** The smoke floor: a cheap pass through Welcome, the wallet type and the warning. */
export const TIER1 = ['welcome-terms:fresh', 'software-warning:started'];

export const MANUAL = [];

/** Nothing here throws on purpose, so any uncaught renderer exception fails the scenario. */
export const FAIL_ON_EXCEPTIONS = true;
