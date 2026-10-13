import React from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  declare props: Props;
  declare state: State;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FFFDF9] flex items-center justify-center p-6 text-[#14213d]">
          <div className="max-w-md w-full bg-white rounded-3xl border border-[#eadfd3] p-8 text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7" />
            </div>

            <h1 className="text-xl sm:text-2xl font-bold font-serif text-[#14213d]">
              {this.props.fallbackTitle || "Something went wrong"}
            </h1>

            <p className="text-xs sm:text-sm text-[#5b6478] leading-relaxed">
              {this.props.fallbackMessage ||
                "An unexpected issue occurred while rendering this page. You can refresh the page or return home."}
            </p>

            {this.state.error && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs font-mono text-slate-700 overflow-x-auto max-h-32">
                {this.state.error.message}
              </div>
            )}

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#14284b] hover:bg-[#1f3763] text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload page</span>
              </button>

              <a
                href="/"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-[#eadfd3] hover:bg-slate-50 text-[#14213d] text-xs font-semibold transition-colors"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Go to Home</span>
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
