import { db } from './db.js';
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
import { eq, and, sql } from 'drizzle-orm';
import type { IStorage } from './storage.js';

export class DbStorage implements IStorage {
  // Client operations
  async getClients(): Promise<Client[]> {
    return await db.select().from(clients);
  }

  async getClient(id: number): Promise<Client | undefined> {
    const result = await db.select().from(clients).where(eq(clients.id, id));
    return result[0];
  }

  async createClient(client: InsertClient): Promise<Client> {
    const result = await db.insert(clients).values(client).returning();
    return result[0];
  }

  async updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined> {
    const result = await db.update(clients)
      .set(client)
      .where(eq(clients.id, id))
      .returning();
    return result[0];
  }

  async deleteClient(id: number): Promise<boolean> {
    const result = await db.delete(clients)
      .where(eq(clients.id, id))
      .returning();
    return result.length > 0;
  }

  // Workout plan operations
  async getWorkoutPlans(clientId?: number): Promise<WorkoutPlan[]> {
    if (clientId) {
      return await db.select().from(workoutPlans).where(eq(workoutPlans.clientId, clientId));
    }
    return await db.select().from(workoutPlans);
  }

  async getWorkoutPlan(id: number): Promise<WorkoutPlan | undefined> {
    const result = await db.select().from(workoutPlans).where(eq(workoutPlans.id, id));
    return result[0];
  }

  async createWorkoutPlan(plan: InsertWorkoutPlan): Promise<WorkoutPlan> {
    const result = await db.insert(workoutPlans).values(plan).returning();
    return result[0];
  }

  async updateWorkoutPlan(id: number, plan: Partial<InsertWorkoutPlan>): Promise<WorkoutPlan | undefined> {
    const result = await db.update(workoutPlans)
      .set(plan)
      .where(eq(workoutPlans.id, id))
      .returning();
    return result[0];
  }

  async deleteWorkoutPlan(id: number): Promise<boolean> {
    const result = await db.delete(workoutPlans)
      .where(eq(workoutPlans.id, id))
      .returning();
    return result.length > 0;
  }

  // Session operations
  async getSessions(clientId?: number, date?: string): Promise<Session[]> {
    let query = db.select().from(sessions);
    if (clientId && date) {
      const dateStr = typeof date === 'string' ? date : new Date(date).toISOString().split('T')[0];
      query = query.where(and(eq(sessions.clientId, clientId), sql`DATE(${sessions.date}) = DATE(${dateStr})`));
    } else if (clientId) {
      query = query.where(eq(sessions.clientId, clientId));
    } else if (date) {
      const dateStr = typeof date === 'string' ? date : new Date(date).toISOString().split('T')[0];
      query = query.where(sql`DATE(${sessions.date}) = DATE(${dateStr})`);
    }
    return await query;
  }

  async getSession(id: number): Promise<Session | undefined> {
    const result = await db.select().from(sessions).where(eq(sessions.id, id));
    return result[0];
  }

  async createSession(session: InsertSession): Promise<Session> {
    const result = await db.insert(sessions).values(session).returning();
    return result[0];
  }

  async updateSession(id: number, session: Partial<InsertSession>): Promise<Session | undefined> {
    const result = await db.update(sessions)
      .set(session)
      .where(eq(sessions.id, id))
      .returning();
    return result[0];
  }

  async deleteSession(id: number): Promise<boolean> {
    const result = await db.delete(sessions)
      .where(eq(sessions.id, id))
      .returning();
    return result.length > 0;
  }

  // Exercise progress operations
  async getExerciseProgress(clientId?: number, exerciseName?: string): Promise<ExerciseProgress[]> {
    let query = db.select().from(exerciseProgress);
    
    if (clientId) {
      query = query.where(eq(exerciseProgress.clientId, clientId));
    }
    
    if (exerciseName) {
      query = query.where(eq(exerciseProgress.exerciseName, exerciseName));
    }
    
    return await query;
  }

  async createExerciseProgress(progress: InsertExerciseProgress): Promise<ExerciseProgress> {
    const result = await db.insert(exerciseProgress).values(progress).returning();
    return result[0];
  }

  async getProgressSummary(clientId: number): Promise<any> {
    const progress = await this.getExerciseProgress(clientId);
    return {
      totalExercises: progress.length,
      exercises: progress.reduce((acc, curr) => {
        if (!acc[curr.exerciseName]) {
          acc[curr.exerciseName] = [];
        }
        acc[curr.exerciseName].push(curr);
        return acc;
      }, {} as Record<string, ExerciseProgress[]>)
    };
  }

  // MIGRATION: Convert all workout plans with .raw to parsed arrays
  async migrateWorkoutPlansToParsedArrays() {
    const allPlans = await db.select().from(workoutPlans);
    for (const plan of allPlans) {
      if (plan.plan && typeof plan.plan === 'object' && 'raw' in plan.plan && typeof plan.plan.raw === 'string') {
        let cleaned = plan.plan.raw.trim();
        cleaned = cleaned.replace(/```json|```/gi, '').trim();
        cleaned = cleaned.replace(/^[\s\r\n]+|[\s\r\n]+$/g, '');
        try {
          const parsed = JSON.parse(cleaned);
          if (Array.isArray(parsed)) {
            await db.update(workoutPlans)
              .set({ plan: parsed })
              .where(eq(workoutPlans.id, plan.id));
          }
        } catch (e) {
          // skip if parsing fails
        }
      }
    }
  }
}

export async function migrateWorkoutPlansToParsedArrays() {
  const allPlans = await db.select().from(workoutPlans);
  for (const plan of allPlans) {
    if (plan.plan && typeof plan.plan === 'object' && 'raw' in plan.plan && typeof plan.plan.raw === 'string') {
      let cleaned = plan.plan.raw.trim();
      cleaned = cleaned.replace(/```json|```/gi, '').trim();
      cleaned = cleaned.replace(/^[\s\r\n]+|[\s\r\n]+$/g, '');
      try {
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) {
          await db.update(workoutPlans)
            .set({ plan: parsed })
            .where(eq(workoutPlans.id, plan.id));
        }
      } catch (e) {
        // skip if parsing fails
      }
    }
  }
} 