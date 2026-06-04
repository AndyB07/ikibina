import React, { createContext, useContext, useState } from 'react';
import translations from '../translations';

const LangContext = createContext();

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'en');

  const toggleLang = () => {
    const next = lang === 'en' ? 'rw' : 'en';
    setLang(next);
    localStorage.setItem('lang', next);
  };

  const t = (key) => translations[lang][key] || translations['en'][key] || key;

  return (
    <LangContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
