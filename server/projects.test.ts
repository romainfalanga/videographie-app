import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database functions
vi.mock("./db", () => ({
  getProjectsByUserId: vi.fn(),
  getProjectById: vi.fn(),
  getProjectByName: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  getOrCreateNewIdeasProject: vi.fn(),
  getVideosByProjectId: vi.fn(),
  getVideosByUserId: vi.fn(),
  getVideoById: vi.fn(),
  createVideo: vi.fn(),
  updateVideo: vi.fn(),
  deleteVideo: vi.fn(),
  getDocumentByProjectId: vi.fn(),
  getDocumentsByUserId: vi.fn(),
  createDocument: vi.fn(),
  updateDocument: vi.fn(),
  deleteDocument: vi.fn(),
}));

// Mock storage
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://test-url.com/video.webm", key: "test-key" }),
}));

// Mock services
vi.mock("./services/transcription", () => ({
  transcribeWithGemini: vi.fn().mockResolvedValue({
    text: "Test transcription",
    firstKeyword: "test-project",
    isNewIdea: false,
    suggestedProjectName: "test-project",
  }),
  extractFirstKeyword: vi.fn().mockReturnValue("test-project"),
}));

vi.mock("./services/documentGeneration", () => ({
  generateProjectDocument: vi.fn().mockResolvedValue({
    title: "Test Document",
    content: "# Test Content",
    summary: "Test summary",
  }),
  generateThumbnailPrompt: vi.fn().mockResolvedValue("A beautiful thumbnail"),
}));

vi.mock("./_core/imageGeneration", () => ({
  generateImage: vi.fn().mockResolvedValue({ url: "https://test-url.com/image.png" }),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("projects router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("projects.list", () => {
    it("returns projects for authenticated user", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      const mockProjects = [
        { id: 1, name: "Project 1", userId: 1, isNewIdeas: false },
        { id: 2, name: "Project 2", userId: 1, isNewIdeas: false },
      ];
      
      const db = await import("./db");
      vi.mocked(db.getProjectsByUserId).mockResolvedValue(mockProjects as any);

      const result = await caller.projects.list();
      
      expect(db.getProjectsByUserId).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockProjects);
    });
  });

  describe("projects.get", () => {
    it("returns a specific project", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      const mockProject = { id: 1, name: "Test Project", userId: 1, isNewIdeas: false };
      
      const db = await import("./db");
      vi.mocked(db.getProjectById).mockResolvedValue(mockProject as any);

      const result = await caller.projects.get({ id: 1 });
      
      expect(db.getProjectById).toHaveBeenCalledWith(1, 1);
      expect(result).toEqual(mockProject);
    });

    it("throws NOT_FOUND for non-existent project", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      const db = await import("./db");
      vi.mocked(db.getProjectById).mockResolvedValue(undefined);

      await expect(caller.projects.get({ id: 999 })).rejects.toThrow("Project not found");
    });
  });

  describe("projects.create", () => {
    it("creates a new project", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      const db = await import("./db");
      vi.mocked(db.getProjectByName).mockResolvedValue(undefined);
      vi.mocked(db.createProject).mockResolvedValue({
        id: 1,
        name: "New Project",
        userId: 1,
        color: "#3B82F6",
        isNewIdeas: false,
      } as any);

      const result = await caller.projects.create({ name: "New Project" });
      
      expect(db.createProject).toHaveBeenCalledWith({
        userId: 1,
        name: "New Project",
        description: undefined,
        color: "#3B82F6",
      });
      expect(result.name).toBe("New Project");
    });

    it("throws CONFLICT for duplicate project name", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      const db = await import("./db");
      vi.mocked(db.getProjectByName).mockResolvedValue({ id: 1, name: "Existing" } as any);

      await expect(caller.projects.create({ name: "Existing" })).rejects.toThrow(
        "A project with this name already exists"
      );
    });
  });

  describe("projects.delete", () => {
    it("deletes a project", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      const db = await import("./db");
      vi.mocked(db.getProjectById).mockResolvedValue({
        id: 1,
        name: "To Delete",
        isNewIdeas: false,
      } as any);
      vi.mocked(db.deleteProject).mockResolvedValue(undefined);

      const result = await caller.projects.delete({ id: 1 });
      
      expect(db.deleteProject).toHaveBeenCalledWith(1, 1);
      expect(result).toEqual({ success: true });
    });

    it("prevents deletion of New Ideas category", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      const db = await import("./db");
      vi.mocked(db.getProjectById).mockResolvedValue({
        id: 1,
        name: "Nouvelles idées",
        isNewIdeas: true,
      } as any);

      await expect(caller.projects.delete({ id: 1 })).rejects.toThrow(
        "Cannot delete the 'New Ideas' category"
      );
    });
  });
});

describe("stats router", () => {
  it("returns dashboard statistics", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const db = await import("./db");
    vi.mocked(db.getProjectsByUserId).mockResolvedValue([
      { id: 1, name: "Project 1", isNewIdeas: false },
      { id: 2, name: "Nouvelles idées", isNewIdeas: true },
    ] as any);
    vi.mocked(db.getVideosByUserId).mockResolvedValue([
      { id: 1, status: "transcribed" },
      { id: 2, status: "uploaded" },
    ] as any);
    vi.mocked(db.getDocumentsByUserId).mockResolvedValue([
      { id: 1, title: "Doc 1" },
    ] as any);

    const result = await caller.stats.dashboard();
    
    expect(result.totalProjects).toBe(1); // Excludes "Nouvelles idées"
    expect(result.totalVideos).toBe(2);
    expect(result.totalDocuments).toBe(1);
    expect(result.transcribedVideos).toBe(1);
    expect(result.pendingVideos).toBe(1);
  });
});
