import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Video,
  FileText,
  Loader2,
  MoreVertical,
  Trash2,
  MoveRight,
  Play,
  Clock,
  Calendar,
  Sparkles,
  Download,
  Image,
  RefreshCw,
} from "lucide-react";
import { Link, useParams, useLocation } from "wouter";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Streamdown } from "streamdown";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id || "0");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [selectedVideo, setSelectedVideo] = useState<number | null>(null);
  const [showDocument, setShowDocument] = useState(false);

  const { data: project, isLoading: projectLoading } = trpc.projects.get.useQuery(
    { id: projectId },
    { enabled: !!projectId }
  );

  const { data: videos, isLoading: videosLoading } = trpc.videos.listByProject.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  const { data: document, isLoading: documentLoading } = trpc.documents.getByProject.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  const { data: allProjects } = trpc.projects.list.useQuery();

  const utils = trpc.useUtils();

  const generateDocMutation = trpc.documents.generate.useMutation({
    onSuccess: () => {
      utils.documents.getByProject.invalidate({ projectId });
      toast.success("Document généré avec succès !");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const generateThumbnailMutation = trpc.projects.generateThumbnail.useMutation({
    onSuccess: () => {
      utils.projects.get.invalidate({ id: projectId });
      toast.success("Vignette générée !");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteVideoMutation = trpc.videos.delete.useMutation({
    onSuccess: () => {
      utils.videos.listByProject.invalidate({ projectId });
      toast.success("Vidéo supprimée");
    },
  });

  const reassignVideoMutation = trpc.videos.reassign.useMutation({
    onSuccess: () => {
      utils.videos.listByProject.invalidate({ projectId });
      toast.success("Vidéo déplacée");
    },
  });

  const deleteProjectMutation = trpc.projects.delete.useMutation({
    onSuccess: () => {
      toast.success("Projet supprimé");
      setLocation("/dashboard");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleExportDocument = () => {
    if (!document) return;

    const blob = new Blob([document.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `${project?.name || "document"}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Document exporté !");
  };

  if (projectLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <header className="sticky top-0 z-50 bg-gray-950/95 backdrop-blur border-b border-gray-800">
          <div className="container flex items-center h-14 px-4">
            <Skeleton className="h-8 w-8 mr-2" />
            <Skeleton className="h-6 w-32" />
          </div>
        </header>
        <main className="container px-4 py-6">
          <Skeleton className="h-32 w-full mb-4" />
          <Skeleton className="h-24 w-full mb-4" />
          <Skeleton className="h-24 w-full" />
        </main>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <Card className="max-w-md bg-gray-900 border-gray-800">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">Projet non trouvé</p>
            <Button asChild>
              <Link href="/dashboard">Retour au dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const transcribedVideos = videos?.filter((v) => v.status === "transcribed") || [];
  const canGenerateDocument = transcribedVideos.length > 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gray-950/95 backdrop-blur border-b border-gray-800">
        <div className="container flex items-center justify-between h-14 px-4">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" asChild className="mr-2">
              <Link href="/dashboard">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: project.color || "#3B82F6" }}
            />
            <h1 className="font-semibold truncate max-w-[200px]">{project.name}</h1>
            {project.isNewIdeas && (
              <Badge variant="secondary" className="ml-2 bg-purple-600">
                Idées
              </Badge>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => generateThumbnailMutation.mutate({ id: projectId })}
                disabled={generateThumbnailMutation.isPending}
              >
                <Image className="w-4 h-4 mr-2" />
                Générer vignette
              </DropdownMenuItem>
              {!project.isNewIdeas && (
                <DropdownMenuItem
                  onClick={() => deleteProjectMutation.mutate({ id: projectId })}
                  className="text-red-500"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer le projet
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6">
        {/* Project thumbnail */}
        {project.thumbnailUrl && (
          <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-900">
            <img
              src={project.thumbnailUrl}
              alt={project.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Project description */}
        {project.description && (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-4">
              <p className="text-sm text-gray-400">{project.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Document section */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Document de présentation
              </CardTitle>
              {document && (
                <Badge variant="outline" className="text-xs">
                  v{document.version}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {documentLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : document ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-400 line-clamp-3">
                  {document.versionNotes || "Document généré à partir des vidéos du projet."}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDocument(true)}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Voir
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportDocument}>
                    <Download className="w-4 h-4 mr-2" />
                    Exporter
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateDocMutation.mutate({ projectId })}
                    disabled={generateDocMutation.isPending || !canGenerateDocument}
                  >
                    {generateDocMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Régénérer
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-400 mb-3">
                  {canGenerateDocument
                    ? "Générez un document à partir des vidéos transcrites"
                    : "Ajoutez des vidéos pour générer un document"}
                </p>
                <Button
                  onClick={() => generateDocMutation.mutate({ projectId })}
                  disabled={generateDocMutation.isPending || !canGenerateDocument}
                >
                  {generateDocMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Générer le document
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Videos section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Video className="w-5 h-5" />
              Vidéos ({videos?.length || 0})
            </h2>
            <Button size="sm" asChild>
              <Link href="/record">
                <Video className="w-4 h-4 mr-2" />
                Ajouter
              </Link>
            </Button>
          </div>

          {videosLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : videos && videos.length > 0 ? (
            <div className="space-y-3">
              {videos.map((video) => (
                <Card
                  key={video.id}
                  className="bg-gray-900 border-gray-800 overflow-hidden"
                >
                  <CardContent className="p-0">
                    <div className="flex items-start p-4">
                      {/* Video preview */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <button className="relative w-20 h-14 bg-gray-800 rounded flex-shrink-0 mr-3 overflow-hidden group">
                            <Play className="w-6 h-6 absolute inset-0 m-auto text-white/80 group-hover:text-white transition-colors" />
                          </button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl bg-gray-900 border-gray-800">
                          <DialogHeader>
                            <DialogTitle>{video.filename}</DialogTitle>
                          </DialogHeader>
                          <video
                            src={video.videoUrl}
                            controls
                            className="w-full rounded-lg"
                          />
                          {video.transcription && (
                            <div className="mt-4 p-4 bg-gray-800 rounded-lg max-h-48 overflow-y-auto">
                              <h4 className="text-sm font-medium mb-2">Transcription</h4>
                              <p className="text-sm text-gray-400">{video.transcription}</p>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>

                      {/* Video info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm truncate">
                              {video.firstKeyword || video.filename}
                            </p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                              {video.duration && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {Math.floor(video.duration / 60)}:{(video.duration % 60)
                                    .toString()
                                    .padStart(2, "0")}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDistanceToNow(new Date(video.createdAt), {
                                  addSuffix: true,
                                  locale: fr,
                                })}
                              </span>
                            </div>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {allProjects
                                ?.filter((p) => p.id !== projectId)
                                .map((p) => (
                                  <DropdownMenuItem
                                    key={p.id}
                                    onClick={() =>
                                      reassignVideoMutation.mutate({
                                        id: video.id,
                                        projectId: p.id,
                                      })
                                    }
                                  >
                                    <MoveRight className="w-4 h-4 mr-2" />
                                    Déplacer vers {p.name}
                                  </DropdownMenuItem>
                                ))}
                              <DropdownMenuItem
                                onClick={() => deleteVideoMutation.mutate({ id: video.id })}
                                className="text-red-500"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Status badge */}
                        <div className="mt-2">
                          {video.status === "transcribed" && (
                            <Badge variant="secondary" className="bg-green-600/20 text-green-400">
                              Transcrit
                            </Badge>
                          )}
                          {video.status === "transcribing" && (
                            <Badge variant="secondary" className="bg-yellow-600/20 text-yellow-400">
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Transcription...
                            </Badge>
                          )}
                          {video.status === "error" && (
                            <Badge variant="secondary" className="bg-red-600/20 text-red-400">
                              Erreur
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="py-8 text-center">
                <Video className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                <p className="text-gray-400 mb-4">Aucune vidéo dans ce projet</p>
                <Button asChild>
                  <Link href="/record">Enregistrer une vidéo</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Document viewer dialog */}
      <Dialog open={showDocument} onOpenChange={setShowDocument}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle>{document?.title || "Document de présentation"}</DialogTitle>
          </DialogHeader>
          <div className="prose prose-invert max-w-none">
            <Streamdown>{document?.content || ""}</Streamdown>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
