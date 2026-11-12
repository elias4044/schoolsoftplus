'use client';

import React, { Component } from 'react';

import { WIDGET_REGISTRY } from '@/lib/widgets/registry';
import type { WidgetId } from '@/lib/widgets/types';

import { WidgetNotice } from './WidgetContent';

interface Props {
  widgetId: WidgetId;
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class WidgetErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(
      `[WidgetErrorBoundary] Widget "${this.props.widgetId}" crashed:`,
      error,
      info.componentStack
    );
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      const meta = WIDGET_REGISTRY[this.props.widgetId];
      const label = meta?.label ?? this.props.widgetId;

      return (
        <WidgetNotice action="Try again" onAction={this.handleRetry}>
          {label} failed to load.
        </WidgetNotice>
      );
    }

    return this.props.children;
  }
}
