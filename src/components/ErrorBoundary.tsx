import React from "react";

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#0f0f10",
            color: "#f0f0f0",
            padding: "2rem",
            textAlign: "center",
            gap: "1rem",
          }}
        >
          <span style={{ fontSize: "3rem" }}>💥</span>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 900, color: "#ef4444" }}>
            משהו השתבש
          </h1>
          <p style={{ fontSize: "0.85rem", color: "#888", maxWidth: 320 }}>
            {this.state.error?.message || "שגיאה לא צפויה"}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "1rem",
              padding: "0.6rem 1.5rem",
              borderRadius: "0.75rem",
              background: "#6366f1",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.9rem",
              border: "none",
              cursor: "pointer",
            }}
          >
            רענן דף
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
