import { useState } from "react";
import { useAppContext } from "../context/AppContext";

const actionStyle: React.CSSProperties = {
  background: "#4338ca",
  color: "#222",
  border: 0,
  fontWeight: 700,
  cursor: "pointer",
};
const subtleStyle: React.CSSProperties = {
  background: "#f2f3f5",
  color: "#222",
  border: "1px solid #d8dce1",
  cursor: "pointer",
};

function formatAcceptanceCriteria(raw: string) {
  const text = raw
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p\s*>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\b(Given|When|Then)\b/gi, "\n$1:")
    .replace(/(Given|When|Then):\s*:/gi, "$1:")
    .trim();
  return text.split(/\n+/).map((line, i) => {
    const match = line.trim().match(/^(Given|When|Then):?\s*(.*)$/i);
    return (
      <div key={i} style={{ marginBottom: 9, lineHeight: 1.65 }}>
        {match ? (
          <>
            <strong style={{ display: "inline-block", minWidth: 58 }}>
              {match[1]}
            </strong>
            {match[2]}
          </>
        ) : (
          line
        )}
      </div>
    );
  });
}

export default function LibraryPage() {
  const c = useAppContext();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [ids, setIds] = useState<Record<number, string>>({});
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<
    "criteria" | "questions" | "cases"
  >("questions");
  const [editingQuestion, setEditingQuestion] = useState<number | null>(null);
  const [questionText, setQuestionText] = useState("");
  const visible = c.drafts;
  const selected = c.drafts.find((d) => d.story.id === selectedId) ?? null;

  function removeStory(storyId: number) {
try {
      c.deleteDraft(storyId);
      if (selectedId === storyId) setSelectedId(null);
      setMessage(`US #${storyId} apagada da biblioteca.`);
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Não foi possível apagar a US.",
      );
    }
  }

  function saveEditedQuestion(storyId: number, index: number) {
    if (!questionText.trim()) {
      setMessage(
        "A questão não pode ficar vazia. Utiliza Apagar para a remover.",
      );
      return;
    }
    c.updateDraftQuestion(storyId, index, questionText.trim());
    setEditingQuestion(null);
    setQuestionText("");
    setMessage("");
  }

  function removeQuestion(storyId: number, index: number) {
    c.deleteDraftQuestion(storyId, index);
    setEditingQuestion(null);
    setQuestionText("");
  }

  function publish(storyId: number) {
    const item = c.drafts.find((d) => d.story.id === storyId);
    if (!item) return;
    if (item.status !== "Refinada") {
      setMessage("Primeiro marca a US como Refinada.");
      return;
    }
    if (item.questions.some((q) => !q.notApplicable && !q.answer.trim())) {
      setMessage("Responde a todas as questões antes de publicar.");
      return;
    }
    const nums = (ids[storyId] || "")
      .split(/[\s,;]+/)
      .filter(Boolean)
      .map(Number);
    if (
      nums.length !== item.cases.length ||
      nums.some((n) => !Number.isSafeInteger(n) || n <= 0) ||
      new Set(nums).size !== nums.length
    ) {
      setMessage(
        `Introduz exatamente ${item.cases.length} IDs numéricos distintos, pela ordem dos casos de teste.`,
      );
      return;
    }
try {
      c.confirmPublication(storyId, nums);
      setSelectedId(null);
      setMessage(`US #${storyId} arquivada. IDs guardados no histórico.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erro ao guardar.");
    }
  }

  return (
    <div className="user-stories-page">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ margin: "0 0 6px" }}>User Storys</h1>
          <p style={{ color: "#667085", marginTop: 0 }}>
            Retoma o trabalho, acompanha o refinement e prepara os casos de teste.
          </p>
        </div>
        <button className="app-action"
          type="button"
          style={actionStyle}
          onClick={() => c.setScreen("import")}
        >
          + Importar nova US
        </button>
      </div>
      <p style={{ color: "#667085", fontSize: 12 }}>
        Os dados estão guardados neste navegador.
      </p>
      {message && (
        <p
          role="status"
          style={{ padding: 12, background: "#eef2ff", borderRadius: 8 }}
        >
          {message}
        </p>
      )}
      <div className="us-list-heading"><h2>As tuas User Storys</h2><span>{visible.length} {visible.length===1?"US guardada":"US guardadas"}</span></div>
      {visible.length === 0 ? (
        <section className="panel">
          <p>Ainda não existem User Stories na biblioteca.</p>
        </section>
      ) : (
        <div className="us-cards-grid" aria-label="User Storys guardadas">
          {visible.map(entry=>{
            const reviewed=entry.cases.filter(tc=>tc.reviewStatus==="reviewed").length;
            const total=entry.cases.length;
            const openDetails=()=>{setSelectedId(entry.story.id);setActiveTab("questions");setEditingQuestion(null);setMessage("");};
            return <article key={entry.story.id} className={`us-card${selectedId===entry.story.id?" is-active":""}`}>
              <div className="us-card-top">
                <span className="us-card-id">US #{entry.story.id}</span>
                <span className="us-card-status" data-refined={entry.status==="Refinada"}>{entry.status==="Refinada"?"Refinement concluído":"Por refinar"}</span>
                <button type="button" className="us-card-action us-card-delete" aria-label={`Apagar US #${entry.story.id}`} title="Apagar US guardada" onClick={()=>removeStory(entry.story.id)}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7M14 10v7"/></svg>
                </button>
              </div>
              {c.needsStoryRefresh(entry)&&<button type="button" className="story-refresh-tag" title="Obter os dados mais recentes desta US na demonstração" disabled={c.loading||c.refreshingStoryId!==null} aria-busy={c.refreshingStoryId===entry.story.id} onClick={()=>{void c.refreshStory(entry.story.id);}}><span aria-hidden="true">⚠</span> {c.refreshingStoryId===entry.story.id?"A atualizar…":"Atualizar US"}</button>}
              {c.storyRefreshFeedback?.storyId===entry.story.id&&<>{c.storyRefreshFeedback.error?<p role="alert" className="story-refresh-error">{c.storyRefreshFeedback.message}</p>:<output className="story-refresh-success">{c.storyRefreshFeedback.message}</output>}</>}
              <h3 className="us-card-title"><button type="button" className="us-card-action us-card-title-button" onClick={openDetails}>{entry.story.title}</button></h3>
              <div className="us-card-metrics">
                <div><strong>{total}</strong><span>{total===1?"caso de teste":"casos de teste"}</span></div>
                <div><strong>{entry.questions.length}</strong><span>{entry.questions.length===1?"questão de refinement":"questões de refinement"}</span></div>
              </div>
              <div className="us-card-progress">
                <div><span>Revisão dos testes</span><strong>{reviewed} de {total}</strong></div>
                <progress max={Math.max(1,total)} value={reviewed} aria-label={`Casos revistos da US #${entry.story.id}`}/>
                {total===0&&<span className="us-card-empty-hint">Continua para preparar os primeiros casos.</span>}
              </div>
              <div className="us-card-actions">
                <button type="button" className="us-card-action us-card-continue" onClick={()=>c.openDraft(entry.story.id)}>Continuar trabalho <span aria-hidden="true">→</span></button>
                <button type="button" className="us-card-action us-card-details" aria-expanded={selectedId===entry.story.id} onClick={openDetails}>Ver detalhes</button>
              </div>
            </article>;
          })}
        </div>
      )}
      {selected && (
        <section
          style={{
            background: "#fff",
            padding: 22,
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            marginTop: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "start",
            }}
          >
            <div>
              <h2 style={{ marginTop: 0 }}>US #{selected.story.id}</h2>
              <h3 style={{ fontWeight: 500 }}>{selected.story.title}</h3>
            </div>
            <button
              type="button"
              style={subtleStyle}
              onClick={() => setSelectedId(null)}
              aria-label="Fechar detalhes"
            >
              ✕ Fechar
            </button>
          </div>
          <button className="app-action" type="button" style={actionStyle} onClick={()=>c.openRefinement(selected.story.id)}>Abrir questões de refinement</button>
          <p>
            {selected.cases.length} Test Cases · {selected.questions.length}{" "}
            questões ·{" "}
            <strong>
              {selected.status === "Refinada"
                ? "Refinement feito"
                : "Por fazer"}
            </strong>
          </p>
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginBottom: 22,
            }}
          >
            <button className="app-action"
              type="button"
              style={subtleStyle}
              onClick={() =>
                c.changeDraftStatus(
                  selected.story.id,
                  selected.status === "Por refinar"
                    ? "Refinada"
                    : "Por refinar",
                )
              }
            >
              {selected.status === "Por refinar"
                ? "✓ Marcar Refinement feito"
                : "↶ Reabrir Refinement"}
            </button>
          </div>
          <div
            role="tablist"
            aria-label="Detalhes da User Story"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              borderBottom: "1px solid #e5e7eb",
              paddingBottom: 12,
              marginBottom: 18,
            }}
          >
            {(
              [
                ["criteria", "Critérios de Aceitação"],
                ["questions", "Questões"],
              ] as const
            ).map(([tab, label]) => (
              <button className="app-action"
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => {
                  setActiveTab(tab);
                  setEditingQuestion(null);
                }}
                style={activeTab === tab ? actionStyle : subtleStyle}
              >
                {label}
              </button>
            ))}
          </div>
          {activeTab === "criteria" && (
            <section role="tabpanel">
              <h3>Critérios de Aceitação</h3>
              {(() => {
                // Compatibilidade com diferentes formatos devolvidos pelo backend da demonstração DevOps.
                const story = selected.story as unknown as Record<
                  string,
                  unknown
                >;
                const raw =
                  story.acceptanceCriteria ??
                  story.acceptance_criteria ??
                  story.criteria;
                if (typeof raw === "string" && raw.trim())
                  return <div>{formatAcceptanceCriteria(raw)}</div>;
                if (Array.isArray(raw) && raw.length > 0)
                  return (
                    <ol>
                      {raw.map((item, i) => (
                        <li key={i} style={{ marginBottom: 8 }}>
                          {formatAcceptanceCriteria(
                            typeof item === "string"
                              ? item
                              : JSON.stringify(item),
                          )}
                        </li>
                      ))}
                    </ol>
                  );
                return (
                  <p className="note">
                    Não foram encontrados critérios de aceitação nos dados
                    importados desta US.
                  </p>
                );
              })()}
            </section>
          )}
          {activeTab === "questions" && (
            <section role="tabpanel">
              <h3>Questões ({selected.questions.length})</h3>
              {selected.questions.length === 0 ? (
                <p>Sem questões pendentes.</p>
              ) : (
                selected.questions.map((q, i) => (
                  <div
                    key={`${selected.story.id}-${i}`}
                    style={{
                      marginBottom: 18,
                      padding: 14,
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                    }}
                  >
                    {editingQuestion === i ? (
                      <>
                        <label
                          htmlFor={`edit-q-${selected.story.id}-${i}`}
                          style={{
                            display: "block",
                            fontWeight: 600,
                            marginBottom: 6,
                          }}
                        >
                          Editar questão {i + 1}
                        </label>
                        <textarea
                          id={`edit-q-${selected.story.id}-${i}`}
                          value={questionText}
                          rows={3}
                          onChange={(e) => setQuestionText(e.target.value)}
                          style={{
                            width: "100%",
                            boxSizing: "border-box",
                            padding: 10,
                            borderRadius: 8,
                            border: "1px solid #ccd0d5",
                          }}
                        />
                        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                          <button className="app-action"
                            type="button"
                            style={actionStyle}
                            onClick={() =>
                              saveEditedQuestion(selected.story.id, i)
                            }
                          >
                            Guardar
                          </button>
                          <button className="app-action"
                            type="button"
                            style={subtleStyle}
                            onClick={() => setEditingQuestion(null)}
                          >
                            Cancelar
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p style={{ fontWeight: 600 }}>
                          {i + 1}. {q.text}
                        </p>
                        <div
                          style={{ display: "flex", gap: 8, marginBottom: 12 }}
                        >
                          <button className="app-action"
                            type="button"
                            style={subtleStyle}
                            onClick={() => {
                              setEditingQuestion(i);
                              setQuestionText(q.text);
                            }}
                          >
                            Editar
                          </button>
                          <button className="app-action"
                            type="button"
                            style={subtleStyle}
                            onClick={() => removeQuestion(selected.story.id, i)}
                          >
                            🗑 Apagar
                          </button>
                        </div>
                      </>
                    )}
                    <label
                      htmlFor={`q-${selected.story.id}-${i}`}
                      style={{ display: "block", marginBottom: 6 }}
                    >
                      Resposta
                    </label>
                    <textarea
                      id={`q-${selected.story.id}-${i}`}
                      rows={2}
                      value={q.answer}
                      onChange={(e) =>
                        c.answerDraftQuestion(
                          selected.story.id,
                          i,
                          e.target.value,
                        )
                      }
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        border: "1px solid #ccd0d5",
                        borderRadius: 8,
                        padding: 10,
                      }}
                    />
                  </div>
                ))
              )}
            </section>
          )}
          <div
            style={{
              borderTop: "1px solid #eee",
              marginTop: 22,
              paddingTop: 16,
            }}
          >
            <h3>Publicação na demonstração Test Plans</h3>
            <p style={{ fontSize: 13, color: "#667085" }}>
              Este bloco regista manualmente IDs já existentes no histórico local. Para criar e gravar nas suites, abre os casos em «Continuar trabalho».
            </p>
            <ol>
              {selected.cases.map((tc) => (
                <li key={tc.localId} style={{ marginBottom: 6 }}>
                  {tc.title}
                </li>
              ))}
            </ol>
            <label
              htmlFor={`ids-${selected.story.id}`}
              style={{ display: "block", marginBottom: 8 }}
            >
              IDs dos Test Cases (separados por vírgula)
            </label>
            <input
              id={`ids-${selected.story.id}`}
              placeholder="Ex.: 12345, 12346, 12347"
              value={ids[selected.story.id] || ""}
              onChange={(e) =>
                setIds((prev) => ({
                  ...prev,
                  [selected.story.id]: e.target.value,
                }))
              }
              style={{
                display: "block",
                width: "100%",
                boxSizing: "border-box",
                padding: 11,
                border: "1px solid #ccd0d5",
                borderRadius: 8,
                marginBottom: 12,
              }}
            />
            <button className="app-action"
              type="button"
              style={actionStyle}
              onClick={() => publish(selected.story.id)}
            >
              Confirmar publicação e arquivar US
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
