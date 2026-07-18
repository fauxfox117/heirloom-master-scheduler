export function ModalWrap({ children, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.38)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 300,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "24px 28px",
          width: "100%",
          maxWidth: 480,
          boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function LabelField({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "#6B7280",
          display: "block",
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
