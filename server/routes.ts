import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { z } from "zod";
import * as bcrypt from "bcryptjs";

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

  // User registration
  app.post("/api/auth/register", async (req: any, res) => {
    try {
      let { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }
      
      // Normalize username - remove spaces
      username = username.replace(/\s+/g, '').trim();
      
      if (!username) {
        return res.status(400).json({ message: "Username cannot be only spaces" });
      }
      
      // Check if user already exists
      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(409).json({ message: "Username already taken" });
      }
      
      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Create user with both hash and plain password
      const user = await storage.registerUser(username, passwordHash, password);
      res.status(201).json({ id: user.id, username: user.username, firstName: user.firstName });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ message: "Failed to register" });
    }
  });

  // User login
  app.post("/api/auth/login", async (req: any, res) => {
    try {
      let { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }
      
      // Normalize username - remove spaces
      username = username.replace(/\s+/g, '').trim();
      
      // Find user by username
      const user = await storage.getUserByUsername(username);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Verify password
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Return user info (frontend will store in localStorage)
      res.json({ id: user.id, username: user.username, firstName: user.firstName });
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Auth routes - returns null if not authenticated (NOT 401)
  // This allows frontend to check auth state without error
  app.get("/api/auth/user", async (req: any, res) => {
    try {
      if (!req.isAuthenticated() || !req.user?.claims?.sub) {
        return res.json(null);
      }
      const userId = req.userId || req.user?.claims?.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Update user profile (name) - works with local auth
  app.patch("/api/auth/profile", async (req: any, res) => {
    try {
      const userId = req.body.userId;
      
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const { firstName, lastName } = req.body;
      
      const user = await storage.updateUserProfile(userId, firstName, lastName);
      res.json({ id: user.id, username: user.username, firstName: user.firstName, lastName: user.lastName });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Update user password - works with local auth
  app.patch("/api/auth/password", async (req: any, res) => {
    try {
      const userId = req.body.userId;
      
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new password required" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "User not found" });
      }
      
      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      
      const newHash = await bcrypt.hash(newPassword, 10);
      await storage.updateUserPassword(userId, newHash, newPassword);
      
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Error updating password:", error);
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  // OMR Sheet routes
  // GET current user's sheet
  app.get("/api/omr-sheets/current", isAuthenticated, async (req: any, res) => {
    try {
      // Check for impersonation via header, otherwise use session
      const userId = req.headers["x-user-id"] || req.userId || req.user?.claims?.sub;
      const sheet = await storage.getCurrentUserSheet(userId);
      res.json(sheet);
    } catch (error) {
      console.error("Error fetching current sheet:", error);
      res.status(500).json({ message: "Failed to fetch current sheet" });
    }
  });

  // POST or UPDATE sheet (creates if doesn't exist, updates if exists)
  app.post("/api/omr-sheets", isAuthenticated, async (req: any, res) => {
    try {
      // Check for impersonation via header, otherwise use session
      const userId = req.headers["x-user-id"] || req.userId || req.user?.claims?.sub;
      
      // Validate request body
      const validatedData = omrSheetBodySchema.parse(req.body);
      
      const omrSheet = await storage.updateOmrSheet(userId, {
        name: validatedData.name,
        physics: validatedData.physics,
        chemistry: validatedData.chemistry,
        biology: validatedData.biology,
        userId,
      });
      
      res.status(200).json(omrSheet);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        console.error("Error updating OMR sheet:", error);
        res.status(500).json({ message: "Failed to update OMR sheet" });
      }
    }
  });

  // Get current user's sheets (kept for activity tracking)
  app.get("/api/my-sheets", isAuthenticated, async (req: any, res) => {
    try {
      // Check for impersonation via header, otherwise use session
      const userId = req.headers["x-user-id"] || req.userId || req.user?.claims?.sub;
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

  // Get all users (directory)
  app.get("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      res.json(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
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

  // Moderator routes
  app.post("/api/moderator/login", async (req: any, res) => {
    try {
      const { password } = req.body;
      if (password === "Sanskruti") {
        res.json({ authenticated: true });
      } else {
        res.status(401).json({ authenticated: false, message: "Invalid password" });
      }
    } catch (error) {
      console.error("Error moderator login:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  // Get all users with their data (moderator only)
  app.get("/api/moderator/users", async (req: any, res) => {
    try {
      const { password } = req.query;
      if (password !== "AniSanu") {
        return res.status(401).json({ message: "Invalid password" });
      }
      
      const usersWithData = await storage.getAllUsersWithData();
      res.json(usersWithData);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Get all chats (moderator only)
  app.get("/api/moderator/chats", async (req: any, res) => {
    try {
      const { password } = req.query;
      if (password !== "AniSanu") {
        return res.status(401).json({ message: "Invalid password" });
      }
      
      const messages = await storage.getAllChatMessages();
      res.json(messages);
    } catch (error) {
      console.error("Error fetching chats:", error);
      res.status(500).json({ message: "Failed to fetch chats" });
    }
  });


  // Export chat as text (moderator only)
  app.get("/api/moderator/export-chat", async (req: any, res) => {
    try {
      const { password } = req.query;
      if (password !== "AniSanu") {
        return res.status(401).json({ message: "Invalid password" });
      }
      
      const messages = await storage.getAllChatMessages();
      
      // Generate text content
      let content = "OMR TRACKER - CHAT LOG\n";
      content += "=".repeat(60) + "\n\n";
      
      messages.reverse().forEach((msg: any) => {
        const date = new Date(msg.createdAt).toLocaleString();
        const userName = msg.user?.firstName || "Unknown";
        content += `[${date}] ${userName}:\n${msg.message}\n\n`;
      });
      
      res.setHeader("Content-Type", "text/plain");
      res.setHeader("Content-Disposition", "attachment; filename=chat-log.txt");
      res.send(content);
    } catch (error) {
      console.error("Error exporting chat:", error);
      res.status(500).json({ message: "Failed to export chat" });
    }
  });

  // Get chapters config
  app.get("/api/chapters", async (req: any, res) => {
    try {
      let config = await storage.getChaptersConfig();
      if (!config) {
        const defaultConfig = {
          physics: ["Elasticity", "Capacitance", "Electrostatics", "Current electricity"],
          chemistry: ["p block", "Coordination compounds"],
          biology: ["Microbes", "Tissue culture", "Biotechnology:PP", "The living world", "Biotech: Applications", "Human health and diseases"],
        };
        config = await storage.updateChaptersConfig(defaultConfig);
      }
      res.json(config);
    } catch (error) {
      console.error("Error fetching chapters:", error);
      res.status(500).json({ message: "Failed to fetch chapters" });
    }
  });

  // Update chapters config (moderator only)
  app.put("/api/moderator/chapters", async (req: any, res) => {
    try {
      const { password, physics, chemistry, biology } = req.body;
      if (password !== "modneet" && password !== "AniSanu") {
        res.status(401).json({ message: "Invalid password" });
        return;
      }
      const updated = await storage.updateChaptersConfig({ physics, chemistry, biology });
      res.json(updated);
    } catch (error) {
      console.error("Error updating chapters:", error);
      res.status(500).json({ message: "Failed to update chapters" });
    }
  });

  // Recommend chapter
  app.post("/api/recommendations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId || req.user?.claims?.sub;
      const { subject, chapterName } = req.body;
      const rec = await storage.createRecommendation({ userId, subject, chapterName });
      res.json(rec);
    } catch (error) {
      console.error("Error creating recommendation:", error);
      res.status(500).json({ message: "Failed to create recommendation" });
    }
  });

  // Get pending recommendations
  app.get("/api/recommendations", isAuthenticated, async (req: any, res) => {
    try {
      const recs = await storage.getPendingRecommendations();
      res.json(recs);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      res.status(500).json({ message: "Failed to fetch recommendations" });
    }
  });

  // Approve recommendation
  app.post("/api/recommendations/:id/approve", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId || req.user?.claims?.sub;
      const { id } = req.params;
      const updated = await storage.approveRecommendation(id, userId);
      res.json(updated);
    } catch (error) {
      console.error("Error approving recommendation:", error);
      res.status(500).json({ message: "Failed to approve recommendation" });
    }
  });

  // Reject recommendation
  app.post("/api/recommendations/:id/reject", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId || req.user?.claims?.sub;
      const { id } = req.params;
      const updated = await storage.rejectRecommendation(id, userId);
      res.json(updated);
    } catch (error) {
      console.error("Error rejecting recommendation:", error);
      res.status(500).json({ message: "Failed to reject recommendation" });
    }
  });

  // Chat routes
  app.get("/api/chat/messages", isAuthenticated, async (req: any, res) => {
    try {
      const messages = await storage.getChatMessages(100);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/chat/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId || req.user?.claims?.sub;
      const { message } = req.body;
      
      if (!message || typeof message !== "string" || message.trim().length === 0) {
        return res.status(400).json({ message: "Message cannot be empty" });
      }

      const msg = await storage.createChatMessage({
        userId,
        message: message.trim().substring(0, 1000),
      });
      res.status(201).json(msg);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Edit chat message
  app.patch("/api/chat/messages/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId || req.user?.claims?.sub;
      const { id } = req.params;
      const { message } = req.body;
      
      if (!message || typeof message !== "string" || message.trim().length === 0) {
        return res.status(400).json({ message: "Message cannot be empty" });
      }

      const updated = await storage.updateChatMessage(id, message.trim().substring(0, 1000));
      res.json(updated);
    } catch (error) {
      console.error("Error updating message:", error);
      res.status(500).json({ message: "Failed to update message" });
    }
  });

  // Delete chat message
  app.delete("/api/chat/messages/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteChatMessage(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting message:", error);
      res.status(500).json({ message: "Failed to delete message" });
    }
  });

  // Whisper/Conversation routes
  app.get("/api/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId || req.user?.claims?.sub;
      const conversations = await storage.getUserConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:conversationId/messages", isAuthenticated, async (req: any, res) => {
    try {
      const messages = await storage.getConversationMessages(req.params.conversationId, 100);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId || req.user?.claims?.sub;
      const { participantIds } = req.body;
      
      if (!Array.isArray(participantIds) || participantIds.length === 0) {
        return res.status(400).json({ message: "Invalid participants" });
      }
      
      const allParticipants = [...new Set([userId, ...participantIds])];
      const conversation = await storage.getOrCreateConversation(allParticipants);
      res.json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  app.post("/api/conversations/group", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId || req.user?.claims?.sub;
      const { participantIds, groupName } = req.body;
      
      if (!Array.isArray(participantIds) || participantIds.length < 2 || !groupName?.trim()) {
        return res.status(400).json({ message: "Invalid group data" });
      }
      
      const allParticipants = [...new Set([userId, ...participantIds])];
      const conversation = await storage.createGroupConversation(allParticipants, groupName, userId);
      res.json(conversation);
    } catch (error) {
      console.error("Error creating group:", error);
      res.status(500).json({ message: "Failed to create group" });
    }
  });

  app.post("/api/conversations/:conversationId/messages", isAuthenticated, async (req: any, res) => {
    try {
      const senderId = req.userId || req.user?.claims?.sub;
      const { message } = req.body;
      
      if (!message || typeof message !== "string" || message.trim().length === 0) {
        return res.status(400).json({ message: "Message cannot be empty" });
      }

      const msg = await storage.createWhisperMessage({
        conversationId: req.params.conversationId,
        senderId,
        message: message.trim().substring(0, 1000),
      });
      res.status(201).json(msg);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Legacy whispers endpoint (for backward compatibility during transition)
  app.get("/api/whispers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId || req.user?.claims?.sub;
      const conversations = await storage.getUserConversations(userId);
      const messages = conversations.flatMap(c => 
        c.lastMessage ? [{ id: c.id, senderId: c.lastSender?.id, message: c.lastMessage }] : []
      );
      res.json(messages);
    } catch (error) {
      console.error("Error fetching whispers:", error);
      res.status(500).json({ message: "Failed to fetch whispers" });
    }
  });

  // Edit whisper
  app.patch("/api/whispers/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { message } = req.body;
      
      if (!message || typeof message !== "string" || message.trim().length === 0) {
        return res.status(400).json({ message: "Message cannot be empty" });
      }

      const updated = await storage.updateWhisperMessage(id, message.trim().substring(0, 1000));
      res.json(updated);
    } catch (error) {
      console.error("Error updating whisper:", error);
      res.status(500).json({ message: "Failed to update whisper" });
    }
  });

  // Delete whisper
  app.delete("/api/whispers/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteWhisperMessage(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting whisper:", error);
      res.status(500).json({ message: "Failed to delete whisper" });
    }
  });

  // Reaction routes
  app.post("/api/chat/reactions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId || req.user?.claims?.sub;
      const { messageId, reaction } = req.body;
      
      await storage.addReaction(messageId, userId, reaction);
      res.json({ success: true });
    } catch (error) {
      console.error("Error adding reaction:", error);
      res.status(500).json({ message: "Failed to add reaction" });
    }
  });

  app.delete("/api/chat/reactions/:messageId/:reaction", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId || req.user?.claims?.sub;
      const { messageId, reaction } = req.params;
      
      await storage.removeReaction(messageId, userId, reaction);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing reaction:", error);
      res.status(500).json({ message: "Failed to remove reaction" });
    }
  });

  // Online status routes
  app.post("/api/presence/:isOnline", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId || req.user?.claims?.sub;
      const isOnline = req.params.isOnline === "true";
      const result = await storage.setUserOnline(userId, isOnline);
      res.json(result);
    } catch (error) {
      console.error("Error updating presence:", error);
      res.status(500).json({ message: "Failed to update presence" });
    }
  });

  app.get("/api/online-users", isAuthenticated, async (req: any, res) => {
    try {
      const onlineUsers = await storage.getOnlineUsers();
      res.json(onlineUsers);
    } catch (error) {
      console.error("Error fetching online users:", error);
      res.status(500).json({ message: "Failed to fetch online users" });
    }
  });

  // Download app archive
  app.get("/download/app", (req, res) => {
    const fs = require("fs");
    const path = require("path");
    try {
      const filePath = path.join(process.cwd(), "omr-app.tar.gz");
      if (fs.existsSync(filePath)) {
        res.download(filePath, "omr-app.tar.gz");
      } else {
        res.status(404).json({ message: "Archive not found" });
      }
    } catch (error) {
      console.error("Error downloading archive:", error);
      res.status(500).json({ message: "Failed to download archive" });
    }
  });

  return httpServer;
}
