import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/hooks/use-language';
import { MoreVertical, Bot, Plus } from 'lucide-react';
import type { Client } from '@shared/schema';

interface ClientCardProps {
  client: Client;
  onView: (clientId: number) => void;
  onGenerateWorkout: (clientId: number) => void;
  onLogWorkout: (clientId: number) => void;
}

export function ClientCard({ client, onView, onGenerateWorkout, onLogWorkout }: ClientCardProps) {
  const { t } = useLanguage();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getGoalColor = (goal: string) => {
    switch (goal) {
      case 'weight_loss':
        return 'bg-primary-100 text-primary-600';
      case 'muscle_gain':
        return 'bg-emerald-100 text-emerald-600';
      case 'endurance':
        return 'bg-amber-100 text-amber-600';
      case 'strength':
        return 'bg-purple-100 text-purple-600';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getGoalColor(client.goal)}`}>
              <span className="font-semibold text-lg">{getInitials(client.name)}</span>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">{client.name}</h3>
              <p className="text-sm text-slate-500">{client.age} years old</p>
            </div>
          </div>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">{t('client.goal')}:</span>
            <span className="font-medium text-slate-900">
              {client.goal === 'weight_loss' && t('goals.weight_loss')}
              {client.goal === 'muscle_gain' && t('goals.muscle_gain')}
              {client.goal === 'endurance' && t('goals.endurance')}
              {client.goal === 'strength' && t('goals.strength')}
              {client.goal === 'general_fitness' && t('goals.general_fitness')}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">{t('client.experience')}:</span>
            <span className="font-medium text-slate-900">
              {client.experience === 'beginner' && t('experience.beginner')}
              {client.experience === 'intermediate' && t('experience.intermediate')}
              {client.experience === 'advanced' && t('experience.advanced')}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">{t('client.available_days')}:</span>
            <span className="font-medium text-slate-900">{client.availableDays.join(', ')}</span>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="flex space-x-2">
            <Button 
              className="flex-1" 
              onClick={() => onView(client.id)}
            >
              {t('actions.view_profile')}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onGenerateWorkout(client.id)}
            >
              <Bot className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onLogWorkout(client.id)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
