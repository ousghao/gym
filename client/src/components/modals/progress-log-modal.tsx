import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLanguage } from '@/hooks/use-language';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clientApi, progressApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type { InsertExerciseProgress } from '@shared/schema';
import { X, Plus } from 'lucide-react';

interface ProgressLogModalProps {
  open: boolean;
  onClose: () => void;
  preSelectedClientId?: number;
}

export function ProgressLogModal({ open, onClose, preSelectedClientId }: ProgressLogModalProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<Partial<InsertExerciseProgress>>({
    clientId: preSelectedClientId || undefined,
    exerciseName: '',
    weight: undefined,
    reps: undefined,
    sets: undefined,
    duration: undefined,
    notes: '',
  });

  const { data: clients } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: clientApi.getAll,
    enabled: open,
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

  const resetForm = () => {
    setFormData({
      clientId: preSelectedClientId || undefined,
      exerciseName: '',
      weight: undefined,
      reps: undefined,
      sets: undefined,
      duration: undefined,
      notes: '',
    });
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              {t('actions.log_progress')}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>{t('forms.select_client')} *</Label>
            <Select 
              value={formData.clientId?.toString()} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, clientId: parseInt(value) }))}
              disabled={!!preSelectedClientId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose client..." />
              </SelectTrigger>
              <SelectContent>
                {clients?.map((client) => (
                  <SelectItem key={client.id} value={client.id.toString()}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="exerciseName">Exercise Name *</Label>
            <Input
              id="exerciseName"
              value={formData.exerciseName}
              onChange={(e) => setFormData(prev => ({ ...prev, exerciseName: e.target.value }))}
              placeholder="e.g. Bench Press, Squats"
            />
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
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Optional notes..."
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
      </DialogContent>
    </Dialog>
  );
}