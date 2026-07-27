

import type { SocketReadyState } from '../hooks/useChatSocket'

export function ConnectionStatus(props: {
  readyState: SocketReadyState
  isAuthenticating: boolean
  authFailed: boolean
}) {
  const { readyState, isAuthenticating, authFailed } = props

  const view = authFailed
    ? { label: 'Connection failed', colorClass: 'text-rose-600', dotClass: 'bg-rose-500/70' }
    : readyState === 'open'
      ? { label: 'Connected', colorClass: 'text-emerald-600', dotClass: 'bg-emerald-500/70' }
      : isAuthenticating || readyState === 'connecting' || readyState === 'closing'
        ? { label: 'Connecting', colorClass: 'text-slate-500', dotClass: 'bg-slate-400/60' }
        : { label: 'Disconnected', colorClass: 'text-slate-500', dotClass: 'bg-slate-400/60' }

  return (
    <div className={`flex items-center justify-center gap-1.5 rounded-t-lg bg-slate-900/5 p-1.5 text-xs ${view.colorClass} rise`}>
      <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${view.dotClass}`} aria-hidden='true' />
      <span className='text-xs'>{view.label}</span>
    </div>
  )
}

