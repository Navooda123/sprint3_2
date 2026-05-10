import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

const LanguageToggle = () => {
  const { lang, changeLang } = useLanguage();

  const options = [
    { code: 'en', label: 'EN' },
    { code: 'si', label: 'සි' },
    { code: 'ta', label: 'த' },
  ];

  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-full px-1 py-1">
      {options.map(opt => (
        <button
          key={opt.code}
          onClick={() => changeLang(opt.code)}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
            lang === opt.code
              ? 'bg-white text-nestleBlue shadow border border-nestleBlue'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};

export default LanguageToggle;
