import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Video,
  FolderOpen,
  FileText,
  Plus,
  Lightbulb,
  Loader2,
  Search,
  Clock,
  TrendingUp,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDialogOpen, setNewProjectDialogOpen] = useState(false);

  const { data: stats, isLoading: statsLoading } = trpc.stats.dashboard.useQuery(
    undefined,
    { enabled: !!user }
  );

  const { data: projects, isLoading: projectsLoading } = trpc.projects.list.useQuery(
    undefined,
    { enabled: !!user }
  );

  const { data: newIdeasProject } = trpc.projects.getNewIdeas.useQuery(
    undefined,
    { enabled: !!user }
  );

  const utils = trpc.useUtils();

  const createProjectMutation = trpc.projects.create.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      utils.stats.dashboard.invalidate();
      setNewProjectDialogOpen(false);
      setNewProjectName("");
      toast.success("Projet créé !");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreateProject = () => {
    if (!newProjectName.trim()) {
      toast.error("Veuillez entrer un nom de projet");
      return;
    }
    createProjectMutation.mutate({ name: newProjectName.trim() });
  };

  // Filter projects based on search
  const filteredProjects = projects?.filter(
    (p) =>
      !p.isNewIdeas &&
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gray-950/95 backdrop-blur border-b border-gray-800">
        <div className="container px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold">Vidéographie</h1>
              <p className="text-sm text-gray-400">
                {user?.name ? `Bonjour, ${user.name}` : "Bienvenue"}
              </p>
            </div>
            <Button asChild className="bg-primary hover:bg-primary/90">
              <Link href="/record">
                <Video className="w-4 h-4 mr-2" />
                Enregistrer
              </Link>
            </Button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Rechercher un projet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-900 border-gray-800"
            />
          </div>
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6">
        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-4 pb-4 text-center">
              {statsLoading ? (
                <Skeleton className="h-8 w-8 mx-auto mb-1" />
              ) : (
                <p className="text-2xl font-bold text-primary">
                  {stats?.totalProjects || 0}
                </p>
              )}
              <p className="text-xs text-gray-400">Projets</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-4 pb-4 text-center">
              {statsLoading ? (
                <Skeleton className="h-8 w-8 mx-auto mb-1" />
              ) : (
                <p className="text-2xl font-bold text-green-500">
                  {stats?.totalVideos || 0}
                </p>
              )}
              <p className="text-xs text-gray-400">Vidéos</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-4 pb-4 text-center">
              {statsLoading ? (
                <Skeleton className="h-8 w-8 mx-auto mb-1" />
              ) : (
                <p className="text-2xl font-bold text-purple-500">
                  {stats?.totalDocuments || 0}
                </p>
              )}
              <p className="text-xs text-gray-400">Documents</p>
            </CardContent>
          </Card>
        </div>

        {/* New Ideas section */}
        {newIdeasProject && (
          <Link href={`/projects/${newIdeasProject.id}`}>
            <Card className="bg-gradient-to-r from-purple-900/50 to-purple-800/30 border-purple-700/50 cursor-pointer hover:border-purple-600 transition-colors">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
                      <Lightbulb className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Nouvelles idées</h3>
                      <p className="text-sm text-gray-400">
                        Idées non assignées à un projet
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-purple-600/30">
                    {stats?.recentVideos?.filter(
                      (v) => v.projectId === newIdeasProject.id
                    ).length || 0}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Projects section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              Mes projets
            </h2>
            <Dialog open={newProjectDialogOpen} onOpenChange={setNewProjectDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Nouveau
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-800">
                <DialogHeader>
                  <DialogTitle>Nouveau projet</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <Input
                    placeholder="Nom du projet"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="bg-gray-800 border-gray-700"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateProject();
                    }}
                  />
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setNewProjectDialogOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleCreateProject}
                    disabled={createProjectMutation.isPending}
                  >
                    {createProjectMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Créer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {projectsLoading ? (
            <div className="grid gap-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : filteredProjects && filteredProjects.length > 0 ? (
            <div className="grid gap-3">
              {filteredProjects.map((project) => (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <Card className="bg-gray-900 border-gray-800 cursor-pointer hover:border-gray-700 transition-colors overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex">
                        {/* Thumbnail or color bar */}
                        {project.thumbnailUrl ? (
                          <div className="w-24 h-24 flex-shrink-0">
                            <img
                              src={project.thumbnailUrl}
                              alt={project.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div
                            className="w-2 flex-shrink-0"
                            style={{ backgroundColor: project.color || "#3B82F6" }}
                          />
                        )}

                        <div className="flex-1 p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold">{project.name}</h3>
                              {project.description && (
                                <p className="text-sm text-gray-400 line-clamp-1 mt-1">
                                  {project.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDistanceToNow(new Date(project.updatedAt), {
                                addSuffix: true,
                                locale: fr,
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="py-8 text-center">
                <FolderOpen className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                <p className="text-gray-400 mb-4">
                  {searchQuery
                    ? "Aucun projet trouvé"
                    : "Aucun projet pour le moment"}
                </p>
                {!searchQuery && (
                  <p className="text-sm text-gray-500">
                    Enregistrez une vidéo en commençant par le nom d'un projet pour le créer automatiquement
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent activity */}
        {stats?.recentVideos && stats.recentVideos.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5" />
              Activité récente
            </h2>
            <div className="space-y-2">
              {stats.recentVideos.slice(0, 5).map((video) => (
                <Card
                  key={video.id}
                  className="bg-gray-900 border-gray-800"
                >
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center flex-shrink-0">
                        <Video className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {video.firstKeyword || video.filename}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(video.createdAt), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </p>
                      </div>
                      {video.status === "transcribed" && (
                        <Badge
                          variant="secondary"
                          className="bg-green-600/20 text-green-400 text-xs"
                        >
                          Transcrit
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-950/95 backdrop-blur border-t border-gray-800 z-50">
        <div className="container flex items-center justify-around h-16 px-4">
          <Link href="/dashboard">
            <button className="flex flex-col items-center gap-1 text-primary">
              <FolderOpen className="w-6 h-6" />
              <span className="text-xs">Projets</span>
            </button>
          </Link>
          <Link href="/record">
            <button className="flex flex-col items-center gap-1 -mt-4">
              <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg">
                <Video className="w-7 h-7" />
              </div>
            </button>
          </Link>
          <Link href="/documents">
            <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition-colors">
              <FileText className="w-6 h-6" />
              <span className="text-xs">Documents</span>
            </button>
          </Link>
        </div>
      </nav>
    </div>
  );
}
