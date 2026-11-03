import type { TestCase } from "../models/types";

export function parseAssistantResponse(input: string): {
  testCases: TestCase[];
  questions: string[];
} {
  let text = input.trim();
  if (text.startsWith("```"))
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const parsed: unknown = JSON.parse(text);
  if (!parsed || typeof parsed !== "object" || !("testCases" in parsed))
    throw new Error("O JSON deve conter o campo testCases.");
  const result = parsed as { testCases?: unknown; questions?: unknown };
  if (!Array.isArray(result.testCases) || result.testCases.length === 0)
    throw new Error("Não foram encontrados casos de teste.");
  const required = (value: unknown, label: string): string => {
    if (typeof value !== "string" || !value.trim())
      throw new Error(`Campo obrigatório inválido: ${label}.`);
    return value;
  };
  const optional = (value: unknown) => (typeof value === "string" ? value : "");
  const testCases = result.testCases.map((raw, i): TestCase => {
    if (!raw || typeof raw !== "object")
      throw new Error(`Caso ${i + 1} inválido.`);
    const item = raw as Record<string, unknown>;
    if (!Array.isArray(item.steps) || item.steps.length === 0)
      throw new Error(`O caso ${i + 1} não tem passos válidos.`);
    const priority = Number(item.priority);
    if (![1, 2, 3, 4].includes(priority))
      throw new Error(`Prioridade inválida no caso ${i + 1}.`);
    if(item.titleOutcome!==undefined && item.titleOutcome!=="OK" && item.titleOutcome!=="NOT OK")
      throw new Error(`Sufixo inválido no caso ${i+1}: usa OK ou NOT OK.`);
    const status = item.automationStatus;
    if (status !== "Manual" && status !== "Automated" && status !== "Planned")
      throw new Error(`Automation Status inválido no caso ${i + 1}.`);
    return {
      localId: `${Date.now()}-${i}`,
      title: required(item.title, `title (caso ${i + 1})`),
      ...(item.titleOutcome==="OK"||item.titleOutcome==="NOT OK"?{titleOutcome:item.titleOutcome}:{}),
      description: optional(item.description),
      priority: priority as TestCase["priority"],
      testType: required(item.testType, `testType (caso ${i + 1})`),
      automationStatus: "Manual",
      testedComponent: optional(item.testedComponent),
      
      preconditions: optional(item.preconditions),
      testData: optional(item.testData),
      steps: item.steps.map((rawStep, j) => {
        if (!rawStep || typeof rawStep !== "object")
          throw new Error(`Passo ${j + 1} inválido no caso ${i + 1}.`);
        const step = rawStep as Record<string, unknown>;
        return {
          action: required(
            step.action,
            `action (caso ${i + 1}, passo ${j + 1})`,
          ),
          expectedResult: required(
            step.expectedResult,
            `expectedResult (caso ${i + 1}, passo ${j + 1})`,
          ),
        };
      }),
    };
  });
  if (
    result.questions !== undefined &&
    (!Array.isArray(result.questions) ||
      !result.questions.every((q) => typeof q === "string"))
  )
    throw new Error("O campo questions deve ser uma lista de textos.");
  return {
    testCases,
    questions: (result.questions as string[] | undefined) ?? [],
  };
}
