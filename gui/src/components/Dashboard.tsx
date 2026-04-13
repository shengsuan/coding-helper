interface AppCardData {
  id: string;
  name: string;
  icon: string;
  status: 'connected' | 'not-set';
  provider?: string;
  model?: string;
  detail?: string;
}

const apps: AppCardData[] = [
  {
    id: '1',
    name: 'Writing Assistant',
    icon: 'edit_note',
    status: 'connected',
    provider: 'OpenAI',
    model: 'GPT-4 Turbo',
  },
  {
    id: '2',
    name: 'Code Genius',
    icon: 'code',
    status: 'connected',
    provider: 'Anthropic',
    model: 'Claude 3.5',
  },
  {
    id: '3',
    name: 'Pixel Master',
    icon: 'image',
    status: 'not-set',
    provider: 'Pending...',
    detail: 'Inactive',
  },
  {
    id: '4',
    name: 'Linguist AI',
    icon: 'translate',
    status: 'connected',
    provider: 'DeepL',
    detail: '99.9%',
  },
  {
    id: '5',
    name: 'Data Oracle',
    icon: 'insights',
    status: 'connected',
    provider: 'Google Vertex',
    detail: '2.4M/mo',
  },
  {
    id: '6',
    name: 'Agent X',
    icon: 'psychology',
    status: 'connected',
    provider: 'Mistral',
    detail: '$0.04/1k',
  },
  {
    id: '7',
    name: 'Echo Voice',
    icon: 'mic',
    status: 'not-set',
    provider: 'Unassigned',
    detail: 'Global',
  },
  {
    id: '8',
    name: 'Safe Guard',
    icon: 'shield',
    status: 'connected',
    provider: 'Azure AI',
    detail: 'Strict v4',
  },
  {
    id: '9',
    name: 'DocuSummarize',
    icon: 'history_edu',
    status: 'connected',
    provider: 'OpenAI',
    detail: '128k',
  },
  {
    id: '10',
    name: 'GenFlow',
    icon: 'auto_awesome_motion',
    status: 'not-set',
    provider: 'No API Key',
    detail: 'Never',
  },
];

interface DashboardProps {
  onConfigureApp: (appId: string) => void;
}

export default function Dashboard({ onConfigureApp }: DashboardProps) {
  return (
    <div className="p-8">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="font-headline font-extrabold text-3xl text-on-surface tracking-tight">
            Application Fleet
          </h2>
          <p className="text-on-surface-variant mt-2 font-medium">
            Manage and configure your AI-powered microservices.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-surface-container-low p-1 rounded-xl">
            <button className="px-4 py-2 bg-surface-container-lowest rounded-lg shadow-sm text-primary font-bold text-sm flex items-center gap-2 transition-all">
              <span className="material-symbols-outlined text-sm">grid_view</span>
              Grid
            </button>
            <button className="px-4 py-2 text-on-surface-variant font-medium text-sm flex items-center gap-2 hover:bg-surface-container-high rounded-lg transition-all">
              <span className="material-symbols-outlined text-sm">list</span>
              List
            </button>
          </div>
        </div>
      </div>

      {/* Bento Grid of Application Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
        {apps.map((app) => (
          <div
            key={app.id}
            className="group bg-surface-container-lowest p-6 rounded-xl border border-transparent hover:border-primary-container/20 hover:shadow-[0_12px_40px_rgba(19,27,46,0.06)] transition-all duration-300 relative"
          >
            <div className="absolute top-4 right-4">
              <button className="text-outline hover:text-error transition-colors p-1 rounded-lg hover:bg-error-container/20">
                <span className="material-symbols-outlined text-[20px]">delete</span>
              </button>
            </div>

            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform ${
                app.status === 'connected'
                  ? 'bg-primary/10 group-hover:scale-110'
                  : 'bg-surface-container-high'
              }`}
            >
              <span
                className={`material-symbols-outlined ${
                  app.status === 'connected' ? 'text-primary' : 'text-on-surface-variant'
                }`}
              >
                {app.icon}
              </span>
            </div>

            <h3 className="font-headline font-bold text-lg mb-1">{app.name}</h3>

            <div className="flex items-center gap-2 mb-4">
              {app.status === 'connected' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Connected
                  </span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-outline"></span>
                  <span className="text-xs font-semibold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Not Set
                  </span>
                </>
              )}
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center text-sm">
                <span className="text-on-surface-variant">Provider</span>
                <span
                  className={
                    app.status === 'connected'
                      ? 'font-semibold'
                      : 'font-medium text-outline italic'
                  }
                >
                  {app.provider}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-on-surface-variant">
                  {app.model ? 'Model' : app.id === '4' ? 'Uptime' : app.id === '5' ? 'Tokens' : app.id === '6' ? 'Cost' : app.id === '8' ? 'Policy' : app.id === '9' ? 'Context' : app.id === '3' ? 'Endpoint' : app.id === '7' ? 'Region' : 'Last Run'}
                </span>
                <span
                  className={
                    app.status === 'connected' && app.model
                      ? 'font-semibold text-primary'
                      : app.status === 'connected'
                      ? 'font-semibold text-primary'
                      : 'font-medium text-outline italic'
                  }
                >
                  {app.model || app.detail}
                </span>
              </div>
            </div>

            <button
              onClick={() => onConfigureApp(app.id)}
              className={`w-full font-bold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 ${
                app.status === 'connected'
                  ? 'bg-surface-container-low text-primary hover:bg-primary hover:text-white'
                  : 'bg-primary text-white shadow-sm hover:translate-y-[-1px]'
              }`}
            >
              <span className="material-symbols-outlined text-sm">
                {app.status === 'connected' ? 'tune' : 'settings_ethernet'}
              </span>
              Configure
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
