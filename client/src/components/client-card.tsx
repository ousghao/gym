import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/hooks/use-language';
import { MoreVertical, Bot, Plus } from 'lucide-react';
import type { Client } from '@shared/schema';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface ClientCardProps {
  client: Client;
  onView: (clientId: number) => void;
  onEdit: (clientId: number) => void;
  onGenerateWorkout: (clientId: number) => void;
  onLogWorkout: (clientId: number) => void;
  onDelete?: (clientId: number) => void;
}

export function ClientCard({ client, onView, onEdit, onGenerateWorkout, onLogWorkout, onDelete }: ClientCardProps) {
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
    <Card className="hover:shadow-lg transition-shadow rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col h-full relative overflow-visible">
      {/* Three-dots menu in top right */}
      <div className="absolute top-4 right-4 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
              <MoreVertical className="h-5 w-5 text-slate-600 dark:text-white" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(client.id)}>
              {t('actions.edit_client') || 'Modify Client'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete && onDelete(client.id)} className="text-red-600">
              {t('actions.delete_client') || 'Delete Client'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <CardContent className="p-6 flex flex-col h-full items-center">
        {/* Avatar and Name */}
        <div className="flex flex-col items-center gap-2 mb-4 w-full">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold shadow-md bg-gradient-to-br from-primary/10 to-blue-100 dark:from-primary/20 dark:to-blue-900/30 mb-1`}>
            <span className="text-slate-900 dark:text-white">{getInitials(client.name)}</span>
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-white text-lg leading-tight text-center break-words max-w-[180px]">{client.name}</h3>
          <p className="text-xs text-slate-500 dark:text-gray-400 text-center">{client.age} years old</p>
        </div>
        {/* Info Section */}
        <div className="space-y-2 mb-4 w-full">
          <div className="flex justify-between text-sm w-full">
            <span className="text-slate-600 dark:text-gray-300">{t('client.goal')}:</span>
            <span className="font-medium text-slate-900 dark:text-white text-right">
              {client.goal === 'weight_loss' && t('goals.weight_loss')}
              {client.goal === 'muscle_gain' && t('goals.muscle_gain')}
              {client.goal === 'endurance' && t('goals.endurance')}
              {client.goal === 'strength' && t('goals.strength')}
              {client.goal === 'general_fitness' && t('goals.general_fitness')}
            </span>
          </div>
          <div className="flex justify-between text-sm w-full">
            <span className="text-slate-600 dark:text-gray-300">{t('client.experience')}:</span>
            <span className="font-medium text-slate-900 dark:text-white text-right">
              {client.experience === 'beginner' && t('experience.beginner')}
              {client.experience === 'intermediate' && t('experience.intermediate')}
              {client.experience === 'advanced' && t('experience.advanced')}
            </span>
          </div>
          <div className="flex justify-between text-sm w-full">
            <span className="text-slate-600 dark:text-gray-300">{t('client.available_days')}:</span>
            <span className="font-medium text-slate-900 dark:text-white text-right truncate max-w-[120px] sm:max-w-none">{client.availableDays.join(', ')}</span>
          </div>
        </div>
        {/* Actions */}
        <div className="mt-auto flex flex-col gap-2 w-full">
          <Button 
            className="w-full text-base py-2" 
            onClick={() => onView(client.id)}
          >
            {t('actions.view_profile')}
          </Button>
          <div className="flex flex-row gap-2 w-full justify-center">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => onGenerateWorkout(client.id)}
              className="shrink-0 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-slate-200 dark:border-slate-600"
              title={t('actions.generate_ai_plan')}
            >
              <Bot className="h-5 w-5 text-slate-600 dark:text-white" />
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => onLogWorkout(client.id)}
              className="shrink-0 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border-slate-200 dark:border-slate-600"
              title={t('actions.log_workout')}
            >
              <Plus className="h-5 w-5 text-slate-600 dark:text-white" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
