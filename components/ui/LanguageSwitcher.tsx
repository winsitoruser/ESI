import React from 'react';
import { useTranslation, Language, languageNames, languageFlags } from '@/lib/i18n';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { FaGlobe } from 'react-icons/fa';

interface LanguageSwitcherProps {
  variant?: 'select' | 'buttons';
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ 
  variant = 'select', 
  className = '' 
}) => {
  const { language, setLanguage, t } = useTranslation();

  if (variant === 'buttons') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <FaGlobe className="text-gray-500 h-4 w-4" />
        {Object.entries(languageNames).map(([lang, name]) => (
          <Button
            key={lang}
            variant={language === lang ? 'default' : 'outline'}
            size="sm"
            onClick={() => setLanguage(lang as Language)}
            className={`text-xs px-2 py-1 ${
              language === lang 
                ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white' 
                : 'border-red-200 hover:bg-red-50'
            }`}
          >
            <span className="mr-1">{languageFlags[lang as Language]}</span>
            {lang.toUpperCase()}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <FaGlobe className="text-gray-500 h-4 w-4" />
      <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
        <SelectTrigger className="w-40 border-red-200 focus:border-red-400">
          <SelectValue>
            <div className="flex items-center space-x-2">
              <span>{languageFlags[language]}</span>
              <span className="text-sm">{languageNames[language]}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(languageNames).map(([lang, name]) => (
            <SelectItem key={lang} value={lang}>
              <div className="flex items-center space-x-2">
                <span>{languageFlags[lang as Language]}</span>
                <span>{name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default LanguageSwitcher;
