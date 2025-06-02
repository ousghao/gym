import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useLanguage } from '@/hooks/use-language';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clientApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type { InsertClient } from '@shared/schema';
import { X } from 'lucide-react';

interface AddClientModalProps {
  open: boolean;
  onClose: () => void;
  client?: Partial<InsertClient> & { id?: number };
  isEdit?: boolean;
}

export function AddClientModal({ open, onClose, client, isEdit }: AddClientModalProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<Partial<InsertClient>>({
    name: '',
    age: undefined,
    weight: undefined,
    height: undefined,
    goal: '',
    experience: '',
    availableDays: [],
    equipment: 'full_gym',
    limitations: '',
  });

  useEffect(() => {
    if (client && isEdit) {
      setFormData({ ...client });
    } else {
      resetForm();
    }
  }, [client, isEdit, open]);

  const createClientMutation = useMutation({
    mutationFn: clientApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({
        title: 'Success',
        description: 'Client created successfully',
      });
      onClose();
      resetForm();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to create client',
        variant: 'destructive',
      });
    },
  });

  const updateClientMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertClient> }) => clientApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({
        title: 'Success',
        description: 'Client updated successfully',
      });
      onClose();
      resetForm();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update client',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      age: undefined,
      weight: undefined,
      height: undefined,
      goal: '',
      experience: '',
      availableDays: [],
      equipment: 'full_gym',
      limitations: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit && client && client.id) {
      const updatedFields: Partial<InsertClient> = {};
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0)) {
          updatedFields[key as keyof InsertClient] = value as any;
        }
      });
      updateClientMutation.mutate({ id: client.id, data: updatedFields });
    } else {
      if (!formData.name || !formData.age || !formData.weight || !formData.height || 
          !formData.goal || !formData.experience || !formData.availableDays?.length) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required fields',
          variant: 'destructive',
        });
        return;
      }
      createClientMutation.mutate(formData as InsertClient);
    }
  };

  const handleDayToggle = (day: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      availableDays: checked 
        ? [...(prev.availableDays || []), day]
        : (prev.availableDays || []).filter(d => d !== day)
    }));
  };

  const days = [
    { value: 'monday', label: t('days.mon') },
    { value: 'tuesday', label: t('days.tue') },
    { value: 'wednesday', label: t('days.wed') },
    { value: 'thursday', label: t('days.thu') },
    { value: 'friday', label: t('days.fri') },
    { value: 'saturday', label: t('days.sat') },
    { value: 'sunday', label: t('days.sun') },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('modals.add_client.title')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">{t('forms.basic_information')}</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">{t('forms.full_name')} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter client name"
                />
              </div>
              <div>
                <Label htmlFor="age">{t('forms.age')} *</Label>
                <Input
                  id="age"
                  type="number"
                  value={formData.age || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, age: parseInt(e.target.value) || undefined }))}
                  placeholder="Age"
                />
              </div>
              <div>
                <Label htmlFor="weight">{t('forms.weight')} *</Label>
                <Input
                  id="weight"
                  type="number"
                  value={formData.weight || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, weight: parseInt(e.target.value) || undefined }))}
                  placeholder="Weight"
                />
              </div>
              <div>
                <Label htmlFor="height">{t('forms.height')} *</Label>
                <Input
                  id="height"
                  type="number"
                  value={formData.height || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, height: parseInt(e.target.value) || undefined }))}
                  placeholder="Height"
                />
              </div>
            </div>
          </div>

          {/* Training Goals */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">{t('forms.training_goals')}</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>{t('forms.primary_goal')} *</Label>
                <Select value={formData.goal} onValueChange={(value) => setFormData(prev => ({ ...prev, goal: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select goal..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weight_loss">{t('goals.weight_loss')}</SelectItem>
                    <SelectItem value="muscle_gain">{t('goals.muscle_gain')}</SelectItem>
                    <SelectItem value="endurance">{t('goals.endurance')}</SelectItem>
                    <SelectItem value="strength">{t('goals.strength')}</SelectItem>
                    <SelectItem value="general_fitness">{t('goals.general_fitness')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('forms.experience_level')} *</Label>
                <Select value={formData.experience} onValueChange={(value) => setFormData(prev => ({ ...prev, experience: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select level..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">{t('experience.beginner')}</SelectItem>
                    <SelectItem value="intermediate">{t('experience.intermediate')}</SelectItem>
                    <SelectItem value="advanced">{t('experience.advanced')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Availability & Equipment */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">{t('forms.availability_equipment')}</h3>
            <div className="space-y-4">
              <div>
                <Label>{t('forms.available_days')} *</Label>
                <div className="grid grid-cols-7 gap-2 mt-2">
                  {days.map((day) => (
                    <div key={day.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={day.value}
                        checked={formData.availableDays?.includes(day.value)}
                        onCheckedChange={(checked) => handleDayToggle(day.value, checked as boolean)}
                      />
                      <Label htmlFor={day.value} className="text-sm">{day.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label>{t('forms.available_equipment')}</Label>
                <Select value={formData.equipment} onValueChange={(value) => setFormData(prev => ({ ...prev, equipment: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_gym">{t('equipment.full_gym')}</SelectItem>
                    <SelectItem value="home_basic">{t('equipment.home_basic')}</SelectItem>
                    <SelectItem value="home_advanced">{t('equipment.home_advanced')}</SelectItem>
                    <SelectItem value="bodyweight">{t('equipment.bodyweight')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('forms.limitations')}</Label>
                <Textarea
                  value={formData.limitations || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, limitations: e.target.value }))}
                  placeholder="Any injuries, medical conditions, or limitations to consider..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          <div className="flex space-x-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              {t('actions.cancel')}
            </Button>
            <Button 
              type="submit" 
              className="flex-1" 
              disabled={createClientMutation.isPending}
            >
              {createClientMutation.isPending ? 'Saving...' : t('actions.save_client')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
