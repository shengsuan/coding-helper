import { useState } from "react";
import { type Translator } from "../i18n";

interface AuthProps {
  t: Translator;
  onLogin: (email: string, password: string) => void;
  onRegister: (name: string, email: string, password: string) => void;
}

export default function Auth({ t, onLogin, onRegister }: AuthProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (mode === "register" && password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }
    try {
      if (mode === "login") onLogin(email, password);
      else onRegister(name, email, password);
    } catch (reason) {
      setError(
        reason instanceof Error && reason.message === "ACCOUNT_EXISTS"
          ? t("accountExists")
          : t("invalidCredentials"),
      );
    }
  };
  const toggle = () => {
    setMode(mode === "login" ? "register" : "login");
    setError("");
  };
  return (
    <main className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="w-full max-w-5xl grid md:grid-cols-2 overflow-hidden bg-surface-container-lowest rounded-3xl shadow-[0_20px_70px_rgba(19,27,46,0.12)]">
        <section className="bg-[linear-gradient(135deg,#0040e0_0%,#2e5bff_100%)] p-10 text-white flex flex-col justify-between min-h-[580px]">
          <div>
            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
              <span className="material-symbols-outlined">terminal</span>
            </div>
            <h1 className="font-headline text-4xl font-extrabold mt-8">
              Coding Helper
            </h1>
            <p className="text-white/80 mt-4 leading-relaxed">
              {t("authDescription")}
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-white/80">
            <span className="material-symbols-outlined">verified_user</span>
            {t("localAccountNote")}
          </div>
        </section>
        <section className="p-10 md:p-12">
          <div className="max-w-sm mx-auto">
            <h2 className="font-headline font-extrabold text-3xl">
              {mode === "login" ? t("signIn") : t("createAccount")}
            </h2>
            <p className="text-on-surface-variant mt-3">
              {mode === "login"
                ? t("signInDescription")
                : t("registerDescription")}
            </p>
            <form onSubmit={submit} className="mt-8 space-y-5">
              {mode === "register" && (
                <Field label={t("displayName")}>
                  <input className="input" required value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder={t("displayName")}
                  />
                </Field>
              )}
              <Field label={t("email")}>
                <input className="input" required type="email" value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                />
              </Field>
              <Field label={t("password")}>
                <input className="input" required minLength={6} type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                />
              </Field>
              {mode === "register" && (
                <Field label={t("confirmPassword")}>
                  <input className="input" required minLength={6} type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="••••••••"
                  />
                </Field>
              )}
              {error && <p className="text-error text-sm">{error}</p>}
              <button type="submit"
                className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:shadow-lg transition-all"
              >
                {mode === "login" ? t("signIn") : t("createAccount")}
              </button>
            </form>
            <p className="mt-7 text-sm text-on-surface-variant">
              {mode === "login" ? t("noAccount") : t("hasAccount")}{" "}
              <button onClick={toggle} type="button"
                className="text-primary font-bold hover:underline"
              >
                {mode === "login" ? t("register") : t("signIn")}
              </button>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-on-surface-variant">
        {label}
      </span>
      {children}
    </label>
  );
}
