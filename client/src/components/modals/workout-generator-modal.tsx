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

interface WorkoutGeneratorModalProps {
  open: boolean;
  onClose: () => void;
  preSelectedClientId?: number;
}

export function WorkoutGeneratorModal({ open, onClose, preSelectedClientId }: WorkoutGeneratorModalProps) {
  const { t } = useLanguage();
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
      setGeneratedPlan(data);
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
    });
  };

  const handleRegenerate = () => {
    setGenerationStatus('idle');
    setGeneratedPlan(null);
  };

  const handleSavePlan = () => {
    toast({
      title: "Success",
      description: "Workout plan saved to client profile",
    });
    onClose();
    resetModal();
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
                {clients?.map((client) => (
                  <SelectItem key={client.id} value={client.id.toString()}>
                    {client.name} - {t(`goals.${client.goal}`)}
                  </SelectItem>
                ))}
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
                  
                  {generatedPlan.plan && (
                    <div className="space-y-2 text-sm">
                      {generatedPlan.plan.days && generatedPlan.plan.days.length > 0 ? (
                        generatedPlan.plan.days.slice(0, 3).map((day: any, index: number) => (
                          <div key={index} className="flex justify-between">
                            <span className="text-slate-600">{day.day}:</span>
                            <span>{day.type} ({day.duration} min)</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-slate-600">
                          <p>{generatedPlan.plan.overview || 'Custom workout plan generated for your goals'}</p>
                        </div>
                      )}
                    </div>
                  )}
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
