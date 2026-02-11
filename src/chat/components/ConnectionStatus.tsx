import { ReadyState } from 'react-use-websocket'

export function ConnectionStatus(props: { readyState: ReadyState; isAuthenticating: boolean; authFailed: boolean }) {
  const { readyState, isAuthenticating, authFailed } = props

  const view = authFailed
    ? { label: 'Connection failed', colorClass: 'text-rose-600', dotClass: 'bg-rose-500/70' }
    : isAuthenticating || readyState === ReadyState.CONNECTING
      ? { label: 'Connecting', colorClass: 'text-slate-500', dotClass: 'bg-slate-400/60' }
      : readyState === ReadyState.OPEN
        ? { label: 'Connected', colorClass: 'text-emerald-600', dotClass: 'bg-emerald-500/70' }
        : { label: 'Connection failed', colorClass: 'text-rose-600', dotClass: 'bg-rose-500/70' }

  return (
    <div className={`flex items-center justify-center gap-1.5 rounded-t-lg bg-slate-900/5 p-1.5 text-xs ${view.colorClass}`}>
      <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${view.dotClass}`} aria-hidden='true' />
      <span className='italic'>{view.label}</span>
    </div>
  )
}

