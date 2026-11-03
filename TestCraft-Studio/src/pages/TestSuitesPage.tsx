import { useEffect, useState } from "react";
import testedComponents from "../data/testedComponents.json";

type Plan = { id: number; name: string };
type Suite = {
  id: number;
  name: string;
  suiteType?: string;
  testCaseCount?: number;
  children?: Suite[];
};
type SuitesResponse = { planId: number; suites: Suite[] };

function SuiteNode({
  suite,
  depth,
  selected,
  onSelect,
  parentPath,
}: {
  readonly suite: Suite;
  readonly depth: number;
  readonly selected: number | null;
  readonly onSelect: (suite: Suite, path: string) => void;
  readonly parentPath: string;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const children = (suite.children ?? []).filter(
    (child) => !/obsolet/i.test(child.name),
  );
  const currentPath = parentPath ? `${parentPath} → ${suite.name}` : suite.name;
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 8px",
          paddingLeft: 8 + depth * 20,
          background: selected === suite.id ? "#eef2ff" : "transparent",
          borderRadius: 7,
        }}
      >
        {children.length > 0 ? (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? "Recolher" : "Expandir"}
            style={{
              border: 0,
              background: "transparent",
              cursor: "pointer",
              width: 24,
            }}
          >
            {expanded ? "▾" : "▸"}
          </button>
        ) : (
          <span style={{ width: 24 }} />
        )}
        <button className="app-action"
          type="button"
          onClick={() => onSelect(suite, currentPath)}
          style={{
            background: "transparent",
            border: 0,
            
            cursor: "pointer",
            
            fontWeight: selected === suite.id ? 700 : 400,
          }}
        >
          📁 {suite.name}{" "}
          <span style={{ color: "#667085", fontSize: 12 }}>
            (ID: {suite.id}
            {typeof suite.testCaseCount === "number"
              ? ` · ${suite.testCaseCount} casos`
              : ""}
            )
          </span>
        </button>
      </div>
      {expanded &&
        children.map((child) => (
          <SuiteNode
            key={child.id}
            suite={child}
            depth={depth + 1}
            selected={selected}
            onSelect={onSelect}
            parentPath={currentPath}
          />
        ))}
    </div>
  );
}

export default function TestSuitesPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planId, setPlanId] = useState("");
  const [data, setData] = useState<SuitesResponse | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingSuites, setLoadingSuites] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Suite | null>(null);
  const [selectedPath, setSelectedPath] = useState("");
  const [automationStatus, setAutomationStatus] = useState("Manual");
  const [testedComponent, setTestedComponent] = useState("");
  const [description, setDescription] = useState("");
  const [preconditions, setPreconditions] = useState("");
  const [testedSubcomponent, setTestedSubcomponent] = useState("");

  async function loadPlans() {
    setLoadingPlans(true);
    setError("");
    try {
      const response = await fetch("/api/testplans");
      if (!response.ok)
        throw new Error(
          `Falha ao carregar bibliotecas (HTTP ${response.status}).`,
        );
      const result: { plans?: Plan[] } = await response.json();
      if (!Array.isArray(result.plans))
        throw new Error("A lista de bibliotecas recebida é inválida.");
      setPlans(result.plans);
      if (result.plans.length === 0)
        setError("Não foram encontradas bibliotecas neste projeto.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao consultar bibliotecas.",
      );
    } finally {
      setLoadingPlans(false);
    }
  }

  useEffect(() => {
    void loadPlans();
  }, []);

  async function selectPlan(id: string) {
    setPlanId(id);
    setData(null);
    setSelected(null);
    setSelectedPath("");
    setError("");
    if (!id) return;
    setLoadingSuites(true);
    try {
      const response = await fetch(
        `/api/testplans/${encodeURIComponent(id)}/suites`,
      );
      if (!response.ok)
        throw new Error(
          `Falha ao carregar Test Suites (HTTP ${response.status}).`,
        );
      const result: SuitesResponse = await response.json();
      if (!Array.isArray(result.suites))
        throw new Error(
          "O servidor não devolveu uma árvore de Test Suites válida.",
        );
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao consultar Test Suites.",
      );
    } finally {
      setLoadingSuites(false);
    }
  }

  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        padding: 22,
      }}
    >
      <h1 style={{ marginTop: 0 }}>Bibliotecas de Testes</h1>
      <p style={{ color: "#667085" }}>
        Consulta as bibliotecas e as Test Suites diretamente na demonstração.
        Nesta fase, a seleção não publica casos de teste.
      </p>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "end",
          marginBottom: 20,
        }}
      >
        <label
          style={{
            display: "grid",
            gap: 6,
            fontWeight: 700,
            minWidth: 320,
            flex: 1,
          }}
        >
          <span>Biblioteca de Testes</span>
          <select
            value={planId}
            disabled={loadingPlans || loadingSuites}
            onChange={(e) => {
              void selectPlan(e.target.value);
            }}
            style={{
              padding: 11,
              border: "1px solid #ccd0d5",
              borderRadius: 8,
            }}
          >
            <option value="">
              {loadingPlans
                ? "A carregar bibliotecas..."
                : "Selecionar biblioteca"}
            </option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} (#{plan.id})
              </option>
            ))}
          </select>
        </label>
        <button className="app-action"
          type="button"
          onClick={() => {
            void loadPlans();
          }}
          disabled={loadingPlans || loadingSuites}
          style={{
            background: "#4338ca",
            color: "#1d1d1d",
            border: 0,
            
            
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Atualizar bibliotecas
        </button>
      </div>
      {error && (
        <p role="alert" style={{ color: "#b42318" }}>
          {error}
        </p>
      )}
      {loadingSuites && <p>A carregar Test Suites...</p>}
      {data && (
        <>
          <p style={{ fontWeight: 700 }}>
            {plans.find((plan) => String(plan.id) === planId)?.name ??
              "Test Plan"}{" "}
            (#{data.planId})
          </p>
          <div
            style={{ border: "1px solid #e5e7eb", borderRadius: 9, padding: 8 }}
          >
            {data.suites
              .filter((suite) => !/obsolet/i.test(suite.name))
              .map((suite) => (
                <SuiteNode
                  key={suite.id}
                  suite={suite}
                  depth={0}
                  selected={selected?.id ?? null}
                  parentPath=""
                  onSelect={(s, path) => {
                    setSelected(s);
                    setSelectedPath(path);
                  }}
                />
              ))}
          </div>
        </>
      )}
      {selected && (
        <div
          style={{
            marginTop: 18,
            padding: 18,
            background: "#eef2ff",
            borderRadius: 8,
          }}
        >
          <strong>Test Suite selecionada:</strong> {selectedPath} (ID:{" "}
          {selected.id})<h3>Dados adicionais do Test Case</h3>
          <div style={{ display: "grid", gap: 14 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Automation Status *</span>
              <select
                value={automationStatus}
                onChange={(e) => setAutomationStatus(e.target.value)}
              >
                <option value="Manual">Manual</option>
                <option value="Automated">Automated</option>
                <option value="Planned">Planned</option>
              </select>
            </label>

            <label
              htmlFor="testedComponent"
              style={{ display: "grid", gap: 6 }}
            >
              <span>Tested Component *</span>

              <select
                id="testedComponent"
                value={testedComponent}
                onChange={(e) => setTestedComponent(e.target.value)}
                required
              >
                <option value="">Selecionar componente</option>

                {testedComponents.map((component) => (
                  <option key={component} value={component}>
                    {component}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Description</span>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição do caso de teste (opcional)"
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Preconditions</span>
              <textarea
                rows={3}
                value={preconditions}
                onChange={(e) => setPreconditions(e.target.value)}
                placeholder="Pré-condições (opcional)"
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Tested Subcomponent</span>
              <textarea
                rows={2}
                value={testedSubcomponent}
                onChange={(e) => setTestedSubcomponent(e.target.value)}
                placeholder="Subcomponente testado (opcional)"
              />
            </label>
          </div>
          <p style={{ marginTop: 14, color: "#667085", fontSize: 13 }}>
            * Campos obrigatórios para publicação. Nesta fase, os dados ainda
            não são enviados à demonstração DevOps.
          </p>
        </div>
      )}
    </section>
  );
}
