import { Component, type ErrorInfo, type ReactNode } from "react"
import Icon from "../ui/Icon"

type Props = {
  children: ReactNode
  fallbackTitle?: string
}

type State = {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary caught an error]", error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="error-boundary-card"
          style={{
            padding: "16px",
            margin: "8px",
            borderRadius: "6px",
            background: "rgba(220, 38, 38, 0.08)",
            border: "1px solid rgba(220, 38, 38, 0.25)",
            color: "var(--text-primary, #1e293b)",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
          role="alert"
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600 }}>
            <span style={{ color: "#dc2626" }}>
              <Icon name="warning" size={18} />
            </span>
            <span>{this.props.fallbackTitle || "Ocurrió un error en este componente"}</span>
          </div>
          {this.state.error && (
            <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.85 }}>
              {this.state.error.message}
            </p>
          )}
          <button
            type="button"
            onClick={this.handleRetry}
            style={{
              alignSelf: "flex-start",
              padding: "4px 12px",
              fontSize: "0.8rem",
              borderRadius: "4px",
              border: "1px solid currentColor",
              background: "transparent",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Reintentar
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
