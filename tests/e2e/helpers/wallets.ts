import config from '../wallets.config.json';

type WalletEntry = { srpEnv: string; description: string };
const registry = config as Record<string, WalletEntry>;

function readSeed(name: string): string | undefined {
  const entry = registry[name];
  if (!entry) return undefined;
  const seed = process.env[entry.srpEnv];
  return seed?.trim() || undefined;
}

/** True when the named wallet's seed env var is set and non-empty. */
export function hasWallet(name: string): boolean {
  return Boolean(readSeed(name));
}

/** Returns the trimmed seed or throws a clear error (fixtures fail fast). */
export function lookupWallet(name: string): string {
  const seed = readSeed(name);
  if (!seed) {
    const entry = registry[name];
    const envName = entry?.srpEnv ?? `<unknown wallet "${name}">`;
    throw new Error(`Missing seed for wallet "${name}". Set ${envName} in .env.e2e.`);
  }
  return seed;
}
