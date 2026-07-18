import { useState } from "react";
import { supabase } from "../supabaseClient";

export function SignupScreen({ invite, onSignup, onBackToLogin }) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState(invite.email || "");
  const [pw, setPw] = useState("");
  const [confPw, setConfPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");

  function isValidEmail(e) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  }

  async function submit() {
    setError("");
    if (!name.trim()) return setError("Please enter your full name.");
    if (!username.trim()) return setError("Please choose a username.");
    if (!email.trim() || !isValidEmail(email))
      return setError("Please enter a valid email address.");
    if (pw.length < 6)
      return setError("Password must be at least 6 characters.");
    if (pw !== confPw) return setError("Passwords do not match.");

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: pw,
    });
    if (signUpError) return setError(signUpError.message);

    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user.id,
      name: name.trim(),
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      role: invite.role,
    });
    if (profileError) return setError(profileError.message);

    await supabase
      .from("invites")
      .update({ used: true })
      .eq("token", invite.token);

    onSignup();
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

  const roleBadge = {
    background: invite.role === "admin" ? "#EEF3FF" : "#F3F4F6",
    border: `1px solid ${invite.role === "admin" ? "#C7D7FA" : "#E5E7EB"}`,
    color: invite.role === "admin" ? "#2D6BE4" : "#374151",
  };

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
      <div style={{ width: "100%", maxWidth: 440, padding: 16 }}>
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
              fontSize: 18,
              fontWeight: 800,
              color: "#fff",
              letterSpacing: "-0.5px",
              marginBottom: 14,
              boxShadow: "0 8px 32px rgba(45,107,228,0.4)",
            }}
          >
            MS
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
            You've been invited — create your account
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: 18,
            padding: "28px 28px",
            boxShadow: "0 24px 64px rgba(0,0,0,0.3)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              borderRadius: 10,
              padding: "10px 14px",
              marginBottom: 22,
              ...roleBadge,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background:
                  invite.role === "admin"
                    ? "linear-gradient(135deg,#2D6BE4,#7C3AED)"
                    : "#E5E7EB",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 800,
                color: invite.role === "admin" ? "#fff" : "#6B7280",
                flexShrink: 0,
              }}
            >
              {invite.role === "admin" ? "A" : "V"}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>
                Invited as {invite.role === "admin" ? "Admin" : "Viewer"}
              </div>
              <div style={{ fontSize: 11, color: "#9CA3AF" }}>
                Role assigned by your admin
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#6B7280",
                  display: "block",
                  marginBottom: 5,
                }}
              >
                FULL NAME
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Smith"
                style={iStyle}
                onFocus={(e) => (e.target.style.borderColor = "#2D6BE4")}
                onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
                autoFocus
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#6B7280",
                  display: "block",
                  marginBottom: 5,
                }}
              >
                USERNAME
              </label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. jsmith"
                style={iStyle}
                onFocus={(e) => (e.target.style.borderColor = "#2D6BE4")}
                onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
              />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#6B7280",
                display: "block",
                marginBottom: 5,
              }}
            >
              EMAIL ADDRESS
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              style={iStyle}
              onFocus={(e) => (e.target.style.borderColor = "#2D6BE4")}
              onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#6B7280",
                display: "block",
                marginBottom: 5,
              }}
            >
              PASSWORD
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPw ? "text" : "password"}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Min. 6 characters"
                style={{ ...iStyle, paddingRight: 56 }}
                onFocus={(e) => (e.target.style.borderColor = "#2D6BE4")}
                onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
                onKeyDown={(e) => e.key === "Enter" && submit()}
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
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#6B7280",
                display: "block",
                marginBottom: 5,
              }}
            >
              CONFIRM PASSWORD
            </label>
            <input
              type="password"
              value={confPw}
              onChange={(e) => setConfPw(e.target.value)}
              placeholder="Re-enter password"
              style={iStyle}
              onFocus={(e) => (e.target.style.borderColor = "#2D6BE4")}
              onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
              onKeyDown={(e) => e.key === "Enter" && submit()}
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
              {error}
            </div>
          )}

          <button
            onClick={submit}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 9,
              background: "linear-gradient(135deg,#2D6BE4,#7C3AED)",
              color: "#fff",
              border: "none",
              fontWeight: 800,
              fontSize: 15,
              cursor: "pointer",
              letterSpacing: "-0.2px",
            }}
          >
            Create Account
          </button>

          <button
            onClick={onBackToLogin}
            style={{
              width: "100%",
              marginTop: 10,
              padding: "10px",
              borderRadius: 9,
              background: "none",
              border: "none",
              color: "#9CA3AF",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Already have an account? Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
