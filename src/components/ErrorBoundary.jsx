import React from "react";

// Simple Error Boundary to catch render errors and show a friendly message
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Optional: log to monitoring service
    console.error("ErrorBoundary caught an error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" aria-live="assertive" style={{ padding: "1rem" }}>
          <h2>Something went wrong.</h2>
          <p>Try refreshing the page or navigating to another section.</p>
          {this.props.fallback}
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
