import { useEffect, useState } from "react";
import API, { setAuthToken } from "./api/api";
import AuthScreen from "./components/AuthScreen";
import Home from "./pages/Home";
import "./App.css";

function SplashScreen() {
  return (
    <div className="splash-screen" data-splash="true" data-theme="light" data-wallpaper="clean" >
      <div className="splash-logo">finai</div>
      <div className="splash-copy">
        <strong>FinAI</strong>
      </div>
    </div>
  );
}

function App() {
  const [session, setSession] = useState(() => {
    const token = localStorage.getItem("finweb_token");
    const user = JSON.parse(localStorage.getItem("finweb_user") || "null");
    if (token) setAuthToken(token);
    return token && user ? { token, user } : null;
  });
  const [checking, setChecking] = useState(Boolean(session));
  const [splash, setSplash] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setSplash(false), 950);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!session?.token) return;

    let ignore = false;
    API.get("/auth/me")
      .then((res) => {
        if (!ignore) {
          const next = { token: session.token, user: res.data.user };
          localStorage.setItem("finweb_user", JSON.stringify(next.user));
          setSession(next);
        }
      })
      .catch(() => {
        localStorage.removeItem("finweb_token");
        localStorage.removeItem("finweb_user");
        setAuthToken(null);
        if (!ignore) setSession(null);
      })
      .finally(() => {
        if (!ignore) setChecking(false);
      });

    return () => {
      ignore = true;
    };
  }, [session?.token]);

  const handleAuthenticated = ({ token, user }) => {
    localStorage.setItem("finweb_token", token);
    localStorage.setItem("finweb_user", JSON.stringify(user));
    setAuthToken(token);
    setSession({ token, user });
  };

  const handleLogout = async () => {
    try {
      await API.post("/auth/logout");
    } catch {
      // Local logout still clears the UI if the session is already gone.
    }
    localStorage.removeItem("finweb_token");
    localStorage.removeItem("finweb_user");
    setAuthToken(null);
    setSession(null);
  };

  if (splash || checking) {
    return <SplashScreen />;
  }

  return session ? (
    <Home user={session.user} onLogout={handleLogout} />
  ) : (
    <AuthScreen onAuthenticated={handleAuthenticated} />
  );
}

export default App;
