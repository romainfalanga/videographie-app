import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn("[Transcription] GEMINI_API_KEY not configured");
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

export interface TranscriptionResult {
  text: string;
  firstKeyword: string;
  isNewIdea: boolean;
  suggestedProjectName: string | null;
}

/**
 * Transcribes audio/video content using Gemini API
 * Extracts the first keyword to determine project classification
 */
export async function transcribeWithGemini(videoUrl: string): Promise<TranscriptionResult> {
  if (!genAI) {
    throw new Error("Gemini API not configured. Please set GEMINI_API_KEY environment variable.");
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // For video transcription, we need to use the file API or pass base64
    // Since we have a URL, we'll use the built-in transcription first, then analyze
    const { transcribeAudio } = await import("../_core/voiceTranscription");
    
    const whisperResult = await transcribeAudio({
      audioUrl: videoUrl,
      language: "fr",
      prompt: "Transcription d'une vidéo de présentation de projet. Le premier mot prononcé est généralement le nom du projet ou 'nouvelle idée'.",
    });

    if ('error' in whisperResult) {
      throw new Error(whisperResult.error);
    }

    const transcriptionText = whisperResult.text;

    // Use Gemini to analyze the transcription and extract the first keyword
    const analysisPrompt = `Analyse cette transcription et identifie le PREMIER MOT-CLÉ prononcé au début.
Ce premier mot-clé est soit:
- Le nom d'un projet existant
- "nouvelle idée" (ou variantes comme "nouvel idée", "new idea")

Transcription:
"${transcriptionText}"

Réponds UNIQUEMENT au format JSON suivant, sans aucun texte avant ou après:
{
  "firstKeyword": "Le premier mot-clé identifié (en minuscules)",
  "isNewIdea": true si c'est une nouvelle idée, false sinon,
  "suggestedProjectName": "Si isNewIdea est false, le nom du projet suggéré, sinon null"
}`;

    const result = await model.generateContent(analysisPrompt);
    const responseText = result.response.text();

    // Parse the JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Fallback: extract first keyword manually
      const extracted = extractFirstKeyword(transcriptionText);
      return {
        text: transcriptionText,
        firstKeyword: extracted.keyword,
        isNewIdea: extracted.isNewIdea,
        suggestedProjectName: extracted.isNewIdea ? null : extracted.keyword,
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      text: transcriptionText,
      firstKeyword: parsed.firstKeyword || "",
      isNewIdea: parsed.isNewIdea === true,
      suggestedProjectName: parsed.suggestedProjectName || null,
    };
  } catch (error) {
    console.error("[Transcription] Error:", error);
    throw error;
  }
}

/**
 * Simple transcription without keyword analysis
 */
export async function transcribeOnly(audioUrl: string): Promise<string> {
  const { transcribeAudio } = await import("../_core/voiceTranscription");
  
  const result = await transcribeAudio({
    audioUrl,
    language: "fr",
    prompt: "Transcription d'une vidéo de présentation de projet",
  });

  if ('error' in result) {
    throw new Error(result.error);
  }

  return result.text;
}

/**
 * Extracts the first keyword from a transcription
 */
export function extractFirstKeyword(transcription: string): { keyword: string; isNewIdea: boolean } {
  const text = transcription.trim().toLowerCase();
  
  // Check for "nouvelle idée" variants
  const newIdeaPatterns = [
    /^nouvelle?\s*id[ée]e/i,
    /^new\s*idea/i,
    /^nouvel?\s*id[ée]e/i,
  ];

  for (const pattern of newIdeaPatterns) {
    if (pattern.test(text)) {
      return { keyword: "nouvelle idée", isNewIdea: true };
    }
  }

  // Extract first word/phrase (up to first punctuation or significant pause indicator)
  const firstWords = text.split(/[.,!?;:\n]/)[0].trim();
  const keyword = firstWords.split(/\s+/).slice(0, 3).join(" "); // Take up to 3 words

  return { keyword, isNewIdea: false };
}
