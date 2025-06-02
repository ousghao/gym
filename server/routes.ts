import type { Express } from "express";
import { createServer, type Server } from "http";
import { type IStorage } from "./storage.js";
import { insertClientSchema, insertWorkoutPlanSchema, insertSessionSchema, insertExerciseProgressSchema } from "@shared/schema";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { DbStorage } from './db-storage.js';
import { MemStorage } from './storage.js';

export async function registerRoutes(app: Express, storage: IStorage): Promise<Server> {
  const server = createServer(app);
  
  // Client routes
  app.get("/api/clients", async (req, res) => {
    try {
      const clients = await storage.getClients();
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const client = await storage.getClient(id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  app.post("/api/clients", async (req, res) => {
    try {
      const clientData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(clientData);
      res.status(201).json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid client data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  app.patch("/api/clients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const clientData = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(id, clientData);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid client data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update client" });
    }
  });

  app.delete("/api/clients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`[DELETE] /api/clients/${id}`);
      // Manual cascade: delete sessions and workout plans for this client
      await storage.getSessions(id).then(async (sessions) => {
        for (const session of sessions) {
          await storage.deleteSession(session.id);
        }
      });
      await storage.getWorkoutPlans(id).then(async (plans) => {
        for (const plan of plans) {
          await storage.deleteWorkoutPlan(plan.id);
        }
      });
      const deleted = await storage.deleteClient(id);
      console.log(`Delete result for client ${id}:`, deleted);
      if (!deleted) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting client:', error);
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  // Workout plan routes
  app.get("/api/workout-plans", async (req, res) => {
    try {
      const clientId = req.query.clientId ? parseInt(req.query.clientId as string) : undefined;
      const plans = await storage.getWorkoutPlans(clientId);
      res.json(plans);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch workout plans" });
    }
  });

  app.post("/api/workout-plans", async (req, res) => {
    try {
      const planData = insertWorkoutPlanSchema.parse(req.body);
      const plan = await storage.createWorkoutPlan(planData);
      res.status(201).json(plan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid workout plan data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create workout plan" });
    }
  });

  function fixGeminiJson(raw: string): string {
    // Remove code block markers and trim
    let cleaned = raw.replace(/```json|```/gi, '').trim();
    // Remove leading/trailing whitespace/newlines
    cleaned = cleaned.replace(/^[\s\r\n]+|[\s\r\n]+$/g, '');
    // Fix unquoted reps: "reps": 8-12, or "reps": 10-12 per leg, or "reps": 15-20
    cleaned = cleaned.replace(/"reps":\s*([0-9]+(?:-[0-9]+)?(?:\s*per\s*leg)?),/g, (match, p1) => `"reps": "${p1}",`);
    cleaned = cleaned.replace(/"reps":\s*([0-9]+(?:-[0-9]+)?(?:\s*per\s*leg)?)\n/g, (match, p1) => `"reps": "${p1}"\n`);
    cleaned = cleaned.replace(/"reps":\s*([0-9]+(?:-[0-9]+)?(?:\s*per\s*leg)?)\s*}/g, (match, p1) => `"reps": "${p1}"}`);
    return cleaned;
  }

  // Generate workout plan with Gemini AI
  app.post("/api/workout-plans/generate", async (req, res) => {
    try {
      const { clientId, duration, focus, language } = req.body;
      if (!clientId) {
        return res.status(400).json({ message: "Client ID is required" });
      }
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      // Get Gemini API key from environment
      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_STUDIO_API_KEY || process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "Gemini API key not configured" });
      }
      // Use the @google/generative-ai SDK
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      // Use a dynamic, structured JSON prompt based on client and user choices
      const durationText = duration === '1_week' ? '7 days' : duration === '2_weeks' ? '15 days' : '30 days';
      const focusText = focus.replace('_', ' ');
      const availableDays = Array.isArray(client.availableDays) ? client.availableDays.join(', ') : client.availableDays;
      const langInstruction = language === 'es' ? '\nRespond strictly in Spanish.' : '';
      const prompt = `Create a personalized gym workout plan for the following client in strict JSON format.\n\nClient details:\n- Goal: ${client.goal}\n- Experience: ${client.experience}\n- Available Days: ${availableDays}\n- Equipment: ${client.equipment}\n- Limitations: ${client.limitations || 'None'}\n\nPlan requirements:\n- Duration: ${durationText}\n- Focus: ${focusText}\n- Return an array where each item represents one day.\n- Each day should include a name (Day 1, Day 2, ...), the focus (e.g. Legs, Chest, Core...), and 3 to 5 exercises.\n- Each exercise should contain name, sets, and reps.\n- Do not include any introduction or extra text. Respond only with valid JSON.${langInstruction}`;
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 800,
          temperature: 0.7,
          topP: 0.8,
          candidateCount: 1
        }
      });
      const text = await result.response.text();
      let planJson: any = {};
      try {
        let cleaned = fixGeminiJson(text);
        planJson = JSON.parse(cleaned);
      } catch (e) {
        console.error('Failed to parse Gemini response:', text);
        planJson = { error: 'Failed to parse Gemini response as JSON', raw: text };
      }
      // Compose InsertWorkoutPlan
      const planData = {
        clientId,
        name: `AI Plan for ${client.name}`,
        description: `AI-generated plan (${duration}, ${focus})`,
        duration: duration || '1_week',
        focus: focus || 'balanced',
        plan: planJson,
        isActive: true,
      };
      const savedPlan = await storage.createWorkoutPlan(planData);
      res.status(201).json(savedPlan);
    } catch (error: any) {
      res.status(500).json({ message: `Gemini API error: ${error?.message || error}` });
    }
  });

  // Session routes
  app.get("/api/sessions", async (req, res) => {
    try {
      const clientId = req.query.clientId ? parseInt(req.query.clientId as string) : undefined;
      const date = req.query.date as string;
      const sessions = await storage.getSessions(clientId, date);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  app.post("/api/sessions", async (req, res) => {
    try {
      const sessionData = insertSessionSchema.parse(req.body);
      const session = await storage.createSession(sessionData);
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid session data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create session" });
    }
  });

  app.patch("/api/sessions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const sessionData = insertSessionSchema.partial().parse(req.body);
      const session = await storage.updateSession(id, sessionData);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid session data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update session" });
    }
  });

  app.delete("/api/sessions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteSession(id);
      if (!deleted) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete session" });
    }
  });

  // Progress tracking routes
  app.get("/api/progress", async (req, res) => {
    try {
      const clientId = req.query.clientId ? parseInt(req.query.clientId as string) : undefined;
      const exerciseName = req.query.exerciseName as string;
      const progress = await storage.getExerciseProgress(clientId, exerciseName);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  app.post("/api/progress", async (req, res) => {
    try {
      const progressData = insertExerciseProgressSchema.parse(req.body);
      const progress = await storage.createExerciseProgress(progressData);
      res.status(201).json(progress);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid progress data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to log progress" });
    }
  });

  app.get("/api/progress/summary/:clientId", async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const summary = await storage.getProgressSummary(clientId);
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch progress summary" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const clients = await storage.getClients();
      const plans = await storage.getWorkoutPlans();
      const sessions = await storage.getSessions();
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      // Sessions today
      const sessionsToday = sessions.filter(s => {
        const sessionDate = new Date(s.date).toISOString().split('T')[0];
        return sessionDate === todayStr;
      });
      // Sessions this week
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      const sessionsThisWeek = sessions.filter(s => {
        const d = new Date(s.date);
        return d >= startOfWeek && d <= endOfWeek;
      });
      // AI plans generated (name or description contains 'AI')
      const aiPlansGenerated = plans.filter(p => (p.name && p.name.toLowerCase().includes('ai')) || (p.description && p.description.toLowerCase().includes('ai'))).length;
      // Average progress (mean improvement across all clients)
      let avgProgress = 0;
      let progressCount = 0;
      for (const client of clients) {
        const summary = await storage.getProgressSummary(client.id);
        if (summary && typeof summary === 'object') {
          for (const exercise in summary) {
            const improvement = summary[exercise]?.improvement;
            if (improvement && typeof improvement.weight === 'number') {
              avgProgress += improvement.weight;
              progressCount++;
            }
          }
        }
      }
      avgProgress = progressCount > 0 ? (avgProgress / progressCount) : 0;
      // Compose stats
      const stats = {
        totalClients: clients.length,
        totalPlans: plans.length,
        totalSessions: sessions.length,
        sessionsToday: sessionsToday.length,
        sessionsThisWeek: sessionsThisWeek.length,
        avgProgress: progressCount > 0 ? `${avgProgress.toFixed(1)}%` : '0%',
        aiPlansGenerated,
      };
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Get today's sessions with client details
  app.get("/api/dashboard/today-sessions", async (req, res) => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const sessions = await storage.getSessions(undefined, todayStr);
      
      const sessionsWithClients = await Promise.all(
        sessions.map(async (session) => {
          try {
            const client = await storage.getClient(session.clientId);
            if (!client) {
              console.warn(`[today-sessions] Client not found for session`, session.id, 'clientId:', session.clientId);
              return null;
            }
            return {
              ...session,
              client,
            };
          } catch (err) {
            console.error(`[today-sessions] Error resolving client for session`, session.id, err);
            return null;
          }
        })
      );

      res.json(sessionsWithClients.filter(Boolean));
    } catch (error) {
      console.error('[today-sessions] Fatal error:', error);
      res.status(500).json({ message: "Failed to fetch today's sessions" });
    }
  });

  app.delete("/api/workout-plans/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteWorkoutPlan(id);
      if (!deleted) {
        return res.status(404).json({ message: "Workout plan not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete workout plan" });
    }
  });

  return server;
}
