export default function AssistanceNotice(props: {
  label: string;
  tone: "success" | "warning";
}) {
  return (
    <div
      className="mb-1.5 mt-0.5 w-full self-center px-1.5 text-center"
      aria-live="polite"
      role="status"
    >
      <span
        className={`chat-status-notice chat-status-notice--${props.tone} select-none text-[12px] font-medium tracking-[-0.01em]`}
      >
        {props.label}
      </span>
    </div>
  );
}
