"use client";

import React, { Component } from "react";
import { AlertTriangle } from "lucide-react";
import { WIDGET_REGISTRY } from "@/lib/widgets/registry";
import type { WidgetId } from "@/lib/widgets/types";

interface Props {
  widgetId: WidgetId;
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class WidgetErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(
      `[WidgetErrorBoundary] Widget "${this.props.widgetId}" crashed:`,
      error,
      info.componentStack
    );
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const meta = WIDGET_REGISTRY[this.props.widgetId];
      const label = meta?.label ?? this.props.widgetId;

      return (
        <div className="flex flex-col items-center justify-center gap-2 px-4 py-6 text-center h-full min-h-30">
          <AlertTriangle className="w-6 h-6 text-destructive/70" />
          <p className="text-xs text-destructive/80 font-medium">
            {label} failed to load
          </p>
          <p className="text-[10px] text-muted-foreground max-w-50 leading-relaxed">
            {this.state.error?.message ?? "An unexpected error occurred."}
          </p>
          <button
            onClick={this.handleRetry}
            className="mt-1 text-[10px] px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors border border-white/5"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}