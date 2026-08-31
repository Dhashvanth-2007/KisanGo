import React, { createContext, useContext, useState, useEffect } from 'react';
import { LanguageCode } from '../types';
import { translations } from '../i18n/translations';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string) => string;
  languagesList: { code: LanguageCode; label: string; native: string }[];
}

const languagesList: { code: LanguageCode; label: string; native: string }[] = [
  { code: 'Tamil', label: 'Tamil', native: 'தமிழ்' },
  { code: 'English', label: 'English', native: 'English' },
  { code: 'Hindi', label: 'Hindi', native: 'हिंदी' },
  { code: 'Telugu', label: 'Telugu', native: 'తెలుగు' },
  { code: 'Malayalam', label: 'Malayalam', native: 'മലയാളം' }
];

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLangState] = useState<LanguageCode>(() => {
    const saved = localStorage.getItem('km_language') as LanguageCode;
    return saved || 'Tamil';
  });

  const setLanguage = (lang: LanguageCode) => {
    setLangState(lang);
    localStorage.setItem('km_language', lang);
  };

  const t = (key: string): string => {
    const langDict = translations[language] || translations.English;
    return langDict[key] || translations.English[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, languagesList }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
