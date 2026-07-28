import { useState } from "react";
import { supabase } from "../supabaseClient";

export function LoginScreen({ onSignupWithInvite }) {
  const [tab, setTab] = useState("signin");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function attempt() {
    setError("");
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: login.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (authError) setError("Invalid email or password.");
  }

  async function redeemCode() {
    setError("");
    setLoading(true);
    const trimmed = code.trim();
    const { data: invite, error: fetchError } = await supabase
      .from("invites")
      .select("*")
      .eq("token", trimmed)
      .eq("used", false)
      .maybeSingle();
    setLoading(false);
    if (fetchError)
      return setError(`Error: ${fetchError.message} (${fetchError.code})`);
    if (!invite)
      return setError(
        "Invalid or already-used invite code. Contact your admin.",
      );
    onSignupWithInvite(invite);
  }

  const iStyle = {
    width: "100%",
    padding: "11px 14px",
    borderRadius: 9,
    border: "1.5px solid #E5E7EB",
    fontSize: 14,
    boxSizing: "border-box",
    outline: "none",
    fontFamily: "inherit",
  };

  const tabs = [
    ["signin", "🔐 Sign In"],
    ["invite", "✉️ Invite Code"],
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #0F172A 0%, #1E3A5F 50%, #0F172A 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420, padding: 16 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "linear-gradient(135deg,#2D6BE4,#7C3AED)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 800,
              color: "#fff",
              letterSpacing: "-0.5px",
              marginBottom: 14,
              boxShadow: "0 8px 32px rgba(45,107,228,0.4)",
            }}
          >
            🏗️
          </div>
          <div
            style={{
              color: "#fff",
              fontWeight: 800,
              fontSize: 22,
              letterSpacing: "-0.5px",
            }}
          >
            Master Scheduler
          </div>
          <div style={{ color: "#94A3B8", fontSize: 13, marginTop: 4 }}>
            Sign in or use your invite code
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: 18,
            padding: "28px 28px 24px",
            boxShadow: "0 24px 64px rgba(0,0,0,0.3)",
          }}
        >
          <div
            style={{
              display: "flex",
              background: "#F3F4F6",
              borderRadius: 10,
              padding: 4,
              marginBottom: 24,
              gap: 4,
            }}
          >
            {tabs.map(([t, label]) => (
              <button
                key={t}
                onClick={() => {
                  setTab(t);
                  setError("");
                }}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: 7,
                  border: "none",
                  background: tab === t ? "#fff" : "transparent",
                  color: tab === t ? "#111827" : "#6B7280",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "signin" && (
            <>
              <div style={{ marginBottom: 14 }}>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#6B7280",
                    display: "block",
                    marginBottom: 5,
                    textTransform: "uppercase",
                    letterSpacing: "0.4px",
                  }}
                >
                  Email
                </label>
                <input
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && attempt()}
                  placeholder="your@email.com"
                  autoFocus
                  style={iStyle}
                  onFocus={(e) => (e.target.style.borderColor = "#2D6BE4")}
                  onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
                />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#6B7280",
                    display: "block",
                    marginBottom: 5,
                    textTransform: "uppercase",
                    letterSpacing: "0.4px",
                  }}
                >
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && attempt()}
                    placeholder="Enter your password"
                    style={{ ...iStyle, paddingRight: 56 }}
                    onFocus={(e) => (e.target.style.borderColor = "#2D6BE4")}
                    onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
                  />
                  <button
                    onClick={() => setShowPw((s) => !s)}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#9CA3AF",
                      padding: 0,
                    }}
                  >
                    {showPw ? "🙈" : "👁"}
                  </button>
                </div>
              </div>
              {error && (
                <div
                  style={{
                    background: "#FEF2F2",
                    border: "1px solid #FECACA",
                    borderRadius: 8,
                    padding: "9px 12px",
                    fontSize: 13,
                    color: "#DC2626",
                    fontWeight: 600,
                    marginBottom: 14,
                  }}
                >
                  ⚠ {error}
                </div>
              )}
              <button
                onClick={attempt}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: 9,
                  background: "linear-gradient(135deg,#2D6BE4,#7C3AED)",
                  color: "#fff",
                  border: "none",
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
              <div
                style={{
                  marginTop: 14,
                  textAlign: "center",
                  fontSize: 12,
                  color: "#9CA3AF",
                }}
              >
                New user?{" "}
                <strong
                  style={{ color: "#0891B2", cursor: "pointer" }}
                  onClick={() => setTab("invite")}
                >
                  Use an invite code ✉️
                </strong>
              </div>
            </>
          )}

          {tab === "invite" && (
            <>
              <div
                style={{
                  background: "#F0FAFF",
                  border: "1px solid #BAE6FD",
                  borderRadius: 10,
                  padding: "12px 14px",
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#0369A1",
                    marginBottom: 4,
                  }}
                >
                  First time here?
                </div>
                <div
                  style={{ fontSize: 12, color: "#0369A1", lineHeight: 1.5 }}
                >
                  Your admin will send you an invite code. Enter it below to
                  create your account and set your own password.
                </div>
              </div>
              <div style={{ marginBottom: 18 }}>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#6B7280",
                    display: "block",
                    marginBottom: 5,
                    textTransform: "uppercase",
                    letterSpacing: "0.4px",
                  }}
                >
                  Invite Code
                </label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && redeemCode()}
                  placeholder="Paste your invite code here"
                  autoFocus
                  style={{
                    ...iStyle,
                    fontFamily: "monospace",
                    fontSize: 13,
                    letterSpacing: "0.5px",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#0891B2")}
                  onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
                />
              </div>
              {error && (
                <div
                  style={{
                    background: "#FEF2F2",
                    border: "1px solid #FECACA",
                    borderRadius: 8,
                    padding: "9px 12px",
                    fontSize: 13,
                    color: "#DC2626",
                    fontWeight: 600,
                    marginBottom: 14,
                  }}
                >
                  ⚠ {error}
                </div>
              )}
              <button
                onClick={redeemCode}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: 9,
                  background: "linear-gradient(135deg,#0891B2,#0369A1)",
                  color: "#fff",
                  border: "none",
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "Checking..." : "Continue to Setup"}
              </button>
              <div
                style={{
                  marginTop: 14,
                  textAlign: "center",
                  fontSize: 12,
                  color: "#9CA3AF",
                }}
              >
                Already set up?{" "}
                <strong
                  style={{ color: "#2D6BE4", cursor: "pointer" }}
                  onClick={() => setTab("signin")}
                >
                  Sign in instead
                </strong>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
