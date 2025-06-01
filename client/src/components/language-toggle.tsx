import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'es' : 'en');
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className="fixed top-4 right-4 z-50 bg-white shadow-lg hover:bg-slate-50"
    >
      <Globe className="h-4 w-4 mr-2" />
      {language.toUpperCase()} / {language === 'en' ? 'ES' : 'EN'}
    </Button>
  );
}
