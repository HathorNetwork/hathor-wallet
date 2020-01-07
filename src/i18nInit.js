import { addLocale, useLocale } from 'ttag';

const availableLocales = {
  'pt-BR': () => require('./locale/pt-br/texts.po.json'),
};

//const languages = navigator.languages;
const languages = ['pt-BR'];

for (const locale of languages) {
  if (locale in availableLocales) {
    const data = availableLocales[locale]();
    addLocale(locale, data);
    useLocale(locale);
    break;
  }
}
