import { ReactNode } from "react";
import { type Page } from "../App";
import { type User } from "../auth";
import { type Language, type Translator } from "../i18n";

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  language: Language;
  t: Translator;
  user: User | null;
  onNavigate: (page: Page) => void;
  onLanguageChange: (language: Language) => void;
  onLogout: () => void;
}

export default function Layout({
  children,
  currentPage,
  language,
  t,
  user,
  onNavigate,
  onLanguageChange,
  onLogout,
}: LayoutProps) {
  const navClass = (page: Page) => `w-full flex items-center gap-3 ${currentPage === page || (page === "dashboard" && currentPage === "edit") ? "text-[#2E5BFF] dark:text-white font-bold border-l-4 border-[#2E5BFF] pl-4 py-3 bg-[#eaedff] dark:bg-slate-800" : "text-[#434656] dark:text-slate-400 pl-5 py-3 hover:bg-[#eaedff] dark:hover:bg-slate-800"} transition-all duration-300 hover:translate-x-1`;
  const initials = user?.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="bg-surface font-body text-on-surface antialiased">
      <aside className="h-screen w-64 fixed left-0 top-0 z-50 bg-[#f2f3ff] dark:bg-slate-900 flex flex-col py-6">
        <div className="px-6 mb-10">
          <h1 className="font-headline font-extrabold text-[#131b2e] dark:text-white text-2xl tracking-tight">
            Coding Helper
          </h1>
          <p className="text-xs text-on-surface-variant font-medium mt-1">
            {t("desktopConfiguration")}
          </p>
        </div>
        <nav className="flex-1 space-y-1">
          <Nav icon="dashboard" label={t("dashboard")} page="dashboard" className={navClass("dashboard")} onNavigate={onNavigate}/>
          {/* <Nav icon="neurology" label={t("models")} page="models" className={navClass("models")} onNavigate={onNavigate}/> */}
          <Nav icon="rocket_launch" label={t("tools")} page="tools" className={navClass("tools")} onNavigate={onNavigate}/>
          <Nav icon="key" label={t("apiKeys")} page="api-keys" className={navClass("api-keys")} onNavigate={onNavigate}/>
        </nav>
        <div className="px-4 mt-auto space-y-5">

          <div className="pt-5 border-t border-outline-variant/10">
            <select value={language} onChange={(event) =>
                onLanguageChange(event.target.value as Language)
              }
              className="w-full bg-surface-container-low rounded-lg px-3 py-2 text-sm"
            >
              <option value="zh_CN">中文</option>
              <option value="en_US">English</option>
            </select>
          </div>
          <button onClick={onLogout}
            className="w-full flex items-center gap-3 text-[#434656] dark:text-slate-400 px-3 py-2 hover:bg-[#eaedff] rounded-lg"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="text-sm font-medium">{t("signOut")}</span>
          </button>
        </div>
      </aside>
      <main className="ml-64 min-h-screen">
        <header className="w-full h-16 sticky top-0 z-40 bg-[#faf8ff] dark:bg-slate-950 flex justify-between items-center px-8">
          <div className="relative w-96">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">
              search
            </span>
            <input placeholder={t("search")} type="text"
              className="w-full bg-surface-container-low border-none rounded-full py-2 pl-10 pr-4 focus:ring-2 focus:ring-primary text-sm font-medium"
            />
          </div>
          <div className="flex items-center gap-5">
            <button className="p-2 text-on-surface-variant hover:bg-[#eaedff] rounded-full">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="p-2 text-on-surface-variant hover:bg-[#eaedff] rounded-full">
              <span className="material-symbols-outlined">settings</span>
            </button>
            <div className="h-8 w-px bg-outline-variant/30" />
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-bold leading-tight">{user?.name}</p>
                <p className="text-[10px] text-on-surface-variant font-medium">
                  {user?.email}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary text-white font-bold flex items-center justify-center border-2 border-primary/10">
                {initials}
              </div>
            </div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

function Nav({ icon, label, page, className, onNavigate }: {
  icon: string; label: string; page: Page; className: string; onNavigate: (page: Page) => void;
}) {
  return (
    <button onClick={() => onNavigate(page)} className={className}>
      <span className="material-symbols-outlined">{icon}</span>
      <span className="font-['Inter'] font-medium text-sm">{label}</span>
    </button>
  );
}
