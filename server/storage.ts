import {
  users,
  omrSheets,
  chaptersConfig,
  chapterRecommendations,
  chatMessages,
  conversations,
  whisperMessages,
  messageReactions,
  whisperReactions,
  typingStatus,
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
  type Conversation,
  type InsertConversation,
  type WhisperMessage,
  type InsertWhisperMessage,
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
  registerUser(username: string, passwordHash: string, plainPassword?: string): Promise<User>;
  updateUserProfile(userId: string, firstName?: string, lastName?: string): Promise<User>;
  updateUserPassword(userId: string, passwordHash: string, plainPassword: string): Promise<User>;
  getAllUsers(): Promise<(User & { sheetCount: number; isOnline: boolean })[]>;
  
  // OMR Sheet operations
  createOmrSheet(sheet: InsertOmrSheet): Promise<OmrSheet>;
  updateOmrSheet(userId: string, sheet: InsertOmrSheet): Promise<OmrSheet>;
  getCurrentUserSheet(userId: string): Promise<OmrSheet | null>;
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
  updateChatMessage(id: string, message: string): Promise<ChatMessage>;
  deleteChatMessage(id: string): Promise<void>;
  
  // Conversation operations
  getOrCreateConversation(participantIds: string[]): Promise<Conversation>;
  createGroupConversation(participantIds: string[], groupName: string, creatorId: string): Promise<Conversation>;
  getUserConversations(userId: string): Promise<(Conversation & { lastSender?: User; lastMessage?: string })[]>;
  
  // Whisper operations
  createWhisperMessage(msg: InsertWhisperMessage): Promise<WhisperMessage>;
  getConversationMessages(conversationId: string, limit: number): Promise<(WhisperMessage & { user: User })[]>;
  updateWhisperMessage(id: string, message: string): Promise<WhisperMessage>;
  deleteWhisperMessage(id: string): Promise<void>;
  
  // Reaction operations
  addReaction(messageId: string, userId: string, reaction: string): Promise<void>;
  removeReaction(messageId: string, userId: string, reaction: string): Promise<void>;
  
  // User presence operations
  setUserOnline(userId: string, isOnline: boolean): Promise<UserPresenceStatus>;
  getOnlineUsers(): Promise<UserPresenceStatus[]>;
  
  // Moderator operations
  getAllUsersWithData(): Promise<any[]>;
  getAllChatMessages(): Promise<any[]>;
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

  async registerUser(username: string, passwordHash: string, plainPassword?: string): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        username,
        passwordHash,
        plainPassword: plainPassword || "",
        firstName: username,
      })
      .returning();
    return user;
  }

  async updateUserProfile(userId: string, firstName?: string, lastName?: string): Promise<User> {
    const updates: any = {};
    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    updates.updatedAt = new Date();
    
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserPassword(userId: string, passwordHash: string, plainPassword: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ passwordHash, plainPassword, updatedAt: new Date() })
      .where(eq(users.id, userId))
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

  async updateOmrSheet(userId: string, sheet: InsertOmrSheet): Promise<OmrSheet> {
    // Get user's current sheet
    const [existing] = await db
      .select()
      .from(omrSheets)
      .where(eq(omrSheets.userId, userId));

    if (!existing) {
      // If no sheet exists, create one
      return this.createOmrSheet(sheet);
    }

    // Update existing sheet
    const [updated] = await db
      .update(omrSheets)
      .set({
        name: sheet.name,
        physics: sheet.physics,
        chemistry: sheet.chemistry,
        biology: sheet.biology,
      })
      .where(eq(omrSheets.id, existing.id))
      .returning();
    return updated;
  }

  async getCurrentUserSheet(userId: string): Promise<OmrSheet | null> {
    const [sheet] = await db
      .select()
      .from(omrSheets)
      .where(eq(omrSheets.userId, userId));
    return sheet || null;
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
        isDeleted: chatMessages.isDeleted,
        editedAt: chatMessages.editedAt,
        createdAt: chatMessages.createdAt,
        user: users,
      })
      .from(chatMessages)
      .leftJoin(users, eq(chatMessages.userId, users.id))
      .where(eq(chatMessages.isDeleted, false))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit)
      .then(results => results.reverse().map(r => ({
        id: r.id,
        userId: r.userId,
        message: r.message,
        isDeleted: r.isDeleted,
        editedAt: r.editedAt,
        createdAt: r.createdAt,
        user: r.user!,
      })));
  }

  async updateChatMessage(id: string, message: string): Promise<ChatMessage> {
    const [updated] = await db
      .update(chatMessages)
      .set({ message, editedAt: new Date() })
      .where(eq(chatMessages.id, id))
      .returning();
    return updated;
  }

  async deleteChatMessage(id: string): Promise<void> {
    await db
      .update(chatMessages)
      .set({ isDeleted: true })
      .where(eq(chatMessages.id, id));
  }

  // Whisper operations
  async getOrCreateConversation(participantIds: string[]): Promise<Conversation> {
    const sortedIds = [...participantIds].sort();
    const idString = JSON.stringify(sortedIds);
    
    const existing = await db.query.conversations.findFirst({
      where: (conversations, { eq }) => eq(conversations.participantIds, sortedIds as any),
    });
    
    if (existing) {
      return existing;
    }
    
    const [newConv] = await db
      .insert(conversations)
      .values({ participantIds: sortedIds })
      .returning();
    return newConv;
  }

  async createGroupConversation(participantIds: string[], groupName: string, creatorId: string): Promise<Conversation> {
    const [newConv] = await db
      .insert(conversations)
      .values({ 
        participantIds,
        isGroupChat: true,
        groupName,
        creatorId,
      })
      .returning();
    return newConv;
  }

  async getUserConversations(userId: string): Promise<(Conversation & { lastSender?: User; lastMessage?: string })[]> {
    const convs = await db
      .selectDistinct()
      .from(conversations)
      .where((c) => {
        return sql`${c.participantIds}::text[] @> ARRAY[${userId}]`;
      })
      .orderBy(desc(conversations.lastMessageAt))
      .limit(50);
    
    const result = await Promise.all(
      convs.map(async (conv) => {
        const lastMsg = await db
          .select()
          .from(whisperMessages)
          .where(eq(whisperMessages.conversationId, conv.id))
          .orderBy(desc(whisperMessages.createdAt))
          .limit(1);
        
        let lastSender: User | undefined;
        if (lastMsg.length > 0) {
          lastSender = await db.query.users.findFirst({
            where: (users, { eq }) => eq(users.id, lastMsg[0].senderId),
          });
        }
        
        return {
          ...conv,
          lastSender,
          lastMessage: lastMsg[0]?.message,
        };
      })
    );
    
    return result;
  }

  async createWhisperMessage(msg: InsertWhisperMessage): Promise<WhisperMessage> {
    const [created] = await db
      .insert(whisperMessages)
      .values(msg)
      .returning();
    return created;
  }

  async getConversationMessages(conversationId: string, limit: number = 50): Promise<(WhisperMessage & { user: User })[]> {
    const messages = await db
      .select()
      .from(whisperMessages)
      .where(eq(whisperMessages.conversationId, conversationId))
      .orderBy(desc(whisperMessages.createdAt))
      .limit(limit);

    const reversed = [...messages].reverse();

    return Promise.all(
      reversed.map(async (msg) => {
        const user = await this.getUser(msg.senderId);
        return { ...msg, user: user! };
      })
    );
  }

  async getWhisperMessages(userId: string, limit: number = 50): Promise<(WhisperMessage & { user: User; reactions: any[] })[]> {
    const results = await db
      .select({
        id: whisperMessages.id,
        senderId: whisperMessages.senderId,
        recipientIds: whisperMessages.recipientIds,
        message: whisperMessages.message,
        isDeleted: whisperMessages.isDeleted,
        editedAt: whisperMessages.editedAt,
        createdAt: whisperMessages.createdAt,
        user: users,
      })
      .from(whisperMessages)
      .leftJoin(users, eq(whisperMessages.senderId, users.id))
      .where(eq(whisperMessages.isDeleted, false))
      .orderBy(desc(whisperMessages.createdAt))
      .limit(limit);
    
    return results.reverse().map(r => ({
      id: r.id,
      senderId: r.senderId,
      recipientIds: r.recipientIds as string[],
      message: r.message,
      isDeleted: r.isDeleted,
      editedAt: r.editedAt,
      createdAt: r.createdAt,
      user: r.user!,
      reactions: [],
    }));
  }

  async updateWhisperMessage(id: string, message: string): Promise<WhisperMessage> {
    const [updated] = await db
      .update(whisperMessages)
      .set({ message, editedAt: new Date() })
      .where(eq(whisperMessages.id, id))
      .returning();
    return updated;
  }

  async deleteWhisperMessage(id: string): Promise<void> {
    await db
      .update(whisperMessages)
      .set({ isDeleted: true })
      .where(eq(whisperMessages.id, id));
  }

  async addReaction(messageId: string, userId: string, reaction: string): Promise<void> {
    await db.insert(messageReactions).values({ messageId, userId, reaction }).onConflictDoNothing();
  }

  async removeReaction(messageId: string, userId: string, reaction: string): Promise<void> {
    await db
      .delete(messageReactions)
      .where(and(eq(messageReactions.messageId, messageId), eq(messageReactions.userId, userId), eq(messageReactions.reaction, reaction)));
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

  // Moderator operations
  async getAllUsersWithData(): Promise<any[]> {
    const allUsers = await db.select().from(users).orderBy(users.firstName);
    
    const usersWithData = await Promise.all(
      allUsers.map(async (user) => {
        const sheets = await db.select().from(omrSheets).where(eq(omrSheets.userId, user.id));
        const presence = await db.select().from(userPresence).where(eq(userPresence.userId, user.id));
        
        return {
          id: user.id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          passwordHash: user.passwordHash,
          plainPassword: user.plainPassword,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          sheets: sheets.length,
          isOnline: presence[0]?.isOnline || false,
          lastSeen: presence[0]?.lastSeen,
        };
      })
    );
    
    return usersWithData;
  }

  async getAllChatMessages(): Promise<any[]> {
    const messages = await db
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
      .limit(500);
    
    return messages;
  }
}

export const storage = new DatabaseStorage();
