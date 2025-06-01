import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertClientSchema, insertWorkoutPlanSchema, insertSessionSchema, insertExerciseProgressSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  
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
      const deleted = await storage.deleteClient(id);
      if (!deleted) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.status(204).send();
    } catch (error) {
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

  // Generate workout plan with Gemini AI
  app.post("/api/workout-plans/generate", async (req, res) => {
    try {
      const { clientId, duration, focus } = req.body;
      
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

      // Prepare the prompt for Gemini
      const prompt = `Create a detailed ${duration.replace('_', ' ')} workout plan for a gym client with the following profile:

Name: ${client.name}
Age: ${client.age}
Goal: ${client.goal.replace('_', ' ')}
Experience Level: ${client.experience}
Available Days: ${client.availableDays.join(', ')}
Equipment: ${client.equipment.replace('_', ' ')}
Limitations: ${client.limitations || 'None'}
Focus: ${focus.replace('_', ' ')}

Please provide a structured workout plan in JSON format with the following structure:
{
  "overview": "Brief description of the plan",
  "days": [
    {
      "day": "Monday",
      "type": "Upper Body",
      "duration": 45,
      "exercises": [
        {
          "name": "Exercise name",
          "sets": 3,
          "reps": "10-12",
          "weight": "bodyweight or suggested weight",
          "notes": "Form tips or modifications"
        }
      ]
    }
  ],
  "progressionNotes": "How to progress over time",
  "safetyTips": "Important safety considerations"
}

Make sure the plan is appropriate for their experience level, respects their limitations, and uses their available equipment. Focus on ${focus} while maintaining a balanced approach.`;

      // Call Gemini API
      try {
        const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 2048,
            }
          })
        });

        if (!geminiResponse.ok) {
          throw new Error(`Gemini API error: ${geminiResponse.status}`);
        }

        const geminiData = await geminiResponse.json();
        const generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!generatedText) {
          throw new Error("No content generated by Gemini");
        }

        // Try to parse the JSON from the generated text
        let workoutPlan;
        try {
          // Extract JSON from the response (Gemini might wrap it in markdown)
          const jsonMatch = generatedText.match(/```json\n([\s\S]*?)\n```/) || generatedText.match(/\{[\s\S]*\}/);
          const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : generatedText;
          workoutPlan = JSON.parse(jsonString);
        } catch (parseError) {
          // If JSON parsing fails, create a structured plan from the text
          workoutPlan = {
            overview: `AI-generated ${duration.replace('_', ' ')} plan focusing on ${focus.replace('_', ' ')}`,
            generatedText: generatedText,
            days: [], // We'll populate this based on available days
            progressionNotes: "Follow the guidance provided and adjust weights/reps as you progress",
            safetyTips: "Always warm up before exercising and listen to your body"
          };
        }

        // Create and save the workout plan
        const planData = {
          clientId,
          name: `${focus.replace('_', ' ')} Plan - ${new Date().toLocaleDateString()}`,
          description: workoutPlan.overview || `AI-generated workout plan for ${client.name}`,
          duration,
          focus,
          plan: workoutPlan,
          isActive: true,
        };

        const savedPlan = await storage.createWorkoutPlan(planData);
        res.status(201).json(savedPlan);

      } catch (apiError) {
        console.error("Gemini API error:", apiError);
        res.status(500).json({ message: "Failed to generate workout plan with AI", error: apiError.message });
      }

    } catch (error) {
      console.error("Generate workout plan error:", error);
      res.status(500).json({ message: "Failed to generate workout plan" });
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
      const today = new Date().toISOString().split('T')[0];
      const todaySessions = await storage.getSessions(undefined, today);
      
      const stats = {
        totalClients: clients.length,
        sessionsToday: todaySessions.length,
        sessionsThisWeek: todaySessions.length * 7, // Mock calculation
        avgProgress: "+12%", // Mock value
        aiPlansGenerated: 48, // Mock value
      };

      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Get today's sessions with client details
  app.get("/api/dashboard/today-sessions", async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const sessions = await storage.getSessions(undefined, today);
      
      const sessionsWithClients = await Promise.all(
        sessions.map(async (session) => {
          const client = await storage.getClient(session.clientId);
          return {
            ...session,
            client,
          };
        })
      );

      res.json(sessionsWithClients);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch today's sessions" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
