import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/use-language';
import { Dumbbell, Users, Calendar, BarChart3, Plus } from 'lucide-react';
import { useState } from 'react';

interface NavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
  onAddClient: () => void;
}

export function Navigation({ currentView, onViewChange, onAddClient }: NavigationProps) {
  const { t } = useLanguage();

  return (
    <nav className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-primary">
                <Dumbbell className="inline h-6 w-6 mr-2" />
                {t('app.title')}
              </h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button onClick={onAddClient} className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              {t('actions.add_client')}
            </Button>
            
            <div className="hidden md:flex space-x-1">
              <Button
                variant={currentView === 'dashboard' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewChange('dashboard')}
                className={currentView === 'dashboard' ? 'bg-primary/10 text-primary' : ''}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                {t('nav.dashboard')}
              </Button>
              <Button
                variant={currentView === 'clients' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewChange('clients')}
                className={currentView === 'clients' ? 'bg-primary/10 text-primary' : ''}
              >
                <Users className="h-4 w-4 mr-2" />
                {t('nav.clients')}
              </Button>
              <Button
                variant={currentView === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewChange('calendar')}
                className={currentView === 'calendar' ? 'bg-primary/10 text-primary' : ''}
              >
                <Calendar className="h-4 w-4 mr-2" />
                {t('nav.calendar')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
