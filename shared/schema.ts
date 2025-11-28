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

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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

// Extended type for OMR sheet with user info
export interface OmrSheetWithUser extends OmrSheet {
  user: User;
}
