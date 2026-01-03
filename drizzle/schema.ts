import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, bigint } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Projects table - stores user projects and the special "Nouvelles idées" category
 */
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  /** Special flag for the "Nouvelles idées" category */
  isNewIdeas: boolean("isNewIdeas").default(false).notNull(),
  /** URL of the generated thumbnail */
  thumbnailUrl: text("thumbnailUrl"),
  /** Color theme for the project (hex code) */
  color: varchar("color", { length: 7 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Videos table - stores video metadata and transcriptions
 */
export const videos = mysqlTable("videos", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  projectId: int("projectId").notNull(),
  /** Original filename */
  filename: varchar("filename", { length: 255 }).notNull(),
  /** S3 storage URL */
  videoUrl: text("videoUrl").notNull(),
  /** S3 storage key */
  videoKey: varchar("videoKey", { length: 512 }).notNull(),
  /** Video duration in seconds */
  duration: int("duration"),
  /** File size in bytes */
  fileSize: bigint("fileSize", { mode: "number" }),
  /** MIME type */
  mimeType: varchar("mimeType", { length: 100 }),
  /** Full transcription text */
  transcription: text("transcription"),
  /** First keyword extracted for classification */
  firstKeyword: varchar("firstKeyword", { length: 255 }),
  /** Processing status */
  status: mysqlEnum("status", ["uploading", "uploaded", "transcribing", "transcribed", "error"]).default("uploading").notNull(),
  /** Error message if processing failed */
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Video = typeof videos.$inferSelect;
export type InsertVideo = typeof videos.$inferInsert;

/**
 * Documents table - stores generated presentation documents per project
 */
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  /** Document title */
  title: varchar("title", { length: 255 }).notNull(),
  /** Generated content in Markdown format */
  content: text("content").notNull(),
  /** Version number - increments with each update */
  version: int("version").default(1).notNull(),
  /** Summary of what changed in this version */
  versionNotes: text("versionNotes"),
  /** Number of videos incorporated in this version */
  videosIncorporated: int("videosIncorporated").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;
