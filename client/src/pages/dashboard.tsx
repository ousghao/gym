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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface DashboardProps {
  onGenerateWorkout: () => void;
  onLogProgress: () => void;
  onScheduleSession: () => void;
  onViewReports: () => void;
  onStartWorkout?: (clientId: number) => void;
}

export function Dashboard({ 
  onGenerateWorkout, 
  onLogProgress, 
  onScheduleSession, 
  onViewReports,
  onStartWorkout
}: DashboardProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats, isLoading: isLoadingStats, error: statsError } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    queryFn: dashboardApi.getStats,
  });

  const { data: todaySessions, isLoading: isLoadingSessions } = useQuery({
    queryKey: ['/api/dashboard/today-sessions'],
    queryFn: dashboardApi.getTodaySessions,
  });

  const startSessionMutation = useMutation({
    mutationFn: (sessionId: number) => sessionApi.update(sessionId, { status: 'in_progress' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/today-sessions'] });
      toast({
        title: "Session Started",
        description: "The session has been marked as in progress",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start the session",
        variant: "destructive",
      });
    },
  });

  const handleStartSession = (sessionId: number) => {
    // Find the session to get client ID
    const session = todaySessions?.find(s => s.id === sessionId);
    if (session) {
      // Update session status and open workout modal
      startSessionMutation.mutate(sessionId);
      if (onStartWorkout) {
        onStartWorkout(session.clientId);
      }
    }
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
        {statsError ? (
          <div className="col-span-4 text-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
            Failed to load dashboard stats. Please try again later.
          </div>
        ) : (
          <>
            <Card className="dark:bg-slate-800 dark:border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-lg">
                    <Users className="h-5 w-5 text-primary dark:text-primary-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-slate-600 dark:text-gray-300">{t('stats.total_clients')}</p>
                    {isLoadingStats ? (
                      <Skeleton className="h-6 w-8" />
                    ) : (
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.totalClients || 0}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="dark:bg-slate-800 dark:border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                    <Calendar className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-slate-600 dark:text-gray-300">{t('stats.sessions_week')}</p>
                    {isLoadingStats ? (
                      <Skeleton className="h-6 w-8" />
                    ) : (
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.sessionsThisWeek || 0}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="dark:bg-slate-800 dark:border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-slate-600 dark:text-gray-300">{t('stats.avg_progress')}</p>
                    {isLoadingStats ? (
                      <Skeleton className="h-6 w-12" />
                    ) : (
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.avgProgress || '0%'}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="dark:bg-slate-800 dark:border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Bot className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-slate-600 dark:text-gray-300">{t('stats.ai_plans')}</p>
                    {isLoadingStats ? (
                      <Skeleton className="h-6 w-8" />
                    ) : (
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.aiPlansGenerated || 0}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Today's Schedule */}
      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-slate-900 dark:text-white">{t('dashboard.todays_schedule')}</CardTitle>
            <span className="text-sm text-slate-500 dark:text-gray-400">
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
                  isStarting={startSessionMutation.isPending}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 dark:text-gray-400">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No sessions scheduled for today</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity & Quick Actions */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="dark:bg-slate-800 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-white">{t('dashboard.recent_activity')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                  <Plus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-900 dark:text-white">New workout plan generated</p>
                  <p className="text-xs text-slate-500 dark:text-gray-400">2 hours ago</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-900 dark:text-white">Progress updated for client</p>
                  <p className="text-xs text-slate-500 dark:text-gray-400">4 hours ago</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                  <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-900 dark:text-white">New client added to system</p>
                  <p className="text-xs text-slate-500 dark:text-gray-400">Yesterday</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="dark:bg-slate-800 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-white">{t('dashboard.quick_actions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={onGenerateWorkout}
                variant="outline"
                className="p-4 h-auto bg-gradient-to-br from-primary/5 to-blue-50 border-primary/20 hover:from-primary/10 hover:to-blue-100 dark:from-primary/10 dark:to-blue-900/20 dark:border-primary/30 dark:hover:from-primary/20 dark:hover:to-blue-900/30"
              >
                <div className="text-center w-full">
                  <Bot className="h-8 w-8 text-primary dark:text-primary-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{t('actions.generate_ai_plan')}</p>
                </div>
              </Button>
              
              <Button
                onClick={onLogProgress}
                variant="outline"
                className="p-4 h-auto bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200 hover:from-emerald-100 hover:to-green-100 dark:from-emerald-900/20 dark:to-green-900/20 dark:border-emerald-700/30 dark:hover:from-emerald-900/30 dark:hover:to-green-900/30"
              >
                <div className="text-center w-full">
                  <BarChart3 className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{t('actions.log_progress')}</p>
                </div>
              </Button>
              
              <Button
                onClick={onScheduleSession}
                variant="outline"
                className="p-4 h-auto bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200 hover:from-amber-100 hover:to-yellow-100 dark:from-amber-900/20 dark:to-yellow-900/20 dark:border-amber-700/30 dark:hover:from-amber-900/30 dark:hover:to-yellow-900/30"
              >
                <div className="text-center w-full">
                  <CalendarPlus className="h-8 w-8 text-amber-600 dark:text-amber-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{t('actions.schedule_session')}</p>
                </div>
              </Button>
              
              <Button
                onClick={onViewReports}
                variant="outline"
                className="p-4 h-auto bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200 hover:from-purple-100 hover:to-indigo-100 dark:from-purple-900/20 dark:to-indigo-900/20 dark:border-purple-700/30 dark:hover:from-purple-900/30 dark:hover:to-indigo-900/30"
              >
                <div className="text-center w-full">
                  <PieChart className="h-8 w-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{t('actions.view_reports')}</p>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
