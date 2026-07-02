const scale = Number(process.env.E2E_TIMEOUT_SCALE) || 1;
const ms = (base: number): number => Math.round(base * scale);

export const TIMEOUTS = {
  devServerWarmup: ms(180_000),
  appLaunch: ms(60_000),
  click: ms(30_000),
  walletLoad: ms(90_000),
  networkResync: ms(120_000),
  modal: ms(15_000),
};
