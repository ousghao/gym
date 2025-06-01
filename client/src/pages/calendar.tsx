import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/use-language';
import { useQuery } from '@tanstack/react-query';
import { sessionApi, clientApi } from '@/lib/api';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from 'lucide-react';
import type { Session, Client } from '@shared/schema';

export function Calendar() {
  const { t } = useLanguage();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<'month' | 'week' | 'day'>('month');

  // Get the current month's dates
  const today = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const firstDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
  
  // Generate calendar days
  const calendarDays = [];
  
  // Previous month's trailing days
  const prevMonth = new Date(currentYear, currentMonth - 1, 0);
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    calendarDays.push({
      date: new Date(currentYear, currentMonth - 1, prevMonth.getDate() - i),
      isCurrentMonth: false,
      isToday: false,
    });
  }
  
  // Current month's days
  for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
    const date = new Date(currentYear, currentMonth, day);
    calendarDays.push({
      date,
      isCurrentMonth: true,
      isToday: date.toDateString() === today.toDateString(),
    });
  }
  
  // Next month's leading days to fill the grid
  const remainingDays = 42 - calendarDays.length; // 6 weeks * 7 days
  for (let day = 1; day <= remainingDays; day++) {
    calendarDays.push({
      date: new Date(currentYear, currentMonth + 1, day),
      isCurrentMonth: false,
      isToday: false,
    });
  }

  const { data: sessions, isLoading: isLoadingSessions } = useQuery({
    queryKey: ['/api/sessions'],
    queryFn: () => sessionApi.getAll(),
  });

  const { data: clients } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: clientApi.getAll,
  });

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const getSessionsForDate = (date: Date) => {
    if (!sessions) return [];
    
    return sessions.filter((session: Session) => {
      const sessionDate = new Date(session.date);
      return sessionDate.toDateString() === date.toDateString();
    });
  };

  const getClientById = (clientId: number) => {
    return clients?.find((client: Client) => client.id === clientId);
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const dayNames = [
    t('calendar.sunday'),
    t('calendar.monday'),
    t('calendar.tuesday'),
    t('calendar.wednesday'),
    t('calendar.thursday'),
    t('calendar.friday'),
    t('calendar.saturday'),
  ];

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between">
            <div className="flex items-center space-x-4 mb-4 sm:mb-0">
              <h2 className="text-xl font-semibold text-slate-900">{t('calendar.title')}</h2>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateMonth('prev')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium text-slate-900 min-w-[120px] text-center">
                  {formatMonthYear(currentDate)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateMonth('next')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('calendar.add_session')}
              </Button>
              <div className="flex bg-slate-100 rounded-lg p-1">
                <Button
                  variant={viewType === 'month' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewType('month')}
                  className={viewType === 'month' ? 'bg-white shadow-sm' : ''}
                >
                  {t('calendar.month')}
                </Button>
                <Button
                  variant={viewType === 'week' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewType('week')}
                  className={viewType === 'week' ? 'bg-white shadow-sm' : ''}
                >
                  {t('calendar.week')}
                </Button>
                <Button
                  variant={viewType === 'day' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewType('day')}
                  className={viewType === 'day' ? 'bg-white shadow-sm' : ''}
                >
                  {t('calendar.day')}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      <Card className="overflow-hidden">
        {/* Calendar Header Days */}
        <div className="grid grid-cols-7 border-b border-slate-200">
          {dayNames.map((day, index) => (
            <div key={index} className="p-4 text-center font-medium text-slate-600 border-r border-slate-200 last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days Grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            const daySessions = getSessionsForDate(day.date);
            
            return (
              <div
                key={index}
                className={`min-h-32 p-2 border-r border-b border-slate-200 last:border-r-0 ${
                  !day.isCurrentMonth ? 'bg-slate-50' : ''
                } ${day.isToday ? 'bg-blue-50' : ''}`}
              >
                <div
                  className={`text-sm mb-2 ${
                    !day.isCurrentMonth
                      ? 'text-slate-400'
                      : day.isToday
                      ? 'font-bold text-primary'
                      : 'font-medium text-slate-900'
                  }`}
                >
                  {day.date.getDate()}
                </div>
                
                {/* Sessions for this day */}
                {daySessions.length > 0 && (
                  <div className="space-y-1">
                    {daySessions.slice(0, 3).map((session: Session) => {
                      const client = getClientById(session.clientId);
                      if (!client) return null;
                      
                      const sessionColor = session.status === 'completed' 
                        ? 'bg-emerald-600 text-white'
                        : day.isToday
                        ? 'bg-primary text-white'
                        : session.status === 'in_progress'
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-100 text-slate-700';
                      
                      return (
                        <div
                          key={session.id}
                          className={`text-xs px-2 py-1 rounded truncate ${sessionColor} ${
                            day.isToday ? 'font-medium' : ''
                          }`}
                          title={`${session.startTime} - ${client.name}`}
                        >
                          {session.startTime} {getInitials(client.name)}
                        </div>
                      );
                    })}
                    
                    {daySessions.length > 3 && (
                      <div className="text-xs text-slate-500 px-2">
                        +{daySessions.length - 3} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Loading State */}
      {isLoadingSessions && (
        <div className="text-center py-8 text-slate-500">
          <CalendarIcon className="h-8 w-8 mx-auto mb-2 animate-pulse" />
          Loading sessions...
        </div>
      )}
    </div>
  );
}
