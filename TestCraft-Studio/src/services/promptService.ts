import type { WorkItem } from "../models/types";
import { plainText } from "../utils/textUtils.js";

export const PROMPT_VERSION = "5.0";
export const PROMPT_STORAGE_KEY = "testcraft-demo-generator-combined-prompt-v5";
const LEGACY_PROMPT_STORAGE_KEY = "testcraft-demo-generator-prompt-v2";

// Só estas instruções são editáveis. O contrato JSON é acrescentado separadamente.
export const DEFAULT_PROMPT = `Analisa a User Story abaixo e gera casos de teste de qualidade em português de Portugal.

OBJETIVO PRINCIPAL — CONSOLIDAÇÃO INTELIGENTE
1. Analisa os objetivos, fluxos, contextos de execução e critérios de aceitação da User Story.
2. Cria o número mínimo de Test Cases independentes que assegure cobertura adequada. Não cries um caso por cada propriedade ou critério.
3. Agrupa verificações relacionadas, com pré-condições compatíveis, em Steps do mesmo caso; cada Step deve ter Action e Expected Result concretos e verificáveis.
4. Separa casos apenas quando existirem objetivos, fluxos, contextos ou riscos que justifiquem execução independente.
5. Garante que cada requisito verificável está coberto por pelo menos um Step, sem limites artificiais de casos ou Steps.
6. Evita duplicações entre Design System, aplicação e Storybook e também entre tipos de teste selecionados.
7. Inclui cenários negativos, de fronteira e de regressão apenas se forem pertinentes e sustentados pela User Story e pelos tipos selecionados.
8. Distingue cobertura necessária dos critérios de aceitação de sugestões adicionais; não cries casos autónomos opcionais sem justificação.
9. Não inventes regras de negócio, valores de cores, ecrãs, ferramentas obrigatórias nem critérios técnicos não fornecidos.
10. Gera casos de teste e questões de refinement relevantes. Não inventes regras em falta; usa os esclarecimentos aprovados da User Story. Coloca dúvidas em questions, sem repetir questões já respondidas.
11. No campo title escreve apenas o nome objetivo do caso, em português de Portugal, sem biblioteca nem prefixo. Usa titleOutcome OK ou NOT OK para distinguir cenários positivos e negativos. A aplicação compõe o título final depois de escolher a biblioteca.
12. Privilegia a qualidade, a cobertura e a eficiência de execução, não a quantidade de testes.`;

const JSON_CONTRACT = `REGRAS TÉCNICAS OBRIGATÓRIAS (não editáveis)
- Devolve EXCLUSIVAMENTE um objeto JSON válido, sem texto adicional nem blocos Markdown.
- Devolve casos de teste em testCases e questões de refinement em questions (lista de textos, ou [] quando não existirem dúvidas). Não inventes respostas. Este contrato prevalece sobre instruções editáveis incompatíveis.
- O campo testType de cada caso tem de corresponder exatamente a UM dos tipos selecionados, sem combinações nem categorias adicionais.
- O campo title contém apenas o nome do caso; titleOutcome é OK ou NOT OK. A biblioteca e o prefixo UI, UX/UI ou API serão aplicados pela aplicação.
- testedSubcomponent é opcional e não deve ser inventado.
- Usa priority de 1 a 4 e automationStatus apenas Manual, Automated ou Planned.
- Não atribuas IDs da demonstração DevOps. Se testedComponent for desconhecido, deixa-o vazio.
- Cada caso deve ter pelo menos um Step, com action e expectedResult não vazios.
- Formato obrigatório:
{
  "questions": ["Questão relevante ainda não esclarecida"],
  "testCases": [
    {
      "title": "",
      "titleOutcome": "OK",
      "description": "",
      "priority": 2,
      "testType": "{{EXAMPLE_TEST_TYPE}}",
      "automationStatus": "Manual",
      "testedComponent": "",
      "testedSubcomponent": "",
      "preconditions": "",
      "testData": "",
      "steps": [{ "action": "", "expectedResult": "" }]
    }
  ]
}`;

export function loadPromptInstructions(): string {
  try {
    const saved = window.localStorage.getItem(PROMPT_STORAGE_KEY);
    if (saved !== null) return saved;
    const legacy = window.localStorage.getItem("testcraft-demo-generator-test-prompt-v4") ?? window.localStorage.getItem("testcraft-demo-generator-prompt-v3") ?? window.localStorage.getItem(LEGACY_PROMPT_STORAGE_KEY);
    if (legacy) {
      // Migração da versão 2: remove as regras de JSON e de tipo único obsoletas.
      const cut = legacy.indexOf("12. Não atribuas IDs da demonstração DevOps.");
      if (cut >= 0) return legacy.slice(0, cut).trim();
      // Se a versão anterior foi muito personalizada, preserva-a para revisão manual.
      return legacy.replace("Gera apenas casos de teste. Não formules questões nem inventes regras em falta; usa os esclarecimentos aprovados da User Story.", "Gera casos de teste e questões de refinement relevantes, sem inventar regras nem repetir perguntas já esclarecidas.");
    }
  } catch {
    /* Armazenamento local indisponível. */
  }
  return DEFAULT_PROMPT;
}

function formatRefinementNotes(story:WorkItem):string {
 return (story.refinementNotes??[]).map((note,index)=>[String(index+1)+". "+note.question,"Resposta: "+note.answer].join("\n")).join("\n\n");
}
function testConfiguration(types:string[],automatic:boolean):string {
 const quotedTypes=types.map(type=>JSON.stringify(type)).join(", ");
 if(automatic)return `CLASSIFICAÇÃO AUTOMÁTICA A PARTIR DA USER STORY
- Identifica os tipos de teste pertinentes a partir da descrição, critérios e esclarecimentos da US.
- Respeita os tipos explicitamente indicados na US, quando existirem. Se forem ambíguos, coloca a dúvida em questions.
- Cada testType deve corresponder exatamente a um destes valores permitidos: ${quotedTypes}.
- Não cries casos para todos os tipos da lista. Usa apenas os que forem relevantes para esta US e evita duplicações.
- Esta classificação automática prevalece sobre pedidos antigos para selecionar tipos manualmente.
`;
 return `CONFIGURAÇÃO DEFINIDA PELO UTILIZADOR
Tipos de teste selecionados: ${types.join(", ")}
- Gera exclusivamente casos pertinentes aos tipos selecionados.
- Cada caso deve ter um único testType de entre: ${quotedTypes}.
- Não cries obrigatoriamente um caso por tipo; evita duplicações e respeita o objetivo de cada teste.
- Uma verificação de acessibilidade integrada num caso UX/UI não obriga a criar um caso autónomo de Acessibilidade.
`;
}

export function buildAssistantPrompt(
  story: WorkItem,
  selectedTestTypes: string[],
  instructions: string,
  automatic = false,
): string {
  const types = selectedTestTypes.join(", ");
  const rules = instructions
    .replaceAll("{{TEST_TYPE}}", types)
    .replaceAll("{{TEST_TYPES}}", types);
  const technicalRules = JSON_CONTRACT.replaceAll(
    "{{EXAMPLE_TEST_TYPE}}",
    selectedTestTypes[0] ?? "",
  ).replaceAll("tipos selecionados", automatic ? "tipos permitidos" : "tipos selecionados");
  return `${rules}

${testConfiguration(selectedTestTypes,automatic)}
${technicalRules}

USER STORY
ID: ${story.id}
Tipo: ${story.workItemType}
Título: ${story.title}
Estado: ${story.state}

DESCRIÇÃO
${plainText(story.description) || "Não fornecida."}

CRITÉRIOS DE ACEITAÇÃO
${plainText(story.acceptanceCriteria) || "Não fornecidos."}

ESCLARECIMENTOS APROVADOS NO REFINEMENT (cópia local da US)
${formatRefinementNotes(story) || "Sem esclarecimentos adicionais."}`;
}

export const QUESTION_PROMPT_STORAGE_KEY = "testcraft-demo-generator-question-prompt-v1";
export const DEFAULT_QUESTION_PROMPT = `Analisa a User Story e prepara apenas questões para uma sessão de refinement, em português de Portugal.
1. Pergunta apenas por informação relevante que esteja em falta ou seja ambígua.
2. Não repitas perguntas já esclarecidas na descrição, critérios de aceitação ou respostas aprovadas.
3. Faz perguntas objetivas, independentes e úteis para esclarecer o comportamento esperado.
4. Não inventes regras, respostas ou critérios técnicos.
5. Não cries casos de teste nesta fase. Se não houver dúvidas relevantes, devolve uma lista vazia.`;
export function loadQuestionPromptInstructions():string {
  try {return window.localStorage.getItem(QUESTION_PROMPT_STORAGE_KEY) ?? DEFAULT_QUESTION_PROMPT;}
  catch {return DEFAULT_QUESTION_PROMPT;}
}
export function buildQuestionsPrompt(story:WorkItem,instructions:string):string {
  return `${instructions}

CONTRATO OBRIGATÓRIO (prevalece sobre instruções editáveis incompatíveis)
Devolve exclusivamente JSON válido: {"questions":["Questão objetiva"]}.
Não devolvas testCases, casos de teste, respostas presumidas ou texto adicional.
questions pode ser [] quando não existirem dúvidas relevantes.

USER STORY #${story.id}
Título: ${story.title}
DESCRIÇÃO
${plainText(story.description) || "Não fornecida."}
CRITÉRIOS DE ACEITAÇÃO
${plainText(story.acceptanceCriteria) || "Não fornecidos."}
ESCLARECIMENTOS JÁ APROVADOS
${formatRefinementNotes(story) || "Nenhum."}`;
}

