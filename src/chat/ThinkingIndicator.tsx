export default function ThinkingIndicator(props: { label?: string }) {
  const label = props.label ?? "Agent is thinking";

  return (
    <div
      className="mb-1.5 mt-0.5 w-full self-center px-1.5 text-center"
      aria-live="polite"
      aria-label={label}
    >
      <span className="thinking-shimmer select-none text-[12px] font-medium tracking-[-0.01em]">
        {label}
      </span>
    </div>
  );
}
