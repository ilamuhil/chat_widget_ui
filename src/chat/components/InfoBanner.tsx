import { IconClose } from "../../assets/icons";

export type InfoBannerVariant = "info" | "warning" | "error";

export type BannerMessage = {
  content: string | null;
  variant: InfoBannerVariant;
};

const variantClasses: Record<InfoBannerVariant, string> = {
  info: "chat-info-banner--info",
  warning: "chat-info-banner--warning",
  error: "chat-info-banner--error",
};

export function InfoBanner(props: {
  message: BannerMessage;
  onClose: () => void;
}) {
  const { message, onClose } = props;
  if (!message.content) return null;

  return (
    <div
      className={`chat-info-banner flex items-start gap-2 border-b px-2.5 py-1.5 text-[10px] leading-4 ${variantClasses[message.variant]}`}
      role={message.variant === "error" ? "alert" : "status"}
    >
      <span className="min-w-0 flex-1">{message.content}</span>
      <button
        className="chat-info-banner__dismiss pointer-events-auto mt-0.5 inline-grid h-3.5 w-3.5 flex-none place-items-center rounded opacity-70 hover:opacity-100"
        type="button"
        aria-label="Dismiss message"
        onClick={onClose}
      >
        <IconClose width="11" height="11" />
      </button>
    </div>
  );
}
