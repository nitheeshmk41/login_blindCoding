import { SupportedLanguage, EvaluationResult, ErrorItem } from "./types";

export interface OllamaStatus {
  online: boolean;
  endpoint: string;
  models: string[];
  selectedModel: string;
  error?: string;
}

const DEFAULT_OLLAMA_ENDPOINT = process.env.NEXT_PUBLIC_OLLAMA_URL || "http://localhost:11434";

export async function getOllamaStatus(endpoint: string = DEFAULT_OLLAMA_ENDPOINT): Promise<OllamaStatus> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${endpoint}/api/tags`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        online: false,
        endpoint,
        models: [],
        selectedModel: "llama3",
        error: `HTTP error: ${res.status}`,
      };
    }

    const data = await res.json();
    const models = (data.models || []).map((m: { name?: string }) => m.name || "").filter(Boolean);
    const selectedModel = models.length > 0 ? models[0] : "llama3";

    return {
      online: true,
      endpoint,
      models,
      selectedModel,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Connection failed";
    return {
      online: false,
      endpoint,
      models: [],
      selectedModel: "llama3",
      error: message,
    };
  }
}

/**
 * Intelligent static heuristic code analyzer used when Ollama is offline
 * or as a baseline checker for reverse marking.
 */
export function analyzeCodeHeuristically(
  code: string,
  language: SupportedLanguage,
  problemId: string,
  tabSwitchPenalty?: number
): EvaluationResult {
  const lines = code.split("\n");
  const syntaxErrors: ErrorItem[] = [];
  const logicErrors: ErrorItem[] = [];
  const edgeCaseErrors: ErrorItem[] = [];

  // Check 1: Empty or boilerplate check
  const nonCommentLines = lines.filter((l) => {
    const trimmed = l.trim();
    return (
      trimmed.length > 0 &&
      !trimmed.startsWith("//") &&
      !trimmed.startsWith("/*") &&
      !trimmed.startsWith("*") &&
      !trimmed.startsWith("#")
    );
  });

  if (nonCommentLines.length < 5) {
    logicErrors.push({
      id: "he-incomplete",
      type: "logic",
      line: 1,
      message: "Submission is largely empty or contains only comments/unimplemented stub.",
      deduction: 60,
    });
  }

  // Check 2: Bracket & Parentheses balance
  const stack: { char: string; line: number }[] = [];
  let bracketMismatch = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === "{" || char === "(" || char === "[") {
        stack.push({ char, line: i + 1 });
      } else if (char === "}" || char === ")" || char === "]") {
        const last = stack.pop();
        if (
          !last ||
          (char === "}" && last.char !== "{") ||
          (char === ")" && last.char !== "(") ||
          (char === "]" && last.char !== "[")
        ) {
          bracketMismatch = true;
          syntaxErrors.push({
            id: `bracket-err-${i}`,
            type: "syntax",
            line: i + 1,
            message: `Mismatched or unclosed delimiter '${char}'`,
            deduction: 8,
          });
          break;
        }
      }
    }
  }

  if (stack.length > 0 && !bracketMismatch) {
    syntaxErrors.push({
      id: "unclosed-brackets",
      type: "syntax",
      line: stack[stack.length - 1].line,
      message: `Unclosed bracket '${stack[stack.length - 1].char}'`,
      deduction: 8,
    });
  }

  // Check 3: Language-Specific Syntax Validation
  if (language === "c" || language === "cpp" || language === "java") {
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (
        trimmed.length > 0 &&
        !trimmed.startsWith("//") &&
        !trimmed.startsWith("/*") &&
        !trimmed.startsWith("*") &&
        !trimmed.startsWith("#") &&
        !trimmed.endsWith("{") &&
        !trimmed.endsWith("}") &&
        !trimmed.endsWith(";") &&
        !trimmed.endsWith(":") &&
        !trimmed.endsWith(",") &&
        !trimmed.startsWith("if") &&
        !trimmed.startsWith("while") &&
        !trimmed.startsWith("for") &&
        !trimmed.startsWith("class") &&
        !trimmed.startsWith("struct") &&
        !trimmed.startsWith("public") &&
        !trimmed.startsWith("private") &&
        !trimmed.includes("class ")
      ) {
        if (syntaxErrors.filter((e) => e.type === "syntax").length < 4) {
          syntaxErrors.push({
            id: `missing-semicolon-${idx}`,
            type: "syntax",
            line: idx + 1,
            message: `Expected ';' at statement end: "${trimmed.slice(0, 35)}..."`,
            deduction: 5,
          });
        }
      }

      // Check pointer dereferencing in C / C++
      if ((language === "c" || language === "cpp") && problemId.includes("linked-list")) {
        if (trimmed.includes("l1.val") || trimmed.includes("l2.val") || trimmed.includes("curr.next") || trimmed.includes("dummy.next")) {
          if (!syntaxErrors.some((e) => e.id === "pointer-dot-notation")) {
            syntaxErrors.push({
              id: "pointer-dot-notation",
              type: "syntax",
              line: idx + 1,
              message: "Pointer dereferencing error: used '.' instead of '->' on ListNode pointer.",
              deduction: 8,
            });
          }
        }
      }
    });
  } else if (language === "python") {
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (
        trimmed.startsWith("def ") ||
        trimmed.startsWith("class ") ||
        trimmed.startsWith("if ") ||
        trimmed.startsWith("elif ") ||
        trimmed === "else" ||
        trimmed.startsWith("while ") ||
        trimmed.startsWith("for ")
      ) {
        if (!trimmed.endsWith(":")) {
          if (syntaxErrors.filter((e) => e.type === "syntax").length < 4) {
            syntaxErrors.push({
              id: `missing-colon-${idx}`,
              type: "syntax",
              line: idx + 1,
              message: `Missing colon ':' at the end of statement: "${trimmed.slice(0, 35)}..."`,
              deduction: 5,
            });
          }
        }
      }
    });

    if (problemId.includes("queues") && code.includes("class ") && !code.includes("self.")) {
      syntaxErrors.push({
        id: "py-missing-self",
        type: "syntax",
        message: "Python class methods must access instance attributes via 'self.'",
        deduction: 10,
      });
    }
  }

  // Check 4: Problem-specific logic and constraint checks
  if (problemId.includes("linked-list")) {
    const usesSetOrArray =
      code.includes("unordered_set") ||
      code.includes("std::set") ||
      code.includes("HashSet") ||
      code.includes("Set()") ||
      code.includes("new Set") ||
      code.includes("dict()") ||
      code.includes("vector<") ||
      code.includes("ArrayList");

    const hasDoubleLoop = (code.match(/while/g) || []).length >= 2 || (code.match(/for/g) || []).length >= 2 || (code.includes("while") && code.includes("for"));
    const hasUnlink = code.includes(".next = ") || code.includes("->next = ");
    const hasPointerAdvance = code.includes("current = ") || code.includes("curr = ") || code.includes("head = ");

    if (usesSetOrArray) {
      logicErrors.push({
        id: "space-complexity-violation",
        type: "logic",
        message: "Constraint violation: Used set/hash map/array (O(N) space). Task strictly requires in-place O(1) space.",
        deduction: 25,
      });
    }

    if (!hasDoubleLoop) {
      logicErrors.push({
        id: "missing-nested-traversal",
        type: "logic",
        message: "Missing nested traversal loop required to compare candidates in-place without extra space.",
        deduction: 15,
      });
    }

    if (!hasUnlink) {
      logicErrors.push({
        id: "no-pointer-unlink",
        type: "logic",
        message: "Duplicate nodes are never unlinked (runner.next = runner.next.next is missing).",
        deduction: 20,
      });
    }

    if (!hasPointerAdvance) {
      logicErrors.push({
        id: "no-pointer-advance",
        type: "logic",
        message: "Main traversal pointer is not advanced, leading to infinite loop.",
        deduction: 20,
      });
    }

    if (!code.includes("null") && !code.includes("NULL") && !code.includes("nullptr") && !code.includes("None")) {
      edgeCaseErrors.push({
        id: "missing-null-check",
        type: "edge_case",
        message: "No null head check for empty linked list edge case.",
        deduction: 8,
      });
    }
  } else if (problemId.includes("queues")) {
    const usesElementShift =
      code.includes(".shift()") ||
      code.includes(".splice(") ||
      code.includes("memmove") ||
      code.includes("rotate(");

    const hasModuloOrWrap = code.includes("%") || code.includes("CAPACITY") || code.includes("5") || code.includes("if");
    const hasFullCheck = code.includes("isFull") || code.includes("size == 5") || code.includes("size == CAPACITY") || code.includes("count == 5");
    const hasEmptyCheck = code.includes("isEmpty") || code.includes("size == 0") || code.includes("count == 0");

    if (usesElementShift) {
      logicErrors.push({
        id: "element-shift-antipattern",
        type: "logic",
        message: "Anti-pattern: Shifted elements in array instead of updating front/rear pointers.",
        deduction: 25,
      });
    }

    if (!hasModuloOrWrap) {
      logicErrors.push({
        id: "circular-wrap-missing",
        type: "logic",
        message: "Circular index wrap-around logic using modulo (%) or capacity check is missing.",
        deduction: 15,
      });
    }

    if (!hasFullCheck) {
      logicErrors.push({
        id: "queue-overflow-unchecked",
        type: "logic",
        message: "Queue does not properly verify overflow state before enqueueing.",
        deduction: 15,
      });
    }

    if (!hasEmptyCheck) {
      logicErrors.push({
        id: "queue-underflow-unchecked",
        type: "logic",
        message: "Queue does not properly verify empty state before dequeueing or peeking.",
        deduction: 12,
      });
    }

    if (!code.includes("-1")) {
      edgeCaseErrors.push({
        id: "empty-queue-sentinel",
        type: "edge_case",
        message: "peek() / Front() should return -1 when circular queue is empty.",
        deduction: 8,
      });
    }
  }

  // Calculate Reverse Marking: Starts at 100, drops per error and tab switch penalty
  const defectDeduction =
    syntaxErrors.reduce((acc, e) => acc + e.deduction, 0) +
    logicErrors.reduce((acc, e) => acc + e.deduction, 0) +
    edgeCaseErrors.reduce((acc, e) => acc + e.deduction, 0);

  const penalty = Math.max(0, Number(tabSwitchPenalty || 0));
  const totalDeduction = defectDeduction + penalty;
  const score = Math.max(0, Math.min(100, 100 - totalDeduction));

  const totalErrors = syntaxErrors.length + logicErrors.length + edgeCaseErrors.length;
  let aiFeedback =
    totalErrors === 0
      ? "Outstanding solution! Clean syntax, proper pointer/buffer manipulation, and robust edge cases."
      : `Identified ${totalErrors} issue(s) (${syntaxErrors.length} syntax, ${logicErrors.length} logic, ${edgeCaseErrors.length} edge cases). ${defectDeduction} points deducted from base 100.`;

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
    evaluatorType: "heuristic_fallback",
    modelUsed: "Rule-Based Code Inspector (Offline AI Fallback)",
  };
}

/**
 * Main Ollama AI evaluation handler with reverse marking:
 * Starts at 100 points, strictly counts syntax and logic errors without running/compiling.
 */
export async function evaluateSubmissionWithOllama(params: {
  code: string;
  language: SupportedLanguage;
  problemId: string;
  problemTitle: string;
  problemDescription: string;
  endpoint?: string;
  model?: string;
}): Promise<EvaluationResult> {
  const {
    code,
    language,
    problemId,
    problemTitle,
    problemDescription,
    endpoint = DEFAULT_OLLAMA_ENDPOINT,
    model = "llama3",
  } = params;

  // First check if Ollama is accessible
  const status = await getOllamaStatus(endpoint);
  if (!status.online) {
    const fallback = analyzeCodeHeuristically(code, language, problemId);
    fallback.aiFeedback += " [Ollama server offline at " + endpoint + ". Used static rule inspector.]";
    return fallback;
  }

  const selectedModel = status.models.includes(model) ? model : status.selectedModel || "llama3";

  const prompt = `You are an expert strict programming competition judge specializing in reverse marking.
Evaluate this student's submission for the blind coding contest.

Language: ${language}
Problem Title: ${problemTitle}
Problem Description:
${problemDescription}

Student's Blind-Coded Solution:
\`\`\`${language}
${code}
\`\`\`

CRITICAL CONTEST INSTRUCTIONS:
1. DO NOT COMPILE OR EXECUTE THE CODE. Perform static visual code inspection only.
2. Count every single mistake:
   - Syntax Errors: undeclared variables, missing semicolons (if applicable to ${language}), mismatched brackets/parentheses, wrong keywords, bad imports.
   - Logic Errors: pointer errors, off-by-one errors, infinite loops, missed carries, circular queue modulo errors, wrong returns.
   - Missing Edge Cases: empty input, boundary overflows, single node, null checks.
3. REVERSE MARKING FORMULA:
   - The candidate starts with 100 marks.
   - Deduct 5 to 10 marks per syntax error.
   - Deduct 10 to 20 marks per logic error.
   - Deduct 5 to 10 marks per missing edge case.
   - Final score = Math.max(0, 100 - totalDeductions).
4. OUTPUT FORMAT:
   Return ONLY a valid JSON object. Do not include markdown codeblocks or preamble.
   JSON Schema:
   {
     "syntaxErrors": [
       {"id": "s1", "type": "syntax", "line": 15, "message": "Missing semicolon", "deduction": 5}
     ],
     "logicErrors": [
       {"id": "l1", "type": "logic", "line": 22, "message": "Pointer not advanced", "deduction": 15}
     ],
     "edgeCaseErrors": [
       {"id": "e1", "type": "edge_case", "message": "Trailing carry not handled", "deduction": 10}
     ],
     "totalDeduction": 30,
     "score": 70,
     "aiFeedback": "Concise summary of candidate's blind code quality and errors counted."
   }`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    const response = await fetch(`${endpoint}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: selectedModel,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.1,
        },
      }),
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Ollama returned status ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.response || "";

    // Extract JSON from response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse JSON from Ollama response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const syntaxErrors: ErrorItem[] = (parsed.syntaxErrors || []).map(
      (e: { line?: number; message?: string; deduction?: number }, idx: number) => ({
        id: `ollama-syn-${idx}`,
        type: "syntax" as const,
        line: e.line,
        message: e.message || "Syntax error detected",
        deduction: Number(e.deduction) || 5,
      })
    );

    const logicErrors: ErrorItem[] = (parsed.logicErrors || []).map(
      (e: { line?: number; message?: string; deduction?: number }, idx: number) => ({
        id: `ollama-log-${idx}`,
        type: "logic" as const,
        line: e.line,
        message: e.message || "Logic error detected",
        deduction: Number(e.deduction) || 15,
      })
    );

    const edgeCaseErrors: ErrorItem[] = (parsed.edgeCaseErrors || []).map(
      (e: { message?: string; deduction?: number }, idx: number) => ({
        id: `ollama-edge-${idx}`,
        type: "edge_case" as const,
        message: e.message || "Edge case unhandled",
        deduction: Number(e.deduction) || 8,
      })
    );

    const totalDeduction =
      Number(parsed.totalDeduction) ||
      syntaxErrors.reduce((a, b) => a + b.deduction, 0) +
        logicErrors.reduce((a, b) => a + b.deduction, 0) +
        edgeCaseErrors.reduce((a, b) => a + b.deduction, 0);

    const score = Math.max(0, Math.min(100, 100 - totalDeduction));

    return {
      score,
      totalDeduction,
      syntaxErrors,
      logicErrors,
      edgeCaseErrors,
      aiFeedback: parsed.aiFeedback || `Ollama completed reverse marking static evaluation with ${totalDeduction} points deducted.`,
      evaluatedAt: new Date().toISOString(),
      evaluatorType: "ollama",
      modelUsed: selectedModel,
    };
  } catch (err: unknown) {
    console.warn("Ollama call failed or timed out, falling back to heuristic engine:", err);
    const fallback = analyzeCodeHeuristically(code, language, problemId);
    fallback.aiFeedback += " [Ollama connection error. Evaluated via static rule inspector.]";
    return fallback;
  }
}
