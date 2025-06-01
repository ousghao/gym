import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/hooks/use-language';
import { useQuery } from '@tanstack/react-query';
import { clientApi, progressApi, sessionApi } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { X, BarChart3, TrendingUp, Users, Calendar } from 'lucide-react';
import type { Client } from '@shared/schema';

interface ReportsModalProps {
  open: boolean;
  onClose: () => void;
}

export function ReportsModal({ open, onClose }: ReportsModalProps) {
  const { t } = useLanguage();
  const [selectedClientId, setSelectedClientId] = useState<string>('all');

  const { data: clients } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: clientApi.getAll,
    enabled: open,
  });

  const { data: sessions } = useQuery({
    queryKey: ['/api/sessions'],
    queryFn: () => sessionApi.getAll(),
    enabled: open,
  });

  const { data: progressSummary } = useQuery({
    queryKey: ['/api/progress/summary', selectedClientId],
    queryFn: () => selectedClientId !== 'all' ? progressApi.getSummary(parseInt(selectedClientId)) : null,
    enabled: open && selectedClientId !== 'all',
  });

  const selectedClient = clients?.find((c: Client) => c.id.toString() === selectedClientId);

  const getClientStats = () => {
    if (selectedClientId === 'all') {
      const totalSessions = sessions?.length || 0;
      const completedSessions = sessions?.filter(s => s.status === 'completed').length || 0;
      const activeClients = clients?.length || 0;
      
      return {
        totalSessions,
        completedSessions,
        activeClients,
        completionRate: totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0,
      };
    } else {
      const clientSessions = sessions?.filter(s => s.clientId.toString() === selectedClientId) || [];
      const completedSessions = clientSessions.filter(s => s.status === 'completed');
      
      return {
        totalSessions: clientSessions.length,
        completedSessions: completedSessions.length,
        completionRate: clientSessions.length > 0 ? Math.round((completedSessions.length / clientSessions.length) * 100) : 0,
        exerciseCount: progressSummary ? Object.keys(progressSummary).length : 0,
      };
    }
  };

  const stats = getClientStats();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            {t('actions.view_reports')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Client Filter */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">View reports for:</label>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients?.map((client: Client) => (
                  <SelectItem key={client.id} value={client.id.toString()}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Sessions</p>
                    <p className="text-2xl font-bold">{stats.totalSessions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold">{stats.completedSessions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <BarChart3 className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Completion Rate</p>
                    <p className="text-2xl font-bold">{stats.completionRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Users className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {selectedClientId === 'all' ? 'Active Clients' : 'Exercises Tracked'}
                    </p>
                    <p className="text-2xl font-bold">
                      {selectedClientId === 'all' ? stats.activeClients : stats.exerciseCount}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Client-specific Progress */}
          {selectedClientId !== 'all' && selectedClient && (
            <Card>
              <CardHeader>
                <CardTitle>Progress Summary for {selectedClient.name}</CardTitle>
              </CardHeader>
              <CardContent>
                {progressSummary ? (
                  <div className="space-y-4">
                    {Object.entries(progressSummary).map(([exercise, data]: [string, any]) => (
                      <div key={exercise} className="border border-border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">{exercise}</h4>
                          <span className="text-sm text-muted-foreground">
                            {data.totalSessions} sessions
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Last Weight:</span>
                            <span className="ml-2 font-medium">{data.lastWeight || 'N/A'} kg</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Last Reps:</span>
                            <span className="ml-2 font-medium">{data.lastReps || 'N/A'}</span>
                          </div>
                          {data.suggestedWeight && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Suggested Weight:</span>
                              <span className="ml-2 font-medium text-primary">{data.suggestedWeight} kg</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No progress data available for this client</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* All Clients Overview */}
          {selectedClientId === 'all' && clients && (
            <Card>
              <CardHeader>
                <CardTitle>Client Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {clients.map((client: Client) => {
                    const clientSessions = sessions?.filter(s => s.clientId === client.id) || [];
                    const completedSessions = clientSessions.filter(s => s.status === 'completed');
                    const completionRate = clientSessions.length > 0 
                      ? Math.round((completedSessions.length / clientSessions.length) * 100) 
                      : 0;

                    return (
                      <div key={client.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                        <div>
                          <h4 className="font-medium">{client.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {client.goal === 'weight_loss' && t('goals.weight_loss')}
                            {client.goal === 'muscle_gain' && t('goals.muscle_gain')}
                            {client.goal === 'endurance' && t('goals.endurance')}
                            {client.goal === 'strength' && t('goals.strength')}
                            {client.goal === 'general_fitness' && t('goals.general_fitness')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{clientSessions.length} sessions</p>
                          <p className="text-sm text-muted-foreground">{completionRate}% completed</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}