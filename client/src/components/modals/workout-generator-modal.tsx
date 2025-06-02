import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLanguage } from '@/hooks/use-language';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clientApi, workoutPlanApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { X, Bot, Sparkles, Cog, Check, RotateCcw, Save } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface WorkoutGeneratorModalProps {
  open: boolean;
  onClose: () => void;
  preSelectedClientId?: number;
}

// Utility to clean and parse Gemini response, supporting both English and Spanish keys
function parseGeminiPlan(raw: string): any[] | null {
  if (!raw) return null;
  try {
    let cleaned = raw.trim();
    // Remove all code block markers (```json, ```) globally
    cleaned = cleaned.replace(/```json|```/gi, '').trim();
    // Remove leading/trailing newlines and whitespace
    cleaned = cleaned.replace(/^[\s\r\n]+|[\s\r\n]+$/g, '');
    let arr = JSON.parse(cleaned);
    // If Spanish keys detected, map to English keys
    if (Array.isArray(arr) && arr.length > 0 && (arr[0].nombre || arr[0].enfoque || arr[0].ejercicios)) {
      arr = arr.map((day: any, idx: number) => ({
        day: day.nombre || day.day || `Día ${idx + 1}`,
        focus: day.enfoque || day.focus,
        exercises: Array.isArray(day.ejercicios)
          ? day.ejercicios.map((ex: any) => ({
              name: ex.nombre || ex.name,
              sets: ex.series || ex.sets,
              reps: ex.repeticiones || ex.reps,
            }))
          : day.exercises,
      }));
    }
    return arr;
  } catch (e) {
    console.error('Failed to parse Gemini plan:', e, raw);
    return null;
  }
}

// Utility to get the plan array from any plan structure
function getPlanArray(plan: any): any[] | null {
  if (Array.isArray(plan)) return plan;
  if (plan && typeof plan === 'object' && 'raw' in plan && typeof plan.raw === 'string') {
    let cleaned = plan.raw.replace(/```json|```/gi, '').trim();
    cleaned = cleaned.replace(/^[\s\r\n]+|[\s\r\n]+$/g, '');
    // Fix reps: 8-12, 10-15, Máximo, 10-15 por pierna, etc. (wrap in quotes if not already)
    cleaned = cleaned.replace(/"reps":\s*([0-9]+\s*-\s*[0-9]+(\s*por\s*pierna)?)/g, (match, p1) => `"reps": "${p1.trim()}"`);
    cleaned = cleaned.replace(/"reps":\s*(Máximo)/gi, (match, p1) => `"reps": "${p1}"`);
    cleaned = cleaned.replace(/"reps":\s*([0-9]+)\s*\"([^\"]+)\"/g, (match, num, text) => `"reps": "${num} ${text}"`);
    cleaned = cleaned.replace(/"reps":\s*([0-9]+\s*-\s*[0-9]+)\s*\"([^\"]+)\"/g, (match, range, text) => `"reps": "${range} ${text}"`);
    // Fix unquoted repeticiones with non-numeric values (e.g. 30 minutos, Máximo, etc.)
    cleaned = cleaned.replace(/("repeticiones"\s*:\s*)([0-9]+(?:\s*[^\d"\n,}]*)?)/gi, (_, key, val) => {
      const shouldQuote = !/^".*"$/.test(val.trim());
      return shouldQuote ? `${key}"${val.trim()}"` : `${key}${val}`;
    });
    // Try to auto-close a missing array bracket
    if (cleaned.startsWith('[') && !cleaned.endsWith(']')) cleaned += ']';
    try {
      let arr = JSON.parse(cleaned);
      // Map Spanish keys to English for display, but keep Spanish values
      if (Array.isArray(arr) && arr.length > 0) {
        arr = arr.map((day: any, idx: number) => {
          // Support both English and Spanish keys
          const d = day.dia || day.day || `Día ${idx + 1}`;
          const f = day.enfoque || day.focus;
          let exercises = day.ejercicios || day.exercises;
          if (Array.isArray(exercises)) {
            exercises = exercises.map((ex: any) => ({
              name: ex.nombre || ex.name,
              sets: ex.series || ex.sets,
              reps: ex.repeticiones || ex.reps,
            }));
          }
          return {
            day: d,
            focus: f,
            exercises: exercises || [],
          };
        });
      }
      return arr;
    } catch (e) {
      // Fallback: try to recover from a trailing comma or other minor issues
      try {
        let fixed = cleaned.replace(/,\s*\]/g, ']');
        let arr = JSON.parse(fixed);
        if (Array.isArray(arr) && arr.length > 0) {
          arr = arr.map((day: any, idx: number) => {
            const d = day.dia || day.day || `Día ${idx + 1}`;
            const f = day.enfoque || day.focus;
            let exercises = day.ejercicios || day.exercises;
            if (Array.isArray(exercises)) {
              exercises = exercises.map((ex: any) => ({
                name: ex.nombre || ex.name,
                sets: ex.series || ex.sets,
                reps: ex.repeticiones || ex.reps,
              }));
            }
            return {
              day: d,
              focus: f,
              exercises: exercises || [],
            };
          });
        }
        return arr;
      } catch (e2) {
        return null;
      }
    }
  }
  if (typeof plan === 'string') {
    return parseGeminiPlan(plan);
  }
  return null;
}

function getDayIcon(focus: string) {
  if (!focus) return '📅';
  const f = focus.toLowerCase();
  if (f.includes('rest')) return '💤';
  if (f.includes('recovery')) return '🧘‍♀️';
  if (f.includes('cardio')) return '🏃‍♂️';
  if (f.includes('strength')) return '💪';
  if (f.includes('chest') || f.includes('arms') || f.includes('triceps') || f.includes('biceps')) return '💪';
  if (f.includes('legs')) return '🦵';
  if (f.includes('back')) return '🏋️‍♂️';
  if (f.includes('shoulder')) return '🏋️';
  return '🏋️‍♂️';
}

export function WorkoutGeneratorModal({ open, onClose, preSelectedClientId }: WorkoutGeneratorModalProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedClientId, setSelectedClientId] = useState<number | undefined>(preSelectedClientId);
  const [duration, setDuration] = useState('1_week');
  const [focus, setFocus] = useState('balanced');
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
  const [generatedPlan, setGeneratedPlan] = useState<any>(null);

  const { data: clients } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: clientApi.getAll,
    enabled: open,
  });

  const generateWorkoutMutation = useMutation({
    mutationFn: workoutPlanApi.generateAI,
    onSuccess: (data) => {
      let cleanPlan = data.plan;
      // If plan is a string or has .raw, always parse
      if (typeof data.plan === 'string') {
        const parsed = parseGeminiPlan(data.plan);
        cleanPlan = parsed || [];
      } else if (data.plan && typeof data.plan === 'object' && 'raw' in data.plan) {
        const parsed = parseGeminiPlan((data.plan as any).raw);
        cleanPlan = parsed || [];
      }
      setGeneratedPlan({
        ...data,
        plan: cleanPlan,
      });
      setGenerationStatus('success');
      queryClient.invalidateQueries({ queryKey: ['/api/workout-plans'] });
      toast({
        title: "Success",
        description: "Workout plan generated successfully!",
      });
    },
    onError: (error: any) => {
      setGenerationStatus('error');
      toast({
        title: "Error",
        description: error.message || "Failed to generate workout plan",
        variant: "destructive",
      });
    },
  });

  const savePlanMutation = useMutation({
    mutationFn: workoutPlanApi.create,
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Workout plan saved to client profile",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/workout-plans'] });
      onClose();
      resetModal();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save workout plan",
        variant: "destructive",
      });
    },
  });

  const handleGenerate = () => {
    if (!selectedClientId) {
      toast({
        title: "Validation Error",
        description: "Please select a client",
        variant: "destructive",
      });
      return;
    }

    setGenerationStatus('generating');
    generateWorkoutMutation.mutate({
      clientId: selectedClientId,
      duration,
      focus,
      language,
    });
  };

  const handleRegenerate = () => {
    setGenerationStatus('idle');
    setGeneratedPlan(null);
  };

  const handleSavePlan = () => {
    const planArr = getPlanArray(generatedPlan.plan);
    if (!Array.isArray(planArr)) {
      toast({
        title: "Invalid Plan",
        description: "The workout plan could not be saved. Try regenerating.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedClientId) {
      toast({
        title: "No Client Selected",
        description: "Please select a client before saving the plan.",
        variant: "destructive",
      });
      return;
    }
    // Compose InsertWorkoutPlan
    const planData = {
      clientId: selectedClientId,
      name: generatedPlan.name || `AI Plan for Client #${selectedClientId}`,
      description: generatedPlan.description || 'AI-generated plan',
      duration,
      focus,
      plan: planArr,
      isActive: true,
    };
    savePlanMutation.mutate(planData);
  };

  const resetModal = () => {
    setGenerationStatus('idle');
    setGeneratedPlan(null);
    if (!preSelectedClientId) {
      setSelectedClientId(undefined);
    }
    setDuration('1_week');
    setFocus('balanced');
  };

  const handleClose = () => {
    onClose();
    resetModal();
  };

  const selectedClient = clients?.find(c => c.id === selectedClientId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle>{t('modals.workout_generator.title')}</DialogTitle>
              <p className="text-sm text-muted-foreground">{t('modals.workout_generator.subtitle')}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Client Selection */}
          <div>
            <Label>{t('forms.select_client')}</Label>
            <Select 
              value={selectedClientId?.toString()} 
              onValueChange={(value) => setSelectedClientId(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose client..." />
              </SelectTrigger>
              <SelectContent>
                {clients?.map((client) => {
                  const goalKey = `goals.${client.goal}`;
                  const goalLabel = t(goalKey) !== goalKey ? t(goalKey) : client.goal;
                  return (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.name} - {goalLabel}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Generation Options */}
          <div className="bg-slate-50 rounded-lg p-4">
            <h3 className="font-semibold text-slate-900 mb-3">{t('generator.options')}</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>{t('generator.plan_duration')}</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1_week">1 Week</SelectItem>
                    <SelectItem value="2_weeks">2 Weeks</SelectItem>
                    <SelectItem value="4_weeks">4 Weeks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('generator.focus_area')}</Label>
                <Select value={focus} onValueChange={setFocus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="balanced">Balanced Training</SelectItem>
                    <SelectItem value="strength">Strength Focus</SelectItem>
                    <SelectItem value="cardio">Cardio Focus</SelectItem>
                    <SelectItem value="flexibility">Flexibility Focus</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* AI Generation Status */}
          <div className="border border-slate-200 rounded-lg p-6 text-center">
            {/* Idle State */}
            {generationStatus === 'idle' && (
              <div className="space-y-3">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center mx-auto">
                  <Sparkles className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{t('generator.ready_title')}</h3>
                <p className="text-slate-600">{t('generator.ready_description')}</p>
                <Button 
                  onClick={handleGenerate}
                  className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                  disabled={!selectedClientId}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {t('actions.generate_plan')}
                </Button>
              </div>
            )}

            {/* Loading State */}
            {generationStatus === 'generating' && (
              <div className="space-y-3">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center mx-auto">
                  <Cog className="h-8 w-8 text-purple-600 animate-spin" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{t('generator.generating_title')}</h3>
                <p className="text-slate-600">{t('generator.generating_description')}</p>
                <div className="w-32 h-2 bg-slate-200 rounded-full mx-auto">
                  <div className="h-2 bg-gradient-to-r from-purple-600 to-purple-700 rounded-full animate-pulse w-3/4"></div>
                </div>
              </div>
            )}

            {/* Success State */}
            {generationStatus === 'success' && generatedPlan && (
              <div className="space-y-4">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-full flex items-center justify-center mx-auto">
                  <Check className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{t('generator.success_title')}</h3>
                
                {/* Generated Plan Preview */}
                <div className="bg-white border border-slate-200 rounded-lg p-4 text-left">
                  <h4 className="font-semibold text-slate-900 mb-3">{generatedPlan.name}</h4>
                  <p className="text-sm text-slate-600 mb-3">{generatedPlan.description}</p>
                  {/* Visual Gemini Plan Display - Cards per day */}
                  {(() => {
                    const planArr = getPlanArray(generatedPlan.plan);
                    if (planArr && planArr.length > 0) {
                      return (
                        <div className="grid gap-6 md:grid-cols-2">
                          {planArr.map((day: any, idx: number) => {
                            const focusLower = (day.focus || '').toLowerCase();
                            const isRest = focusLower.includes('rest') || focusLower.includes('descanso') || focusLower.includes('recovery') || focusLower.includes('recuperación');
                            return (
                              <Card
                                key={idx}
                                className={`relative overflow-visible shadow-lg border-0 ${isRest ? 'bg-gradient-to-br from-blue-50 to-blue-100' : 'bg-gradient-to-br from-emerald-50 to-white'} rounded-2xl pl-4`}
                                style={{ borderLeft: `6px solid ${isRest ? '#60a5fa' : '#34d399'}` }}
                              >
                                <div className="absolute -left-6 top-6 flex flex-col items-center">
                                  <span className="text-3xl select-none" style={{ filter: isRest ? 'grayscale(0.5)' : 'none' }}>{getDayIcon(day.focus)}</span>
                                  <span className={`text-xs font-bold mt-1 ${isRest ? 'text-blue-400' : 'text-emerald-500'}`}>{day.day.split(' ')[1] || idx + 1}</span>
                                </div>
                                <CardHeader className="pb-2 flex-row items-center gap-2 pl-8">
                                  <CardTitle className="text-lg font-bold tracking-tight">{day.day} <span className="text-base font-normal text-slate-500">— {day.focus}</span></CardTitle>
                                </CardHeader>
                                <CardContent className="pl-8">
                                  {isRest ? (
                                    <div className="text-center text-lg py-6 flex flex-col items-center">
                                      <span className="text-4xl mb-2">🛌</span>
                                      <span className="font-semibold text-blue-600">{language === 'es' ? 'Día de Descanso' : 'Rest Day'}</span>
                                      <span className="text-slate-500 mt-2">{language === 'es' ? 'Recuerda hidratarte y moverte suavemente. ¡Tu cuerpo lo agradecerá!' : 'Remember to hydrate and move gently. Your body will thank you!'}</span>
                                    </div>
                                  ) : day.exercises && day.exercises.length > 0 ? (
                                    <ul className="space-y-3">
                                      {day.exercises.map((ex: any, i: number) => (
                                        <li key={i} className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2 shadow-sm">
                                          <span className="text-lg">{i === 0 ? '🔥' : '•'}</span>
                                          <span className="font-medium text-slate-800">{ex.name}</span>
                                          <span className="ml-auto text-slate-600 text-sm">
                                            {ex.sets} {language === 'es' ? 'series' : 'sets'}
                                            {ex.reps ? ` × ${ex.reps} ${language === 'es' ? 'repeticiones' : 'reps'}` : ''}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <div className="text-center text-slate-400 italic py-4">
                                      {language === 'es' ? 'No hay ejercicios listados.' : 'No exercises listed.'}
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      );
                    } else {
                      return (
                        <div className="text-red-600 bg-red-50 rounded p-3">
                          {language === 'es' ? 'No se pudo analizar el plan. Por favor, regenera.' : 'Failed to parse plan. Please regenerate.'}
                        </div>
                      );
                    }
                  })()}
                </div>

                <div className="flex space-x-3">
                  <Button onClick={handleSavePlan} className="flex-1">
                    <Save className="h-4 w-4 mr-2" />
                    {t('actions.save_plan')}
                  </Button>
                  <Button onClick={handleRegenerate} variant="secondary" className="flex-1">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    {t('actions.regenerate')}
                  </Button>
                </div>
              </div>
            )}

            {/* Error State */}
            {generationStatus === 'error' && (
              <div className="space-y-3">
                <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mx-auto">
                  <X className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Generation Failed</h3>
                <p className="text-slate-600">There was an error generating the workout plan. Please try again.</p>
                <Button onClick={handleRegenerate} variant="secondary">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
