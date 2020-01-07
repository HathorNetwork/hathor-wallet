/**
 * Convert a string into a JSX. It receives a text and a map of functions. The text
 * must be marked with |x| blocks. Each block will be used to call one of the functions.
 *
 * The content of the blocks must be in the following format: `|key:content|`. The key
 * will be used select which function will be called.
 *
 * The functions will receive two parameters: `content` and `i`. The `i` is a unique value and
 * must be used for prop `key` to avoid warnings.
 *
 * For example: `str2jsx('This is |f1:an example| with |f2:two calls|.', {f1: fn1, f2: fn2})`
 * The return will be `['This is ', fn1('an example', 1), ' with ', fn2(two calls, 3), '.']`.
 *
 * It is useful for i18n to convert texts that will be translated into jsx elements.
 */
export const str2jsx = (text, fnMap) => {
  const parts = text.split('|');
  if (parts.length % 2 === 0) {
    throw new Error(`invalid string: ${text}`);
  }
  const ret = [];
  for (let i = 0; i < parts.length; i += 1) {
    if (i % 2 === 0) {
      ret.push(parts[i]);
    } else {
      const part = parts[i];
      const index = part.indexOf(':');
      let result;
      if (index >= 0) {
        const key = part.substring(0, index);
        const content = part.substring(index + 1);
        const fn = fnMap[key];
        result = fn(content, i);
      } else {
        result = part;
      }
      ret.push(result);
    }
  }
  return ret;
};
