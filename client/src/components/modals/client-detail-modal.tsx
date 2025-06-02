import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLanguage } from '@/hooks/use-language';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientApi, progressApi, workoutPlanApi } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { X, Edit, Calendar, Bot, Plus } from 'lucide-react';
import type { Client } from '@shared/schema';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

interface ClientDetailModalProps {
  open: boolean;
  onClose: () => void;
  clientId: number | null;
  onGenerateWorkout: (clientId: number) => void;
}

export function ClientDetailModal({ open, onClose, clientId, onGenerateWorkout }: ClientDetailModalProps) {
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

  // Utility to get the plan array from any plan structure
  function getPlanArray(plan: any): any[] | null {
    if (Array.isArray(plan)) return plan;
    if (plan && typeof plan === 'object' && 'raw' in plan) {
      // Remove markdown/code block wrappers
      let cleaned = plan.raw.trim();
      cleaned = cleaned.replace(/```json|```/gi, '').trim();
      cleaned = cleaned.replace(/^[\s\r\n]+|[\s\r\n]+$/g, '');
      try {
        return JSON.parse(cleaned);
      } catch (e) {
        return null;
      }
    }
    if (typeof plan === 'string') {
      let cleaned = plan.trim();
      cleaned = cleaned.replace(/```json|```/gi, '').trim();
      cleaned = cleaned.replace(/^[\s\r\n]+|[\s\r\n]+$/g, '');
      try {
        return JSON.parse(cleaned);
      } catch (e) {
        return null;
      }
    }
    return null;
  }
  

  if (!client && !isLoadingClient) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                    <DialogTitle className="text-2xl">{client?.name}</DialogTitle>
                    <p className="text-slate-600">
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
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold text-slate-900 mb-3">{t('client.basic_info')}</h3>
                {isLoadingClient ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">{t('client.age')}:</span>
                      <span>{client?.age} years</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">{t('client.weight')}:</span>
                      <span>{client?.weight} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">{t('client.height')}:</span>
                      <span>{client?.height} cm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">{t('client.experience')}:</span>
                      <span>
                        {client?.experience === 'beginner' && t('experience.beginner')}
                        {client?.experience === 'intermediate' && t('experience.intermediate')}
                        {client?.experience === 'advanced' && t('experience.advanced')}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold text-slate-900 mb-3">{t('client.training_info')}</h3>
                {isLoadingClient ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">{t('client.goal')}:</span>
                      <span>
                        {client?.goal === 'weight_loss' && t('goals.weight_loss')}
                        {client?.goal === 'muscle_gain' && t('goals.muscle_gain')}
                        {client?.goal === 'endurance' && t('goals.endurance')}
                        {client?.goal === 'strength' && t('goals.strength')}
                        {client?.goal === 'general_fitness' && t('goals.general_fitness')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">{t('client.available_days')}:</span>
                      <span>{client?.availableDays.join(', ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">{t('client.equipment')}:</span>
                      <span>
                        {client?.equipment === 'full_gym' && t('equipment.full_gym')}
                        {client?.equipment === 'home_basic' && t('equipment.home_basic')}
                        {client?.equipment === 'home_advanced' && t('equipment.home_advanced')}
                        {client?.equipment === 'bodyweight' && t('equipment.bodyweight')}
                      </span>
                    </div>
                    {client?.limitations && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">{t('client.limitations')}:</span>
                        <span>{client.limitations}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Current Workout Plan */}
            <div className="bg-white border border-slate-200 rounded-lg">
              <div className="p-4 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">{t('client.current_plan')}</h3>
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
                      <div key={plan.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer group" onClick={() => setSelectedPlan(plan)}>
                        <div>
                          <p className="font-medium text-slate-900">{plan.name}</p>
                          <p className="text-sm text-slate-600">{plan.description}</p>
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
                  <div className="text-center py-8 text-slate-500">
                    <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No workout plans yet. Generate one to get started!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Progress Tracking */}
            <div className="bg-white border border-slate-200 rounded-lg">
              <div className="p-4 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">{t('client.progress_tracking')}</h3>
                  <Button>
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
                      <div key={exercise} className="border border-slate-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-slate-900">{exercise}</h4>
                          <span className="text-xs text-slate-500">
                            {data.totalSessions} sessions
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Last weight:</span>
                          <span className="font-medium">{data.lastWeight || 'N/A'} kg</span>
                        </div>
                        {data.suggestedWeight && (
                          <div className="flex justify-between text-sm mt-1">
                            <span className="text-slate-600">{t('progress.suggested_weight')}:</span>
                            <span className="text-primary font-medium">{data.suggestedWeight} kg</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No progress logged yet. Start tracking workouts!</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-200 bg-slate-50 -mx-6 -mb-6 px-6 pb-6">
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPlan?.name}</DialogTitle>
            <p className="text-sm text-muted-foreground mb-2">{selectedPlan?.description}</p>
          </DialogHeader>
          <div className="bg-slate-50 rounded-lg p-4 text-sm whitespace-pre-wrap break-words max-h-[70vh] overflow-y-auto">
            {selectedPlan && selectedPlan.plan ? (() => {
              const planArr = getPlanArray(selectedPlan.plan);
              if (planArr) {
                return (
                  <div className="space-y-4">
                    {planArr.map((day: any, idx: number) => (
                      <Card key={idx} className="shadow rounded-lg">
                        <CardHeader className="font-semibold text-primary text-lg">
                          {day.day ? `${day.day} - ${day.focus || ''}` : `Day ${idx + 1}${day.focus ? ' - ' + day.focus : ''}`}
                        </CardHeader>
                        <CardContent>
                          <ul className="list-none space-y-1">
                            {day.exercises && day.exercises.map((ex: any, i: number) => (
                              <li key={i} className="flex items-center gap-2">
                                <span>{getExerciseEmoji(ex.name)}</span>
                                <span className="font-medium">{ex.name}:</span>
                                <span>{ex.sets} sets × {ex.reps} reps</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                );
              } else {
                return <>
                  <div className="text-red-600 mb-2">Failed to parse plan. Please regenerate.</div>
                  <details><summary>Show raw Gemini response</summary><pre className="bg-slate-100 p-2 rounded text-xs mt-2">{typeof selectedPlan.plan === 'string' ? selectedPlan.plan : JSON.stringify(selectedPlan.plan, null, 2)}</pre></details>
                </>;
              }
            })() : <div className="text-slate-400">No plan data available.</div>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Helper to get emoji for exercise name
function getExerciseEmoji(name: string) {
  const n = name.toLowerCase();
  if (n.includes('bench') || n.includes('press')) return '🏋️';
  if (n.includes('curl') || n.includes('bicep')) return '💪';
  if (n.includes('run') || n.includes('cardio')) return '🏃‍♂️';
  if (n.includes('row')) return '🚣';
  if (n.includes('squat') || n.includes('leg')) return '🦵';
  if (n.includes('plank') || n.includes('core')) return '🧘‍♀️';
  if (n.includes('stretch')) return '🤸';
  if (n.includes('tricep')) return '💪';
  if (n.includes('deadlift')) return '🏋️‍♂️';
  return '🏋️';
}
