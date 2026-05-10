import React, { createContext, useContext, useState, useCallback } from 'react';
import en from '../i18n/en';
import si from '../i18n/si';
import ta from '../i18n/ta';
import axios from '../api/axios';

const translations = { en, si, ta };

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => localStorage.getItem('nestle_lang') || 'en');

  const t = useCallback((path) => {
    const keys = path.split('.');
    let result = translations[lang];
    for (const key of keys) {
      result = result?.[key];
    }
    return result || path;
  }, [lang]);

  const changeLang = async (newLang) => {
    setLang(newLang);
    localStorage.setItem('nestle_lang', newLang);
    try {
      await axios.put('/auth/language', { language: newLang });
    } catch (e) { /* non-critical */ }
  };

  return (
    <LanguageContext.Provider value={{ lang, t, changeLang }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
