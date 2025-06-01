import { useState } from 'react';
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/hooks/use-language";
import { LanguageToggle } from "@/components/language-toggle";
import { Navigation } from "@/components/layout/navigation";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Dashboard } from "@/pages/dashboard";
import { Clients } from "@/pages/clients";
import { Calendar } from "@/pages/calendar";
import { AddClientModal } from "@/components/modals/add-client-modal";
import { ClientDetailModal } from "@/components/modals/client-detail-modal";
import { WorkoutGeneratorModal } from "@/components/modals/workout-generator-modal";
import NotFound from "@/pages/not-found";

function Router() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [isClientDetailModalOpen, setIsClientDetailModalOpen] = useState(false);
  const [isWorkoutGeneratorModalOpen, setIsWorkoutGeneratorModalOpen] = useState(false);
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
    console.log('Log progress clicked');
    // TODO: Implement progress logging modal
  };

  const handleScheduleSession = () => {
    console.log('Schedule session clicked');
    // TODO: Implement session scheduling modal
  };

  const handleViewReports = () => {
    console.log('View reports clicked');
    // TODO: Implement reports view
  };

  const handleQuickLog = () => {
    console.log('Quick log clicked');
    // TODO: Implement quick logging modal
  };

  const handleLogWorkout = (clientId: number) => {
    console.log('Log workout for client:', clientId);
    // TODO: Implement workout logging modal
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
      default:
        return (
          <Dashboard
            onGenerateWorkout={() => handleGenerateWorkout()}
            onLogProgress={handleLogProgress}
            onScheduleSession={handleScheduleSession}
            onViewReports={handleViewReports}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <LanguageToggle />
      
      <Navigation
        currentView={currentView}
        onViewChange={handleViewChange}
        onAddClient={handleAddClient}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-6">
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
      />

      <WorkoutGeneratorModal
        open={isWorkoutGeneratorModalOpen}
        onClose={() => {
          setIsWorkoutGeneratorModalOpen(false);
          setPreSelectedClientId(undefined);
        }}
        preSelectedClientId={preSelectedClientId}
      />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Switch>
            <Route path="/" component={Router} />
            <Route component={NotFound} />
          </Switch>
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
