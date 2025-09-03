import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/hooks/use-language';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientApi } from '@/lib/api';
import { ClientCard } from '@/components/client-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Users, Plus } from 'lucide-react';
import type { Client } from '@shared/schema';
import { AddClientModal } from '@/components/modals/add-client-modal';
import { ClientDetailModal } from '@/components/modals/client-detail-modal';
import { useToast } from '@/hooks/use-toast';

interface ClientsProps {
  onViewClient: (clientId: number) => void;
  onGenerateWorkout: (clientId: number) => void;
  onLogWorkout: (clientId: number) => void;
}

export function Clients({ onViewClient, onGenerateWorkout, onLogWorkout }: ClientsProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [goalFilter, setGoalFilter] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailClient, setDetailClient] = useState<Client | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: clients, isLoading, error } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: clientApi.getAll,
  });

  const deleteClientMutation = useMutation({
    mutationFn: (id: number) => clientApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({ title: 'Success', description: 'Client deleted successfully' });
      console.log('Client deleted successfully');
    },
    onError: (error) => {
      toast({ title: 'Error', description: 'Failed to delete client', variant: 'destructive' });
      console.error('Failed to delete client', error);
    },
  });

  const handleEdit = (clientId: number) => {
    const client = clients?.find((c: Client) => c.id === clientId) || null;
    setEditClient(client);
    setEditModalOpen(true);
  };

  const handleView = (clientId: number) => {
    const client = clients?.find((c: Client) => c.id === clientId) || null;
    setDetailClient(client);
    setDetailModalOpen(true);
  };

  const handleDelete = (clientId: number) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      deleteClientMutation.mutate(clientId);
    }
  };

  const filteredClients = clients?.filter((client: Client) => {
    const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGoal = !goalFilter || goalFilter === 'all' || client.goal === goalFilter;
    return matchesSearch && matchesGoal;
  }) || [];

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-lg font-medium mb-2">Error loading clients</div>
        <p className="text-slate-600 dark:text-gray-300">Please try refreshing the page</p>
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
                  className="pl-10 dark:bg-slate-800 dark:text-white dark:placeholder-gray-400"
                />
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400 dark:text-gray-300" />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={goalFilter} onValueChange={setGoalFilter}>
                <SelectTrigger className="w-48 dark:bg-slate-800 dark:text-white dark:border-slate-600">
                  <SelectValue placeholder="All Goals" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:border-slate-600">
                  <SelectItem value="all" className="dark:text-white dark:hover:bg-slate-700">All Goals</SelectItem>
                  <SelectItem value="weight_loss" className="dark:text-white dark:hover:bg-slate-700">{t('goals.weight_loss')}</SelectItem>
                  <SelectItem value="muscle_gain" className="dark:text-white dark:hover:bg-slate-700">{t('goals.muscle_gain')}</SelectItem>
                  <SelectItem value="endurance" className="dark:text-white dark:hover:bg-slate-700">{t('goals.endurance')}</SelectItem>
                  <SelectItem value="strength" className="dark:text-white dark:hover:bg-slate-700">{t('goals.strength')}</SelectItem>
                  <SelectItem value="general_fitness" className="dark:text-white dark:hover:bg-slate-700">{t('goals.general_fitness')}</SelectItem>
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
              onView={handleView}
              onEdit={handleEdit}
              onGenerateWorkout={onGenerateWorkout}
              onLogWorkout={onLogWorkout}
              onDelete={handleDelete}
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
              <Button onClick={() => setAddModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('actions.add_client')}
              </Button>
            </>
          ) : (
            <>
              <Search className="h-16 w-16 mx-auto text-slate-400 dark:text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No clients found</h3>
              <p className="text-slate-600 dark:text-gray-300">Try adjusting your search or filter criteria</p>
            </>
          )}
        </div>
      )}

      {/* Results Summary */}
      {!isLoading && clients && clients.length > 0 && (
        <div className="text-center text-sm text-slate-500 dark:text-gray-400">
          Showing {filteredClients.length} of {clients.length} clients
        </div>
      )}

      <ClientDetailModal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        clientId={detailClient?.id || null}
        onGenerateWorkout={onGenerateWorkout}
      />
      <AddClientModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
      />
      <AddClientModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        client={editClient || undefined}
        isEdit={true}
      />
    </div>
  );
}
