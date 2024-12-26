export const logger = (namespace) => ({
  debug: (...args) => console.debug(`[${namespace}]`, ...args),
  error: (...args) => console.error(`[${namespace}]`, ...args),
  info: (...args) => console.info(`[${namespace}]`, ...args),
  warn: (...args) => console.warn(`[${namespace}]`, ...args),
});
