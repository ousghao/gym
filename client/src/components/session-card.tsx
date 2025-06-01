import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/hooks/use-language';
import type { Session, Client } from '@shared/schema';

interface SessionCardProps {
  session: Session;
  client: Client;
  onStart: (sessionId: number) => void;
}

export function SessionCard({ session, client, onStart }: SessionCardProps) {
  const { t } = useLanguage();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-100 text-emerald-600';
      case 'in_progress':
        return 'bg-primary-100 text-primary-600';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const isUpcoming = session.status === 'scheduled';

  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getStatusColor(session.status)}`}>
            <span className="font-semibold">{getInitials(client.name)}</span>
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-900">{client.name}</p>
          <p className="text-sm text-slate-500">
            {client.goal === 'weight_loss' && t('goals.weight_loss')}
            {client.goal === 'muscle_gain' && t('goals.muscle_gain')}
            {client.goal === 'endurance' && t('goals.endurance')}
            {client.goal === 'strength' && t('goals.strength')}
            {client.goal === 'general_fitness' && t('goals.general_fitness')}
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        <span className="text-sm font-medium text-slate-600">{session.startTime}</span>
        <Button
          size="sm"
          variant={isUpcoming ? "default" : "secondary"}
          onClick={() => onStart(session.id)}
          disabled={session.status === 'completed'}
        >
          {session.status === 'completed' 
            ? 'Completed'
            : isUpcoming 
              ? t('actions.start') 
              : t('actions.upcoming')
          }
        </Button>
      </div>
    </div>
  );
}
