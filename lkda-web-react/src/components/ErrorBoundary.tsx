import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
          <div className="mb-4 rounded-full bg-red-500/15 p-4">
            <AlertTriangle size={32} className="text-red-400" />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-slate-title">
            页面出现了一些问题
          </h2>
          <p className="mb-1 max-w-sm text-sm text-slate-body">
            抱歉，当前页面发生异常。您可以点击下方按钮重试，或返回首页。
          </p>
          {this.state.error && (
            <p className="mb-6 max-w-sm text-xs text-[var(--text-faint)]">
              {this.state.error.message}
            </p>
          )}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => window.location.href = '/'}>
              返回首页
            </Button>
            <Button onClick={this.handleReset}>
              <RefreshCw size={16} className="mr-1.5" />
              重试
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
