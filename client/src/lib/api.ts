import { apiRequest } from './queryClient';
import type { 
  Client, 
  InsertClient, 
  WorkoutPlan, 
  InsertWorkoutPlan, 
  Session, 
  InsertSession, 
  ExerciseProgress, 
  InsertExerciseProgress 
} from '@shared/schema';

// Client API
export const clientApi = {
  getAll: async (): Promise<Client[]> => {
    const response = await apiRequest('GET', '/api/clients');
    return response.json();
  },

  getById: async (id: number): Promise<Client> => {
    const response = await apiRequest('GET', `/api/clients/${id}`);
    return response.json();
  },

  create: async (client: InsertClient): Promise<Client> => {
    const response = await apiRequest('POST', '/api/clients', client);
    return response.json();
  },

  update: async (id: number, client: Partial<InsertClient>): Promise<Client> => {
    const response = await apiRequest('PATCH', `/api/clients/${id}`, client);
    return response.json();
  },

  delete: async (id: number): Promise<void> => {
    await apiRequest('DELETE', `/api/clients/${id}`);
  },
};

// Workout Plan API
export const workoutPlanApi = {
  getAll: async (clientId?: number): Promise<WorkoutPlan[]> => {
    const url = clientId ? `/api/workout-plans?clientId=${clientId}` : '/api/workout-plans';
    const response = await apiRequest('GET', url);
    return response.json();
  },

  create: async (plan: InsertWorkoutPlan): Promise<WorkoutPlan> => {
    const response = await apiRequest('POST', '/api/workout-plans', plan);
    return response.json();
  },

  generateAI: async (data: { clientId: number; duration: string; focus: string; language?: string }): Promise<WorkoutPlan> => {
    const response = await apiRequest('POST', '/api/workout-plans/generate', data);
    return response.json();
  },

  delete: async (planId: number): Promise<void> => {
    await apiRequest('DELETE', `/api/workout-plans/${planId}`);
  },
};

// Session API
export const sessionApi = {
  getAll: async (clientId?: number, date?: string): Promise<Session[]> => {
    let url = '/api/sessions';
    const params = new URLSearchParams();
    if (clientId) params.append('clientId', clientId.toString());
    if (date) params.append('date', date);
    if (params.toString()) url += `?${params.toString()}`;
    
    const response = await apiRequest('GET', url);
    return response.json();
  },

  create: async (session: InsertSession): Promise<Session> => {
    const response = await apiRequest('POST', '/api/sessions', session);
    return response.json();
  },

  update: async (id: number, session: Partial<InsertSession>): Promise<Session> => {
    const response = await apiRequest('PATCH', `/api/sessions/${id}`, session);
    return response.json();
  },

  delete: async (id: number): Promise<void> => {
    await apiRequest('DELETE', `/api/sessions/${id}`);
  },
};

// Progress API
export const progressApi = {
  getAll: async (clientId?: number, exerciseName?: string): Promise<ExerciseProgress[]> => {
    let url = '/api/progress';
    const params = new URLSearchParams();
    if (clientId) params.append('clientId', clientId.toString());
    if (exerciseName) params.append('exerciseName', exerciseName);
    if (params.toString()) url += `?${params.toString()}`;
    
    const response = await apiRequest('GET', url);
    return response.json();
  },

  create: async (progress: InsertExerciseProgress): Promise<ExerciseProgress> => {
    const response = await apiRequest('POST', '/api/progress', progress);
    return response.json();
  },

  getSummary: async (clientId: number): Promise<any> => {
    const response = await apiRequest('GET', `/api/progress/summary/${clientId}`);
    return response.json();
  },
};

// Dashboard API
export const dashboardApi = {
  getStats: async (): Promise<any> => {
    const response = await apiRequest('GET', '/api/dashboard/stats');
    return response.json();
  },

  getTodaySessions: async (): Promise<any[]> => {
    const response = await apiRequest('GET', '/api/dashboard/today-sessions');
    return response.json();
  },
};
