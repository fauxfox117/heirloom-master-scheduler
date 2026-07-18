import { useState } from "react";

export function QuickAssign({ members, jobs, onAssign }) {
  const [mid, setMid] = useState(members[0]?.id || "");
  const [jid, setJid] = useState(jobs[0]?.id || "");

  const iStyle = {
    padding: "8px 10px",
    borderRadius: 8,
    border: "1.5px solid #E5E7EB",
    fontSize: 13,
    background: "#fff",
    width: "100%",
    boxSizing: "border-box",
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <select
          value={mid}
          onChange={(e) => setMid(e.target.value)}
          style={{ ...iStyle, flex: 1 }}
        >
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <select
          value={jid}
          onChange={(e) => setJid(e.target.value)}
          style={{ ...iStyle, flex: 2 }}
        >
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.name}
            </option>
          ))}
        </select>
      </div>
      <button
        onClick={() => {
          if (mid && jid) onAssign(mid, jid);
        }}
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
        + Assign
      </button>
    </div>
  );
}
