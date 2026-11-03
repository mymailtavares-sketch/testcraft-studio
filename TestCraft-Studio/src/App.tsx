import PendingTestsPage from "./pages/PendingTestsPage";
import DashboardPage from "./pages/DashboardPage";
import { Fragment, useState } from "react";
import PromptsPage from "./pages/PromptsPage";
import RefinementPage from "./pages/RefinementPage";
import { AppContext } from "./context/AppContext";
import { useAppController } from "./services/useAppController";
import ImportPage from "./pages/ImportPage";
import ReviewPage from "./pages/ReviewPage";
import LibraryPage from "./pages/LibraryPage";


export default function App() {
  const controller = useAppController();
  const [promptPageOpen, setPromptPageOpen] = useState(false);
  const pendingCount=controller.drafts.reduce((total,entry)=>total+entry.cases.length,0);

  const navigate = (screen: typeof controller.screen) => {
    setPromptPageOpen(false);

    controller.setScreen(screen);
  };
  const menu: {
    label: string;
    screen: typeof controller.screen;
    count?: number;
  }[] = [
    { label: "Dashboard", screen: "dashboard" },
    { label: "Importar US", screen: "import" },
    {
      label: "User Storys",
      screen: "library",
      count: controller.drafts.length,
    },
  ];
  return (
    <AppContext.Provider value={controller}>
      <div className="demo-banner" role="note">Demonstração de portfólio · dados fictícios · gravações simuladas · sem ligação a serviços externos</div>
      <div
        style={{
          minHeight: "100vh",
          background: "#f7f8fa",
          color: "#222",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <header
          style={{
            background: "white",
            borderBottom: "1px solid #e5e7eb",
            padding: "16px 28px",
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          <img
            src="/logo.svg"
            alt="TestCraft"
            onError={event=>{event.currentTarget.style.display="none";}}
            style={{ width: 44, height: "auto" }}
          />
          <div>
            <strong style={{ fontSize: 20 }}>TestCraft Studio</strong>
            <div style={{ fontSize: 13, color: "#667085", marginTop: 4 }}>
              Preparação e gestão de casos de teste
            </div>
          </div>
        </header>
        <div
          style={{
            display: "flex",
            alignItems: "stretch",
            minHeight: "calc(100vh - 85px)",
          }}
        >
          <aside
            style={{
              width: 245,
              flexShrink: 0,
              background: "#f0f1f3",
              borderRight: "1px solid #e0e2e6",
              padding: "26px 12px",
            }}
          >
            <div
              style={{ fontSize: 12, color: "#667085", padding: "0 12px 16px" }}
            >
              MENU PRINCIPAL
            </div>
            {menu.map((item) => (
              <Fragment key={item.screen}><button
                key={item.screen}
                type="button"
                onClick={() => navigate(item.screen)}
                aria-describedby={item.screen==="import"&&controller.hasPendingStoryRefresh?"import-refresh-description":undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  width: "100%",
                  gap: 10,
                  marginBottom: 8,
                  padding: "10px 12px",
                  textAlign: "left",
                  background:
                    !promptPageOpen &&
                    (controller.screen === item.screen ||
                      (controller.screen === "review" &&
                        item.screen === "library") || (controller.screen === "refinement" && item.screen === "library") || (controller.screen === "pending" && item.screen === "library"))
                      ? "#818cf8"
                      : "transparent",
                  border: 0,
                  borderRadius: 9,
                  cursor: "pointer",
                  color: "#222",
                  fontWeight:
                    !promptPageOpen && controller.screen === item.screen
                      ? 700
                      : 500,
                }}
              >
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.screen==="import"&&controller.hasPendingStoryRefresh&&<span className="outdated-indicator"><span aria-hidden="true">ⓘ</span><span id="import-refresh-description" role="tooltip" className="outdated-tooltip">Há respostas de refinement. Podes atualizar as US nos respetivos cards; a gravação dos testes continua disponível.</span></span>}
                {item.count !== undefined && (
                  <span style={{ fontSize: 12 }}>({item.count})</span>
                )}
              </button>
              {item.screen==="library"&&<div className="story-subnav" aria-label="User Story">
                <button type="button" aria-current={!promptPageOpen&&controller.screen==="review"?"page":undefined} onClick={()=>navigate("review")}>Casos de teste

                </button>
                {pendingCount>0&&<div className="pending-subnav" role="group" aria-label="Casos de teste" style={{margin:"0 0 8px 16px",paddingLeft:10,borderLeft:"1px solid #d0d5dd"}}>
                  <button type="button" aria-current={!promptPageOpen&&controller.screen==="pending"?"page":undefined} title="Casos de teste com gravação pendente" onClick={()=>navigate("pending")} style={{background:!promptPageOpen&&controller.screen==="pending"?"#818cf8":"#eef2ff",color:"#4338ca",borderRadius:8,fontWeight:600}}>
                    <span aria-hidden="true">ⓘ</span><span style={{flex:1}}>Testes pendentes</span><span>({pendingCount})</span>
                  </button>
                </div>}
                <button type="button" aria-current={!promptPageOpen&&controller.screen==="refinement"?"page":undefined} onClick={()=>navigate("refinement")}>Questões Refinment</button>
              </div>}
              </Fragment>
            ))}
            <button
              type="button"
              onClick={() => { setPromptPageOpen(true); }}
              style={{
                display: "flex",
                alignItems: "center",
                width: "100%",
                marginBottom: 8,
                padding: "10px 12px",
                textAlign: "left",
                background: promptPageOpen ? "#818cf8" : "transparent",
                border: 0,
                borderRadius: 9,
                cursor: "pointer",
                color: "#222",
                fontWeight: promptPageOpen ? 700 : 500,
              }}
            >
              Prompts
            </button>
          </aside>
          <main
            style={{
              flex: 1,
              minWidth: 0,
              padding: "28px clamp(14px, 3vw, 42px)",
              maxWidth: 1450,
            }}
          >
            {promptPageOpen ? (
              <PromptsPage />
            ) : (
              <>
                {controller.screen === "dashboard" && <DashboardPage />}
                {controller.screen === "import" && <ImportPage />}
                {controller.screen === "review" && <ReviewPage />}
                {controller.screen === "pending" && <PendingTestsPage />}
                {controller.screen === "refinement" && <RefinementPage />}
                {controller.screen === "library" && <LibraryPage />}
              </>
            )}
          </main>
        </div>
      </div>
    </AppContext.Provider>
  );
}