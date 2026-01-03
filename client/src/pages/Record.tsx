import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { VideoRecorder } from "@/components/VideoRecorder";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, Loader2, AlertCircle, Video } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

type UploadStatus = "idle" | "uploading" | "transcribing" | "success" | "error";

export default function Record() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadedVideoId, setUploadedVideoId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const uploadMutation = trpc.videos.upload.useMutation();
  const transcribeMutation = trpc.videos.transcribe.useMutation();
  const utils = trpc.useUtils();

  const handleVideoReady = async (videoData: {
    blob: Blob;
    filename: string;
    duration: number;
    mimeType: string;
  }) => {
    setUploadStatus("uploading");
    setErrorMessage(null);

    try {
      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix
          const base64 = result.split(",")[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(videoData.blob);
      const videoBase64 = await base64Promise;

      // Upload video
      const video = await uploadMutation.mutateAsync({
        filename: videoData.filename,
        mimeType: videoData.mimeType,
        fileSize: videoData.blob.size,
        duration: videoData.duration,
        videoBase64,
      });

      setUploadedVideoId(video.id);
      setUploadStatus("transcribing");
      toast.success("Vidéo uploadée ! Transcription en cours...");

      // Start transcription
      const transcribedVideo = await transcribeMutation.mutateAsync({ id: video.id });

      setUploadStatus("success");
      toast.success(`Vidéo classée dans : ${transcribedVideo?.firstKeyword || "Nouvelles idées"}`);

      // Invalidate queries to refresh data
      utils.videos.listAll.invalidate();
      utils.projects.list.invalidate();
      utils.stats.dashboard.invalidate();

      // Redirect after a short delay
      setTimeout(() => {
        if (transcribedVideo?.projectId) {
          setLocation(`/projects/${transcribedVideo.projectId}`);
        } else {
          setLocation("/dashboard");
        }
      }, 2000);
    } catch (error) {
      console.error("Upload/transcription error:", error);
      setUploadStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Une erreur est survenue"
      );
      toast.error("Erreur lors du traitement de la vidéo");
    }
  };

  const resetRecorder = () => {
    setUploadStatus("idle");
    setUploadedVideoId(null);
    setErrorMessage(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Video className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Connexion requise</h2>
            <p className="text-muted-foreground mb-4">
              Connectez-vous pour enregistrer des vidéos
            </p>
            <Button asChild>
              <Link href="/">Se connecter</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gray-950/95 backdrop-blur border-b border-gray-800">
        <div className="container flex items-center h-14 px-4">
          <Button variant="ghost" size="icon" asChild className="mr-2">
            <Link href="/dashboard">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <h1 className="font-semibold">Nouvelle vidéo</h1>
        </div>
      </header>

      {/* Main content */}
      <main className="container px-4 py-6">
        {uploadStatus === "idle" && (
          <>
            {/* Instructions */}
            <Card className="mb-6 bg-gray-900 border-gray-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Comment ça marche ?</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-400 space-y-2">
                <p>
                  <strong className="text-white">1.</strong> Commencez votre vidéo en disant le{" "}
                  <strong className="text-primary">nom du projet</strong> ou{" "}
                  <strong className="text-purple-400">"nouvelle idée"</strong>
                </p>
                <p>
                  <strong className="text-white">2.</strong> Expliquez votre idée ou ajoutez des détails au projet
                </p>
                <p>
                  <strong className="text-white">3.</strong> La vidéo sera automatiquement classée et transcrite
                </p>
              </CardContent>
            </Card>

            {/* Video recorder */}
            <VideoRecorder
              onVideoReady={handleVideoReady}
              isUploading={uploadStatus !== "idle"}
              maxDuration={300}
            />
          </>
        )}

        {/* Processing states */}
        {uploadStatus !== "idle" && (
          <Card className="max-w-md mx-auto bg-gray-900 border-gray-800">
            <CardContent className="pt-8 pb-8 text-center">
              {uploadStatus === "uploading" && (
                <>
                  <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
                  <h2 className="text-lg font-semibold mb-2">Upload en cours...</h2>
                  <p className="text-sm text-gray-400">
                    Envoi de votre vidéo vers le serveur
                  </p>
                </>
              )}

              {uploadStatus === "transcribing" && (
                <>
                  <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-purple-500" />
                  <h2 className="text-lg font-semibold mb-2">Transcription en cours...</h2>
                  <p className="text-sm text-gray-400">
                    L'IA analyse votre vidéo et extrait le contenu
                  </p>
                </>
              )}

              {uploadStatus === "success" && (
                <>
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                  <h2 className="text-lg font-semibold mb-2">Vidéo traitée !</h2>
                  <p className="text-sm text-gray-400 mb-4">
                    Redirection vers votre projet...
                  </p>
                </>
              )}

              {uploadStatus === "error" && (
                <>
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                  <h2 className="text-lg font-semibold mb-2">Erreur</h2>
                  <p className="text-sm text-gray-400 mb-4">
                    {errorMessage || "Une erreur est survenue lors du traitement"}
                  </p>
                  <Button onClick={resetRecorder}>Réessayer</Button>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
