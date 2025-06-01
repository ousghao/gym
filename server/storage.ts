import { 
  clients, 
  workoutPlans, 
  sessions, 
  exerciseProgress,
  type Client, 
  type InsertClient,
  type WorkoutPlan,
  type InsertWorkoutPlan,
  type Session,
  type InsertSession,
  type ExerciseProgress,
  type InsertExerciseProgress
} from "@shared/schema";

export interface IStorage {
  // Client operations
  getClients(): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: number): Promise<boolean>;

  // Workout plan operations
  getWorkoutPlans(clientId?: number): Promise<WorkoutPlan[]>;
  getWorkoutPlan(id: number): Promise<WorkoutPlan | undefined>;
  createWorkoutPlan(plan: InsertWorkoutPlan): Promise<WorkoutPlan>;
  updateWorkoutPlan(id: number, plan: Partial<InsertWorkoutPlan>): Promise<WorkoutPlan | undefined>;
  deleteWorkoutPlan(id: number): Promise<boolean>;

  // Session operations
  getSessions(clientId?: number, date?: string): Promise<Session[]>;
  getSession(id: number): Promise<Session | undefined>;
  createSession(session: InsertSession): Promise<Session>;
  updateSession(id: number, session: Partial<InsertSession>): Promise<Session | undefined>;
  deleteSession(id: number): Promise<boolean>;

  // Exercise progress operations
  getExerciseProgress(clientId?: number, exerciseName?: string): Promise<ExerciseProgress[]>;
  createExerciseProgress(progress: InsertExerciseProgress): Promise<ExerciseProgress>;
  getProgressSummary(clientId: number): Promise<any>;
}

export class MemStorage implements IStorage {
  private clients: Map<number, Client>;
  private workoutPlans: Map<number, WorkoutPlan>;
  private sessions: Map<number, Session>;
  private exerciseProgress: Map<number, ExerciseProgress>;
  private currentClientId: number;
  private currentWorkoutPlanId: number;
  private currentSessionId: number;
  private currentProgressId: number;

  constructor() {
    this.clients = new Map();
    this.workoutPlans = new Map();
    this.sessions = new Map();
    this.exerciseProgress = new Map();
    this.currentClientId = 1;
    this.currentWorkoutPlanId = 1;
    this.currentSessionId = 1;
    this.currentProgressId = 1;

    // Initialize with some sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Sample clients
    const client1: Client = {
      id: 1,
      name: "Maria Rodriguez",
      age: 28,
      weight: 65,
      height: 165,
      goal: "weight_loss",
      experience: "intermediate",
      availableDays: ["monday", "wednesday", "friday"],
      equipment: "full_gym",
      limitations: "Lower back sensitivity",
      createdAt: new Date(),
    };

    const client2: Client = {
      id: 2,
      name: "John Davis",
      age: 35,
      weight: 80,
      height: 180,
      goal: "muscle_gain",
      experience: "advanced",
      availableDays: ["monday", "tuesday", "thursday", "friday"],
      equipment: "full_gym",
      limitations: null,
      createdAt: new Date(),
    };

    const client3: Client = {
      id: 3,
      name: "Sofia Kim",
      age: 24,
      weight: 55,
      height: 158,
      goal: "endurance",
      experience: "beginner",
      availableDays: ["tuesday", "thursday", "saturday"],
      equipment: "home_basic",
      limitations: null,
      createdAt: new Date(),
    };

    this.clients.set(1, client1);
    this.clients.set(2, client2);
    this.clients.set(3, client3);
    this.currentClientId = 4;

    // Sample sessions for today
    const today = new Date();
    const session1: Session = {
      id: 1,
      clientId: 1,
      workoutPlanId: null,
      date: today,
      startTime: "09:00",
      endTime: "10:00",
      status: "scheduled",
      notes: null,
      createdAt: new Date(),
    };

    const session2: Session = {
      id: 2,
      clientId: 2,
      workoutPlanId: null,
      date: today,
      startTime: "11:30",
      endTime: "12:30",
      status: "scheduled",
      notes: null,
      createdAt: new Date(),
    };

    const session3: Session = {
      id: 3,
      clientId: 3,
      workoutPlanId: null,
      date: today,
      startTime: "14:00",
      endTime: "15:00",
      status: "scheduled",
      notes: null,
      createdAt: new Date(),
    };

    this.sessions.set(1, session1);
    this.sessions.set(2, session2);
    this.sessions.set(3, session3);
    this.currentSessionId = 4;
  }

  // Client operations
  async getClients(): Promise<Client[]> {
    return Array.from(this.clients.values());
  }

  async getClient(id: number): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const id = this.currentClientId++;
    const client: Client = { 
      ...insertClient, 
      id, 
      createdAt: new Date() 
    };
    this.clients.set(id, client);
    return client;
  }

  async updateClient(id: number, clientUpdate: Partial<InsertClient>): Promise<Client | undefined> {
    const client = this.clients.get(id);
    if (!client) return undefined;

    const updatedClient = { ...client, ...clientUpdate };
    this.clients.set(id, updatedClient);
    return updatedClient;
  }

  async deleteClient(id: number): Promise<boolean> {
    return this.clients.delete(id);
  }

  // Workout plan operations
  async getWorkoutPlans(clientId?: number): Promise<WorkoutPlan[]> {
    const plans = Array.from(this.workoutPlans.values());
    return clientId ? plans.filter(plan => plan.clientId === clientId) : plans;
  }

  async getWorkoutPlan(id: number): Promise<WorkoutPlan | undefined> {
    return this.workoutPlans.get(id);
  }

  async createWorkoutPlan(insertPlan: InsertWorkoutPlan): Promise<WorkoutPlan> {
    const id = this.currentWorkoutPlanId++;
    const plan: WorkoutPlan = { 
      ...insertPlan, 
      id, 
      createdAt: new Date() 
    };
    this.workoutPlans.set(id, plan);
    return plan;
  }

  async updateWorkoutPlan(id: number, planUpdate: Partial<InsertWorkoutPlan>): Promise<WorkoutPlan | undefined> {
    const plan = this.workoutPlans.get(id);
    if (!plan) return undefined;

    const updatedPlan = { ...plan, ...planUpdate };
    this.workoutPlans.set(id, updatedPlan);
    return updatedPlan;
  }

  async deleteWorkoutPlan(id: number): Promise<boolean> {
    return this.workoutPlans.delete(id);
  }

  // Session operations
  async getSessions(clientId?: number, date?: string): Promise<Session[]> {
    let sessions = Array.from(this.sessions.values());
    
    if (clientId) {
      sessions = sessions.filter(session => session.clientId === clientId);
    }
    
    if (date) {
      const targetDate = new Date(date);
      sessions = sessions.filter(session => 
        session.date.toDateString() === targetDate.toDateString()
      );
    }
    
    return sessions;
  }

  async getSession(id: number): Promise<Session | undefined> {
    return this.sessions.get(id);
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const id = this.currentSessionId++;
    const session: Session = { 
      ...insertSession, 
      id, 
      createdAt: new Date() 
    };
    this.sessions.set(id, session);
    return session;
  }

  async updateSession(id: number, sessionUpdate: Partial<InsertSession>): Promise<Session | undefined> {
    const session = this.sessions.get(id);
    if (!session) return undefined;

    const updatedSession = { ...session, ...sessionUpdate };
    this.sessions.set(id, updatedSession);
    return updatedSession;
  }

  async deleteSession(id: number): Promise<boolean> {
    return this.sessions.delete(id);
  }

  // Exercise progress operations
  async getExerciseProgress(clientId?: number, exerciseName?: string): Promise<ExerciseProgress[]> {
    let progress = Array.from(this.exerciseProgress.values());
    
    if (clientId) {
      progress = progress.filter(p => p.clientId === clientId);
    }
    
    if (exerciseName) {
      progress = progress.filter(p => p.exerciseName === exerciseName);
    }
    
    return progress;
  }

  async createExerciseProgress(insertProgress: InsertExerciseProgress): Promise<ExerciseProgress> {
    const id = this.currentProgressId++;
    const progress: ExerciseProgress = { 
      ...insertProgress, 
      id, 
      date: new Date() 
    };
    this.exerciseProgress.set(id, progress);
    return progress;
  }

  async getProgressSummary(clientId: number): Promise<any> {
    const progress = await this.getExerciseProgress(clientId);
    
    // Group by exercise and calculate improvements
    const exerciseGroups: Record<string, ExerciseProgress[]> = {};
    progress.forEach(p => {
      if (!exerciseGroups[p.exerciseName]) {
        exerciseGroups[p.exerciseName] = [];
      }
      exerciseGroups[p.exerciseName].push(p);
    });

    const summary: Record<string, any> = {};
    Object.entries(exerciseGroups).forEach(([exercise, records]) => {
      records.sort((a, b) => a.date.getTime() - b.date.getTime());
      const first = records[0];
      const last = records[records.length - 1];
      
      summary[exercise] = {
        totalSessions: records.length,
        improvement: first && last ? {
          weight: last.weight && first.weight ? ((last.weight - first.weight) / first.weight * 100) : 0,
          reps: last.reps && first.reps ? ((last.reps - first.reps) / first.reps * 100) : 0,
        } : null,
        lastWeight: last.weight,
        lastReps: last.reps,
        suggestedWeight: last.weight ? Math.round(last.weight * 1.05) : null,
      };
    });

    return summary;
  }
}

export const storage = new MemStorage();
