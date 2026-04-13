import { useState } from 'react';

interface EditConfigurationProps {
  appId: string | null;
  onBack: () => void;
}

export default function EditConfiguration({ appId, onBack }: EditConfigurationProps) {
  const [provider, setProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('sk-proj-4920k92019xk2019dk201');
  const [model, setModel] = useState('GPT-4o');
  const [showKey, setShowKey] = useState(false);
  console.log('Editing configuration for app:', appId);
  return (
    <div className="p-10 max-w-5xl mx-auto">
      <section className="mb-12 flex items-start gap-8 bg-surface-container-low p-8 rounded-xl">
        <div className="w-24 h-24 bg-surface-container-lowest rounded-xl flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined text-primary text-5xl">edit_note</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={onBack}
              className="mr-2 p-2 hover:bg-surface-container rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h2 className="text-3xl font-headline font-extrabold tracking-tight">
              Writing Assistant
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant text-xs font-bold uppercase tracking-wider">
              Active
            </span>
          </div>
          <p className="text-on-surface-variant max-w-2xl leading-relaxed">
            A specialized module optimized for grammatical precision, stylistic consistency, and
            semantic enrichment of technical documentation and creative prose.
          </p>
          <div className="mt-4 flex gap-4 text-sm font-medium">
            <span className="flex items-center gap-1 text-on-surface-variant">
              <span className="material-symbols-outlined text-sm">update</span> Last synced 2h ago
            </span>
            <span className="flex items-center gap-1 text-on-surface-variant">
              <span className="material-symbols-outlined text-sm">token</span> 1.2M tokens this
              month
            </span>
          </div>
        </div>
      </section>

      {/* Configuration Form Area */}
      <div className="grid grid-cols-12 gap-8">
        {/* Main Form Column */}
        <div className="col-span-8">
          <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_12px_40px_rgba(19,27,46,0.04)]">
            <h3 className="text-xl font-headline font-bold mb-8 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                settings_input_component
              </span>
              Provider Configuration
            </h3>

            <form className="space-y-8">
              {/* 1. Dropdown for Model Provider */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-on-surface-variant ml-1">
                  Model Provider
                </label>
                <div className="relative group">
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="w-full appearance-none bg-surface-container-low border-none rounded-xl px-5 py-4 text-on-surface focus:ring-2 focus:ring-primary transition-all cursor-pointer"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="google">Google Cloud Vertex AI</option>
                    <option value="mistral">Mistral AI</option>
                    <option value="azure">Azure Cognitive Services</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
                    <span className="material-symbols-outlined">expand_more</span>
                  </div>
                </div>
                <p className="text-xs text-on-surface-variant/70 ml-1">
                  Select the underlying infrastructure for your assistant's intelligence.
                </p>
              </div>

              {/* 2. Password-masked input for API Key */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-on-surface-variant ml-1">
                  API Access Key
                </label>
                <div className="relative flex items-center">
                  <input
                    className="w-full bg-surface-container-low border-none rounded-xl px-5 py-4 text-on-surface focus:ring-2 focus:ring-primary transition-all"
                    placeholder="Enter your provider API key"
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <button
                    className="absolute right-4 text-primary font-bold text-sm hover:underline flex items-center gap-1 transition-all hover:-translate-x-0.5"
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showKey ? 'visibility_off' : 'visibility'}
                    </span>
                    {showKey ? 'Hide' : 'Reveal'}
                  </button>
                </div>
                <p className="text-xs text-on-surface-variant/70 ml-1">
                  Sensitive keys are encrypted at rest using AES-256 GCM.
                </p>
              </div>

              {/* 3. Model Selection */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-on-surface-variant ml-1">
                  Model Selection
                </label>
                <div className="relative">
                  <div className="flex items-center bg-surface-container-low rounded-xl px-5 py-4 focus-within:ring-2 focus-within:ring-primary transition-all">
                    <span className="material-symbols-outlined text-on-surface-variant mr-3">
                      search
                    </span>
                    <input
                      className="flex-1 bg-transparent border-none p-0 focus:ring-0 text-on-surface font-medium"
                      placeholder="Search models..."
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                    />
                    <span className="material-symbols-outlined text-on-surface-variant ml-3">
                      unfold_more
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-6 flex items-center justify-between">
                <button
                  className="text-tertiary font-bold px-6 py-3 rounded-xl hover:bg-tertiary/5 transition-colors flex items-center gap-2"
                  type="button"
                >
                  <span className="material-symbols-outlined">delete_forever</span>
                  Uninstall Configuration
                </button>
                <button
                  className="bg-linear-to-br from-primary to-primary-container text-white font-bold px-10 py-3 rounded-xl hover:shadow-[0_4px_20px_rgba(0,64,224,0.4)] transition-all active:scale-[0.98]"
                  type="submit"
                  onClick={(e) => {
                    e.preventDefault();
                    onBack();
                  }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Secondary Info Column */}
        <div className="col-span-4 space-y-8">
          {/* Documentation Bento Card */}
          <div className="bg-surface-container-high p-6 rounded-xl space-y-4">
            <div className="w-12 h-12 bg-surface-container-lowest rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">menu_book</span>
            </div>
            <h4 className="font-headline font-bold text-lg">Configuration Help</h4>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Need help setting up your writing assistant? Read our guide on{' '}
              <a className="text-primary hover:underline" href="#">
                Provider Token Limits
              </a>{' '}
              and{' '}
              <a className="text-primary hover:underline" href="#">
                Model Benchmarks
              </a>
              .
            </p>
          </div>

          {/* Environment Status Card */}
          <div className="bg-surface-container-lowest border border-outline-variant/15 p-6 rounded-xl shadow-sm">
            <h4 className="font-headline font-bold text-md mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              System Health
            </h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-on-surface-variant">Latency</span>
                <span className="text-sm font-medium">142ms</span>
              </div>
              <div className="w-full bg-surface-container-low h-1.5 rounded-full overflow-hidden">
                <div className="bg-primary h-full w-[85%]"></div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-on-surface-variant">Uptime</span>
                <span className="text-sm font-medium">99.98%</span>
              </div>
            </div>
          </div>

          {/* Model Capability Card */}
          <div className="relative h-48 rounded-xl overflow-hidden bg-surface-container-highest group">
            <div className="absolute inset-0 bg-linear-to-br from-primary/20 to-primary-container/20"></div>
            <div className="absolute inset-0 flex flex-col justify-end p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">
                Architecture
              </p>
              <p className="text-on-surface font-bold">Transformer Engine v4</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
