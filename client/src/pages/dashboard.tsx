import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/use-language';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';
import { SessionCard } from '@/components/session-card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  Bot, 
  BarChart3, 
  Plus, 
  CalendarPlus, 
  PieChart,
  Trophy,
  Zap,
  Target
} from 'lucide-react';

interface DashboardProps {
  onGenerateWorkout: () => void;
  onLogProgress: () => void;
  onScheduleSession: () => void;
  onViewReports: () => void;
}

export function Dashboard({ 
  onGenerateWorkout, 
  onLogProgress, 
  onScheduleSession, 
  onViewReports 
}: DashboardProps) {
  const { t } = useLanguage();

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    queryFn: dashboardApi.getStats,
  });

  const { data: todaySessions, isLoading: isLoadingSessions } = useQuery({
    queryKey: ['/api/dashboard/today-sessions'],
    queryFn: dashboardApi.getTodaySessions,
  });

  const handleStartSession = (sessionId: number) => {
    console.log('Starting session:', sessionId);
    // Here you would typically update the session status
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary to-blue-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">{t('dashboard.welcome')}</h2>
            <p className="text-blue-100">
              {isLoadingSessions 
                ? 'Loading...' 
                : t('dashboard.today_summary', { count: todaySessions?.length || 0 })
              }
            </p>
          </div>
          <div className="hidden sm:block">
            <Trophy className="h-16 w-16 text-blue-200" />
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-slate-600">{t('stats.total_clients')}</p>
                {isLoadingStats ? (
                  <Skeleton className="h-6 w-8" />
                ) : (
                  <p className="text-2xl font-bold text-slate-900">{stats?.totalClients || 0}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Calendar className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-slate-600">{t('stats.sessions_week')}</p>
                {isLoadingStats ? (
                  <Skeleton className="h-6 w-8" />
                ) : (
                  <p className="text-2xl font-bold text-slate-900">{stats?.sessionsThisWeek || 0}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-amber-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-slate-600">{t('stats.avg_progress')}</p>
                {isLoadingStats ? (
                  <Skeleton className="h-6 w-12" />
                ) : (
                  <p className="text-2xl font-bold text-slate-900">{stats?.avgProgress || '0%'}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Bot className="h-5 w-5 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-slate-600">{t('stats.ai_plans')}</p>
                {isLoadingStats ? (
                  <Skeleton className="h-6 w-8" />
                ) : (
                  <p className="text-2xl font-bold text-slate-900">{stats?.aiPlansGenerated || 0}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('dashboard.todays_schedule')}</CardTitle>
            <span className="text-sm text-slate-500">
              {new Date().toLocaleDateString()}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingSessions ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : todaySessions && todaySessions.length > 0 ? (
            <div className="space-y-4">
              {todaySessions.map((sessionWithClient) => (
                <SessionCard
                  key={sessionWithClient.id}
                  session={sessionWithClient}
                  client={sessionWithClient.client}
                  onStart={handleStartSession}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No sessions scheduled for today</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity & Quick Actions */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.recent_activity')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Plus className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-900">New workout plan generated</p>
                  <p className="text-xs text-slate-500">2 hours ago</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-900">Progress updated for client</p>
                  <p className="text-xs text-slate-500">4 hours ago</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <Users className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-900">New client added to system</p>
                  <p className="text-xs text-slate-500">Yesterday</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.quick_actions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={onGenerateWorkout}
                variant="outline"
                className="p-4 h-auto bg-gradient-to-br from-primary/5 to-blue-50 border-primary/20 hover:from-primary/10 hover:to-blue-100"
              >
                <div className="text-center w-full">
                  <Bot className="h-8 w-8 text-primary mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-900">{t('actions.generate_ai_plan')}</p>
                </div>
              </Button>
              
              <Button
                onClick={onLogProgress}
                variant="outline"
                className="p-4 h-auto bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200 hover:from-emerald-100 hover:to-green-100"
              >
                <div className="text-center w-full">
                  <BarChart3 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-900">{t('actions.log_progress')}</p>
                </div>
              </Button>
              
              <Button
                onClick={onScheduleSession}
                variant="outline"
                className="p-4 h-auto bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200 hover:from-amber-100 hover:to-yellow-100"
              >
                <div className="text-center w-full">
                  <CalendarPlus className="h-8 w-8 text-amber-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-900">{t('actions.schedule_session')}</p>
                </div>
              </Button>
              
              <Button
                onClick={onViewReports}
                variant="outline"
                className="p-4 h-auto bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200 hover:from-purple-100 hover:to-indigo-100"
              >
                <div className="text-center w-full">
                  <PieChart className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-900">{t('actions.view_reports')}</p>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
