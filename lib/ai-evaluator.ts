import {
  SupportedLanguage,
  EvaluationResult,
  ErrorItem,
  AiConfig,
  AiProvider,
} from "./types";
import { analyzeCodeHeuristically, getOllamaStatus } from "./ollama";

import fs from "fs";
import path from "path";

// In-memory persistent AI configuration
declare global {
  // eslint-disable-next-line no-var
  var __AI_CONFIG__: AiConfig | undefined;
}

export function getOpenRouterApiKey(): string {
  if (process.env.OPEN_ROUTER) return process.env.OPEN_ROUTER.trim();
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY.trim();
  try {
    const envPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      const match = content.match(/OPEN_ROUTER\s*=\s*([^\r\n]+)/);
      if (match) return match[1].trim();
    }
  } catch (e) {}
  return "";
}

export function getAiConfig(): AiConfig {
  const orKey = getOpenRouterApiKey();
  if (!global.__AI_CONFIG__) {
    global.__AI_CONFIG__ = {
      provider: orKey ? "openrouter" : "gemini",
      openRouterApiKey: orKey,
      openRouterModel: "cohere/north-mini-code:free",
      geminiApiKey: process.env.GEMINI_API_KEY || "",
      geminiModel: "gemini-1.5-flash",
      ollamaEndpoint: process.env.NEXT_PUBLIC_OLLAMA_URL || "http://localhost:11434",
      ollamaModel: "llama3",
      openaiApiKey: process.env.OPENAI_API_KEY || "",
      openaiEndpoint: "https://api.openai.com/v1",
      openaiModel: "gpt-4o-mini",
    };
  } else {
    if (!global.__AI_CONFIG__.openRouterApiKey && orKey) {
      global.__AI_CONFIG__.openRouterApiKey = orKey;
    }
    if (!global.__AI_CONFIG__.openRouterModel) {
      global.__AI_CONFIG__.openRouterModel = "cohere/north-mini-code:free";
    }
  }
  return global.__AI_CONFIG__;
}

export function updateAiConfig(newConfig: Partial<AiConfig>): AiConfig {
  const current = getAiConfig();
  global.__AI_CONFIG__ = { ...current, ...newConfig };
  return global.__AI_CONFIG__;
}

function buildPrompt(params: {
  code: string;
  language: SupportedLanguage;
  problemTitle: string;
  problemDescription: string;
}): string {
  const langRules: Record<SupportedLanguage, string> = {
    cpp: "C++ strict rules: inspect pointer dereferencing ('->' vs '.'), nullptr safety checks, missing semicolons, memory leaks with new/delete, and vector sizing.",
    java: "Java strict rules: inspect exact method and class signatures, variable type declarations, semicolons on statements, NullPointerException risks, and boundary checks.",
    c: "C strict rules: inspect pointer syntax ('->'), malloc/free memory leaks, null pointer dereferences, missing semicolons, and proper function signatures.",
    python: "Python strict rules: inspect indentation, missing colons (:) on def/class/if/elif/else/while/for, explicit 'self.' attribute usage inside classes, and None handling.",
    javascript: "JavaScript strict rules: inspect bracket balancing, proper function/class syntax, proper handling of negative modulo ((x % n) + n) % n, and undefined/null checks.",
  };

  const selectedRule = langRules[params.language] || "";

  return `You are a world-class collegiate competitive programming judge and static code analysis auditor.
Evaluate this student's submission for a BLIND CODING championship.
Language: ${params.language}
Problem: ${params.problemTitle}
Problem Specification:
${params.problemDescription}

Language-Specific Verification:
${selectedRule}

Student Blind-Coded Submission:
\`\`\`${params.language}
${params.code}
\`\`\`

CORE EVALUATION DIRECTIVES:
1. STRICT STATIC INSPECTION ONLY: DO NOT compile or execute code. The student coded blindly without visual feedback or testing.
2. COUNT EVERY DEFECT ACCURATELY:
   - Syntax Errors: Missing semicolons, unmatched braces/parentheses, typos in keywords/variables, invalid operators, bad signatures (-5 to -10 PTS each).
   - Logic Flaws: Pointer traversal bugs, infinite loops, missing loop pointer increment, off-by-one errors, incorrect modulo arithmetic, wrong return values (-10 to -20 PTS each).
   - Edge Cases: Empty inputs, single-element cases, null pointers, capacity overflow/underflow, trailing carry (-5 to -10 PTS each).
3. REVERSE MARKING FORMULA:
   - Initial Base: 100 MARKS.
   - Total Deductions = Sum of deductions for all syntax, logic, and edge case defects.
   - Score = Math.max(0, 100 - Total Deductions).
4. OUTPUT FORMAT:
   Return strictly valid JSON matching this schema:
   {
     "syntaxErrors": [
       {"id": "syn-1", "type": "syntax", "line": 5, "message": "Detailed explanation of syntax defect", "deduction": 5}
     ],
     "logicErrors": [
       {"id": "log-1", "type": "logic", "line": 14, "message": "Detailed explanation of logic defect", "deduction": 15}
     ],
     "edgeCaseErrors": [
       {"id": "edge-1", "type": "edge_case", "message": "Detailed explanation of missed edge case", "deduction": 8}
     ],
     "totalDeduction": 28,
     "score": 72,
     "aiFeedback": "Concise summary of candidate's algorithmic accuracy, syntax precision, and key blind coding errors."
   }`;
}

function parseAiJson(
  rawText: string,
  fallback: EvaluationResult,
  tabSwitchPenalty: number = 0
): EvaluationResult {
  try {
    // Strip markdown code block wrapper if present
    let cleaned = rawText.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith("```")) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallback;

    const parsed = JSON.parse(jsonMatch[0]);

    const syntaxErrors: ErrorItem[] = (parsed.syntaxErrors || []).map(
      (e: any, idx: number) => ({
        id: e.id || `syn-${idx}`,
        type: "syntax",
        line: e.line,
        message: e.message || "Syntax defect detected",
        deduction: Number(e.deduction) || 5,
      })
    );

    const logicErrors: ErrorItem[] = (parsed.logicErrors || []).map(
      (e: any, idx: number) => ({
        id: e.id || `log-${idx}`,
        type: "logic",
        line: e.line,
        message: e.message || "Logic defect detected",
        deduction: Number(e.deduction) || 15,
      })
    );

    const edgeCaseErrors: ErrorItem[] = (parsed.edgeCaseErrors || []).map(
      (e: any, idx: number) => ({
        id: e.id || `edge-${idx}`,
        type: "edge_case",
        message: e.message || "Edge case missed",
        deduction: Number(e.deduction) || 8,
      })
    );

    const defectDeduction =
      Number(parsed.totalDeduction) ||
      syntaxErrors.reduce((a, b) => a + b.deduction, 0) +
        logicErrors.reduce((a, b) => a + b.deduction, 0) +
        edgeCaseErrors.reduce((a, b) => a + b.deduction, 0);

    const penalty = Math.max(0, Number(tabSwitchPenalty || 0));
    const totalDeduction = defectDeduction + penalty;
    const score = Math.max(0, Math.min(100, 100 - totalDeduction));

    let aiFeedback =
      parsed.aiFeedback ||
      `Static evaluation completed with ${defectDeduction} points deducted.`;

    if (penalty > 0) {
      aiFeedback += ` Tab switch penalty applied: -${penalty} PTS.`;
    }

    return {
      score,
      totalDeduction,
      tabSwitchPenalty: penalty,
      syntaxErrors,
      logicErrors,
      edgeCaseErrors,
      aiFeedback,
      evaluatedAt: new Date().toISOString(),
      evaluatorType: fallback.evaluatorType,
      modelUsed: fallback.modelUsed,
    };
  } catch (err) {
    return fallback;
  }
}

/**
 * Evaluate using Google Gemini API
 */
export async function evaluateWithGemini(
  params: {
    code: string;
    language: SupportedLanguage;
    problemId: string;
    problemTitle: string;
    problemDescription: string;
    tabSwitchPenalty?: number;
  },
  config: AiConfig
): Promise<EvaluationResult> {
  const apiKey = config.geminiApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key is not configured.");
  }

  const model = config.geminiModel || "gemini-1.5-flash";
  const prompt = buildPrompt(params);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errorBody}`);
  }

  const data = await res.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  const fallback = analyzeCodeHeuristically(
    params.code,
    params.language,
    params.problemId,
    params.tabSwitchPenalty
  );
  fallback.evaluatorType = "gemini";
  fallback.modelUsed = `Google Gemini (${model})`;

  return parseAiJson(rawText, fallback, params.tabSwitchPenalty);
}

/**
 * Evaluate using OpenAI or OpenAI-compatible API
 */
export async function evaluateWithOpenAi(
  params: {
    code: string;
    language: SupportedLanguage;
    problemId: string;
    problemTitle: string;
    problemDescription: string;
    tabSwitchPenalty?: number;
  },
  config: AiConfig
): Promise<EvaluationResult> {
  const apiKey = config.openaiApiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API key is not configured.");
  }

  const endpoint = config.openaiEndpoint || "https://api.openai.com/v1";
  const model = config.openaiModel || "gpt-4o-mini";
  const prompt = buildPrompt(params);

  const res = await fetch(`${endpoint}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const rawText = data?.choices?.[0]?.message?.content || "";

  const fallback = analyzeCodeHeuristically(
    params.code,
    params.language,
    params.problemId,
    params.tabSwitchPenalty
  );
  fallback.evaluatorType = "openai";
  fallback.modelUsed = `OpenAI (${model})`;

  return parseAiJson(rawText, fallback, params.tabSwitchPenalty);
}

/**
 * Unified multi-provider evaluator with automatic fallback chain:
 * Configured Provider (Gemini / Ollama / OpenAI) -> Ollama -> Heuristic static inspector
/**
 * Evaluate using OpenRouter Free Model with automatic fallback on token limit / rate limit / bug
 */
export async function evaluateWithOpenRouter(
  params: {
    code: string;
    language: SupportedLanguage;
    problemId: string;
    problemTitle: string;
    problemDescription: string;
    tabSwitchPenalty?: number;
  },
  config: AiConfig
): Promise<EvaluationResult> {
  const apiKey = config.openRouterApiKey || getOpenRouterApiKey();
  if (!apiKey) {
    throw new Error("OpenRouter API key is not configured.");
  }

  const prompt = buildPrompt(params);
  const modelsToTry = Array.from(
    new Set([
      config.openRouterModel || "cohere/north-mini-code:free",
      "cohere/north-mini-code:free",
      "nex-agi/nex-n2.5-mini:free",
      "liquid/lfm-2.5-2.6b:free",
      "poolside/laguna-s-2.1:free",
    ])
  );

  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout for free model generation

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://psgtech.ac.in",
          "X-Title": "LOGIN 2K26 Blind Coding Arena",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1,
          max_tokens: 800,
        }),
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text();
        console.warn(`OpenRouter model ${model} returned error status ${res.status}:`, errorText);
        lastError = new Error(`OpenRouter (${res.status}): ${errorText}`);
        continue;
      }

      const data = await res.json();
      if (data?.error) {
        console.warn(`OpenRouter model ${model} error payload:`, data.error);
        lastError = new Error(data.error.message || "OpenRouter error");
        continue;
      }

      const rawText = data?.choices?.[0]?.message?.content || "";
      if (!rawText.trim()) {
        lastError = new Error("Empty response from OpenRouter");
        continue;
      }

      const fallback = analyzeCodeHeuristically(
        params.code,
        params.language,
        params.problemId,
        params.tabSwitchPenalty
      );
      fallback.evaluatorType = "openrouter";
      fallback.modelUsed = `OpenRouter Free (${model})`;

      const result = parseAiJson(rawText, fallback, params.tabSwitchPenalty);
      result.evaluatorType = "openrouter";
      result.modelUsed = `OpenRouter Free (${model})`;
      return result;
    } catch (err: unknown) {
      console.warn(`OpenRouter attempt failed for ${model}:`, err);
      lastError = err instanceof Error ? err : new Error("OpenRouter request error");
    }
  }

  throw lastError || new Error("All OpenRouter free models exhausted or rate-limited.");
}

/**
 * Unified multi-provider evaluator with automatic resilient fallback chain:
 * 1. OpenRouter (Free Model from .env)
 * 2. If token limit, 429, or bug -> Gemini API
 * 3. If Gemini unavailable -> Local Ollama
 * 4. If Ollama unavailable -> Enhanced Rule-Based AST Static Code Inspector
 */
export async function evaluateSubmissionUnified(params: {
  code: string;
  language: SupportedLanguage;
  problemId: string;
  problemTitle: string;
  problemDescription: string;
  tabSwitchPenalty?: number;
  overrideProvider?: AiProvider;
}): Promise<EvaluationResult> {
  const config = getAiConfig();
  const provider = params.overrideProvider || config.provider;
  const penalty = params.tabSwitchPenalty || 0;

  // 1. Try OpenRouter (Default or if configured)
  const hasOpenRouterKey = Boolean(config.openRouterApiKey || getOpenRouterApiKey());
  if (provider === "openrouter" || (!params.overrideProvider && hasOpenRouterKey)) {
    try {
      const result = await evaluateWithOpenRouter(params, config);
      return result;
    } catch (err: unknown) {
      console.warn("OpenRouter free model error / token limit / bug, cascading to Gemini:", err);
    }
  }

  // 2. Cascade / Try Gemini API
  const hasGeminiKey = Boolean(config.geminiApiKey || process.env.GEMINI_API_KEY);
  if (provider === "gemini" || hasGeminiKey) {
    try {
      const result = await evaluateWithGemini(params, config);
      result.evaluatorType = "gemini";
      result.modelUsed = `Gemini (${config.geminiModel})`;
      return result;
    } catch (err: unknown) {
      console.warn("Gemini evaluation failed, cascading to Ollama:", err);
    }
  }

  // 3. Try OpenAI if explicitly chosen
  if (provider === "openai") {
    try {
      const result = await evaluateWithOpenAi(params, config);
      result.evaluatorType = "openai";
      result.modelUsed = `OpenAI (${config.openaiModel})`;
      return result;
    } catch (err: unknown) {
      console.warn("OpenAI evaluation failed, cascading to Ollama:", err);
    }
  }

  // 4. Cascade / Try Local Ollama
  try {
    const ollamaHealth = await getOllamaStatus(config.ollamaEndpoint);
    if (ollamaHealth.online) {
      const selectedModel = ollamaHealth.models.includes(config.ollamaModel)
        ? config.ollamaModel
        : ollamaHealth.selectedModel || "llama3";

      const prompt = buildPrompt(params);
      const res = await fetch(`${config.ollamaEndpoint}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          prompt,
          stream: false,
          options: { temperature: 0.1 },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const fallback = analyzeCodeHeuristically(
          params.code,
          params.language,
          params.problemId,
          penalty
        );
        fallback.evaluatorType = "ollama";
        fallback.modelUsed = `Ollama (${selectedModel})`;
        return parseAiJson(data.response || "", fallback, penalty);
      }
    }
  } catch (err) {
    console.warn("Ollama evaluation failed, using enhanced static analyzer:", err);
  }

  // 5. Final robust fallback: Enhanced Heuristic AST Static Inspector
  const fallback = analyzeCodeHeuristically(
    params.code,
    params.language,
    params.problemId,
    penalty
  );
  fallback.aiFeedback += " [Strict AST Multi-Pass Inspector]";
  return fallback;
}
