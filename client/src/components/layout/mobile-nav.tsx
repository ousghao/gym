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
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40">
      <div className="flex justify-around py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewChange('dashboard')}
          className={`flex flex-col items-center p-2 h-auto ${
            currentView === 'dashboard' ? 'text-primary' : 'text-slate-500'
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
            currentView === 'clients' ? 'text-primary' : 'text-slate-500'
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
            currentView === 'calendar' ? 'text-primary' : 'text-slate-500'
          }`}
        >
          <Calendar className="h-5 w-5" />
          <span className="text-xs mt-1">{t('nav.calendar')}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onQuickLog}
          className="flex flex-col items-center p-2 h-auto text-slate-500"
        >
          <Plus className="h-5 w-5" />
          <span className="text-xs mt-1">{t('nav.quick_log')}</span>
        </Button>
      </div>
    </div>
  );
}
