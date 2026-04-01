import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log to console only — no external service
    console.error("[ErrorBoundary]", error, info?.componentStack?.slice(0, 300));
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "linear-gradient(160deg, #0a0a14 0%, #0d0b1a 100%)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "32px", gap: "16px",
          }}
          onClick={() => window.location.reload()}
        >
          <div style={{ fontSize: 52 }}>🐱</div>
          <p style={{
            color: "rgba(255,255,255,0.9)", fontWeight: 700,
            fontSize: 20, textAlign: "center", margin: 0,
          }}>
            Something went wrong
          </p>
          <p style={{
            color: "rgba(255,255,255,0.45)", fontSize: 14,
            textAlign: "center", margin: 0, lineHeight: 1.5,
          }}>
            Tap anywhere to reload the app
          </p>
          <div
            style={{
              marginTop: 8, padding: "10px 24px", borderRadius: 999,
              background: "linear-gradient(135deg, #8B5CF6, #EC4899)",
              color: "white", fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}
          >
            Reload
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
