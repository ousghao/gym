import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/hooks/use-language';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clientApi, progressApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type { InsertExerciseProgress } from '@shared/schema';
import { X, Plus, TrendingUp, Calendar, Target, BarChart3 } from 'lucide-react';

interface ProgressLogModalProps {
  open: boolean;
  onClose: () => void;
  preSelectedClientId?: number;
}

const COMMON_EXERCISES = [
  'Bench Press', 'Squats', 'Deadlift', 'Pull-ups', 'Push-ups', 
  'Overhead Press', 'Barbell Row', 'Dumbbell Press', 'Leg Press', 
  'Bicep Curls', 'Tricep Dips', 'Lunges', 'Plank', 'Lat Pulldown'
];

export function ProgressLogModal({ open, onClose, preSelectedClientId }: ProgressLogModalProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    clientId: preSelectedClientId || 0,
    exerciseName: '',
    weight: undefined as number | undefined,
    reps: undefined as number | undefined,
    sets: undefined as number | undefined,
    duration: undefined as number | undefined,
    notes: '',
  });

  const [showSuggestions, setShowSuggestions] = useState(false);

  const { data: clients } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: clientApi.getAll,
    enabled: open,
  });

  const { data: progressSummary } = useQuery({
    queryKey: ['/api/progress/summary', formData.clientId],
    queryFn: () => progressApi.getSummary(formData.clientId!),
    enabled: !!formData.clientId && open,
  });

  const { data: recentProgress } = useQuery({
    queryKey: ['/api/progress', formData.clientId],
    queryFn: () => progressApi.getAll(formData.clientId),
    enabled: !!formData.clientId && open,
  });

  const logProgressMutation = useMutation({
    mutationFn: progressApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/progress'] });
      queryClient.invalidateQueries({ queryKey: ['/api/progress/summary'] });
      toast({
        title: "Success",
        description: "Progress logged successfully",
      });
      onClose();
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to log progress",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (formData.exerciseName && progressSummary?.[formData.exerciseName]) {
      const lastData = progressSummary[formData.exerciseName];
      // Auto-suggest next progression if available
      if (lastData.suggestedWeight) {
        setFormData(prev => ({ 
          ...prev, 
          weight: prev.weight || lastData.suggestedWeight 
        }));
      }
    }
  }, [formData.exerciseName, progressSummary]);

  const resetForm = () => {
    setFormData({
      clientId: preSelectedClientId || 0,
      exerciseName: '',
      weight: undefined,
      reps: undefined,
      sets: undefined,
      duration: undefined,
      notes: '',
    });
    setShowSuggestions(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.clientId || !formData.exerciseName) {
      toast({
        title: "Validation Error",
        description: "Please select a client and enter an exercise name",
        variant: "destructive",
      });
      return;
    }

    logProgressMutation.mutate(formData as InsertExerciseProgress);
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  const selectExercise = (exerciseName: string) => {
    setFormData(prev => ({ ...prev, exerciseName }));
    setShowSuggestions(false);
  };

  const getPreviousData = () => {
    if (!formData.exerciseName || !progressSummary) return null;
    return progressSummary[formData.exerciseName];
  };

  const getRecentExercises = () => {
    if (!recentProgress) return [];
    const uniqueExercises = [...new Set(recentProgress.map(p => p.exerciseName))];
    return uniqueExercises.slice(0, 5);
  };

  const previousData = getPreviousData();
  const recentExercises = getRecentExercises();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl dark:bg-slate-900 dark:text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 dark:text-white">
            <BarChart3 className="h-5 w-5 text-primary" />
            {t('actions.log_progress')}
          </DialogTitle>
        </DialogHeader>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>{t('forms.select_client')} *</Label>
                <Select 
                  value={formData.clientId?.toString()} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, clientId: parseInt(value) }))}
                  disabled={!!preSelectedClientId}
                >
                  <SelectTrigger className="dark:bg-slate-800 dark:border-slate-600">
                    <SelectValue placeholder="Choose client..." />
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
                <Label htmlFor="exerciseName">Exercise Name *</Label>
                <div className="relative">
                  <Input
                    id="exerciseName"
                    value={formData.exerciseName}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, exerciseName: e.target.value }));
                      setShowSuggestions(e.target.value.length > 0);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="e.g. Bench Press, Squats"
                    className="dark:bg-slate-800 dark:border-slate-600"
                  />
                  
                  {showSuggestions && (
                    <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md shadow-lg">
                      {recentExercises.length > 0 && (
                        <div>
                          <div className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-gray-400 border-b">
                            Recent Exercises
                          </div>
                          {recentExercises.map((exercise) => (
                            <button
                              key={exercise}
                              type="button"
                              onClick={() => selectExercise(exercise)}
                              className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-white"
                            >
                              {exercise}
                            </button>
                          ))}
                        </div>
                      )}
                      
                      <div>
                        <div className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-gray-400 border-b">
                          Common Exercises
                        </div>
                        {COMMON_EXERCISES
                          .filter(exercise => 
                            exercise.toLowerCase().includes(formData.exerciseName?.toLowerCase() || '') &&
                            !recentExercises.includes(exercise)
                          )
                          .map((exercise) => (
                            <button
                              key={exercise}
                              type="button"
                              onClick={() => selectExercise(exercise)}
                              className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-white"
                            >
                              {exercise}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    value={formData.weight || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, weight: parseInt(e.target.value) || undefined }))}
                    placeholder="0"
                    className="dark:bg-slate-800 dark:border-slate-600"
                  />
                </div>
                <div>
                  <Label htmlFor="reps">Reps</Label>
                  <Input
                    id="reps"
                    type="number"
                    value={formData.reps || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, reps: parseInt(e.target.value) || undefined }))}
                    placeholder="0"
                    className="dark:bg-slate-800 dark:border-slate-600"
                  />
                </div>
                <div>
                  <Label htmlFor="sets">Sets</Label>
                  <Input
                    id="sets"
                    type="number"
                    value={formData.sets || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, sets: parseInt(e.target.value) || undefined }))}
                    placeholder="0"
                    className="dark:bg-slate-800 dark:border-slate-600"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || undefined }))}
                  placeholder="For cardio exercises"
                  className="dark:bg-slate-800 dark:border-slate-600"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="How did it feel? Any observations..."
                  className="dark:bg-slate-800 dark:border-slate-600"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <Button type="button" variant="secondary" onClick={handleClose} className="flex-1">
                  {t('actions.cancel')}
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={logProgressMutation.isPending}
                >
                  {logProgressMutation.isPending ? 'Logging...' : 'Log Progress'}
                </Button>
              </div>
            </form>
          </div>

          {/* Progress Info */}
          <div className="space-y-4">
            {previousData && (
              <Card className="dark:bg-slate-800 dark:border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm dark:text-white">Previous Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-gray-300">Last Weight:</span>
                    <span className="font-medium dark:text-white">{previousData.lastWeight} kg</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-gray-300">Last Reps:</span>
                    <span className="font-medium dark:text-white">{previousData.lastReps}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-gray-300">Total Sessions:</span>
                    <span className="font-medium dark:text-white">{previousData.totalSessions}</span>
                  </div>
                  {previousData.suggestedWeight && (
                    <div className="flex justify-between text-sm pt-2 border-t">
                      <span className="text-slate-600 dark:text-gray-300">Suggested:</span>
                      <Badge variant="secondary" className="text-xs">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {previousData.suggestedWeight} kg
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {formData.clientId && (
              <Card className="dark:bg-slate-800 dark:border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm dark:text-white">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  {recentProgress && recentProgress.length > 0 ? (
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {recentProgress.slice(0, 5).map((progress) => (
                        <div key={progress.id} className="flex items-center justify-between text-xs">
                          <div className="dark:text-white">{progress.exerciseName}</div>
                          <div className="text-slate-500 dark:text-gray-400">
                            {progress.weight}kg × {progress.reps}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500 dark:text-gray-400 text-center py-2">
                      No recent progress logged
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFormData(prev => ({ 
                  ...prev, 
                  weight: previousData?.suggestedWeight || prev.weight 
                }))}
                disabled={!previousData?.suggestedWeight}
                className="text-xs"
              >
                <Target className="h-3 w-3 mr-2" />
                Use Suggested Weight
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFormData(prev => ({ 
                  ...prev, 
                  weight: previousData?.lastWeight,
                  reps: previousData?.lastReps 
                }))}
                disabled={!previousData}
                className="text-xs"
              >
                <Calendar className="h-3 w-3 mr-2" />
                Copy Last Session
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}