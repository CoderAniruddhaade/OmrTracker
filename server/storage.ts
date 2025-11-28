import {
  users,
  omrSheets,
  chaptersConfig,
  type User,
  type UpsertUser,
  type OmrSheet,
  type InsertOmrSheet,
  type OmrSheetWithUser,
  type ChaptersConfig,
  type InsertChaptersConfig,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // OMR Sheet operations
  createOmrSheet(sheet: InsertOmrSheet): Promise<OmrSheet>;
  getOmrSheetsByUser(userId: string): Promise<OmrSheet[]>;
  getAllOmrSheets(): Promise<OmrSheetWithUser[]>;
  getUserWithSheets(userId: string): Promise<{ user: User; sheets: OmrSheetWithUser[] } | null>;
  
  // Chapters config operations
  getChaptersConfig(): Promise<ChaptersConfig | null>;
  updateChaptersConfig(chapters: InsertChaptersConfig): Promise<ChaptersConfig>;
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
}

export const storage = new DatabaseStorage();
