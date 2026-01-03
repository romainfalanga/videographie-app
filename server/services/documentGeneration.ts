import Anthropic from "@anthropic-ai/sdk";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
  console.warn("[DocumentGeneration] ANTHROPIC_API_KEY not configured");
}

const anthropic = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY }) : null;

export interface DocumentGenerationInput {
  projectName: string;
  projectDescription?: string;
  existingContent?: string;
  newTranscriptions: string[];
  videosCount: number;
}

export interface GeneratedDocument {
  title: string;
  content: string;
  summary: string;
}

/**
 * Generates or updates a project presentation document using Claude
 */
export async function generateProjectDocument(input: DocumentGenerationInput): Promise<GeneratedDocument> {
  if (!anthropic) {
    throw new Error("Anthropic API not configured. Please set ANTHROPIC_API_KEY environment variable.");
  }

  const isUpdate = !!input.existingContent;
  
  const systemPrompt = `Tu es un expert en rédaction de documents de présentation de projets.
Ton objectif est de créer des documents clairs, structurés et professionnels qui peuvent être utilisés pour présenter un projet à une intelligence artificielle afin qu'elle puisse le développer.

Le document doit inclure:
- Un titre clair et descriptif
- Un résumé exécutif
- Les objectifs du projet
- Les fonctionnalités principales
- Les spécifications techniques (si mentionnées)
- Les contraintes et exigences
- Les prochaines étapes suggérées

Format: Markdown
Style: Professionnel mais accessible
Langue: Français`;

  let userPrompt: string;

  if (isUpdate) {
    userPrompt = `Voici le document de présentation actuel du projet "${input.projectName}":

---
${input.existingContent}
---

Nouvelles informations à intégrer (${input.newTranscriptions.length} nouvelle(s) vidéo(s)):

${input.newTranscriptions.map((t, i) => `### Vidéo ${i + 1}:\n${t}`).join("\n\n")}

---

Mets à jour le document en intégrant ces nouvelles informations de manière cohérente.
- Enrichis les sections existantes avec les nouveaux détails
- Ajoute de nouvelles sections si nécessaire
- Maintiens la cohérence et la structure du document
- Évite les répétitions
- Garde le document concis mais complet

Nombre total de vidéos incorporées: ${input.videosCount}`;
  } else {
    userPrompt = `Crée un document de présentation pour le projet "${input.projectName}".

${input.projectDescription ? `Description initiale: ${input.projectDescription}\n` : ""}

Contenu des vidéos de présentation (${input.newTranscriptions.length} vidéo(s)):

${input.newTranscriptions.map((t, i) => `### Vidéo ${i + 1}:\n${t}`).join("\n\n")}

---

Génère un document de présentation complet et structuré basé sur ces informations.
Le document doit être suffisamment détaillé pour qu'une IA puisse comprendre et développer le projet.`;
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
      system: systemPrompt,
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    const documentContent = content.text;

    // Extract title from the first heading
    const titleMatch = documentContent.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : `Document de présentation - ${input.projectName}`;

    // Generate a brief summary
    const summaryResponse = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `Résume ce document en 2-3 phrases:\n\n${documentContent.substring(0, 2000)}`,
        },
      ],
    });

    const summaryContent = summaryResponse.content[0];
    const summary = summaryContent.type === "text" ? summaryContent.text : "";

    return {
      title,
      content: documentContent,
      summary,
    };
  } catch (error) {
    console.error("[DocumentGeneration] Claude API error:", error);
    throw error;
  }
}

/**
 * Generates a thumbnail description for a project based on its content
 */
export async function generateThumbnailPrompt(projectName: string, documentContent: string): Promise<string> {
  if (!anthropic) {
    throw new Error("Anthropic API not configured");
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `Génère une description courte (max 100 mots) pour créer une image de vignette représentant ce projet:

Nom du projet: ${projectName}
Contenu: ${documentContent.substring(0, 1500)}

La description doit être visuelle, abstraite et professionnelle, adaptée à la génération d'image par IA.
Réponds uniquement avec la description, sans préambule.`,
        },
      ],
    });

    const content = response.content[0];
    return content.type === "text" ? content.text : `Abstract representation of ${projectName} project`;
  } catch (error) {
    console.error("[DocumentGeneration] Thumbnail prompt generation error:", error);
    return `Abstract professional illustration representing ${projectName}`;
  }
}
