import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/use-language';
import { Dumbbell, Users, Calendar, BarChart3, Plus, Menu, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageToggle } from '@/components/language-toggle';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface NavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
  onAddClient: () => void;
}

export function Navigation({ currentView, onViewChange, onAddClient }: NavigationProps) {
  const { t } = useLanguage();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const handleViewChange = (view: string) => {
    onViewChange(view);
    setIsSheetOpen(false);
  };

  const handleAddClient = () => {
    onAddClient();
    setIsSheetOpen(false);
  };

  return (
    <nav className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-primary dark:text-white flex items-center">
                <Dumbbell className="inline h-6 w-6 mr-2 text-primary dark:text-white" />
                {t('app.title')}
              </h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-2">
              <Button onClick={onAddClient} className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                {t('actions.add_client')}
              </Button>
              
              <div className="flex space-x-1">
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
                <Button
                  variant={currentView === 'progress' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onViewChange('progress')}
                  className={currentView === 'progress' ? 'bg-primary/10 text-primary' : ''}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Progress
                </Button>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center space-x-2">
              <ThemeToggle />
              <LanguageToggle />
              
              {/* Mobile Menu */}
              <div className="lg:hidden">
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Menu className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-80">
                    <div className="flex flex-col space-y-4 mt-6">
                      <Button 
                        onClick={handleAddClient} 
                        className="w-full justify-start bg-primary hover:bg-primary/90"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {t('actions.add_client')}
                      </Button>
                      
                      <div className="space-y-2">
                        <Button
                          variant={currentView === 'dashboard' ? 'default' : 'ghost'}
                          onClick={() => handleViewChange('dashboard')}
                          className="w-full justify-start"
                        >
                          <BarChart3 className="h-4 w-4 mr-2" />
                          {t('nav.dashboard')}
                        </Button>
                        <Button
                          variant={currentView === 'clients' ? 'default' : 'ghost'}
                          onClick={() => handleViewChange('clients')}
                          className="w-full justify-start"
                        >
                          <Users className="h-4 w-4 mr-2" />
                          {t('nav.clients')}
                        </Button>
                        <Button
                          variant={currentView === 'calendar' ? 'default' : 'ghost'}
                          onClick={() => handleViewChange('calendar')}
                          className="w-full justify-start"
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          {t('nav.calendar')}
                        </Button>
                        <Button
                          variant={currentView === 'progress' ? 'default' : 'ghost'}
                          onClick={() => handleViewChange('progress')}
                          className="w-full justify-start"
                        >
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Progress
                        </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
