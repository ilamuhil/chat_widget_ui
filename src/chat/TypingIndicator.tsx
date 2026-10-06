export default function TypingIndicator() {
  return (
    <div
      className="chat-bubble-staff ml-3 mb-1.5 mt-0.5 flex h-5 w-fit items-center justify-center gap-0.5 self-start rounded-full px-1.5"
      style={
        {
          "--bounce-height": "1.5px",
          "--typing-cycle": "1.8s",
        } as React.CSSProperties
      }
    >
      <div className="typing-dot typing-dot--1 h-1 w-1 rounded-full"></div>
      <div className="typing-dot typing-dot--2 h-1 w-1 rounded-full"></div>
      <div className="typing-dot typing-dot--3 h-1 w-1 rounded-full"></div>
    </div>
  );
}
