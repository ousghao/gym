import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/hooks/use-language';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clientApi, progressApi, workoutPlanApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type { InsertExerciseProgress, WorkoutPlan } from '@shared/schema';
import { X, Plus, Save, PlayCircle, Trash2, Timer, RotateCcw } from 'lucide-react';

interface WorkoutSessionModalProps {
  open: boolean;
  onClose: () => void;
  preSelectedClientId?: number;
  preSelectedPlan?: WorkoutPlan;
}

interface ExerciseEntry {
  id: string;
  exerciseName: string;
  targetSets?: number;
  targetReps?: string;
  completedSets: CompletedSet[];
  notes?: string;
}

interface CompletedSet {
  id: string;
  weight?: number;
  reps?: number;
  completed: boolean;
  restTimer?: number;
}

export function WorkoutSessionModal({ open, onClose, preSelectedClientId, preSelectedPlan }: WorkoutSessionModalProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedClientId, setSelectedClientId] = useState<number | undefined>(preSelectedClientId);
  const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | undefined>(preSelectedPlan);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [restTimer, setRestTimer] = useState<number>(0);
  const [isResting, setIsResting] = useState(false);
  const [sessionNotes, setSessionNotes] = useState('');

  const { data: clients } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: clientApi.getAll,
    enabled: open,
  });

  const { data: workoutPlans } = useQuery({
    queryKey: ['/api/workout-plans', selectedClientId],
    queryFn: () => workoutPlanApi.getAll(selectedClientId!),
    enabled: !!selectedClientId && open,
  });

  const { data: previousProgress } = useQuery({
    queryKey: ['/api/progress/summary', selectedClientId],
    queryFn: () => progressApi.getSummary(selectedClientId!),
    enabled: !!selectedClientId && open,
  });

  const logProgressMutation = useMutation({
    mutationFn: progressApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/progress'] });
      queryClient.invalidateQueries({ queryKey: ['/api/progress/summary'] });
    },
  });

  useEffect(() => {
    if (selectedPlan && selectedPlan.plan) {
      loadWorkoutFromPlan(selectedPlan.plan);
    }
  }, [selectedPlan]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isResting && restTimer > 0) {
      interval = setInterval(() => {
        setRestTimer(prev => {
          if (prev <= 1) {
            setIsResting(false);
            toast({
              title: "Rest Complete!",
              description: "Ready for your next set",
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isResting, restTimer, toast]);

  const loadWorkoutFromPlan = (plan: any) => {
    try {
      let planData = plan;
      if (typeof plan === 'string') {
        planData = JSON.parse(plan);
      }
      
      if (Array.isArray(planData)) {
        // Get today's workout or first day
        const today = new Date().getDay(); // 0 = Sunday
        const dayIndex = today === 0 ? 6 : today - 1; // Convert to Monday = 0 format
        const todayWorkout = planData[dayIndex] || planData[0];
        
        if (todayWorkout && todayWorkout.exercises) {
          const loadedExercises: ExerciseEntry[] = todayWorkout.exercises.map((exercise: any, index: number) => ({
            id: `exercise-${index}`,
            exerciseName: exercise.name || exercise.nombre || `Exercise ${index + 1}`,
            targetSets: exercise.sets || exercise.series || 3,
            targetReps: exercise.reps || exercise.repeticiones || '10-12',
            completedSets: Array.from({ length: exercise.sets || exercise.series || 3 }, (_, setIndex) => ({
              id: `set-${index}-${setIndex}`,
              weight: previousProgress?.[exercise.name]?.lastWeight || undefined,
              reps: undefined,
              completed: false,
              restTimer: 60,
            })),
            notes: '',
          }));
          setExercises(loadedExercises);
        }
      }
    } catch (error) {
      console.error('Error loading workout plan:', error);
      toast({
        title: "Error",
        description: "Failed to load workout plan",
        variant: "destructive",
      });
    }
  };

  const startSession = () => {
    if (!selectedClientId) {
      toast({
        title: "Validation Error",
        description: "Please select a client",
        variant: "destructive",
      });
      return;
    }
    
    setSessionStarted(true);
    setSessionStartTime(new Date());
    toast({
      title: "Workout Started!",
      description: "Good luck with your training session",
    });
  };

  const completeSet = (exerciseIndex: number, setIndex: number) => {
    setExercises(prev => prev.map((exercise, eIdx) => {
      if (eIdx === exerciseIndex) {
        const updatedSets = exercise.completedSets.map((set, sIdx) => {
          if (sIdx === setIndex) {
            return { ...set, completed: true };
          }
          return set;
        });
        return { ...exercise, completedSets: updatedSets };
      }
      return exercise;
    }));

    // Start rest timer
    const restTime = 60; // Default 60 seconds
    setRestTimer(restTime);
    setIsResting(true);
  };

  const updateSetData = (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps', value: number) => {
    setExercises(prev => prev.map((exercise, eIdx) => {
      if (eIdx === exerciseIndex) {
        const updatedSets = exercise.completedSets.map((set, sIdx) => {
          if (sIdx === setIndex) {
            return { ...set, [field]: value };
          }
          return set;
        });
        return { ...exercise, completedSets: updatedSets };
      }
      return exercise;
    }));
  };

  const addCustomExercise = () => {
    const newExercise: ExerciseEntry = {
      id: `custom-${Date.now()}`,
      exerciseName: '',
      completedSets: [{
        id: `set-custom-${Date.now()}-0`,
        weight: undefined,
        reps: undefined,
        completed: false,
        restTimer: 60,
      }],
      notes: '',
    };
    setExercises(prev => [...prev, newExercise]);
  };

  const addSetToExercise = (exerciseIndex: number) => {
    setExercises(prev => prev.map((exercise, eIdx) => {
      if (eIdx === exerciseIndex) {
        const newSet: CompletedSet = {
          id: `set-${exerciseIndex}-${exercise.completedSets.length}`,
          weight: exercise.completedSets[exercise.completedSets.length - 1]?.weight,
          reps: undefined,
          completed: false,
          restTimer: 60,
        };
        return { ...exercise, completedSets: [...exercise.completedSets, newSet] };
      }
      return exercise;
    }));
  };

  const removeExercise = (exerciseIndex: number) => {
    setExercises(prev => prev.filter((_, index) => index !== exerciseIndex));
  };

  const finishSession = async () => {
    try {
      // Save all completed sets as progress entries
      const progressEntries = exercises.flatMap(exercise => 
        exercise.completedSets
          .filter(set => set.completed && set.weight && set.reps)
          .map(set => ({
            clientId: selectedClientId!,
            exerciseName: exercise.exerciseName,
            weight: set.weight!,
            reps: set.reps!,
            sets: 1, // Each set is logged individually
            notes: exercise.notes || sessionNotes,
          }))
      );

      // Log all progress entries
      await Promise.all(
        progressEntries.map(entry => logProgressMutation.mutateAsync(entry))
      );

      const duration = sessionStartTime 
        ? Math.round((Date.now() - sessionStartTime.getTime()) / (1000 * 60))
        : 0;

      toast({
        title: "Workout Complete!",
        description: `Great job! Session duration: ${duration} minutes`,
      });

      handleClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save workout progress",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setSessionStarted(false);
    setSessionStartTime(null);
    setExercises([]);
    setCurrentExerciseIndex(0);
    setRestTimer(0);
    setIsResting(false);
    setSessionNotes('');
    setSelectedClientId(preSelectedClientId);
    setSelectedPlan(preSelectedPlan);
    onClose();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!sessionStarted) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl dark:bg-slate-900 dark:text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 dark:text-white">
              <PlayCircle className="h-5 w-5 text-primary" />
              Start Workout Session
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Select Client *</Label>
              <Select 
                value={selectedClientId?.toString()} 
                onValueChange={(value) => setSelectedClientId(parseInt(value))}
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

            {selectedClientId && (
              <div>
                <Label>Select Workout Plan (Optional)</Label>
                <Select 
                  value={selectedPlan?.id.toString()} 
                  onValueChange={(value) => {
                    const plan = workoutPlans?.find(p => p.id.toString() === value);
                    setSelectedPlan(plan);
                  }}
                >
                  <SelectTrigger className="dark:bg-slate-800 dark:border-slate-600">
                    <SelectValue placeholder="Choose workout plan or create custom..." />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800">
                    {workoutPlans?.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id.toString()} className="dark:text-white">
                        {plan.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <Button variant="secondary" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button onClick={startSession} className="flex-1">
                <PlayCircle className="h-4 w-4 mr-2" />
                Start Session
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto dark:bg-slate-900 dark:text-white">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 dark:text-white">
              <Timer className="h-5 w-5 text-primary" />
              Active Workout Session
              {sessionStartTime && (
                <Badge variant="secondary" className="ml-2">
                  {Math.round((Date.now() - sessionStartTime.getTime()) / (1000 * 60))} min
                </Badge>
              )}
            </DialogTitle>
            {isResting && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="animate-pulse">
                  Rest: {formatTime(restTimer)}
                </Badge>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {exercises.map((exercise, exerciseIndex) => (
            <Card key={exercise.id} className="dark:bg-slate-800 dark:border-slate-700">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg dark:text-white">
                    {exercise.exerciseName || (
                      <Input
                        placeholder="Enter exercise name..."
                        value={exercise.exerciseName}
                        onChange={(e) => {
                          setExercises(prev => prev.map((ex, idx) => 
                            idx === exerciseIndex ? { ...ex, exerciseName: e.target.value } : ex
                          ));
                        }}
                        className="text-lg font-semibold border-none p-0 h-auto bg-transparent dark:text-white"
                      />
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {exercise.targetSets && (
                      <Badge variant="outline">
                        {exercise.targetSets} sets × {exercise.targetReps}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeExercise(exerciseIndex)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  {exercise.completedSets.map((set, setIndex) => (
                    <div key={set.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                      <div className="text-sm font-medium w-12 dark:text-white">
                        Set {setIndex + 1}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Label className="text-xs dark:text-gray-300">Weight (kg)</Label>
                        <Input
                          type="number"
                          value={set.weight || ''}
                          onChange={(e) => updateSetData(exerciseIndex, setIndex, 'weight', parseInt(e.target.value) || 0)}
                          className="w-20 h-8 dark:bg-slate-600 dark:border-slate-500"
                          disabled={set.completed}
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Label className="text-xs dark:text-gray-300">Reps</Label>
                        <Input
                          type="number"
                          value={set.reps || ''}
                          onChange={(e) => updateSetData(exerciseIndex, setIndex, 'reps', parseInt(e.target.value) || 0)}
                          className="w-20 h-8 dark:bg-slate-600 dark:border-slate-500"
                          disabled={set.completed}
                        />
                      </div>
                      
                      <Button
                        size="sm"
                        variant={set.completed ? "secondary" : "default"}
                        onClick={() => completeSet(exerciseIndex, setIndex)}
                        disabled={set.completed || !set.weight || !set.reps}
                      >
                        {set.completed ? "✓ Done" : "Complete"}
                      </Button>
                      
                      {previousProgress?.[exercise.exerciseName] && (
                        <div className="text-xs text-slate-500 dark:text-gray-400">
                          Previous: {previousProgress[exercise.exerciseName].lastWeight}kg × {previousProgress[exercise.exerciseName].lastReps}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addSetToExercise(exerciseIndex)}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Set
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex gap-3">
            <Button variant="outline" onClick={addCustomExercise} className="flex-1">
              <Plus className="h-4 w-4 mr-2" />
              Add Exercise
            </Button>
            
            <Button onClick={finishSession} className="flex-1" variant="default">
              <Save className="h-4 w-4 mr-2" />
              Finish Session
            </Button>
          </div>

          <div>
            <Label htmlFor="sessionNotes">Session Notes</Label>
            <Textarea
              id="sessionNotes"
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder="How was the workout? Any notes..."
              className="dark:bg-slate-800 dark:border-slate-600"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
