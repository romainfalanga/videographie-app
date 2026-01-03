import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Video, FileText, Sparkles, FolderOpen, ArrowRight } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated && !loading) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, loading, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Hero section */}
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-purple-900/20 to-gray-950" />
        
        <div className="relative container px-4 pt-16 pb-24">
          {/* Logo/Title */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/20 mb-6">
              <Video className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Vidéographie
            </h1>
            <p className="text-lg text-gray-400 max-w-md mx-auto">
              Transformez vos idées en vidéos, vos vidéos en documents structurés
            </p>
          </div>

          {/* CTA */}
          <div className="flex justify-center mb-16">
            <Button
              size="lg"
              className="text-lg px-8 py-6"
              onClick={() => window.location.href = getLoginUrl()}
            >
              Commencer
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="bg-gray-900/50 border-gray-800 backdrop-blur">
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <Video className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Enregistrez</h3>
                <p className="text-sm text-gray-400">
                  Capturez vos idées en vidéo directement depuis votre téléphone
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-800 backdrop-blur">
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 rounded-full bg-purple-600/20 flex items-center justify-center mx-auto mb-4">
                  <FolderOpen className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="font-semibold mb-2">Organisez</h3>
                <p className="text-sm text-gray-400">
                  Classification automatique par projet grâce à l'IA
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-800 backdrop-blur">
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 rounded-full bg-green-600/20 flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="font-semibold mb-2">Générez</h3>
                <p className="text-sm text-gray-400">
                  Documents de présentation créés automatiquement
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="container px-4 py-16">
        <h2 className="text-2xl font-bold text-center mb-12">Comment ça marche ?</h2>
        
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0 font-bold">
              1
            </div>
            <div>
              <h3 className="font-semibold mb-1">Dites le nom du projet</h3>
              <p className="text-gray-400 text-sm">
                Commencez chaque vidéo par le nom de votre projet ou "nouvelle idée" pour une classification automatique
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0 font-bold">
              2
            </div>
            <div>
              <h3 className="font-semibold mb-1">Expliquez votre idée</h3>
              <p className="text-gray-400 text-sm">
                Parlez librement, l'IA transcrit et analyse votre contenu
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0 font-bold">
              3
            </div>
            <div>
              <h3 className="font-semibold mb-1">Obtenez votre document</h3>
              <p className="text-gray-400 text-sm">
                Un document de présentation structuré est généré, prêt à être partagé avec une IA pour développement
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Features */}
      <div className="container px-4 py-16 border-t border-gray-800">
        <div className="max-w-2xl mx-auto text-center">
          <Sparkles className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
          <h2 className="text-2xl font-bold mb-4">Propulsé par l'IA</h2>
          <p className="text-gray-400 mb-8">
            Vidéographie utilise les dernières technologies d'intelligence artificielle pour transcrire vos vidéos avec Gemini et générer des documents professionnels avec Claude.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <div className="px-4 py-2 bg-gray-900 rounded-full text-sm">
              🎙️ Transcription Gemini
            </div>
            <div className="px-4 py-2 bg-gray-900 rounded-full text-sm">
              📝 Rédaction Claude
            </div>
            <div className="px-4 py-2 bg-gray-900 rounded-full text-sm">
              🏷️ Classification auto
            </div>
            <div className="px-4 py-2 bg-gray-900 rounded-full text-sm">
              🖼️ Vignettes IA
            </div>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="container px-4 py-16 border-t border-gray-800">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Prêt à commencer ?</h2>
          <p className="text-gray-400 mb-6">
            Créez votre compte et commencez à capturer vos idées
          </p>
          <Button
            size="lg"
            onClick={() => window.location.href = getLoginUrl()}
          >
            Se connecter
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="container px-4 py-8 border-t border-gray-800">
        <p className="text-center text-sm text-gray-500">
          © 2025 Vidéographie. Tous droits réservés.
        </p>
      </footer>
    </div>
  );
}
