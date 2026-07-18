import { useState } from "react";
import { ModalWrap } from "./ModalWrap";

export function InviteModal({
  invites,
  onCreateInvite,
  onRevokeInvite,
  onClose,
}) {
  const [role, setRole] = useState("viewer");
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(null);
  const [error, setError] = useState("");

  function isValidEmail(e) {
    return !e || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  }

  function create() {
    setError("");
    if (email && !isValidEmail(email))
      return setError("Enter a valid email or leave blank.");
    onCreateInvite({ role, email: email.trim().toLowerCase() });
    setEmail("");
    setRole("viewer");
  }

  function copyCode(token) {
    const msg =
      `Your Master Scheduler invite code:\n\n${token}\n\n` +
      `Go to the app, click "Invite Code" on the login screen, paste this code, and create your account.`;
    navigator.clipboard.writeText(msg).then(() => {
      setCopied(token);
      setTimeout(() => setCopied(null), 2500);
    });
  }

  const active = invites.filter((i) => !i.used);
  const used = invites.filter((i) => i.used);

  const inputStyle = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 7,
    border: "1.5px solid #E5E7EB",
    fontSize: 13,
    background: "#fff",
    boxSizing: "border-box",
  };

  return (
    <ModalWrap onClose={onClose}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 18,
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 17 }}>✉️ Invite Users</div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 20,
            color: "#9CA3AF",
          }}
        >
          ✕
        </button>
      </div>

      <div
        style={{
          background: "#F8FAFF",
          border: "1.5px solid #C7D7FA",
          borderRadius: 12,
          padding: "16px",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 13,
            color: "#2D6BE4",
            marginBottom: 12,
          }}
        >
          Generate Invite Code
        </div>
        <div style={{ marginBottom: 10 }}>
          <label
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#6B7280",
              display: "block",
              marginBottom: 4,
            }}
          >
            Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={inputStyle}
          >
            <option value="viewer">👁 Viewer — read only</option>
            <option value="admin">🔑 Admin — full access</option>
          </select>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#6B7280",
              display: "block",
              marginBottom: 4,
            }}
          >
            Pre-fill Email (optional)
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="recipient@company.com"
            style={inputStyle}
          />
          <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 3 }}>
            If provided, the signup form will pre-fill this email.
          </div>
        </div>
        {error && (
          <div
            style={{
              color: "#DC2626",
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 10,
            }}
          >
            ⚠ {error}
          </div>
        )}
        <button
          onClick={create}
          style={{
            width: "100%",
            padding: "9px",
            borderRadius: 8,
            background: "#2D6BE4",
            color: "#fff",
            border: "none",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Generate Code
        </button>
      </div>

      {active.length > 0 && (
        <>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#6B7280",
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: "0.4px",
            }}
          >
            Active Invite Codes
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginBottom: 16,
            }}
          >
            {active.map((inv) => (
              <div
                key={inv.token}
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E5E7EB",
                  borderRadius: 10,
                  padding: "10px 12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 7px",
                      borderRadius: 5,
                      background: inv.role === "admin" ? "#EEF3FF" : "#F3F4F6",
                      color: inv.role === "admin" ? "#2D6BE4" : "#6B7280",
                    }}
                  >
                    {inv.role === "admin" ? "🔑 Admin" : "👁 Viewer"}
                  </span>
                  {inv.email && (
                    <span style={{ fontSize: 11, color: "#6B7280" }}>
                      &rarr; {inv.email}
                    </span>
                  )}
                  <div style={{ flex: 1 }} />
                  <span style={{ fontSize: 10, color: "#9CA3AF" }}>
                    {new Date(
                      inv.created_at || inv.createdAt,
                    ).toLocaleDateString()}
                  </span>
                </div>
                <div
                  style={{
                    background: "#fff",
                    border: "1.5px solid #E5E7EB",
                    borderRadius: 8,
                    padding: "10px 14px",
                    marginBottom: 8,
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: "#9CA3AF",
                      fontWeight: 600,
                      marginBottom: 4,
                      textTransform: "uppercase",
                      letterSpacing: "0.4px",
                    }}
                  >
                    Invite Code
                  </div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      letterSpacing: "3px",
                      color: "#111827",
                      fontFamily: "monospace",
                    }}
                  >
                    {inv.token}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => copyCode(inv.token)}
                    style={{
                      flex: 1,
                      padding: "7px 12px",
                      borderRadius: 6,
                      border: "none",
                      background: copied === inv.token ? "#065F46" : "#2D6BE4",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {copied === inv.token
                      ? "✓ Copied"
                      : "📋 Copy invite message"}
                  </button>
                  <button
                    onClick={() => onRevokeInvite(inv.token)}
                    style={{
                      padding: "7px 12px",
                      borderRadius: 6,
                      border: "none",
                      background: "#FEF2F2",
                      color: "#DC2626",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {used.length > 0 && (
        <>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#9CA3AF",
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: "0.4px",
            }}
          >
            Used Codes
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {used.map((inv) => (
              <div
                key={inv.token}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  background: "#F9FAFB",
                  borderRadius: 8,
                  border: "1px solid #F3F4F6",
                }}
              >
                <span style={{ fontSize: 10, color: "#9CA3AF" }}>
                  {inv.role === "admin" ? "🔑" : "👁"} {inv.role}
                </span>
                {inv.email && (
                  <span style={{ fontSize: 10, color: "#9CA3AF" }}>
                    &rarr; {inv.email}
                  </span>
                )}
                <div style={{ flex: 1 }} />
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#065F46",
                    background: "#ECFDF5",
                    padding: "1px 6px",
                    borderRadius: 4,
                  }}
                >
                  ✓ Used
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {active.length === 0 && used.length === 0 && (
        <div
          style={{
            textAlign: "center",
            color: "#9CA3AF",
            fontSize: 13,
            padding: "16px 0",
          }}
        >
          No invite codes yet. Generate one above.
        </div>
      )}

      <div
        style={{
          marginTop: 16,
          padding: "10px 14px",
          background: "#FFFBEB",
          borderRadius: 9,
          border: "1px solid #FDE68A",
          fontSize: 11,
          color: "#92400E",
        }}
      >
        <strong>📋 How it works:</strong> Click "Copy invite message" to copy a
        ready-to-send message with the code. They open the app, click{" "}
        <strong>✉️ Invite Code</strong> on the login screen, paste the code, and
        set up their own account. Each code works once only.
      </div>
    </ModalWrap>
  );
}
