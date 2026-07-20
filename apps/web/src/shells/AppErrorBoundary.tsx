import { Component, type ErrorInfo, type ReactNode } from "react";
import { AppCrashFallback } from "./AppCrashFallback.js";

type Props = { children: ReactNode };
type State = { error: Error | null };

/** Root boundary — catches render throws outside the route tree (e.g. TransportProvider). */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error("AppErrorBoundary", error, info.componentStack);
    }
  }

  render(): ReactNode {
    if (this.state.error) {
      return <AppCrashFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
