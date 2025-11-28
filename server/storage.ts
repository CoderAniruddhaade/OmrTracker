import {
  users,
  omrSheets,
  chaptersConfig,
  chapterRecommendations,
  chatMessages,
  userPresence,
  type User,
  type UpsertUser,
  type OmrSheet,
  type InsertOmrSheet,
  type OmrSheetWithUser,
  type ChaptersConfig,
  type InsertChaptersConfig,
  type ChapterRecommendation,
  type InsertChapterRecommendation,
  type ChatMessage,
  type InsertChatMessage,
  type UserPresenceStatus,
  type InsertUserPresence,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByUsername(username: string): Promise<User | undefined>;
  registerUser(username: string, passwordHash: string): Promise<User>;
  getAllUsers(): Promise<(User & { sheetCount: number; isOnline: boolean })[]>;
  
  // OMR Sheet operations
  createOmrSheet(sheet: InsertOmrSheet): Promise<OmrSheet>;
  getOmrSheetsByUser(userId: string): Promise<OmrSheet[]>;
  getAllOmrSheets(): Promise<OmrSheetWithUser[]>;
  getUserWithSheets(userId: string): Promise<{ user: User; sheets: OmrSheetWithUser[] } | null>;
  
  // Chapters config operations
  getChaptersConfig(): Promise<ChaptersConfig | null>;
  updateChaptersConfig(chapters: InsertChaptersConfig): Promise<ChaptersConfig>;
  
  // Chapter recommendations operations
  createRecommendation(rec: InsertChapterRecommendation): Promise<ChapterRecommendation>;
  getPendingRecommendations(): Promise<ChapterRecommendation[]>;
  approveRecommendation(recId: string, userId: string): Promise<ChapterRecommendation>;
  rejectRecommendation(recId: string, userId: string): Promise<ChapterRecommendation>;
  
  // Chat operations
  createChatMessage(msg: InsertChatMessage): Promise<ChatMessage>;
  getChatMessages(limit: number): Promise<(ChatMessage & { user: User })[]>;
  
  // User presence operations
  setUserOnline(userId: string, isOnline: boolean): Promise<UserPresenceStatus>;
  getOnlineUsers(): Promise<UserPresenceStatus[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async registerUser(username: string, passwordHash: string): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        username,
        passwordHash,
        firstName: username,
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<(User & { sheetCount: number; isOnline: boolean })[]> {
    const allUsers = await db.select().from(users).orderBy(users.firstName);
    
    const result = await Promise.all(
      allUsers.map(async (user) => {
        const sheets = await db.select().from(omrSheets).where(eq(omrSheets.userId, user.id));
        const presence = await db.select().from(userPresence).where(eq(userPresence.userId, user.id));
        
        return {
          ...user,
          sheetCount: sheets.length,
          isOnline: presence[0]?.isOnline || false,
        };
      })
    );
    
    return result;
  }

  // OMR Sheet operations
  async createOmrSheet(sheet: InsertOmrSheet): Promise<OmrSheet> {
    const [omrSheet] = await db
      .insert(omrSheets)
      .values(sheet)
      .returning();
    return omrSheet;
  }

  async getOmrSheetsByUser(userId: string): Promise<OmrSheet[]> {
    return await db
      .select()
      .from(omrSheets)
      .where(eq(omrSheets.userId, userId))
      .orderBy(desc(omrSheets.createdAt));
  }

  async getAllOmrSheets(): Promise<OmrSheetWithUser[]> {
    const result = await db
      .select({
        id: omrSheets.id,
        userId: omrSheets.userId,
        name: omrSheets.name,
        physics: omrSheets.physics,
        chemistry: omrSheets.chemistry,
        biology: omrSheets.biology,
        createdAt: omrSheets.createdAt,
        user: users,
      })
      .from(omrSheets)
      .leftJoin(users, eq(omrSheets.userId, users.id))
      .orderBy(desc(omrSheets.createdAt));

    return result.map((row) => ({
      id: row.id,
      userId: row.userId,
      name: row.name,
      physics: row.physics,
      chemistry: row.chemistry,
      biology: row.biology,
      createdAt: row.createdAt,
      user: row.user!,
    }));
  }

  async getUserWithSheets(userId: string): Promise<{ user: User; sheets: OmrSheetWithUser[] } | null> {
    const user = await this.getUser(userId);
    if (!user) return null;

    const sheetsResult = await db
      .select({
        id: omrSheets.id,
        userId: omrSheets.userId,
        name: omrSheets.name,
        physics: omrSheets.physics,
        chemistry: omrSheets.chemistry,
        biology: omrSheets.biology,
        createdAt: omrSheets.createdAt,
      })
      .from(omrSheets)
      .where(eq(omrSheets.userId, userId))
      .orderBy(desc(omrSheets.createdAt));

    const sheets: OmrSheetWithUser[] = sheetsResult.map((sheet) => ({
      ...sheet,
      user,
    }));

    return { user, sheets };
  }

  // Chapters config operations
  async getChaptersConfig(): Promise<ChaptersConfig | null> {
    const [config] = await db.select().from(chaptersConfig).limit(1);
    return config || null;
  }

  async updateChaptersConfig(data: InsertChaptersConfig): Promise<ChaptersConfig> {
    const existing = await this.getChaptersConfig();
    
    if (existing) {
      const [updated] = await db
        .update(chaptersConfig)
        .set({
          physics: data.physics as unknown as string[],
          chemistry: data.chemistry as unknown as string[],
          biology: data.biology as unknown as string[],
          updatedAt: new Date(),
        })
        .where(eq(chaptersConfig.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(chaptersConfig)
        .values([{ physics: data.physics as unknown as string[], chemistry: data.chemistry as unknown as string[], biology: data.biology as unknown as string[] }])
        .returning();
      return created;
    }
  }

  // Chapter recommendations operations
  async createRecommendation(rec: InsertChapterRecommendation): Promise<ChapterRecommendation> {
    const [created] = await db
      .insert(chapterRecommendations)
      .values(rec)
      .returning();
    return created;
  }

  async getPendingRecommendations(): Promise<ChapterRecommendation[]> {
    return await db
      .select()
      .from(chapterRecommendations)
      .where(eq(chapterRecommendations.status, "pending"))
      .orderBy(desc(chapterRecommendations.createdAt));
  }

  async approveRecommendation(recId: string, userId: string): Promise<ChapterRecommendation> {
    const rec = await db
      .select()
      .from(chapterRecommendations)
      .where(eq(chapterRecommendations.id, recId));
    
    if (!rec.length) throw new Error("Recommendation not found");
    
    const approvals = [...(rec[0].approvals || []), userId];
    const allUsers = await db.select().from(users);
    const totalUsers = allUsers.length;
    
    const status = approvals.length === totalUsers ? "approved" : "pending";
    
    const [updated] = await db
      .update(chapterRecommendations)
      .set({
        approvals: approvals as unknown as string[],
        status,
        updatedAt: new Date(),
      })
      .where(eq(chapterRecommendations.id, recId))
      .returning();
    return updated;
  }

  async rejectRecommendation(recId: string, userId: string): Promise<ChapterRecommendation> {
    const rec = await db
      .select()
      .from(chapterRecommendations)
      .where(eq(chapterRecommendations.id, recId));
    
    if (!rec.length) throw new Error("Recommendation not found");
    
    const rejections = [...(rec[0].rejections || []), userId];
    
    const [updated] = await db
      .update(chapterRecommendations)
      .set({
        rejections: rejections as unknown as string[],
        status: "rejected",
        updatedAt: new Date(),
      })
      .where(eq(chapterRecommendations.id, recId))
      .returning();
    return updated;
  }

  // Chat operations
  async createChatMessage(msg: InsertChatMessage): Promise<ChatMessage> {
    const [created] = await db
      .insert(chatMessages)
      .values(msg)
      .returning();
    return created;
  }

  async getChatMessages(limit: number = 50): Promise<(ChatMessage & { user: User })[]> {
    return await db
      .select({
        id: chatMessages.id,
        userId: chatMessages.userId,
        message: chatMessages.message,
        createdAt: chatMessages.createdAt,
        user: users,
      })
      .from(chatMessages)
      .leftJoin(users, eq(chatMessages.userId, users.id))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit)
      .then(results => results.reverse().map(r => ({
        id: r.id,
        userId: r.userId,
        message: r.message,
        createdAt: r.createdAt,
        user: r.user!,
      })));
  }

  // User presence operations
  async setUserOnline(userId: string, isOnline: boolean): Promise<UserPresenceStatus> {
    const [result] = await db
      .insert(userPresence)
      .values({ userId, isOnline })
      .onConflictDoUpdate({
        target: userPresence.userId,
        set: { isOnline, lastSeen: new Date() },
      })
      .returning();
    return result;
  }

  async getOnlineUsers(): Promise<UserPresenceStatus[]> {
    return await db
      .select()
      .from(userPresence)
      .where(eq(userPresence.isOnline, true));
  }
}

export const storage = new DatabaseStorage();
