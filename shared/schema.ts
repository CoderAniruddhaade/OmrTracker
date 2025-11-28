import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - now includes username and password hash
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").unique(),
  passwordHash: varchar("password_hash"),
  plainPassword: varchar("plain_password"),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chapter data structure - tracks done, practiced status and number of questions practiced
export interface ChapterData {
  done: boolean;
  practiced: boolean;
  questionsPracticed: number;
}

// Subject data structure with chapters
export interface SubjectData {
  present: number;
  chapters: Record<string, ChapterData>;
}

// Chapters configuration table - stores current week's chapters
export const chaptersConfig = pgTable("chapters_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  physics: jsonb("physics").$type<string[]>().notNull(),
  chemistry: jsonb("chemistry").$type<string[]>().notNull(),
  biology: jsonb("biology").$type<string[]>().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// OMR Sheet table
export const omrSheets = pgTable("omr_sheets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: varchar("name").notNull(),
  physics: jsonb("physics").$type<SubjectData>().notNull(),
  chemistry: jsonb("chemistry").$type<SubjectData>().notNull(),
  biology: jsonb("biology").$type<SubjectData>().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  omrSheets: many(omrSheets),
}));

export const omrSheetsRelations = relations(omrSheets, ({ one }) => ({
  user: one(users, {
    fields: [omrSheets.userId],
    references: [users.id],
  }),
}));

// Schemas and Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const insertOmrSheetSchema = createInsertSchema(omrSheets).omit({
  id: true,
  createdAt: true,
});

export type InsertOmrSheet = z.infer<typeof insertOmrSheetSchema>;
export type OmrSheet = typeof omrSheets.$inferSelect;

// Chapters config types
export const insertChaptersConfigSchema = createInsertSchema(chaptersConfig).omit({
  id: true,
  updatedAt: true,
});

export type InsertChaptersConfig = z.infer<typeof insertChaptersConfigSchema>;
export type ChaptersConfig = typeof chaptersConfig.$inferSelect;

// Chapter recommendations table
export const chapterRecommendations = pgTable("chapter_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  subject: varchar("subject").notNull(), // physics, chemistry, biology
  chapterName: varchar("chapter_name").notNull(),
  approvals: jsonb("approvals").$type<string[]>().default(sql`'[]'`).notNull(), // array of user IDs who approved
  rejections: jsonb("rejections").$type<string[]>().default(sql`'[]'`).notNull(), // array of user IDs who rejected
  status: varchar("status").default("pending").notNull(), // pending, approved, rejected
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat messages table
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  message: varchar("message").notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  editedAt: timestamp("edited_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Conversations table - groups private chat messages
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  participantIds: jsonb("participant_ids").$type<string[]>().notNull(), // Array of all participant user IDs
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Whisper/DM messages table (private chats in conversations)
export const whisperMessages = pgTable("whisper_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  message: varchar("message").notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  editedAt: timestamp("edited_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Message reactions table
export const messageReactions = pgTable("message_reactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: varchar("message_id").notNull().references(() => chatMessages.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  reaction: varchar("reaction").notNull(), // emoji like 👍 ❤️ 😂 etc
  createdAt: timestamp("created_at").defaultNow(),
});

// Whisper reactions table
export const whisperReactions = pgTable("whisper_reactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: varchar("message_id").notNull().references(() => whisperMessages.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  reaction: varchar("reaction").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Typing status
export const typingStatus = pgTable("typing_status", {
  userId: varchar("user_id").primaryKey().references(() => users.id),
  chatType: varchar("chat_type").notNull(), // "public" or "whisper"
  targetIds: jsonb("target_ids").$type<string[]>().default(sql`'[]'`).notNull(), // for whispers
  lastTyping: timestamp("last_typing").defaultNow(),
});

// User presence/online status table
export const userPresence = pgTable("user_presence", {
  userId: varchar("user_id").primaryKey().references(() => users.id),
  isOnline: boolean("is_online").default(false).notNull(),
  lastSeen: timestamp("last_seen").defaultNow(),
});

// Extended type for OMR sheet with user info
export interface OmrSheetWithUser extends OmrSheet {
  user: User;
}

// Recommendation types
export type ChapterRecommendation = typeof chapterRecommendations.$inferSelect;
export const insertChapterRecommendationSchema = createInsertSchema(chapterRecommendations).omit({
  id: true,
  approvals: true,
  rejections: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertChapterRecommendation = z.infer<typeof insertChapterRecommendationSchema>;

// Chat message types
export type ChatMessage = typeof chatMessages.$inferSelect;
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
  isDeleted: true,
  editedAt: true,
});
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

// Conversation types
export type Conversation = typeof conversations.$inferSelect;
export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  lastMessageAt: true,
  createdAt: true,
});
export type InsertConversation = z.infer<typeof insertConversationSchema>;

// Whisper message types
export type WhisperMessage = typeof whisperMessages.$inferSelect;
export const insertWhisperMessageSchema = createInsertSchema(whisperMessages).omit({
  id: true,
  createdAt: true,
  isDeleted: true,
  editedAt: true,
});
export type InsertWhisperMessage = z.infer<typeof insertWhisperMessageSchema>;

// Reaction types
export type MessageReaction = typeof messageReactions.$inferSelect;
export type WhisperReaction = typeof whisperReactions.$inferSelect;

// Typing status types
export type TypingStatus = typeof typingStatus.$inferSelect;

// User presence types
export type UserPresenceStatus = typeof userPresence.$inferSelect;
export const insertUserPresenceSchema = createInsertSchema(userPresence).omit({
  lastSeen: true,
});
export type InsertUserPresence = z.infer<typeof insertUserPresenceSchema>;
