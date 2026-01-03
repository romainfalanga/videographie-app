import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  FolderOpen,
  Video,
  Download,
  Eye,
  Loader2,
  Clock,
  Copy,
  Check,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Streamdown } from "streamdown";

export default function Documents() {
  const { user, loading: authLoading } = useAuth();
  const [selectedDocument, setSelectedDocument] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: documents, isLoading } = trpc.documents.listAll.useQuery(
    undefined,
    { enabled: !!user }
  );

  const { data: projects } = trpc.projects.list.useQuery(
    undefined,
    { enabled: !!user }
  );

  const selectedDoc = documents?.find((d) => d.id === selectedDocument);
  const selectedProject = projects?.find((p) => p.id === selectedDoc?.projectId);

  const handleExport = (doc: typeof selectedDoc) => {
    if (!doc) return;

    const project = projects?.find((p) => p.id === doc.projectId);
    const blob = new Blob([doc.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `${project?.name || "document"}_v${doc.version}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Document exporté !");
  };

  const handleCopyToClipboard = async () => {
    if (!selectedDoc) return;

    try {
      await navigator.clipboard.writeText(selectedDoc.content);
      setCopied(true);
      toast.success("Contenu copié dans le presse-papiers !");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erreur lors de la copie");
    }
  };

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
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Documents
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Documents de présentation générés par IA
          </p>
        </div>
      </header>

      <main className="container px-4 py-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : documents && documents.length > 0 ? (
          <div className="space-y-3">
            {documents.map((doc) => {
              const project = projects?.find((p) => p.id === doc.projectId);
              return (
                <Card
                  key={doc.id}
                  className="bg-gray-900 border-gray-800 overflow-hidden"
                >
                  <CardContent className="p-0">
                    <div className="flex">
                      {/* Color indicator */}
                      <div
                        className="w-2 flex-shrink-0"
                        style={{ backgroundColor: project?.color || "#3B82F6" }}
                      />

                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate">{doc.title}</h3>
                            <p className="text-sm text-gray-400 mt-1">
                              {project?.name || "Projet inconnu"}
                            </p>
                          </div>
                          <Badge variant="outline" className="ml-2 flex-shrink-0">
                            v{doc.version}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(doc.updatedAt), {
                              addSuffix: true,
                              locale: fr,
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Video className="w-3 h-3" />
                            {doc.videosIncorporated} vidéo(s)
                          </span>
                        </div>

                        {doc.versionNotes && (
                          <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                            {doc.versionNotes}
                          </p>
                        )}

                        <div className="flex gap-2 mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedDocument(doc.id)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Voir
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExport(doc)}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Exporter
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="py-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <h3 className="text-lg font-semibold mb-2">Aucun document</h3>
              <p className="text-gray-400 mb-4 max-w-sm mx-auto">
                Les documents sont générés automatiquement à partir des vidéos de vos projets
              </p>
              <Button asChild>
                <Link href="/record">
                  <Video className="w-4 h-4 mr-2" />
                  Enregistrer une vidéo
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Document viewer dialog */}
      <Dialog
        open={selectedDocument !== null}
        onOpenChange={(open) => !open && setSelectedDocument(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-gray-900 border-gray-800">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: selectedProject?.color || "#3B82F6" }}
              />
              {selectedDoc?.title || "Document"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex gap-2 flex-shrink-0 pb-4 border-b border-gray-800">
            <Button variant="outline" size="sm" onClick={handleCopyToClipboard}>
              {copied ? (
                <Check className="w-4 h-4 mr-1" />
              ) : (
                <Copy className="w-4 h-4 mr-1" />
              )}
              {copied ? "Copié !" : "Copier"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport(selectedDoc)}
            >
              <Download className="w-4 h-4 mr-1" />
              Télécharger .md
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto prose prose-invert max-w-none">
            <Streamdown>{selectedDoc?.content || ""}</Streamdown>
          </div>

          <div className="flex-shrink-0 pt-4 border-t border-gray-800 text-xs text-gray-400">
            <p>
              Version {selectedDoc?.version} • {selectedDoc?.videosIncorporated} vidéo(s)
              incorporée(s) • Mis à jour{" "}
              {selectedDoc &&
                formatDistanceToNow(new Date(selectedDoc.updatedAt), {
                  addSuffix: true,
                  locale: fr,
                })}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-950/95 backdrop-blur border-t border-gray-800 z-50">
        <div className="container flex items-center justify-around h-16 px-4">
          <Link href="/dashboard">
            <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition-colors">
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
            <button className="flex flex-col items-center gap-1 text-primary">
              <FileText className="w-6 h-6" />
              <span className="text-xs">Documents</span>
            </button>
          </Link>
        </div>
      </nav>
    </div>
  );
}
