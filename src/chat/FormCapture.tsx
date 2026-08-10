export default function FormCapture(props: {
  onFormSubmit: () => void
  email: string
  phone: string
  name: string
  setEmail: (email: string) => void
  setPhone: (phone: string) => void
  setName: (name: string) => void
  layoutFullscreen?: boolean
}) {
  const {
    onFormSubmit,
    email,
    phone,
    name,
    setEmail,
    setPhone,
    setName,
    layoutFullscreen = false,
  } = props
  const disableFormSubmit = !email.trim() || !phone.trim() || !name.trim()

  return (
    <div
      className={[
        'chat-lead-capture flex h-full min-h-0 flex-col',
        layoutFullscreen ? 'chat-lead-capture--fullscreen items-center justify-center px-6' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <form
        className={[
          'flex w-full flex-col',
          layoutFullscreen
            ? 'chat-lead-capture-panel max-w-sm px-7 py-7'
            : 'h-full min-h-0 flex-1 px-4 py-3',
        ].join(' ')}
        onSubmit={event => {
          event.preventDefault()
          onFormSubmit()
        }}
      >
        <div className="shrink-0">
          <p
            className={[
              'font-semibold uppercase tracking-[0.08em] text-sky-700/70',
              layoutFullscreen ? 'text-[11px]' : 'text-[10px]',
            ].join(' ')}
          >
            Before we start
          </p>
          <h2
            className={[
              'font-semibold tracking-[-0.03em] leading-snug text-slate-900',
              layoutFullscreen ? 'mt-1.5 text-[22px]' : 'mt-0.5 text-[17px]',
            ].join(' ')}
          >
            Tell us how to reach you
          </h2>
          <p
            className={[
              'leading-snug text-slate-600/80',
              layoutFullscreen ? 'mt-1.5 text-[13px]' : 'mt-1 text-[11px]',
            ].join(' ')}
          >
            We&apos;ll connect you with the right support.
          </p>
        </div>

        <div
          className={[
            'flex flex-col',
            layoutFullscreen ? 'mt-5 gap-3' : 'mt-3 min-h-0 flex-1 justify-center gap-2.5',
          ].join(' ')}
        >
          <div className={['flex flex-col', layoutFullscreen ? 'gap-1.5' : 'gap-1'].join(' ')}>
            <label
              className={[
                'font-medium tracking-[-0.01em] text-slate-600',
                layoutFullscreen ? 'text-[11px]' : 'text-[10px]',
              ].join(' ')}
              htmlFor="capture-name"
            >
              Name
            </label>
            <input
              id="capture-name"
              className={[
                'chat-lead-input w-full rounded-lg border border-slate-200/90 bg-white text-[13px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100',
                layoutFullscreen ? 'h-10 px-3.5' : 'h-9 px-3',
              ].join(' ')}
              type="text"
              name="name"
              value={name}
              onChange={event => setName(event.target.value)}
              autoComplete="name"
              placeholder="Your full name"
              required
            />
          </div>

          <div className={['flex flex-col', layoutFullscreen ? 'gap-1.5' : 'gap-1'].join(' ')}>
            <label
              className={[
                'font-medium tracking-[-0.01em] text-slate-600',
                layoutFullscreen ? 'text-[11px]' : 'text-[10px]',
              ].join(' ')}
              htmlFor="capture-email"
            >
              Email
            </label>
            <input
              id="capture-email"
              className={[
                'chat-lead-input w-full rounded-lg border border-slate-200/90 bg-white text-[13px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100',
                layoutFullscreen ? 'h-10 px-3.5' : 'h-9 px-3',
              ].join(' ')}
              type="email"
              name="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="you@company.com"
              required
            />
          </div>

          <div className={['flex flex-col', layoutFullscreen ? 'gap-1.5' : 'gap-1'].join(' ')}>
            <label
              className={[
                'font-medium tracking-[-0.01em] text-slate-600',
                layoutFullscreen ? 'text-[11px]' : 'text-[10px]',
              ].join(' ')}
              htmlFor="capture-phone"
            >
              Phone
            </label>
            <input
              id="capture-phone"
              className={[
                'chat-lead-input w-full rounded-lg border border-slate-200/90 bg-white text-[13px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100',
                layoutFullscreen ? 'h-10 px-3.5' : 'h-9 px-3',
              ].join(' ')}
              type="tel"
              name="phone"
              value={phone}
              onChange={event => setPhone(event.target.value)}
              autoComplete="tel"
              inputMode="tel"
              placeholder="+1 (555) 000-0000"
              required
            />
          </div>
        </div>

        <button
          className={[
            'w-full shrink-0 rounded-lg bg-sky-600 font-semibold tracking-[-0.01em] text-white transition hover:bg-sky-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none',
            layoutFullscreen
              ? 'mt-5 h-10 text-[13px] shadow-[0_8px_20px_rgba(2,132,199,0.28)]'
              : 'mt-2 h-9 text-[12px] shadow-[0_6px_16px_rgba(2,132,199,0.24)]',
          ].join(' ')}
          disabled={disableFormSubmit}
          type="submit"
        >
          Continue to chat
        </button>
      </form>
    </div>
  )
}
