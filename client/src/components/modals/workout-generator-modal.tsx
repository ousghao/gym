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

// Unified, robust plan parsing function that handles all formats
function parseGeminiPlan(raw: string): any[] | null {
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
    console.warn('Failed to parse Gemini plan:', error, raw);
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

// Utility to get the plan array from any plan structure
function getPlanArray(plan: any): any[] | null {
  // Case 1: Already an array
  if (Array.isArray(plan)) {
    return normalizePlanArray(plan);
  }

  // Case 2: Object with raw property (error case from backend)
  if (plan && typeof plan === 'object' && 'raw' in plan && typeof plan.raw === 'string') {
    return parseGeminiPlan(plan.raw);
  }

  // Case 3: String (raw AI response)
  if (typeof plan === 'string') {
    return parseGeminiPlan(plan);
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
    onSuccess: (data: any) => {
      try {
        let cleanPlan = data.plan;
        // If plan is a string or has .raw, always parse
        if (typeof data.plan === 'string') {
          const parsed = parseGeminiPlan(data.plan);
          cleanPlan = parsed || [];
        } else if (data.plan && typeof data.plan === 'object' && 'raw' in data.plan) {
          const parsed = parseGeminiPlan((data.plan as any).raw);
          cleanPlan = parsed || [];
        }
        
        if (!Array.isArray(cleanPlan) || cleanPlan.length === 0) {
          throw new Error('Invalid plan format');
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
      } catch (error) {
        console.error('Error processing plan:', error);
        setGenerationStatus('error');
        toast({
          title: "Error",
          description: "Failed to process workout plan",
          variant: "destructive",
        });
      }
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto dark:bg-slate-900 dark:text-white">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="dark:text-white">{t('modals.workout_generator.title')}</DialogTitle>
              <p className="text-sm text-muted-foreground dark:text-gray-300">{t('modals.workout_generator.subtitle')}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Client Selection */}
          <div>
            <Label className="dark:text-white">{t('forms.select_client')}</Label>
            <Select 
              value={selectedClientId?.toString()} 
              onValueChange={(value) => setSelectedClientId(parseInt(value))}
            >
              <SelectTrigger className="dark:bg-slate-800 dark:border-slate-600 dark:text-white">
                <SelectValue placeholder="Choose client..." className="dark:text-gray-300" />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-800 dark:border-slate-600">
                {clients?.map((client) => {
                  const goalKey = `goals.${client.goal}`;
                  const goalLabel = t(goalKey) !== goalKey ? t(goalKey) : client.goal;
                  return (
                    <SelectItem key={client.id} value={client.id.toString()} className="dark:text-white dark:hover:bg-slate-700 dark:focus:bg-slate-700">
                      {client.name} - {goalLabel}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Generation Options */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3">{t('generator.options')}</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="dark:text-white">{t('generator.plan_duration')}</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800 dark:border-slate-600">
                    <SelectItem value="1_week" className="dark:text-white dark:hover:bg-slate-700 dark:focus:bg-slate-700">1 Week</SelectItem>
                    <SelectItem value="2_weeks" className="dark:text-white dark:hover:bg-slate-700 dark:focus:bg-slate-700">2 Weeks</SelectItem>
                    <SelectItem value="4_weeks" className="dark:text-white dark:hover:bg-slate-700 dark:focus:bg-slate-700">4 Weeks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="dark:text-white">{t('generator.focus_area')}</Label>
                <Select value={focus} onValueChange={setFocus}>
                  <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800 dark:border-slate-600">
                    <SelectItem value="balanced" className="dark:text-white dark:hover:bg-slate-700 dark:focus:bg-slate-700">Balanced Training</SelectItem>
                    <SelectItem value="strength" className="dark:text-white dark:hover:bg-slate-700 dark:focus:bg-slate-700">Strength Focus</SelectItem>
                    <SelectItem value="cardio" className="dark:text-white dark:hover:bg-slate-700 dark:focus:bg-slate-700">Cardio Focus</SelectItem>
                    <SelectItem value="flexibility" className="dark:text-white dark:hover:bg-slate-700 dark:focus:bg-slate-700">Flexibility Focus</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* AI Generation Status */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-6 text-center dark:bg-slate-800/50">
            {/* Idle State */}
            {generationStatus === 'idle' && (
              <div className="space-y-3">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/50 dark:to-purple-800/50 rounded-full flex items-center justify-center mx-auto">
                  <Sparkles className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('generator.ready_title')}</h3>
                <p className="text-slate-600 dark:text-slate-300">{t('generator.ready_description')}</p>
                <Button 
                  onClick={handleGenerate}
                  className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 dark:from-purple-500 dark:to-purple-600 dark:hover:from-purple-600 dark:hover:to-purple-700"
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
                <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/50 dark:to-purple-800/50 rounded-full flex items-center justify-center mx-auto">
                  <Cog className="h-8 w-8 text-purple-600 dark:text-purple-400 animate-spin" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('generator.generating_title')}</h3>
                <p className="text-slate-600 dark:text-slate-300">{t('generator.generating_description')}</p>
                <div className="w-32 h-2 bg-slate-200 rounded-full mx-auto">
                  <div className="h-2 bg-gradient-to-r from-purple-600 to-purple-700 dark:from-purple-500 dark:to-purple-600 rounded-full animate-pulse w-3/4"></div>
                </div>
              </div>
            )}

            {/* Success State */}
            {generationStatus === 'success' && generatedPlan && (
              <div className="space-y-4">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/50 dark:to-emerald-800/50 rounded-full flex items-center justify-center mx-auto">
                  <Check className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('generator.success_title')}</h3>
                
                {/* Generated Plan Preview */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 text-left">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-3">{generatedPlan.name}</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">{generatedPlan.description}</p>
                  {/* Visual Gemini Plan Display - Cards per day */}
                  {(() => {
                    const planArr = getPlanArray(generatedPlan.plan);
                    if (planArr && planArr.length > 0) {
                      return (
                        <div className="grid gap-6 md:grid-cols-2">
                          {planArr.map((day: any, idx: number) => {
                            const focusLower = (day.focus || '').toLowerCase();
                            const isRest = focusLower.includes('rest') || 
                                          focusLower.includes('descanso') || 
                                          focusLower.includes('recovery') || 
                                          focusLower.includes('recuperación');
                            const isActiveRest = focusLower.includes('activo') || 
                                               focusLower.includes('active');
                            
                            return (
                              <Card
                                key={idx}
                                className={`relative overflow-visible shadow-lg border-0 ${
                                  isRest 
                                    ? isActiveRest 
                                      ? 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20' 
                                      : 'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700'
                                    : 'bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/20 dark:to-slate-800'
                                } rounded-2xl pl-4`}
                                style={{ 
                                  borderLeft: `6px solid ${
                                    isRest 
                                      ? isActiveRest 
                                        ? '#60a5fa' 
                                        : '#94a3b8'
                                      : '#34d399'
                                  }`
                                }}
                              >
                                <div className="absolute -left-6 top-6 flex flex-col items-center">
                                  <span className="text-3xl select-none" style={{ filter: isRest ? 'grayscale(0.5)' : 'none' }}>
                                    {getDayIcon(day.focus)}
                                  </span>
                                  <span className={`text-xs font-bold mt-1 ${
                                    isRest 
                                      ? isActiveRest 
                                        ? 'text-blue-400' 
                                        : 'text-slate-400'
                                      : 'text-emerald-500'
                                  }`}>
                                    {day.day.split(' ')[1] || idx + 1}
                                  </span>
                                </div>
                                <CardHeader className="pb-2 flex-row items-center gap-2 pl-8">
                                  <CardTitle className="text-lg font-bold tracking-tight dark:text-white">
                                    {day.day} <span className="text-base font-normal text-slate-500 dark:text-slate-400">— {day.focus}</span>
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="pl-8">
                                  {isRest ? (
                                    <div className="text-center text-lg py-6 flex flex-col items-center">
                                      <span className="text-4xl mb-2">
                                        {isActiveRest ? '🚶' : '🛌'}
                                      </span>
                                      <span className={`font-semibold ${
                                        isActiveRest ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'
                                      }`}>
                                        {isActiveRest 
                                          ? (language === 'es' ? 'Descanso Activo' : 'Active Rest')
                                          : (language === 'es' ? 'Día de Descanso' : 'Rest Day')
                                        }
                                      </span>
                                      <span className="text-slate-500 dark:text-slate-400 mt-2">
                                        {isActiveRest
                                          ? (language === 'es' 
                                              ? 'Mantén el movimiento suave y controlado. ¡Perfecto para la recuperación!' 
                                              : 'Keep movement gentle and controlled. Perfect for recovery!')
                                          : (language === 'es' 
                                              ? 'Recuerda hidratarte y moverte suavemente. ¡Tu cuerpo lo agradecerá!' 
                                              : 'Remember to hydrate and move gently. Your body will thank you!')
                                        }
                                      </span>
                                    </div>
                                  ) : day.exercises && day.exercises.length > 0 ? (
                                    <ul className="space-y-3">
                                      {day.exercises.map((ex: any, i: number) => (
                                        <li key={i} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-2 shadow-sm">
                                          <span className="text-lg">{i === 0 ? '🔥' : '•'}</span>
                                          <span className="font-medium text-slate-800 dark:text-white">{ex.name}</span>
                                          <span className="ml-auto text-slate-600 dark:text-slate-300 text-sm">
                                            {ex.sets} {language === 'es' ? 'series' : 'sets'}
                                            {ex.reps ? ` × ${ex.reps} ${language === 'es' ? 'repeticiones' : 'reps'}` : ''}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <div className="text-center text-slate-400 dark:text-slate-500 italic py-4">
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
                        <div className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded p-3">
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
                  <Button onClick={handleRegenerate} variant="secondary" className="flex-1 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    {t('actions.regenerate')}
                  </Button>
                </div>
              </div>
            )}

            {/* Error State */}
            {generationStatus === 'error' && (
              <div className="space-y-3">
                <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/50 dark:to-red-800/50 rounded-full flex items-center justify-center mx-auto">
                  <X className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Generation Failed</h3>
                <p className="text-slate-600 dark:text-slate-300">There was an error generating the workout plan. Please try again.</p>
                <Button onClick={handleRegenerate} variant="secondary" className="dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600">
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
