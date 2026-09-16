import { NextResponse } from "next/server";
import { getOllamaStatus } from "@/lib/ollama";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const endpoint = searchParams.get("endpoint") || undefined;
  const status = await getOllamaStatus(endpoint);
  return NextResponse.json(status);
}
