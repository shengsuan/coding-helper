const apps = [
  {
    id: '1',
    name: 'Neural-Sync v4',
    appId: 'app_8842_x0',
    icon: 'memory',
    status: 'Optimal',
    tokens: '3.24M',
    latency: '142ms',
    cost: '$648.00',
  },
  {
    id: '2',
    name: 'DataStream Pro',
    appId: 'app_2109_p9',
    icon: 'cloud_queue',
    status: 'Optimal',
    tokens: '2.11M',
    latency: '88ms',
    cost: '$422.00',
  },
  {
    id: '3',
    name: 'Bot-Agent X',
    appId: 'app_7431_k1',
    icon: 'robot_2',
    status: 'Scaling',
    tokens: '1.89M',
    latency: '312ms',
    cost: '$378.00',
  },
  {
    id: '4',
    name: 'Global Web Engine',
    appId: 'app_9901_f2',
    icon: 'language',
    status: 'Optimal',
    tokens: '1.10M',
    latency: '104ms',
    cost: '$220.00',
  },
];

export default function Usage() {
  return (
    <div className="p-10 space-y-10">
      {/* Header Section */}
      <section className="flex justify-between items-end">
        <div>
          <h2 className="font-headline font-extrabold text-4xl text-on-surface tracking-tight">
            Usage Analytics
          </h2>
          <p className="text-on-surface-variant mt-2 text-lg">
            Real-time performance and token metrics across your ecosystem.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-surface-container p-1 rounded-xl">
            <button className="px-4 py-2 text-xs font-bold rounded-lg bg-surface-container-lowest shadow-sm text-primary">
              Monthly
            </button>
            <button className="px-4 py-2 text-xs font-medium text-on-surface-variant hover:text-on-surface transition-colors">
              Quarterly
            </button>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-surface-container-lowest text-on-surface-variant rounded-xl text-sm font-semibold hover:bg-surface-container-high transition-all shadow-sm">
            <span className="material-symbols-outlined text-sm">download</span>
            Export Report
          </button>
        </div>
      </section>

      {/* Usage Charts */}
      <div className="grid grid-cols-12 gap-6">
        {/* Main Bar Chart Card */}
        <div className="col-span-12 lg:col-span-8 bg-surface-container-lowest rounded-xl p-8 shadow-sm">
          <div className="flex justify-between items-start mb-12">
            <div>
              <h3 className="font-headline font-bold text-xl text-on-surface">API Usage Volume</h3>
              <p className="text-on-surface-variant text-sm">
                Requests per app in the current billing cycle
              </p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-primary">12.4M</span>
              <span className="text-xs text-on-surface-variant font-medium">Total Tokens</span>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="flex items-end justify-between h-64 gap-2 px-4">
            {[45, 65, 30, 90, 55, 75, 40, 25, 60, 80].map((height, index) => (
              <div key={index} className="flex flex-col items-center gap-3 w-full group">
                <div
                  className={`w-full bg-primary-container rounded-t-lg transition-all duration-500 group-hover:bg-primary`}
                  style={{ height: `${height}%` }}
                ></div>
                <span className="text-[10px] font-bold text-on-surface-variant opacity-60 group-hover:opacity-100 uppercase">
                  App {String(index + 1).padStart(2, '0')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Snapshot Stats Card */}
        <div className="col-span-12 lg:col-span-4 grid grid-rows-2 gap-6">
          <div className="bg-primary rounded-xl p-6 text-white relative overflow-hidden flex flex-col justify-between shadow-lg shadow-primary/20">
            <div className="z-10">
              <p className="text-primary-fixed text-xs font-bold uppercase tracking-widest mb-1">
                Estimated Cost
              </p>
              <h4 className="text-3xl font-extrabold">$2,408.32</h4>
            </div>
            <div className="z-10 flex items-center gap-2">
              <span className="flex items-center gap-1 text-[10px] font-bold bg-white/20 px-2 py-1 rounded-full">
                <span className="material-symbols-outlined text-[12px]">trending_up</span>
                12% vs last month
              </span>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10">
              <span className="material-symbols-outlined text-[120px]">payments</span>
            </div>
          </div>

          <div className="bg-surface-container-high rounded-xl p-6 flex flex-col justify-between">
            <div>
              <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-1">
                Efficiency Score
              </p>
              <div className="flex items-center gap-3">
                <h4 className="text-3xl font-extrabold text-on-surface">94.2%</h4>
                <div className="w-24 h-2 bg-on-surface/10 rounded-full overflow-hidden">
                  <div className="w-[94%] h-full bg-primary rounded-full"></div>
                </div>
              </div>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              System optimization is performing 4.1% better than the global platform average.
            </p>
          </div>
        </div>
      </div>

      {/* App Usage List */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-headline font-bold text-2xl text-on-surface">
            App Performance Breakdown
          </h3>
          <div className="relative">
            <select className="appearance-none bg-surface-container-lowest border-none pl-4 pr-10 py-2 rounded-xl text-sm font-semibold text-on-surface shadow-sm focus:ring-2 focus:ring-primary/20">
              <option>Sort by: Token Usage</option>
              <option>Sort by: Cost High-Low</option>
              <option>Sort by: Efficiency</option>
            </select>
            <span className="material-symbols-outlined absolute right-3 top-2 text-on-surface-variant pointer-events-none">
              expand_more
            </span>
          </div>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-12 px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest bg-surface-container/30 rounded-t-xl">
          <div className="col-span-4">Application Name</div>
          <div className="col-span-2 text-center">Status</div>
          <div className="col-span-2 text-right">Tokens Used</div>
          <div className="col-span-2 text-right">Avg Latency</div>
          <div className="col-span-2 text-right">Mthly Cost</div>
        </div>

        {/* App Rows */}
        <div className="divide-y divide-outline-variant/10 bg-surface-container-lowest rounded-b-xl shadow-sm border border-outline-variant/5">
          {apps.map((app) => (
            <div
              key={app.id}
              className="grid grid-cols-12 px-6 py-5 items-center hover:bg-surface-container-highest transition-colors group"
            >
              <div className="col-span-4 flex items-center gap-4">
                <div className="w-2 h-2 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity -ml-6"></div>
                <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary">{app.icon}</span>
                </div>
                <div>
                  <p className="font-bold text-on-surface">{app.name}</p>
                  <p className="text-xs text-on-surface-variant">ID: {app.appId}</p>
                </div>
              </div>
              <div className="col-span-2 flex justify-center">
                <span
                  className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                    app.status === 'Optimal'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {app.status}
                </span>
              </div>
              <div className="col-span-2 text-right font-medium text-sm">{app.tokens}</div>
              <div className="col-span-2 text-right font-medium text-sm text-on-surface-variant">
                {app.latency}
              </div>
              <div className="col-span-2 text-right font-extrabold text-sm">{app.cost}</div>
            </div>
          ))}

          <div className="px-6 py-4 text-center">
            <button className="text-xs font-bold text-primary hover:underline uppercase tracking-widest">
              Load All 10 Applications
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
