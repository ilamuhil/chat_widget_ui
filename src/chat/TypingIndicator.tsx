export default function TypingIndicator() {
  return (
    <div
      className='my-2 mb-2 ml-2 mr-1 flex h-6 w-fit items-center justify-center gap-1 self-start rounded-lg bg-slate-900/5 px-2'
      style={{ '--bounce-height': '2px', '--typing-cycle': '2.2s' } as React.CSSProperties}>
      <div className='typing-dot typing-dot--1 h-1 w-1 rounded-full bg-sky-600/40'></div>
      <div className='typing-dot typing-dot--2 h-1 w-1 rounded-full bg-sky-600/40'></div>
      <div className='typing-dot typing-dot--3 h-1 w-1 rounded-full bg-sky-600/40'></div>
    </div>
  )
}


