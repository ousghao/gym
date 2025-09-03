import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLanguage } from '@/hooks/use-language';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientApi, progressApi, workoutPlanApi } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { X, Edit, Calendar, Bot, Plus } from 'lucide-react';
import type { Client } from '@shared/schema';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface ClientDetailModalProps {
  open: boolean;
  onClose: () => void;
  clientId: number | null;
  onGenerateWorkout: (clientId: number) => void;
  onLogProgress?: (clientId: number) => void;
}

export function ClientDetailModal({ open, onClose, clientId, onGenerateWorkout, onLogProgress }: ClientDetailModalProps) {
  const { t } = useLanguage();

  const { data: client, isLoading: isLoadingClient } = useQuery({
    queryKey: ['/api/clients', clientId],
    queryFn: () => clientApi.getById(clientId!),
    enabled: !!clientId && open,
  });

  const { data: workoutPlans, isLoading: isLoadingPlans } = useQuery({
    queryKey: ['/api/workout-plans', clientId],
    queryFn: () => workoutPlanApi.getAll(clientId!),
    enabled: !!clientId && open,
  });

  const { data: progressSummary, isLoading: isLoadingProgress } = useQuery({
    queryKey: ['/api/progress/summary', clientId],
    queryFn: () => progressApi.getSummary(clientId!),
    enabled: !!clientId && open,
  });

  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const queryClient = useQueryClient();

  const deletePlanMutation = useMutation({
    mutationFn: (planId: number) => workoutPlanApi.delete(planId),
    onSuccess: () => {
      setSelectedPlan(null);
      queryClient.invalidateQueries({ queryKey: ['/api/workout-plans', clientId] });
    },
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Unified, robust plan parsing function that handles all formats
  function getPlanArray(plan: any): any[] | null {
    // Case 1: Already an array
    if (Array.isArray(plan)) {
      return normalizePlanArray(plan);
    }

    // Case 2: Object with raw property (error case from backend)
    if (plan && typeof plan === 'object' && 'raw' in plan && typeof plan.raw === 'string') {
      return parseRawPlanString(plan.raw);
    }

    // Case 3: String (raw AI response)
    if (typeof plan === 'string') {
      return parseRawPlanString(plan);
    }

    // Case 4: Object that might be a parsed plan
    if (plan && typeof plan === 'object') {
      // Check if it looks like a parsed plan object
      const keys = Object.keys(plan);
      if (keys.some(key => key.includes('day') || key.includes('dia'))) {
        // Convert object to array format
        return normalizePlanArray([plan]);
      }
    }

    return null;
  }

  // Parse raw string from AI (handles both JSON and malformed responses)
  function parseRawPlanString(raw: string): any[] | null {
    if (!raw || typeof raw !== 'string') return null;

    try {
      // Clean the string
      let cleaned = raw.trim();
      
      // Remove code block markers
      cleaned = cleaned.replace(/```json|```/gi, '').trim();
      
      // Remove leading/trailing whitespace and newlines
      cleaned = cleaned.replace(/^[\s\r\n]+|[\s\r\n]+$/g, '');
      
      // Fix common JSON issues
      // Fix unquoted reps values
      cleaned = cleaned.replace(/"reps":\s*([0-9]+(?:-[0-9]+)?(?:\s*(?:per\s*leg|por\s*pierna|minutos?))?)/gi, (_, val) => `"reps": "${val.trim()}"`);
      cleaned = cleaned.replace(/"reps":\s*(Máximo|Maximum)/gi, (_, val) => `"reps": "${val}"`);
      cleaned = cleaned.replace(/"repeticiones":\s*([0-9]+(?:-[0-9]+)?(?:\s*(?:per\s*leg|por\s*pierna|minutos?))?)/gi, (_, val) => `"repeticiones": "${val.trim()}"`);
      cleaned = cleaned.replace(/"repeticiones":\s*(Máximo|Maximum)/gi, (_, val) => `"repeticiones": "${val}"`);
      
      // Fix trailing commas
      cleaned = cleaned.replace(/,\s*\]/g, ']');
      cleaned = cleaned.replace(/,\s*\}/g, '}');
      
      // Ensure array brackets if missing
      if (!cleaned.startsWith('[') && !cleaned.startsWith('{')) {
        cleaned = '[' + cleaned + ']';
      } else if (cleaned.startsWith('[') && !cleaned.endsWith(']')) {
        cleaned += ']';
      }

      // Try to parse
      const parsed = JSON.parse(cleaned);
      
      if (Array.isArray(parsed)) {
        return normalizePlanArray(parsed);
      } else if (parsed && typeof parsed === 'object') {
        return normalizePlanArray([parsed]);
      }
      
      return null;
    } catch (error) {
      console.warn('Failed to parse plan string:', error, raw);
      return null;
    }
  }

  // Normalize plan array to consistent format (handles both English and Spanish)
  function normalizePlanArray(arr: any[]): any[] {
    if (!Array.isArray(arr) || arr.length === 0) return [];

    return arr.map((day: any, idx: number) => {
      const dayName = day.day || day.dia || `Day ${idx + 1}`;
      const focus = day.focus || day.enfoque || 'General';
      const exercises = day.exercises || day.ejercicios || [];

      // Determine if it's a rest day
      const isRest = focus.toLowerCase().includes('descanso') || 
                    focus.toLowerCase().includes('rest') || 
                    focus.toLowerCase().includes('recovery') ||
                    exercises.length === 0;

      const normalizedExercises = Array.isArray(exercises) ? exercises.map((ex: any) => ({
        name: ex.name || ex.nombre || 'Exercise',
        sets: ex.sets || ex.series || 0,
        reps: ex.reps || ex.repeticiones || '0'
      })) : [];

      return {
        day: dayName,
        focus: focus,
        exercises: normalizedExercises,
        isRest: isRest
      };
    });
  }
  

  if (!client && !isLoadingClient) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto dark:bg-slate-900 dark:text-white">
          <DialogHeader>
            <div className="flex items-center justify-between">
              {isLoadingClient ? (
                <Skeleton className="h-8 w-48" />
              ) : (
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-primary font-bold text-xl">
                      {client ? getInitials(client.name) : ''}
                    </span>
                  </div>
                  <div>
                    <DialogTitle className="text-2xl dark:text-white">{client?.name}</DialogTitle>
                    <p className="text-slate-600 dark:text-gray-300">
                      {client?.age} years • {client?.goal} • {client?.experience}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Client Information */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-3">{t('client.basic_info')}</h3>
                {isLoadingClient ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-gray-300">{t('client.age')}:</span>
                      <span className="dark:text-white">{client?.age} years</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-gray-300">{t('client.weight')}:</span>
                      <span className="dark:text-white">{client?.weight} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-gray-300">{t('client.height')}:</span>
                      <span className="dark:text-white">{client?.height} cm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-gray-300">{t('client.experience')}:</span>
                      <span className="dark:text-white">
                        {client?.experience === 'beginner' && t('experience.beginner')}
                        {client?.experience === 'intermediate' && t('experience.intermediate')}
                        {client?.experience === 'advanced' && t('experience.advanced')}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-3">{t('client.training_info')}</h3>
                {isLoadingClient ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-gray-300">{t('client.goal')}:</span>
                      <span className="dark:text-white">
                        {client?.goal === 'weight_loss' && t('goals.weight_loss')}
                        {client?.goal === 'muscle_gain' && t('goals.muscle_gain')}
                        {client?.goal === 'endurance' && t('goals.endurance')}
                        {client?.goal === 'strength' && t('goals.strength')}
                        {client?.goal === 'general_fitness' && t('goals.general_fitness')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-gray-300">{t('client.available_days')}:</span>
                      <span className="dark:text-white">{client?.availableDays.join(', ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-gray-300">{t('client.equipment')}:</span>
                      <span className="dark:text-white">
                        {client?.equipment === 'full_gym' && t('equipment.full_gym')}
                        {client?.equipment === 'home_basic' && t('equipment.home_basic')}
                        {client?.equipment === 'home_advanced' && t('equipment.home_advanced')}
                        {client?.equipment === 'bodyweight' && t('equipment.bodyweight')}
                      </span>
                    </div>
                    {client?.limitations && (
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-gray-300">{t('client.limitations')}:</span>
                        <span className="dark:text-white">{client.limitations}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Current Workout Plan */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{t('client.current_plan')}</h3>
                  <Button 
                    onClick={() => client && onGenerateWorkout(client.id)}
                    disabled={!client}
                  >
                    <Bot className="h-4 w-4 mr-2" />
                    {t('actions.generate_new')}
                  </Button>
                </div>
              </div>
              <div className="p-4">
                {isLoadingPlans ? (
                  <div className="space-y-3">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : workoutPlans && workoutPlans.length > 0 ? (
                  <div className="space-y-3">
                    {workoutPlans.slice(0, 3).map((plan) => (
                      <div key={plan.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg cursor-pointer group" onClick={() => setSelectedPlan(plan)}>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{plan.name}</p>
                          <p className="text-sm text-slate-600 dark:text-gray-300">{plan.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); if (window.confirm('Delete this plan?')) deletePlanMutation.mutate(plan.id); }}>
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Calendar className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 dark:text-gray-400">
                    <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No workout plans yet. Generate one to get started!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Progress Tracking */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{t('client.progress_tracking')}</h3>
                  <Button 
                    onClick={() => client && onLogProgress?.(client.id)}
                    disabled={!client || !onLogProgress}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('actions.log_workout')}
                  </Button>
                </div>
              </div>
              <div className="p-4">
                {isLoadingProgress ? (
                  <div className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                ) : progressSummary && Object.keys(progressSummary).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(progressSummary).map(([exercise, data]: [string, any]) => (
                      <div key={exercise} className="border border-slate-200 dark:border-slate-600 rounded-lg p-4 dark:bg-slate-700">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-slate-900 dark:text-white">{exercise}</h4>
                          <span className="text-xs text-slate-500 dark:text-gray-400">
                            {data.totalSessions} sessions
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600 dark:text-gray-300">Last weight:</span>
                          <span className="font-medium dark:text-white">{data.lastWeight || 'N/A'} kg</span>
                        </div>
                        {data.suggestedWeight && (
                          <div className="flex justify-between text-sm mt-1">
                            <span className="text-slate-600 dark:text-gray-300">{t('progress.suggested_weight')}:</span>
                            <span className="text-primary font-medium">{data.suggestedWeight} kg</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 dark:text-gray-400">
                    <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No progress logged yet. Start tracking workouts!</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 -mx-6 -mb-6 px-6 pb-6">
            <div className="flex space-x-3">
              <Button className="flex-1" disabled={!client}>
                <Edit className="h-4 w-4 mr-2" />
                {t('actions.edit_client')}
              </Button>
              <Button variant="secondary" className="flex-1">
                <Calendar className="h-4 w-4 mr-2" />
                {t('actions.view_calendar')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Plan Detail Modal */}
      <Dialog open={!!selectedPlan} onOpenChange={() => setSelectedPlan(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-slate-900 dark:text-white">
          <DialogHeader>
            <DialogTitle className="dark:text-white">{selectedPlan?.name}</DialogTitle>
            <p className="text-sm text-muted-foreground dark:text-gray-300 mb-2">{selectedPlan?.description}</p>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            {selectedPlan && selectedPlan.plan ? (() => {
              const planArr = getPlanArray(selectedPlan.plan);
              if (planArr && planArr.length > 0) {
                return (
                  <div className="space-y-4">
                    {planArr.map((day: any, idx: number) => (
                      <Card key={idx} className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200 dark:bg-slate-800 dark:border-slate-700 overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-primary/20 dark:bg-primary/30 rounded-full flex items-center justify-center">
                                <span className="text-lg">{getDayIcon(day.focus)}</span>
                              </div>
                              <div>
                                <CardTitle className="text-lg font-semibold text-slate-800 dark:text-white">
                                  {day.day || `Day ${idx + 1}`}
                                </CardTitle>
                                {day.focus && (
                                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                                    {day.focus}
                                  </p>
                                )}
                              </div>
                            </div>
                            {day.isRest && (
                              <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                                Rest Day
                              </span>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                          {day.exercises && day.exercises.length > 0 ? (
                            <div className="space-y-3">
                              {day.exercises.map((ex: any, i: number) => (
                                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-150">
                                  <div className="w-8 h-8 bg-white dark:bg-slate-600 rounded-lg flex items-center justify-center shadow-sm">
                                    <span className="text-sm">{getExerciseEmoji(ex.name)}</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-slate-900 dark:text-white truncate">
                                      {ex.name || 'Exercise'}
                                    </div>
                                    <div className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-4 mt-1">
                                      <span className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                                        <strong>{ex.sets || 0}</strong> sets
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                        <strong>{ex.reps || '0'}</strong> reps
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                              <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                                <span className="text-2xl">💤</span>
                              </div>
                              <p className="text-sm">
                                {day.isRest ? 'Rest and recovery day' : 'No exercises planned'}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                );
              } else {
                return (
                  <div className="space-y-4">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
                          <span className="text-red-600 dark:text-red-400">⚠️</span>
                        </div>
                        <div>
                          <h3 className="font-medium text-red-800 dark:text-red-200">Unable to display plan</h3>
                          <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                            The AI-generated plan couldn't be parsed correctly. Please try generating a new plan.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <details className="bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <summary className="p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300">
                        Show raw AI response (for debugging)
                      </summary>
                      <div className="p-3 pt-0">
                        <pre className="bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-3 rounded text-xs overflow-auto max-h-40 border border-slate-200 dark:border-slate-700">
                          {typeof selectedPlan.plan === 'string' 
                            ? selectedPlan.plan 
                            : JSON.stringify(selectedPlan.plan, null, 2)
                          }
                        </pre>
                      </div>
                    </details>
                  </div>
                );
              }
            })() : (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bot className="h-8 w-8 opacity-50" />
                </div>
                <p className="text-sm">No plan data available</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

  // Get appropriate icon for workout day focus
  function getDayIcon(focus: string) {
    if (!focus) return '📅';
    const f = focus.toLowerCase();
    if (f.includes('rest') || f.includes('descanso')) return '💤';
    if (f.includes('recovery') || f.includes('recuperación')) return '🧘‍♀️';
    if (f.includes('cardio')) return '🏃‍♂️';
    if (f.includes('strength') || f.includes('fuerza')) return '💪';
    if (f.includes('chest') || f.includes('pecho') || f.includes('arms') || f.includes('brazos') || 
        f.includes('triceps') || f.includes('biceps')) return '💪';
    if (f.includes('legs') || f.includes('piernas')) return '🦵';
    if (f.includes('back') || f.includes('espalda')) return '🏋️‍♂️';
    if (f.includes('shoulder') || f.includes('hombros')) return '🏋️';
    if (f.includes('core') || f.includes('abdomen')) return '🧘‍♀️';
    return '🏋️‍♂️';
  }

  // Helper to get emoji for exercise name
  function getExerciseEmoji(name: string) {
    if (!name) return '🏋️';
    const n = name.toLowerCase();
    if (n.includes('bench') || n.includes('press') || n.includes('banco')) return '🏋️';
    if (n.includes('curl') || n.includes('bicep') || n.includes('bícep')) return '💪';
    if (n.includes('run') || n.includes('cardio') || n.includes('correr')) return '🏃‍♂️';
    if (n.includes('row') || n.includes('remo')) return '🚣';
    if (n.includes('squat') || n.includes('leg') || n.includes('sentadilla') || n.includes('pierna')) return '🦵';
    if (n.includes('plank') || n.includes('core') || n.includes('plancha') || n.includes('abdomen')) return '🧘‍♀️';
    if (n.includes('stretch') || n.includes('estiramiento')) return '🤸';
    if (n.includes('tricep') || n.includes('trícep')) return '💪';
    if (n.includes('deadlift') || n.includes('peso muerto')) return '🏋️‍♂️';
    if (n.includes('pull') || n.includes('jalón')) return '🚣';
    if (n.includes('push') || n.includes('empuje')) return '🏋️';
    return '🏋️';
  }
