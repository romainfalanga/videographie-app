import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, projects, videos, documents, InsertProject, InsertVideo, InsertDocument, Project, Video, Document } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USER HELPERS ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ PROJECT HELPERS ============

export async function createProject(project: InsertProject): Promise<Project> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(projects).values(project);
  const result = await db.select().from(projects)
    .where(and(eq(projects.userId, project.userId), eq(projects.name, project.name)))
    .orderBy(desc(projects.createdAt))
    .limit(1);
  
  return result[0];
}

export async function getProjectsByUserId(userId: number): Promise<Project[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.select().from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.updatedAt));
}

export async function getProjectById(projectId: number, userId: number): Promise<Project | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);
  
  return result[0];
}

export async function getProjectByName(name: string, userId: number): Promise<Project | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(projects)
    .where(and(eq(projects.name, name), eq(projects.userId, userId)))
    .limit(1);
  
  return result[0];
}

export async function getOrCreateNewIdeasProject(userId: number): Promise<Project> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(projects)
    .where(and(eq(projects.userId, userId), eq(projects.isNewIdeas, true)))
    .limit(1);

  if (existing.length > 0) return existing[0];

  return createProject({
    userId,
    name: "Nouvelles idées",
    description: "Catégorie pour les nouvelles idées non encore assignées à un projet",
    isNewIdeas: true,
    color: "#8B5CF6",
  });
}

export async function updateProject(projectId: number, userId: number, data: Partial<InsertProject>): Promise<Project | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(projects)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));

  return getProjectById(projectId, userId);
}

export async function deleteProject(projectId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.delete(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
  
  return true;
}

// ============ VIDEO HELPERS ============

export async function createVideo(video: InsertVideo): Promise<Video> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(videos).values(video);
  const result = await db.select().from(videos)
    .where(eq(videos.videoKey, video.videoKey))
    .limit(1);
  
  return result[0];
}

export async function getVideosByProjectId(projectId: number, userId: number): Promise<Video[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.select().from(videos)
    .where(and(eq(videos.projectId, projectId), eq(videos.userId, userId)))
    .orderBy(desc(videos.createdAt));
}

export async function getVideoById(videoId: number, userId: number): Promise<Video | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(videos)
    .where(and(eq(videos.id, videoId), eq(videos.userId, userId)))
    .limit(1);
  
  return result[0];
}

export async function getVideosByUserId(userId: number): Promise<Video[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.select().from(videos)
    .where(eq(videos.userId, userId))
    .orderBy(desc(videos.createdAt));
}

export async function updateVideo(videoId: number, userId: number, data: Partial<InsertVideo>): Promise<Video | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(videos)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(videos.id, videoId), eq(videos.userId, userId)));

  return getVideoById(videoId, userId);
}

export async function deleteVideo(videoId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(videos)
    .where(and(eq(videos.id, videoId), eq(videos.userId, userId)));
  
  return true;
}

export async function countVideosByProjectId(projectId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(videos)
    .where(eq(videos.projectId, projectId));
  
  return result.length;
}

// ============ DOCUMENT HELPERS ============

export async function createDocument(doc: InsertDocument): Promise<Document> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(documents).values(doc);
  const result = await db.select().from(documents)
    .where(and(eq(documents.projectId, doc.projectId), eq(documents.userId, doc.userId)))
    .orderBy(desc(documents.createdAt))
    .limit(1);
  
  return result[0];
}

export async function getDocumentByProjectId(projectId: number, userId: number): Promise<Document | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(documents)
    .where(and(eq(documents.projectId, projectId), eq(documents.userId, userId)))
    .orderBy(desc(documents.version))
    .limit(1);
  
  return result[0];
}

export async function getDocumentsByUserId(userId: number): Promise<Document[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.select().from(documents)
    .where(eq(documents.userId, userId))
    .orderBy(desc(documents.updatedAt));
}

export async function updateDocument(documentId: number, userId: number, data: Partial<InsertDocument>): Promise<Document | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(documents)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(documents.id, documentId), eq(documents.userId, userId)));

  const result = await db.select().from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);
  
  return result[0];
}

export async function deleteDocument(documentId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(documents)
    .where(and(eq(documents.id, documentId), eq(documents.userId, userId)));
  
  return true;
}
