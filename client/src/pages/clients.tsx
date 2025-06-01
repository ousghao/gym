import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/hooks/use-language';
import { useQuery } from '@tanstack/react-query';
import { clientApi } from '@/lib/api';
import { ClientCard } from '@/components/client-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Users, Plus } from 'lucide-react';
import type { Client } from '@shared/schema';

interface ClientsProps {
  onViewClient: (clientId: number) => void;
  onGenerateWorkout: (clientId: number) => void;
  onLogWorkout: (clientId: number) => void;
}

export function Clients({ onViewClient, onGenerateWorkout, onLogWorkout }: ClientsProps) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [goalFilter, setGoalFilter] = useState('');

  const { data: clients, isLoading, error } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: clientApi.getAll,
  });

  const filteredClients = clients?.filter((client: Client) => {
    const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGoal = !goalFilter || client.goal === goalFilter;
    return matchesSearch && matchesGoal;
  }) || [];

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-lg font-medium mb-2">Error loading clients</div>
        <p className="text-slate-600">Please try refreshing the page</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search clients..."
                  className="pl-10"
                />
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={goalFilter} onValueChange={setGoalFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Goals" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('All Goals')}</SelectItem>
                  <SelectItem value="weight_loss">{t('goals.weight_loss')}</SelectItem>
                  <SelectItem value="muscle_gain">{t('goals.muscle_gain')}</SelectItem>
                  <SelectItem value="endurance">{t('goals.endurance')}</SelectItem>
                  <SelectItem value="strength">{t('goals.strength')}</SelectItem>
                  <SelectItem value="general_fitness">{t('goals.general_fitness')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client Grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div>
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-full" />
                </div>
                <div className="mt-4 pt-4 border-t">
                  <Skeleton className="h-8 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredClients.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onView={onViewClient}
              onGenerateWorkout={onGenerateWorkout}
              onLogWorkout={onLogWorkout}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          {clients && clients.length === 0 ? (
            <>
              <Users className="h-16 w-16 mx-auto text-slate-400 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No clients yet</h3>
              <p className="text-slate-600 mb-6">Get started by adding your first client</p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('actions.add_client')}
              </Button>
            </>
          ) : (
            <>
              <Search className="h-16 w-16 mx-auto text-slate-400 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No clients found</h3>
              <p className="text-slate-600">Try adjusting your search or filter criteria</p>
            </>
          )}
        </div>
      )}

      {/* Results Summary */}
      {!isLoading && clients && clients.length > 0 && (
        <div className="text-center text-sm text-slate-500">
          Showing {filteredClients.length} of {clients.length} clients
        </div>
      )}
    </div>
  );
}
