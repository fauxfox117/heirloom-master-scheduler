import { useState } from "react";
import { ModalWrap } from "./ModalWrap";

export function UserManagementModal({
  users,
  currentUser,
  onUpdate,
  onAdd,
  onDelete,
  onClose,
}) {
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");

  function isValidEmail(e) {
    return !e || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  }

  async function saveEdit(u) {
    if (!u.name.trim() || !u.username.trim())
      return setError("Name and username are required.");
    if (!isValidEmail(u.email))
      return setError("Please enter a valid email address.");
    onUpdate({
      ...u,
      username: u.username.trim().toLowerCase(),
      email: u.email ? u.email.trim().toLowerCase() : "",
    });
    setEditing(null);
    setError("");
  }

  const iStyle = {
    width: "100%",
    padding: "7px 10px",
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
        <div style={{ fontWeight: 800, fontSize: 17 }}>User Management</div>
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

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginBottom: 14,
          maxHeight: 380,
          overflowY: "auto",
        }}
      >
        {users.map((u) => {
          const isMe = u.id === currentUser.id;
          const isEditingThis = editing?.id === u.id;
          return (
            <div
              key={u.id}
              style={{
                borderRadius: 10,
                border: `1.5px solid ${isEditingThis ? "#2D6BE4" : "#E5E7EB"}`,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  background: isEditingThis ? "#EEF3FF" : "#F8FAFC",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background:
                      u.role === "admin"
                        ? "linear-gradient(135deg,#2D6BE4,#7C3AED)"
                        : "#E5E7EB",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    color: u.role === "admin" ? "#fff" : "#6B7280",
                    fontSize: 12,
                    flexShrink: 0,
                  }}
                >
                  {u.name.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>
                    {u.name}{" "}
                    {isMe && (
                      <span
                        style={{
                          fontSize: 10,
                          color: "#2D6BE4",
                          fontWeight: 600,
                        }}
                      >
                        (you)
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "#9CA3AF" }}>
                    @{u.username}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 7px",
                    borderRadius: 5,
                    background: u.role === "admin" ? "#EEF3FF" : "#F3F4F6",
                    color: u.role === "admin" ? "#2D6BE4" : "#6B7280",
                  }}
                >
                  {u.role === "admin" ? "Admin" : "Viewer"}
                </span>
                <button
                  onClick={() => {
                    setEditing(isEditingThis ? null : { ...u });
                    setError("");
                  }}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    border: "1px solid #E5E7EB",
                    background: isEditingThis ? "#2D6BE4" : "#fff",
                    color: isEditingThis ? "#fff" : "#374151",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {isEditingThis ? "Cancel" : "Edit"}
                </button>
                {!isMe && (
                  <button
                    onClick={() => {
                      if (window.confirm(`Remove ${u.name}?`)) {
                        onDelete(u.id);
                        setEditing(null);
                      }
                    }}
                    style={{
                      padding: "4px 8px",
                      borderRadius: 6,
                      border: "none",
                      background: "#FEF2F2",
                      color: "#DC2626",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    &times;
                  </button>
                )}
              </div>

              {isEditingThis && (
                <div
                  style={{
                    padding: "12px 14px",
                    background: "#fff",
                    borderTop: "1px solid #E5E7EB",
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#6B7280",
                          marginBottom: 4,
                        }}
                      >
                        Display Name
                      </div>
                      <input
                        value={editing.name}
                        onChange={(e) =>
                          setEditing((ed) => ({ ...ed, name: e.target.value }))
                        }
                        style={iStyle}
                      />
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#6B7280",
                          marginBottom: 4,
                        }}
                      >
                        Username
                      </div>
                      <input
                        value={editing.username}
                        onChange={(e) =>
                          setEditing((ed) => ({
                            ...ed,
                            username: e.target.value,
                          }))
                        }
                        style={iStyle}
                      />
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#6B7280",
                          marginBottom: 4,
                        }}
                      >
                        Email Address
                      </div>
                      <input
                        type="email"
                        value={editing.email || ""}
                        onChange={(e) =>
                          setEditing((ed) => ({ ...ed, email: e.target.value }))
                        }
                        placeholder="user@company.com"
                        style={iStyle}
                      />
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#6B7280",
                          marginBottom: 4,
                        }}
                      >
                        Role
                      </div>
                      <select
                        value={editing.role}
                        onChange={(e) =>
                          setEditing((ed) => ({ ...ed, role: e.target.value }))
                        }
                        style={iStyle}
                        disabled={isMe}
                      >
                        <option value="viewer">Viewer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>
                  {isMe && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "#9CA3AF",
                        marginBottom: 8,
                      }}
                    >
                      You cannot change your own role.
                    </div>
                  )}
                  <button
                    onClick={() => saveEdit(editing)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: 8,
                      background: "#2D6BE4",
                      color: "#fff",
                      border: "none",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div
        style={{
          padding: "10px 14px",
          background: "#F0FAFF",
          borderRadius: 9,
          border: "1px solid #BAE6FD",
          fontSize: 12,
          color: "#0369A1",
          marginBottom: 8,
        }}
      >
        To add new users, close this panel and use the{" "}
        <strong>Invite Users</strong> button.
      </div>

      <div
        style={{
          marginTop: 14,
          padding: "10px 14px",
          background: "#FFFBEB",
          borderRadius: 9,
          border: "1px solid #FDE68A",
          fontSize: 11,
          color: "#92400E",
        }}
      >
        <strong>Admin</strong> — full edit access. &nbsp;
        <strong>Viewer</strong> — read-only.
      </div>
    </ModalWrap>
  );
}
