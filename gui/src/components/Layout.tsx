import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: 'dashboard' | 'models' | 'api-keys' | 'usage') => void;
}

export default function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  return (
    <div className="bg-surface font-body text-on-surface antialiased">
      {/* SideNavBar Component */}
      <aside className="h-screen w-64 fixed left-0 top-0 z-50 bg-[#f2f3ff] dark:bg-slate-900 flex flex-col py-6">
        <div className="px-6 mb-10">
          <h1 className="font-headline font-extrabold text-[#131b2e] dark:text-white text-2xl tracking-tight">
            Architect Console
          </h1>
          <p className="text-xs text-on-surface-variant font-medium mt-1">V 2.0.4</p>
        </div>

        <nav className="flex-1 space-y-1">
          <button
            onClick={() => onNavigate('dashboard')}
            className={`w-full flex items-center gap-3 ${
              currentPage === 'dashboard' || currentPage === 'edit'
                ? 'text-[#2E5BFF] dark:text-white font-bold border-l-4 border-[#2E5BFF] pl-4 py-3 bg-[#eaedff] dark:bg-slate-800'
                : 'text-[#434656] dark:text-slate-400 pl-5 py-3 hover:bg-[#eaedff] dark:hover:bg-slate-800'
            } transition-all duration-300 hover:translate-x-1`}
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span className="font-['Inter'] font-medium text-sm">Dashboard</span>
          </button>

          <button
            onClick={() => onNavigate('models')}
            className="w-full flex items-center gap-3 text-[#434656] dark:text-slate-400 pl-5 py-3 hover:bg-[#eaedff] dark:hover:bg-slate-800 transition-all duration-300 hover:translate-x-1"
          >
            <span className="material-symbols-outlined">neurology</span>
            <span className="font-['Inter'] font-medium text-sm">Models</span>
          </button>

          <button className="w-full flex items-center gap-3 text-[#434656] dark:text-slate-400 pl-5 py-3 hover:bg-[#eaedff] dark:hover:bg-slate-800 transition-all duration-300 hover:translate-x-1">
            <span className="material-symbols-outlined">rocket_launch</span>
            <span className="font-['Inter'] font-medium text-sm">Deployments</span>
          </button>

          <button
            onClick={() => onNavigate('api-keys')}
            className={`w-full flex items-center gap-3 ${
              currentPage === 'api-keys'
                ? 'text-[#2E5BFF] dark:text-white font-bold border-l-4 border-[#2E5BFF] pl-4 py-3 bg-[#eaedff] dark:bg-slate-800'
                : 'text-[#434656] dark:text-slate-400 pl-5 py-3 hover:bg-[#eaedff] dark:hover:bg-slate-800'
            } transition-all duration-300 hover:translate-x-1`}
          >
            <span className="material-symbols-outlined">key</span>
            <span className="font-['Inter'] font-medium text-sm">API Keys</span>
          </button>

          <button
            onClick={() => onNavigate('usage')}
            className={`w-full flex items-center gap-3 ${
              currentPage === 'usage'
                ? 'text-[#2E5BFF] dark:text-white font-bold border-l-4 border-[#2E5BFF] pl-4 py-3 bg-[#eaedff] dark:bg-slate-800'
                : 'text-[#434656] dark:text-slate-400 pl-5 py-3 hover:bg-[#eaedff] dark:hover:bg-slate-800'
            } transition-all duration-300 hover:translate-x-1`}
          >
            <span className="material-symbols-outlined">analytics</span>
            <span className="font-['Inter'] font-medium text-sm">Usage</span>
          </button>
        </nav>

        <div className="px-4 mt-auto space-y-6">
          <button className="w-full bg-[linear-gradient(135deg,#0040e0_0%,#2e5bff_100%)] text-white font-bold py-3 px-4 rounded-xl shadow-[0_4px_12px_rgba(0,64,224,0.2)] hover:shadow-[0_4px_16px_rgba(0,64,224,0.4)] transition-all flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-sm">add</span>
            New App
          </button>
          <div className="pt-6 border-t border-outline-variant/10">
            <button className="w-full flex items-center gap-3 text-[#434656] dark:text-slate-400 pl-5 py-3 hover:bg-[#eaedff] dark:hover:bg-slate-800 transition-all duration-300">
              <span className="material-symbols-outlined">help</span>
              <span className="font-['Inter'] font-medium text-sm">Help</span>
            </button>
            <button className="w-full flex items-center gap-3 text-[#434656] dark:text-slate-400 pl-5 py-3 hover:bg-[#eaedff] dark:hover:bg-slate-800 transition-all duration-300">
              <span className="material-symbols-outlined">logout</span>
              <span className="font-['Inter'] font-medium text-sm">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="ml-64 min-h-screen">
        {/* TopNavBar Component */}
        <header className="w-full h-16 sticky top-0 z-40 bg-[#faf8ff] dark:bg-slate-950 flex justify-between items-center px-8">
          <div className="flex items-center gap-8 flex-1">
            <div className="relative w-96">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">
                search
              </span>
              <input
                className="w-full bg-surface-container-low border-none rounded-full py-2 pl-10 pr-4 focus:ring-2 focus:ring-primary text-sm font-medium"
                placeholder="Search applications..."
                type="text"
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <button className="p-2 text-on-surface-variant hover:bg-[#eaedff] rounded-full transition-colors active:scale-[0.98]">
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <button className="p-2 text-on-surface-variant hover:bg-[#eaedff] rounded-full transition-colors active:scale-[0.98]">
                <span className="material-symbols-outlined">settings</span>
              </button>
            </div>
            <div className="h-8 w-[1px] bg-outline-variant/30"></div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-bold text-on-surface leading-tight">Alex Rivera</p>
                <p className="text-[10px] text-on-surface-variant font-medium tracking-wider uppercase">
                  Lead Architect
                </p>
              </div>
              <img
                alt="User profile"
                className="w-10 h-10 rounded-full border-2 border-primary/10"
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop"
              />
            </div>
          </div>
        </header>

        {/* Page Content */}
        {children}
      </main>
    </div>
  );
}
