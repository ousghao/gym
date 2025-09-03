import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { progressApi, clientApi } from '@/lib/api';
import { TrendingUp, TrendingDown, Calendar, Target, BarChart3, Activity } from 'lucide-react';
import type { ExerciseProgress, Client } from '@shared/schema';

interface ProgressAnalyticsProps {
  clientId?: number;
}

export function ProgressAnalytics({ clientId: initialClientId }: ProgressAnalyticsProps) {
  const [selectedClientId, setSelectedClientId] = useState<number | undefined>(initialClientId);
  const [selectedExercise, setSelectedExercise] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('30'); // days

  const { data: clients } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: clientApi.getAll,
  });

  const { data: progressSummary } = useQuery({
    queryKey: ['/api/progress/summary', selectedClientId],
    queryFn: () => progressApi.getSummary(selectedClientId!),
    enabled: !!selectedClientId,
  });

  const { data: progressData } = useQuery({
    queryKey: ['/api/progress', selectedClientId, selectedExercise],
    queryFn: () => progressApi.getAll(selectedClientId, selectedExercise === 'all' ? undefined : selectedExercise),
    enabled: !!selectedClientId,
  });

  const getFilteredProgress = () => {
    if (!progressData) return [];
    
    const daysAgo = parseInt(timeRange);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
    
    return progressData.filter(p => new Date(p.date) >= cutoffDate);
  };

  const calculateStats = (exercises: Record<string, any>) => {
    const stats = {
      totalExercises: Object.keys(exercises).length,
      totalSessions: 0,
      averageImprovement: 0,
      topImprovement: { exercise: '', improvement: 0 },
      consistencyScore: 0,
    };

    let totalImprovement = 0;
    let improvementCount = 0;

    Object.entries(exercises).forEach(([exercise, data]) => {
      stats.totalSessions += data.totalSessions;
      
      if (data.improvement?.weight && data.improvement.weight > 0) {
        totalImprovement += data.improvement.weight;
        improvementCount++;
        
        if (data.improvement.weight > stats.topImprovement.improvement) {
          stats.topImprovement = {
            exercise,
            improvement: data.improvement.weight,
          };
        }
      }
    });

    stats.averageImprovement = improvementCount > 0 ? totalImprovement / improvementCount : 0;
    
    // Simple consistency score based on sessions per exercise
    const avgSessionsPerExercise = stats.totalSessions / (stats.totalExercises || 1);
    stats.consistencyScore = Math.min(100, Math.round((avgSessionsPerExercise / 10) * 100));

    return stats;
  };

  const getProgressTrend = (exerciseName: string) => {
    const exerciseProgress = progressData?.filter(p => p.exerciseName === exerciseName)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) || [];
    
    if (exerciseProgress.length < 2) return null;
    
    const first = exerciseProgress[0];
    const last = exerciseProgress[exerciseProgress.length - 1];
    
    if (!first.weight || !last.weight) return null;
    
    const trend = ((last.weight - first.weight) / first.weight) * 100;
    return {
      trend,
      isImproving: trend > 0,
      sessions: exerciseProgress.length,
      weightChange: last.weight - first.weight,
    };
  };

  const stats = progressSummary ? calculateStats(progressSummary) : null;
  const filteredProgress = getFilteredProgress();

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dark:text-white">
            <BarChart3 className="h-5 w-5" />
            Progress Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium dark:text-white">Client</label>
              <Select value={selectedClientId?.toString()} onValueChange={(value) => setSelectedClientId(parseInt(value))}>
                <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600">
                  <SelectValue placeholder="Select client..." />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800">
                  {clients?.map((client) => (
                    <SelectItem key={client.id} value={client.id.toString()} className="dark:text-white">
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium dark:text-white">Exercise</label>
              <Select value={selectedExercise} onValueChange={setSelectedExercise}>
                <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600">
                  <SelectValue placeholder="All exercises" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800">
                  <SelectItem value="all" className="dark:text-white">All exercises</SelectItem>
                  {progressSummary && Object.keys(progressSummary).map((exercise) => (
                    <SelectItem key={exercise} value={exercise} className="dark:text-white">
                      {exercise}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium dark:text-white">Time Range</label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800">
                  <SelectItem value="7" className="dark:text-white">Last 7 days</SelectItem>
                  <SelectItem value="30" className="dark:text-white">Last 30 days</SelectItem>
                  <SelectItem value="90" className="dark:text-white">Last 3 months</SelectItem>
                  <SelectItem value="365" className="dark:text-white">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedClientId && stats && (
        <>
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="dark:bg-slate-800 dark:border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Activity className="h-8 w-8 text-blue-500" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-slate-600 dark:text-gray-300">Total Exercises</p>
                    <p className="text-2xl font-bold dark:text-white">{stats.totalExercises}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="dark:bg-slate-800 dark:border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 text-green-500" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-slate-600 dark:text-gray-300">Total Sessions</p>
                    <p className="text-2xl font-bold dark:text-white">{stats.totalSessions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="dark:bg-slate-800 dark:border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-amber-500" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-slate-600 dark:text-gray-300">Avg. Improvement</p>
                    <p className="text-2xl font-bold dark:text-white">{stats.averageImprovement.toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="dark:bg-slate-800 dark:border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Target className="h-8 w-8 text-purple-500" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-slate-600 dark:text-gray-300">Consistency</p>
                    <p className="text-2xl font-bold dark:text-white">{stats.consistencyScore}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Exercise Progress Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(progressSummary).map(([exercise, data]) => {
              const trend = getProgressTrend(exercise);
              const exerciseData = data as any; // Type assertion for unknown data
              
              return (
                <Card key={exercise} className="dark:bg-slate-800 dark:border-slate-700">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg dark:text-white">{exercise}</CardTitle>
                      {trend && (
                        <Badge variant={trend.isImproving ? "default" : "secondary"}>
                          {trend.isImproving ? (
                            <TrendingUp className="h-3 w-3 mr-1" />
                          ) : (
                            <TrendingDown className="h-3 w-3 mr-1" />
                          )}
                          {trend.trend.toFixed(1)}%
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-600 dark:text-gray-300">Last Weight:</span>
                        <p className="font-semibold dark:text-white">{exerciseData.lastWeight || 'N/A'} kg</p>
                      </div>
                      <div>
                        <span className="text-slate-600 dark:text-gray-300">Last Reps:</span>
                        <p className="font-semibold dark:text-white">{exerciseData.lastReps || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-slate-600 dark:text-gray-300">Sessions:</span>
                        <p className="font-semibold dark:text-white">{exerciseData.totalSessions}</p>
                      </div>
                      <div>
                        <span className="text-slate-600 dark:text-gray-300">Next Goal:</span>
                        <p className="font-semibold text-primary">{exerciseData.suggestedWeight || 'N/A'} kg</p>
                      </div>
                    </div>
                    
                    {trend && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-600">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-600 dark:text-gray-300">Progress:</span>
                          <span className={trend.isImproving ? "text-green-600" : "text-red-600"}>
                            {trend.weightChange > 0 ? '+' : ''}{trend.weightChange} kg
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Recent Progress Timeline */}
          {filteredProgress.length > 0 && (
            <Card className="dark:bg-slate-800 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="dark:text-white">Recent Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {filteredProgress
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((progress) => (
                      <div key={progress.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Activity className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium dark:text-white">{progress.exerciseName}</p>
                            <p className="text-sm text-slate-600 dark:text-gray-300">
                              {new Date(progress.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold dark:text-white">
                            {progress.weight}kg × {progress.reps} 
                            {progress.sets && progress.sets > 1 && ` (${progress.sets} sets)`}
                          </p>
                          {progress.notes && (
                            <p className="text-sm text-slate-500 dark:text-gray-400">{progress.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!selectedClientId && (
        <Card className="dark:bg-slate-800 dark:border-slate-700">
          <CardContent className="text-center py-12">
            <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50 dark:text-gray-400" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Select a Client</h3>
            <p className="text-slate-600 dark:text-gray-300">Choose a client to view their progress analytics and trends.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
