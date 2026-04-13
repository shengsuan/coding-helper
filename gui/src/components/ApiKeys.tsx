const providers = [
  {
    id: '1',
    name: 'OpenAI',
    models: 'GPT-4, DALL-E 3',
    status: 'active',
    key: 'sk-••••••••••••w49a',
    apps: 42,
  },
  {
    id: '2',
    name: 'Anthropic',
    models: 'Claude 3.5 Sonnet',
    status: 'active',
    key: 'ant-••••••••••••f982',
    apps: 18,
  },
  {
    id: '3',
    name: 'Cohere',
    models: 'Command R+, Embed',
    status: 'quota',
    key: 'coh-••••••••••••x311',
    apps: 5,
  },
  {
    id: '4',
    name: 'Azure AI',
    models: 'Enterprise Gateway',
    status: 'active',
    key: 'msf-••••••••••••v110',
    apps: 63,
  },
];

export default function ApiKeys() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
        <div className="space-y-2">
          <h2 className="text-4xl font-headline font-extrabold tracking-tight text-on-background">
            API Credentials
          </h2>
          <p className="text-on-surface-variant max-w-lg leading-relaxed">
            Manage authentication across your infrastructure. These keys provide programmatic access
            to your AI models and deployments.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary-container text-on-secondary-container font-semibold text-sm hover:brightness-95 transition-all">
            <span className="material-symbols-outlined text-lg">download</span>
            Export Audit Log
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[linear-gradient(135deg,#0040e0_0%,#2e5bff_100%)] text-white font-bold text-sm shadow-lg shadow-primary/20 hover:translate-y-[-2px] transition-all">
            <span className="material-symbols-outlined text-lg">add</span>
            Add Provider
          </button>
        </div>
      </div>

      {/* Bento Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/10">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <span className="material-symbols-outlined">hub</span>
            </div>
            <span className="text-xs font-bold text-primary px-2 py-1 bg-primary/5 rounded-full">
              +12% vs LW
            </span>
          </div>
          <p className="text-sm font-medium text-on-surface-variant">Active Providers</p>
          <p className="text-3xl font-headline font-extrabold mt-1">14</p>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/10">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-tertiary/10 rounded-lg text-tertiary">
              <span className="material-symbols-outlined">api</span>
            </div>
            <span className="text-xs font-bold text-on-surface-variant px-2 py-1 bg-surface-container rounded-full">
              3 Expiring
            </span>
          </div>
          <p className="text-sm font-medium text-on-surface-variant">Total Connected Apps</p>
          <p className="text-3xl font-headline font-extrabold mt-1">128</p>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/10">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-secondary/10 rounded-lg text-secondary">
              <span className="material-symbols-outlined">key_visualizer</span>
            </div>
            <span className="text-xs font-bold text-on-surface-variant px-2 py-1 bg-surface-container rounded-full">
              Last 24h
            </span>
          </div>
          <p className="text-sm font-medium text-on-surface-variant">Security Requests</p>
          <p className="text-3xl font-headline font-extrabold mt-1">4.2M</p>
        </div>
      </div>

      {/* Providers Management Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/10 overflow-hidden">
        <div className="px-8 py-6 flex items-center justify-between border-b border-outline-variant/5">
          <h3 className="text-lg font-headline font-bold text-[#131b2e]">Configured Providers</h3>
          <div className="flex items-center gap-2">
            <button className="p-2 text-on-surface-variant hover:bg-surface-container transition-colors rounded-lg">
              <span className="material-symbols-outlined">filter_list</span>
            </button>
            <button className="p-2 text-on-surface-variant hover:bg-surface-container transition-colors rounded-lg">
              <span className="material-symbols-outlined">more_vert</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/30">
                <th className="px-8 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-8 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  Status
                </th>
                <th className="px-8 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  Masked Key
                </th>
                <th className="px-8 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider text-center">
                  Connected Apps
                </th>
                <th className="px-8 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {providers.map((provider) => (
                <tr
                  key={provider.id}
                  className="group hover:bg-surface-container-highest/30 transition-colors"
                >
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center">
                        <span className="text-sm font-bold">{provider.name.slice(0, 2)}</span>
                      </div>
                      <div>
                        <p className="font-bold text-on-surface">{provider.name}</p>
                        <p className="text-xs text-on-surface-variant">{provider.models}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    {provider.status === 'active' ? (
                      <div className="flex items-center gap-2 text-emerald-600 font-semibold text-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Active
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-tertiary font-semibold text-xs">
                        <span className="w-2 h-2 rounded-full bg-tertiary"></span>
                        Quota Reached
                      </div>
                    )}
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <code className="bg-surface-container text-xs px-2 py-1 rounded font-mono text-on-surface-variant">
                        {provider.key}
                      </code>
                      <button className="text-outline hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-sm">content_copy</span>
                      </button>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-fixed text-on-primary-fixed-variant text-xs font-bold">
                      {provider.apps}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="px-3 py-1.5 rounded-lg text-xs font-bold text-primary hover:bg-primary/5 transition-all">
                        Edit Key
                      </button>
                      <button className="px-3 py-1.5 rounded-lg text-xs font-bold text-tertiary hover:bg-tertiary/5 transition-all">
                        Revoke
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-8 py-4 bg-surface-container-low/20 flex items-center justify-between border-t border-outline-variant/5">
          <p className="text-xs text-on-surface-variant font-medium">Showing 4 of 14 providers</p>
          <div className="flex items-center gap-1">
            <button
              className="p-2 text-on-surface-variant hover:bg-surface-container rounded-lg disabled:opacity-30"
              disabled
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <button className="px-3 py-1 text-xs font-bold bg-primary text-white rounded-md">
              1
            </button>
            <button className="px-3 py-1 text-xs font-bold text-on-surface-variant hover:bg-surface-container rounded-md">
              2
            </button>
            <button className="px-3 py-1 text-xs font-bold text-on-surface-variant hover:bg-surface-container rounded-md">
              3
            </button>
            <button className="p-2 text-on-surface-variant hover:bg-surface-container rounded-lg">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mt-10 p-6 rounded-xl bg-[rgba(242,243,255,0.8)] backdrop-blur-[20px] border border-primary/10 flex items-start gap-4">
        <div className="p-3 bg-primary-fixed rounded-xl text-primary">
          <span className="material-symbols-outlined">security</span>
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-on-surface">Secure Key Management Protocol</h4>
          <p className="text-sm text-on-surface-variant leading-relaxed mt-1">
            All keys are encrypted at rest using AES-256. For your security, we only display the
            last 4 characters of each key. Ensure you rotate your credentials every 90 days as per
            enterprise compliance guidelines.
          </p>
        </div>
        <button className="text-primary font-bold text-sm hover:underline">
          Learn more about security
        </button>
      </div>
    </div>
  );
}
