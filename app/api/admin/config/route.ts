import { NextResponse } from "next/server";
import { getAiConfig, updateAiConfig } from "@/lib/ai-evaluator";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = getAiConfig();
  return NextResponse.json({
    provider: config.provider,
    openRouterConfigured: Boolean(config.openRouterApiKey),
    openRouterModel: config.openRouterModel,
    geminiConfigured: Boolean(config.geminiApiKey || process.env.GEMINI_API_KEY),
    geminiModel: config.geminiModel,
    ollamaEndpoint: config.ollamaEndpoint,
    ollamaModel: config.ollamaModel,
    openaiConfigured: Boolean(config.openaiApiKey || process.env.OPENAI_API_KEY),
    openaiModel: config.openaiModel,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const updated = updateAiConfig(body);
    return NextResponse.json({
      success: true,
      config: {
        provider: updated.provider,
        openRouterConfigured: Boolean(updated.openRouterApiKey),
        openRouterModel: updated.openRouterModel,
        geminiConfigured: Boolean(updated.geminiApiKey || process.env.GEMINI_API_KEY),
        geminiModel: updated.geminiModel,
        ollamaEndpoint: updated.ollamaEndpoint,
        ollamaModel: updated.ollamaModel,
        openaiConfigured: Boolean(updated.openaiApiKey || process.env.OPENAI_API_KEY),
        openaiModel: updated.openaiModel,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Config update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
