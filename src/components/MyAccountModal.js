import { useState } from "react";
import { supabase } from "../supabaseClient";
import { ModalWrap } from "./ModalWrap";

export function MyAccountModal({ user, allUsers, onSave, onClose }) {
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email || "");
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confPw, setConfPw] = useState("");
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function isValidEmail(e) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  }

  async function save() {
    setError("");
    setSuccess("");
    if (!name.trim()) return setError("Display name cannot be empty.");
    if (!username.trim()) return setError("Username cannot be empty.");
    if (email.trim() && !isValidEmail(email.trim()))
      return setError("Please enter a valid email address.");

    if (curPw || newPw || confPw) {
      if (newPw.length < 6)
        return setError("New password must be at least 6 characters.");
      if (newPw !== confPw) return setError("New passwords do not match.");
      const { error: verifyErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: curPw,
      });
      if (verifyErr) return setError("Current password is incorrect.");
      const { error: pwErr } = await supabase.auth.updateUser({
        password: newPw,
      });
      if (pwErr) return setError(pwErr.message);
    }

    const { error: profileErr } = await supabase
      .from("profiles")
      .update({
        name: name.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
      })
      .eq("id", user.id);
    if (profileErr) return setError(profileErr.message);

    onSave({
      ...user,
      name: name.trim(),
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
    });
    setSuccess("Account updated successfully.");
    setCurPw("");
    setNewPw("");
    setConfPw("");
  }

  const iStyle = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 8,
    border: "1.5px solid #E5E7EB",
    fontSize: 14,
    background: "#fff",
    boxSizing: "border-box",
    outline: "none",
    fontFamily: "inherit",
  };

  const pwWrap = { position: "relative" };

  const eyeBtn = {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 600,
    color: "#9CA3AF",
    padding: 0,
  };

  const sectionLabel = {
    fontSize: 12,
    fontWeight: 700,
    color: "#6B7280",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: "0.4px",
  };

  const fieldLabel = {
    fontSize: 12,
    fontWeight: 600,
    color: "#6B7280",
    display: "block",
    marginBottom: 5,
  };

  return (
    <ModalWrap onClose={onClose}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 17 }}>My Account</div>
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
          &times;
        </button>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 14px",
          background: user.role === "admin" ? "#EEF3FF" : "#F3F4F6",
          borderRadius: 9,
          marginBottom: 20,
          border: `1px solid ${user.role === "admin" ? "#C7D7FA" : "#E5E7EB"}`,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 9,
            background:
              user.role === "admin"
                ? "linear-gradient(135deg,#2D6BE4,#7C3AED)"
                : "#E5E7EB",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            color: user.role === "admin" ? "#fff" : "#6B7280",
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          {user.name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{user.name}</div>
          <div
            style={{
              fontSize: 11,
              color: user.role === "admin" ? "#2D6BE4" : "#6B7280",
              fontWeight: 600,
            }}
          >
            {user.role === "admin" ? "Admin" : "Viewer"}
          </div>
        </div>
      </div>

      <div style={sectionLabel}>Profile</div>

      <div style={{ marginBottom: 12 }}>
        <label style={fieldLabel}>Display Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={iStyle}
          onFocus={(e) => (e.target.style.borderColor = "#2D6BE4")}
          onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={fieldLabel}>Username</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={iStyle}
          onFocus={(e) => (e.target.style.borderColor = "#2D6BE4")}
          onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
        />
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={fieldLabel}>Email Address</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          style={iStyle}
          onFocus={(e) => (e.target.style.borderColor = "#2D6BE4")}
          onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
        />
        <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 4 }}>
          Used to sign in.
        </div>
      </div>

      <div style={sectionLabel}>
        Change Password{" "}
        <span
          style={{ fontWeight: 400, textTransform: "none", color: "#9CA3AF" }}
        >
          (leave blank to keep current)
        </span>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={fieldLabel}>Current Password</label>
        <div style={pwWrap}>
          <input
            type={showCur ? "text" : "password"}
            value={curPw}
            onChange={(e) => setCurPw(e.target.value)}
            placeholder="Enter current password"
            style={{ ...iStyle, paddingRight: 50 }}
            onFocus={(e) => (e.target.style.borderColor = "#2D6BE4")}
            onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
          />
          <button style={eyeBtn} onClick={() => setShowCur((s) => !s)}>
            {showCur ? "Hide" : "Show"}
          </button>
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={fieldLabel}>New Password</label>
        <div style={pwWrap}>
          <input
            type={showNew ? "text" : "password"}
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            placeholder="Min. 6 characters"
            style={{ ...iStyle, paddingRight: 50 }}
            onFocus={(e) => (e.target.style.borderColor = "#2D6BE4")}
            onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
          />
          <button style={eyeBtn} onClick={() => setShowNew((s) => !s)}>
            {showNew ? "Hide" : "Show"}
          </button>
        </div>
      </div>
      <div style={{ marginBottom: 18 }}>
        <label style={fieldLabel}>Confirm New Password</label>
        <input
          type="password"
          value={confPw}
          onChange={(e) => setConfPw(e.target.value)}
          placeholder="Repeat new password"
          style={iStyle}
          onFocus={(e) => (e.target.style.borderColor = "#2D6BE4")}
          onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
        />
      </div>

      {error && (
        <div
          style={{
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 12,
            color: "#DC2626",
            fontWeight: 600,
            marginBottom: 14,
          }}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          style={{
            background: "#ECFDF5",
            border: "1px solid #6EE7B7",
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 12,
            color: "#065F46",
            fontWeight: 600,
            marginBottom: 14,
          }}
        >
          {success}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onClose}
          style={{
            flex: 1,
            padding: "9px",
            borderRadius: 9,
            border: "1.5px solid #E5E7EB",
            background: "#fff",
            fontSize: 14,
            cursor: "pointer",
            fontWeight: 600,
            color: "#6B7280",
          }}
        >
          Cancel
        </button>
        <button
          onClick={save}
          style={{
            flex: 1,
            padding: "9px",
            borderRadius: 9,
            border: "none",
            background: "#2D6BE4",
            color: "#fff",
            fontSize: 14,
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Save Changes
        </button>
      </div>
    </ModalWrap>
  );
}
