import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { storagePut } from "./storage";
import { transcribeWithGemini, extractFirstKeyword } from "./services/transcription";
import { generateProjectDocument, generateThumbnailPrompt } from "./services/documentGeneration";
import { generateImage } from "./_core/imageGeneration";
import { nanoid } from "nanoid";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============ PROJECTS ============
  projects: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getProjectsByUserId(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.id, ctx.user.id);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }
        return project;
      }),

    getNewIdeas: protectedProcedure.query(async ({ ctx }) => {
      return db.getOrCreateNewIdeasProject(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        color: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if project with same name exists
        const existing = await db.getProjectByName(input.name, ctx.user.id);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "A project with this name already exists" });
        }

        return db.createProject({
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
          color: input.color || "#3B82F6",
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        color: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const project = await db.updateProject(id, ctx.user.id, data);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }
        return project;
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.id, ctx.user.id);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }
        if (project.isNewIdeas) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete the 'New Ideas' category" });
        }
        await db.deleteProject(input.id, ctx.user.id);
        return { success: true };
      }),

    generateThumbnail: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.id, ctx.user.id);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }

        // Get the document content for context
        const doc = await db.getDocumentByProjectId(input.id, ctx.user.id);
        const content = doc?.content || project.description || project.name;

        // Generate thumbnail prompt
        const prompt = await generateThumbnailPrompt(project.name, content);

        // Generate image
        const { url: imageUrl } = await generateImage({ prompt });

        // Update project with thumbnail
        await db.updateProject(input.id, ctx.user.id, { thumbnailUrl: imageUrl });

        return { thumbnailUrl: imageUrl };
      }),
  }),

  // ============ VIDEOS ============
  videos: router({
    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getVideosByProjectId(input.projectId, ctx.user.id);
      }),

    listAll: protectedProcedure.query(async ({ ctx }) => {
      return db.getVideosByUserId(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const video = await db.getVideoById(input.id, ctx.user.id);
        if (!video) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Video not found" });
        }
        return video;
      }),

    upload: protectedProcedure
      .input(z.object({
        filename: z.string(),
        mimeType: z.string(),
        fileSize: z.number(),
        duration: z.number().optional(),
        videoBase64: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Generate unique key for S3
        const fileExt = input.filename.split('.').pop() || 'webm';
        const videoKey = `videos/${ctx.user.id}/${nanoid()}.${fileExt}`;

        // Convert base64 to buffer
        const videoBuffer = Buffer.from(input.videoBase64, 'base64');

        // Upload to S3
        const { url: videoUrl } = await storagePut(videoKey, videoBuffer, input.mimeType);

        // Create initial video record (will be classified after transcription)
        const newIdeasProject = await db.getOrCreateNewIdeasProject(ctx.user.id);

        const video = await db.createVideo({
          userId: ctx.user.id,
          projectId: newIdeasProject.id, // Temporary, will be updated after transcription
          filename: input.filename,
          videoUrl,
          videoKey,
          duration: input.duration,
          fileSize: input.fileSize,
          mimeType: input.mimeType,
          status: "uploaded",
        });

        return video;
      }),

    transcribe: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const video = await db.getVideoById(input.id, ctx.user.id);
        if (!video) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Video not found" });
        }

        // Update status to transcribing
        await db.updateVideo(input.id, ctx.user.id, { status: "transcribing" });

        try {
          // Transcribe with Gemini
          const result = await transcribeWithGemini(video.videoUrl);

          // Determine the target project
          let targetProjectId = video.projectId;

          if (result.isNewIdea) {
            // Keep in "Nouvelles idées"
            const newIdeasProject = await db.getOrCreateNewIdeasProject(ctx.user.id);
            targetProjectId = newIdeasProject.id;
          } else if (result.suggestedProjectName) {
            // Check if project exists, create if not
            let project = await db.getProjectByName(result.suggestedProjectName, ctx.user.id);
            if (!project) {
              project = await db.createProject({
                userId: ctx.user.id,
                name: result.suggestedProjectName,
                color: "#3B82F6",
              });
            }
            targetProjectId = project.id;
          }

          // Update video with transcription and project
          const updatedVideo = await db.updateVideo(input.id, ctx.user.id, {
            transcription: result.text,
            firstKeyword: result.firstKeyword,
            projectId: targetProjectId,
            status: "transcribed",
          });

          return updatedVideo;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Transcription failed";
          await db.updateVideo(input.id, ctx.user.id, {
            status: "error",
            errorMessage,
          });
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: errorMessage });
        }
      }),

    reassign: protectedProcedure
      .input(z.object({
        id: z.number(),
        projectId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const video = await db.getVideoById(input.id, ctx.user.id);
        if (!video) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Video not found" });
        }

        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }

        return db.updateVideo(input.id, ctx.user.id, { projectId: input.projectId });
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const video = await db.getVideoById(input.id, ctx.user.id);
        if (!video) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Video not found" });
        }
        await db.deleteVideo(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ============ DOCUMENTS ============
  documents: router({
    getByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getDocumentByProjectId(input.projectId, ctx.user.id);
      }),

    listAll: protectedProcedure.query(async ({ ctx }) => {
      return db.getDocumentsByUserId(ctx.user.id);
    }),

    generate: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }

        // Get all transcribed videos for this project
        const videos = await db.getVideosByProjectId(input.projectId, ctx.user.id);
        const transcribedVideos = videos.filter(v => v.status === "transcribed" && v.transcription);

        if (transcribedVideos.length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "No transcribed videos available for this project" });
        }

        // Get existing document if any
        const existingDoc = await db.getDocumentByProjectId(input.projectId, ctx.user.id);

        // Generate document
        const generated = await generateProjectDocument({
          projectName: project.name,
          projectDescription: project.description || undefined,
          existingContent: existingDoc?.content,
          newTranscriptions: transcribedVideos.map(v => v.transcription!),
          videosCount: transcribedVideos.length,
        });

        if (existingDoc) {
          // Update existing document
          return db.updateDocument(existingDoc.id, ctx.user.id, {
            title: generated.title,
            content: generated.content,
            version: existingDoc.version + 1,
            versionNotes: generated.summary,
            videosIncorporated: transcribedVideos.length,
          });
        } else {
          // Create new document
          return db.createDocument({
            projectId: input.projectId,
            userId: ctx.user.id,
            title: generated.title,
            content: generated.content,
            versionNotes: generated.summary,
            videosIncorporated: transcribedVideos.length,
          });
        }
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        content: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.updateDocument(input.id, ctx.user.id, {
          content: input.content,
        });
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteDocument(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ============ STATS ============
  stats: router({
    dashboard: protectedProcedure.query(async ({ ctx }) => {
      const projects = await db.getProjectsByUserId(ctx.user.id);
      const videos = await db.getVideosByUserId(ctx.user.id);
      const documents = await db.getDocumentsByUserId(ctx.user.id);

      return {
        totalProjects: projects.filter(p => !p.isNewIdeas).length,
        totalVideos: videos.length,
        totalDocuments: documents.length,
        transcribedVideos: videos.filter(v => v.status === "transcribed").length,
        pendingVideos: videos.filter(v => v.status === "uploaded" || v.status === "transcribing").length,
        recentProjects: projects.slice(0, 5),
        recentVideos: videos.slice(0, 5),
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
