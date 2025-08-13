import i18next from 'i18next';
import Backend from 'i18next-http-backend';

const i18nInstance = i18next.createInstance();

await i18nInstance.use(Backend).init({
  fallbackLng: 'en',
  returnEmptyString: false,
  react: {
    useSuspense: false,
  },
});

export default i18nInstance;
