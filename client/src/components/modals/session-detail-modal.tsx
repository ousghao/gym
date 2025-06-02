import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLanguage } from '@/hooks/use-language';
import type { Session, Client } from '@shared/schema';
import { Calendar as CalendarIcon, Clock, User, StickyNote, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface SessionDetailModalProps {
  open: boolean;
  onClose: () => void;
  session: Session | null;
  client: Client | null;
}

export function SessionDetailModal({ open, onClose, session, client }: SessionDetailModalProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteSessionMutation = useMutation({
    mutationFn: (id: number) => sessionApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      toast({ title: 'Success', description: 'Session deleted successfully' });
      onClose();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete session', variant: 'destructive' });
    },
  });

  if (!session || !client) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            {t('actions.view_details') || 'Session Details'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-slate-500" />
            <span className="font-medium text-slate-900">{client.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-500" />
            <span>{session.startTime} - {session.endTime || '--'}</span>
          </div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-slate-500" />
            <span>{new Date(session.date).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs px-2 py-1 rounded bg-slate-100 text-slate-700">
              {session.status}
            </span>
          </div>
          {session.notes && (
            <div className="flex items-start gap-2">
              <StickyNote className="h-4 w-4 text-slate-500 mt-1" />
              <span>{session.notes}</span>
            </div>
          )}
          <div className="pt-4 flex justify-end">
            <button
              className="flex items-center gap-2 px-4 py-2 rounded bg-red-100 text-red-700 hover:bg-red-200 transition"
              onClick={() => deleteSessionMutation.mutate(session.id)}
              disabled={deleteSessionMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
              {deleteSessionMutation.isPending ? 'Deleting...' : 'Delete Session'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 