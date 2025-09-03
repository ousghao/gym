import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/hooks/use-language';
import { ProgressAnalytics } from '@/components/progress-analytics';
import { BarChart3, Plus, PlayCircle, Calendar } from 'lucide-react';

interface ProgressProps {
  onLogProgress: () => void;
  onStartWorkout: () => void;
  onViewReports: () => void;
}

export function Progress({ onLogProgress, onStartWorkout, onViewReports }: ProgressProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('analytics');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            {t('navigation.progress') || 'Progress Tracking'}
          </h1>
          <p className="text-slate-600 dark:text-gray-300">
            Track client progress, analyze trends, and manage workout sessions
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button onClick={onLogProgress} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Log Progress
          </Button>
          <Button onClick={onStartWorkout}>
            <PlayCircle className="h-4 w-4 mr-2" />
            Start Workout
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="dark:bg-slate-800 dark:border-slate-700">
          <CardContent className="p-4">
            <Button
              onClick={onLogProgress}
              variant="ghost"
              className="w-full h-auto p-4 flex flex-col items-center space-y-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
            >
              <Plus className="h-8 w-8 text-emerald-600" />
              <div className="text-center">
                <p className="font-medium dark:text-white">Quick Log</p>
                <p className="text-sm text-slate-600 dark:text-gray-300">Log individual exercise</p>
              </div>
            </Button>
          </CardContent>
        </Card>

        <Card className="dark:bg-slate-800 dark:border-slate-700">
          <CardContent className="p-4">
            <Button
              onClick={onStartWorkout}
              variant="ghost"
              className="w-full h-auto p-4 flex flex-col items-center space-y-2 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <PlayCircle className="h-8 w-8 text-blue-600" />
              <div className="text-center">
                <p className="font-medium dark:text-white">Start Session</p>
                <p className="text-sm text-slate-600 dark:text-gray-300">Begin workout session</p>
              </div>
            </Button>
          </CardContent>
        </Card>

        <Card className="dark:bg-slate-800 dark:border-slate-700">
          <CardContent className="p-4">
            <Button
              onClick={onViewReports}
              variant="ghost"
              className="w-full h-auto p-4 flex flex-col items-center space-y-2 hover:bg-purple-50 dark:hover:bg-purple-900/20"
            >
              <BarChart3 className="h-8 w-8 text-purple-600" />
              <div className="text-center">
                <p className="font-medium dark:text-white">View Reports</p>
                <p className="text-sm text-slate-600 dark:text-gray-300">Progress reports</p>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="analytics">Progress Analytics</TabsTrigger>
          <TabsTrigger value="sessions">Recent Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="mt-6">
          <ProgressAnalytics />
        </TabsContent>

        <TabsContent value="sessions" className="mt-6">
          <Card className="dark:bg-slate-800 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 dark:text-white">
                <Calendar className="h-5 w-5" />
                Recent Workout Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <PlayCircle className="h-16 w-16 mx-auto mb-4 opacity-50 dark:text-gray-400" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                  No Sessions Yet
                </h3>
                <p className="text-slate-600 dark:text-gray-300 mb-4">
                  Start tracking workout sessions to see progress over time
                </p>
                <Button onClick={onStartWorkout}>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Start Your First Session
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
