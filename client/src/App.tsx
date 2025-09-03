import { useState } from 'react';
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/hooks/use-language";
import { ThemeProvider } from "@/hooks/use-theme";
import { Navigation } from "@/components/layout/navigation";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Dashboard } from "@/pages/dashboard";
import { Clients } from "@/pages/clients";
import { Calendar } from "@/pages/calendar";
import { Progress } from "@/pages/progress";
import { AddClientModal } from "@/components/modals/add-client-modal";
import { ClientDetailModal } from "@/components/modals/client-detail-modal";
import { WorkoutGeneratorModal } from "@/components/modals/workout-generator-modal";
import { ProgressLogModal } from "@/components/modals/progress-log-modal";
import { WorkoutSessionModal } from "@/components/modals/workout-session-modal";
import { ScheduleSessionModal } from "@/components/modals/schedule-session-modal";
import { ReportsModal } from "@/components/modals/reports-modal";
import NotFound from "@/pages/not-found";

function Router() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [isClientDetailModalOpen, setIsClientDetailModalOpen] = useState(false);
  const [isWorkoutGeneratorModalOpen, setIsWorkoutGeneratorModalOpen] = useState(false);
  const [isProgressLogModalOpen, setIsProgressLogModalOpen] = useState(false);
  const [isWorkoutSessionModalOpen, setIsWorkoutSessionModalOpen] = useState(false);
  const [isScheduleSessionModalOpen, setIsScheduleSessionModalOpen] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [preSelectedClientId, setPreSelectedClientId] = useState<number | undefined>(undefined);

  const handleViewChange = (view: string) => {
    setCurrentView(view);
  };

  const handleAddClient = () => {
    setIsAddClientModalOpen(true);
  };

  const handleViewClient = (clientId: number) => {
    setSelectedClientId(clientId);
    setIsClientDetailModalOpen(true);
  };

  const handleGenerateWorkout = (clientId?: number) => {
    setPreSelectedClientId(clientId);
    setIsWorkoutGeneratorModalOpen(true);
  };

  const handleLogProgress = () => {
    setIsProgressLogModalOpen(true);
  };

  const handleStartWorkout = (clientId?: number) => {
    setPreSelectedClientId(clientId);
    setIsWorkoutSessionModalOpen(true);
  };

  const handleScheduleSession = () => {
    setIsScheduleSessionModalOpen(true);
  };

  const handleViewReports = () => {
    setIsReportsModalOpen(true);
  };

  const handleQuickLog = () => {
    setIsProgressLogModalOpen(true);
  };

  const handleLogWorkout = (clientId: number) => {
    setPreSelectedClientId(clientId);
    setIsProgressLogModalOpen(true);
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'clients':
        return (
          <Clients
            onViewClient={handleViewClient}
            onGenerateWorkout={handleGenerateWorkout}
            onLogWorkout={handleLogWorkout}
          />
        );
      case 'calendar':
        return <Calendar />;
      case 'progress':
        return (
          <Progress
            onLogProgress={handleLogProgress}
            onStartWorkout={() => handleStartWorkout()}
            onViewReports={handleViewReports}
          />
        );
      default:
        return (
          <Dashboard
            onGenerateWorkout={() => handleGenerateWorkout()}
            onLogProgress={handleLogProgress}
            onScheduleSession={handleScheduleSession}
            onViewReports={handleViewReports}
            onStartWorkout={handleStartWorkout}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation
        currentView={currentView}
        onViewChange={handleViewChange}
        onAddClient={handleAddClient}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 lg:pb-6">
        {renderCurrentView()}
      </main>

      <MobileNav
        currentView={currentView}
        onViewChange={handleViewChange}
        onQuickLog={handleQuickLog}
      />

      {/* Modals */}
      <AddClientModal
        open={isAddClientModalOpen}
        onClose={() => setIsAddClientModalOpen(false)}
      />

      <ClientDetailModal
        open={isClientDetailModalOpen}
        onClose={() => {
          setIsClientDetailModalOpen(false);
          setSelectedClientId(null);
        }}
        clientId={selectedClientId}
        onGenerateWorkout={handleGenerateWorkout}
        onLogProgress={handleLogWorkout}
      />

      <WorkoutGeneratorModal
        open={isWorkoutGeneratorModalOpen}
        onClose={() => {
          setIsWorkoutGeneratorModalOpen(false);
          setPreSelectedClientId(undefined);
        }}
        preSelectedClientId={preSelectedClientId}
      />

      <ProgressLogModal
        open={isProgressLogModalOpen}
        onClose={() => {
          setIsProgressLogModalOpen(false);
          setPreSelectedClientId(undefined);
        }}
        preSelectedClientId={preSelectedClientId}
      />

      <WorkoutSessionModal
        open={isWorkoutSessionModalOpen}
        onClose={() => {
          setIsWorkoutSessionModalOpen(false);
          setPreSelectedClientId(undefined);
        }}
        preSelectedClientId={preSelectedClientId}
      />

      <ScheduleSessionModal
        open={isScheduleSessionModalOpen}
        onClose={() => setIsScheduleSessionModalOpen(false)}
      />

      <ReportsModal
        open={isReportsModalOpen}
        onClose={() => setIsReportsModalOpen(false)}
      />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="gym-coach-theme">
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <Switch>
              <Route path="/" component={Router} />
              <Route component={NotFound} />
            </Switch>
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
