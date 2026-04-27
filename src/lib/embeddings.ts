import OpenAI from "openai";

function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export function isEmbeddingEnabled(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export function buildEmbeddingText(item: {
  title: string;
  year?: number | null;
  overview?: string | null;
  genres?: string[];
  cast?: string[];
  director?: string | null;
  keywords?: string[];
}): string {
  const parts = [
    `Title: ${item.title}`,
    item.year ? `Year: ${item.year}` : null,
    item.genres?.length ? `Genres: ${item.genres.join(", ")}` : null,
    item.director ? `Director: ${item.director}` : null,
    item.cast?.length ? `Cast: ${item.cast.slice(0, 8).join(", ")}` : null,
    item.keywords?.length ? `Keywords: ${item.keywords.join(", ")}` : null,
    item.overview ? `Overview: ${item.overview.slice(0, 600)}` : null,
  ].filter(Boolean);
  return parts.join("\n");
}

export async function generateEmbedding(
  text: string,
): Promise<number[] | null> {
  const client = getClient();
  if (!client) return null;
  try {
    const response = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return response.data[0].embedding;
  } catch (err) {
    console.error("[embeddings] generation failed:", err);
    return null;
  }
}

export function weightedAverage(
  entries: { vector: number[]; weight: number }[],
): number[] {
  if (entries.length === 0) return [];
  const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);
  const dim = entries[0].vector.length;
  const avg = new Array<number>(dim).fill(0);
  for (const { vector, weight } of entries) {
    for (let i = 0; i < dim; i++) {
      avg[i] += (vector[i] * weight) / totalWeight;
    }
  }
  return avg;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}
