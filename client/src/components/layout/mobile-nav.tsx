import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/use-language';
import { BarChart3, Users, Calendar, Plus } from 'lucide-react';

interface MobileNavProps {
  currentView: string;
  onViewChange: (view: string) => void;
  onQuickLog: () => void;
}

export function MobileNav({ currentView, onViewChange, onQuickLog }: MobileNavProps) {
  const { t } = useLanguage();

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border z-50">
      <div className="flex justify-around py-2 px-4 safe-area-bottom">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewChange('dashboard')}
          className={`flex flex-col items-center p-2 h-auto ${
            currentView === 'dashboard' 
              ? 'text-primary bg-primary/10' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <BarChart3 className="h-5 w-5" />
          <span className="text-xs mt-1">{t('nav.dashboard')}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewChange('clients')}
          className={`flex flex-col items-center p-2 h-auto ${
            currentView === 'clients' 
              ? 'text-primary bg-primary/10' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="h-5 w-5" />
          <span className="text-xs mt-1">{t('nav.clients')}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewChange('calendar')}
          className={`flex flex-col items-center p-2 h-auto ${
            currentView === 'calendar' 
              ? 'text-primary bg-primary/10' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Calendar className="h-5 w-5" />
          <span className="text-xs mt-1">{t('nav.calendar')}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onQuickLog}
          className="flex flex-col items-center p-2 h-auto bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-5 w-5" />
          <span className="text-xs mt-1">Log</span>
        </Button>
      </div>
    </div>
  );
}
