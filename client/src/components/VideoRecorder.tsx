import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Video, Square, Circle, Upload, Loader2, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoRecorderProps {
  onVideoReady: (videoData: {
    blob: Blob;
    filename: string;
    duration: number;
    mimeType: string;
  }) => void;
  isUploading?: boolean;
  maxDuration?: number; // in seconds
}

export function VideoRecorder({ onVideoReady, isUploading = false, maxDuration = 300 }: VideoRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Initialize camera
  const initCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
    } catch (err) {
      console.error("Camera access error:", err);
      setError("Impossible d'accéder à la caméra. Veuillez autoriser l'accès.");
      setCameraReady(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    initCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [initCamera]);

  // Start recording
  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    setRecordingTime(0);
    startTimeRef.current = Date.now();

    // Determine supported MIME type
    const mimeTypes = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4",
    ];
    
    let selectedMimeType = "video/webm";
    for (const type of mimeTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        selectedMimeType = type;
        break;
      }
    }

    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: selectedMimeType,
      videoBitsPerSecond: 2500000,
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: selectedMimeType });
      setRecordedBlob(blob);
      setIsPreviewing(true);

      // Show preview
      if (previewRef.current) {
        previewRef.current.src = URL.createObjectURL(blob);
      }
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(1000); // Collect data every second
    setIsRecording(true);

    // Start timer
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setRecordingTime(elapsed);

      // Auto-stop at max duration
      if (elapsed >= maxDuration) {
        stopRecording();
      }
    }, 1000);
  }, [maxDuration]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  // Cancel preview and restart
  const cancelPreview = useCallback(() => {
    setIsPreviewing(false);
    setRecordedBlob(null);
    setRecordingTime(0);
    if (previewRef.current) {
      previewRef.current.src = "";
    }
  }, []);

  // Confirm and upload
  const confirmVideo = useCallback(() => {
    if (!recordedBlob) return;

    const filename = `video_${Date.now()}.webm`;
    onVideoReady({
      blob: recordedBlob,
      filename,
      duration: recordingTime,
      mimeType: recordedBlob.type || "video/webm",
    });
  }, [recordedBlob, recordingTime, onVideoReady]);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Card className="w-full max-w-lg mx-auto overflow-hidden bg-black">
      {/* Video display area */}
      <div className="relative aspect-[9/16] md:aspect-video bg-gray-900">
        {/* Live camera feed */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            "absolute inset-0 w-full h-full object-cover",
            isPreviewing && "hidden"
          )}
        />

        {/* Preview of recorded video */}
        <video
          ref={previewRef}
          controls
          playsInline
          className={cn(
            "absolute inset-0 w-full h-full object-cover",
            !isPreviewing && "hidden"
          )}
        />

        {/* Recording indicator */}
        {isRecording && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 text-white px-3 py-1.5 rounded-full text-sm font-medium">
            <Circle className="w-3 h-3 fill-current animate-pulse" />
            <span>REC</span>
            <span className="ml-2 font-mono">{formatTime(recordingTime)}</span>
          </div>
        )}

        {/* Max duration warning */}
        {isRecording && recordingTime >= maxDuration - 30 && (
          <div className="absolute top-4 right-4 bg-yellow-500 text-black px-3 py-1.5 rounded-full text-sm font-medium">
            {formatTime(maxDuration - recordingTime)} restantes
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90 p-4">
            <div className="text-center text-white">
              <XCircle className="w-12 h-12 mx-auto mb-3 text-red-500" />
              <p className="text-sm">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={initCamera}
              >
                Réessayer
              </Button>
            </div>
          </div>
        )}

        {/* Loading camera */}
        {!cameraReady && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center text-white">
              <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
              <p className="text-sm">Initialisation de la caméra...</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 bg-gray-950">
        {!isPreviewing ? (
          <div className="flex justify-center">
            {!isRecording ? (
              <Button
                size="lg"
                onClick={startRecording}
                disabled={!cameraReady || isUploading}
                className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 border-4 border-white"
              >
                <Video className="w-8 h-8" />
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={stopRecording}
                className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 border-4 border-white"
              >
                <Square className="w-8 h-8 fill-current" />
              </Button>
            )}
          </div>
        ) : (
          <div className="flex justify-center gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={cancelPreview}
              disabled={isUploading}
              className="flex-1 max-w-[140px]"
            >
              <XCircle className="w-5 h-5 mr-2" />
              Refaire
            </Button>
            <Button
              size="lg"
              onClick={confirmVideo}
              disabled={isUploading}
              className="flex-1 max-w-[140px] bg-green-600 hover:bg-green-700"
            >
              {isUploading ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Upload className="w-5 h-5 mr-2" />
              )}
              {isUploading ? "Envoi..." : "Envoyer"}
            </Button>
          </div>
        )}

        {/* Instructions */}
        <p className="text-center text-gray-400 text-xs mt-4">
          {!isPreviewing
            ? "Commencez par dire le nom du projet ou \"nouvelle idée\""
            : "Vérifiez votre vidéo avant de l'envoyer"}
        </p>
      </div>
    </Card>
  );
}
