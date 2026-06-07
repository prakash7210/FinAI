import { Loader2, LogIn, UserPlus } from "lucide-react";
import { useState } from "react";
import API from "../api/api";
import "./AuthScreen.css";

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  const submit = async (event) => {
    event.preventDefault();
    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const res = await API.post(`/auth/${mode}`, {
        name: isRegister ? name : undefined,
        email,
        password,
      });
      onAuthenticated(res.data);
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not authenticate.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-screen">
      <form className="auth-panel" onSubmit={submit}>
        <div className="auth-mark">FA</div>
        <h1>FinAI</h1>
        <p>Your private financial research assistant, with saved chats and secure sessions.</p>

        {isRegister && (
          <label>
            Name
            <input
              value={name}
              autoComplete="name"
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
            />
          </label>
        )}

        <label>
          Email
          <input
            value={email}
            type="email"
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />
        </label>

        <label>
          Password
          <input
            value={password}
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 6 characters"
            required
          />
        </label>

        {error && <div className="auth-error">{error}</div>}

        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? <Loader2 className="spin" size={18} /> : isRegister ? <UserPlus size={18} /> : <LogIn size={18} />}
          {isRegister ? "Create account" : "Sign in"}
        </button>

        <button
          className="auth-switch"
          type="button"
          onClick={() => {
            setMode(isRegister ? "login" : "register");
            setError("");
          }}
        >
          {isRegister ? "Already have an account? Sign in" : "New here? Create an account"}
        </button>
      </form>
    </main>
  );
}

export default AuthScreen;
