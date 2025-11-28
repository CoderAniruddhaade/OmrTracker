import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { z } from "zod";

// Validation schema for OMR sheet submission
const chapterDataSchema = z.object({
  done: z.boolean(),
  practiced: z.boolean(),
  questionsPracticed: z.number().min(0, "Questions practiced cannot be negative"),
});

const subjectDataSchema = z.object({
  present: z.number().min(0, "Present count cannot be negative"),
  chapters: z.record(z.string(), chapterDataSchema),
});

const omrSheetBodySchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  physics: subjectDataSchema,
  chemistry: subjectDataSchema,
  biology: subjectDataSchema,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes - returns null if not authenticated (NOT 401)
  // This allows frontend to check auth state without error
  app.get("/api/auth/user", async (req: any, res) => {
    try {
      if (!req.isAuthenticated() || !req.user?.claims?.sub) {
        return res.json(null);
      }
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // OMR Sheet routes
  app.post("/api/omr-sheets", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Validate request body with 8-question enforcement
      const validatedData = omrSheetBodySchema.parse(req.body);
      
      const omrSheet = await storage.createOmrSheet({
        name: validatedData.name,
        physics: validatedData.physics,
        chemistry: validatedData.chemistry,
        biology: validatedData.biology,
        userId,
      });
      
      res.status(201).json(omrSheet);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        console.error("Error creating OMR sheet:", error);
        res.status(500).json({ message: "Failed to create OMR sheet" });
      }
    }
  });

  // Get current user's sheets
  app.get("/api/my-sheets", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const sheets = await storage.getOmrSheetsByUser(userId);
      res.json(sheets);
    } catch (error) {
      console.error("Error fetching sheets:", error);
      res.status(500).json({ message: "Failed to fetch sheets" });
    }
  });

  // Get all activity (all users' sheets)
  app.get("/api/activity", isAuthenticated, async (req: any, res) => {
    try {
      const sheets = await storage.getAllOmrSheets();
      res.json(sheets);
    } catch (error) {
      console.error("Error fetching activity:", error);
      res.status(500).json({ message: "Failed to fetch activity" });
    }
  });

  // Get user profile with their sheets
  app.get("/api/users/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const result = await storage.getUserWithSheets(userId);
      
      if (!result) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  return httpServer;
}
