/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { addLocale, useLocale } from 'ttag';

const availableLocales = {
  'pt-BR': () => require('./locale/pt-br/texts.po.json'),
};

const languages = [];

for (const locale of languages) {
  if (locale in availableLocales) {
    const data = availableLocales[locale]();
    addLocale(locale, data);
    useLocale(locale);
    break;
  }
}
