import type { FormEvent } from "react";
import { useState } from "react";

interface AuthScreenProps {
  disabled?: boolean;
  error?: string;
  notice?: string;
  isLoading?: boolean;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
}

export function AuthScreen({ disabled, error, notice, isLoading, onSignIn, onSignUp }: AuthScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const isSubmitDisabled = disabled || isLoading || !email || password.length < 6;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitDisabled) {
      return;
    }

    if (mode === "signup") {
      await onSignUp(email, password);
      return;
    }

    await onSignIn(email, password);
  };

  return (
    <section className="overlay overlay--menu">
      <div className="auth-panel">
        <span className="panel__eyebrow">Cuenta de jugador</span>
        <h1>Adventure Reigns</h1>

        <form className="auth-form" onSubmit={submit}>
          <label className="auth-field">
            <span>Email</span>
            <input
              autoComplete="email"
              disabled={disabled || isLoading}
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              value={email}
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              disabled={disabled || isLoading}
              minLength={6}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </label>

          {error && <p className="auth-error">{error}</p>}
          {notice && <p className="auth-notice">{notice}</p>}

          <div className="auth-actions">
            <button className="button" disabled={isSubmitDisabled} type="submit">
              {isLoading ? "Conectando" : mode === "signin" ? "Entrar" : "Crear cuenta"}
            </button>
            <button
              className="button button--secondary"
              disabled={disabled || isLoading}
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              type="button"
            >
              {mode === "signin" ? "Nueva cuenta" : "Ya tengo cuenta"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
