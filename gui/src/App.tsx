import { useCallback, useEffect, useMemo, useState } from "react";
import Config from "./components/Config";
import Layout from "./components/Layout";
import Dashboard from "./components/Dashboard";
import GlobalApiKeys from "./components/ApiKeys";
import Tools from "./components/Tools";
import SearchResults from "./components/SearchResults";
// import Auth from "./components/Auth";
import { getSession, login, logout, register, type User } from "./auth";
import { core, type Overview } from "./core";
import { translate, type Language } from "./i18n";

export type Page =| "dashboard"| "models"| "api-keys"| "usage"| "edit"| "tools"| "search";

function App() {
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [overview, setOverview] = useState<Overview>({ plans: [], tools: [], language: "zh_CN" });
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchScope, setSearchScope] = useState<"all" | "tools" | "plans">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [diagnostics, setDiagnostics] = useState("");
  const [user, setUser] = useState<User | null>(() => getSession());
  const language: Language = overview.language === "en_US" ? "en_US" : "zh_CN";
  const t = useMemo(() =>(key: Parameters<typeof translate>[1], params?: Record<string, string>) =>
        translate(language, key, params),
    [language],
  );
  const reportError = useCallback((reason: unknown) => {
    setError(reason instanceof Error ? reason.message : String(reason));
    core.binaryPath().then(setDiagnostics).catch(() => setDiagnostics(""));
  }, []);
  const refresh = useCallback(async () => {
    try {
      setError("");
      setDiagnostics("");
      setLoading(true);
      setOverview(await core.overview());
    } catch (reason) {
      reportError(reason);
    } finally {
      setLoading(false);
    }
  }, [reportError]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const changeLanguage = async (nextLanguage: Language) => {
    try {
      await core.setLanguage(nextLanguage);
      setOverview((current) => ({ ...current, language: nextLanguage }));
    } catch (reason) {
      reportError(reason);
    }
  };
  // if (!user)
  //   return (
  //     <Auth t={t}
  //       onLogin={(email, password) => setUser(login(email, password))}
  //       onRegister={(name, email, password) =>
  //         setUser(register(name, email, password))
  //       }
  //     />
  //   );
  const configureTool = (toolName: string) => {
    setSelectedTool(toolName);
    setSelectedPlan(undefined);
    setCurrentPage("edit");
  };
  const configurePlan = (planId: string) => {
    setSelectedTool(null);
    setSelectedPlan(planId);
    setCurrentPage("edit");
  };
  const revokePlan = async (planId: string) => {
    try {
      await core.revokePlan(planId);
      await refresh();
    } catch (reason) {
      reportError(reason);
    }
  };
  const addPlan = async (label: string, baseUrl: string, model: string) => {
    try {
      await core.addPlan(label, baseUrl, model || undefined);
      await refresh();
    } catch (reason) {
      reportError(reason);
    }
  };
  const deletePlan = async (planId: string) => {
    try {
      await core.deletePlan(planId);
      await refresh();
    } catch (reason) {
      reportError(reason);
    }
  };
  const selected = overview.tools.find((tool) => tool.name === selectedTool) || null;
  const page = currentPage === "dashboard" ? (
      <Dashboard tools={overview.tools} plans={overview.plans} loading={loading} t={t}
        filter={searchQuery}
        onConfigureTool={configureTool}
        onConfigurePlan={configurePlan}
        onNavigateTools={() => setCurrentPage("tools")}
        onChanged={() => void refresh()}
      />
    ) : currentPage === "tools" ? (
      <Tools tools={overview.tools} plans={overview.plans} t={t} filter={searchQuery} onChanged={() => void refresh()}
        onConfigure={configureTool}
      />
    ) : currentPage === "api-keys" || currentPage === "models" ? (
      <GlobalApiKeys plans={overview.plans} t={t} filter={searchQuery} onEdit={configurePlan} onRevoke={(planId) => void revokePlan(planId)}
        onAdd={addPlan} onDelete={(planId) => void deletePlan(planId)}
      />
    ) : currentPage === "search" ? (
      <SearchResults query={searchQuery} scope={searchScope}
        tools={overview.tools} plans={overview.plans} t={t}
        onConfigureTool={configureTool}
        onConfigurePlan={configurePlan}
        onNavigateTools={() => setCurrentPage("tools")}
        onNavigateApiKeys={() => setCurrentPage("api-keys")}
        onChanged={() => void refresh()}
      />
    ) : (
      <Config tool={selected} plans={overview.plans} initialPlanId={selectedPlan} t={t}
        onBack={() => setCurrentPage(selectedTool ? "tools" : "api-keys")}
        onSaved={() => void refresh()}
      />
    );
  return (
    <Layout currentPage={currentPage} language={language} t={t} user={user} onNavigate={setCurrentPage}
      onLanguageChange={(nextLanguage) => void changeLanguage(nextLanguage)}
      onLogout={() => {logout();setUser(null);}}
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      onSearchSubmit={() => {
        if (!searchQuery.trim()) return;
        setSearchScope(
          currentPage === "tools"
            ? "tools"
            : currentPage === "api-keys" || currentPage === "models"
              ? "plans"
              : "all",
        );
        setCurrentPage("search");
      }}
      onSearchClear={() => setSearchQuery("")}
    >
      {error && (
        <div className="mx-8 mt-6 p-4 bg-error-container text-error rounded-lg">
          <p>{error}</p>
          {diagnostics && (
            <p className="mt-2 text-xs font-mono opacity-70">CLI: {diagnostics}</p>
          )}
        </div>
      )}
      {page}
    </Layout>
  );
}

export default App;
