export default function PrdAiAppConfiguratorDoc() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <article className="mx-auto max-w-4xl rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-3xl font-extrabold tracking-tight">AI App Configurator - Product Requirements Document</h1>
        <div className="prose prose-slate mt-6 max-w-none">
          <h2>1. Overview</h2>
          <p>
            A desktop utility app designed to centralize the configuration of multiple AI-powered applications.
            Users can manage model providers, API keys, and specific model selections across approximately 10 different apps.
          </p>
          <h2>2. Key Features</h2>
          <ul>
            <li>App Dashboard: Grid or list view of all supported apps and their configuration status.</li>
            <li>Visual Status Tracking: Clearly shows which provider is linked to each app.</li>
            <li>Easy Configuration: Sidebar or modal to edit provider, API key, and model.</li>
            <li>Model Selection: Curated model list filtered by selected provider.</li>
            <li>Uninstall or Remove: Decouple a configuration from an app.</li>
          </ul>
          <h2>3. Proposed Screens</h2>
          <ol>
            <li>Main Dashboard with app cards and connection status.</li>
            <li>App Detail/Edit Sidebar for provider, key, and model settings.</li>
            <li>Provider Management screen for global key operations and usage.</li>
            <li>Onboarding/Empty State for first-time setup.</li>
          </ol>
          <h2>4. Visual Style</h2>
          <ul>
            <li>Minimalist and functional layout.</li>
            <li>Clear hierarchy between connected and non-configured states.</li>
            <li>Card-based layout for the 10 apps.</li>
          </ul>
        </div>
      </article>
    </main>
  );
}
