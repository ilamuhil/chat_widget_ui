import { IconClose } from "../../assets/icons";

export type InfoBannerVariant = "info" | "warning" | "error";

export type BannerMessage = {
  content: string | null;
  variant: InfoBannerVariant;
};

const variantClasses: Record<InfoBannerVariant, string> = {
  info: "border-sky-200 bg-sky-50 text-sky-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  error: "border-rose-200 bg-rose-50 text-rose-700",
};

export function InfoBanner(props: {
  message: BannerMessage;
  onClose: () => void;
}) {
  const { message, onClose } = props;
  if (!message.content) return null;

  return (
    <div
      className={`flex items-start gap-2 border-b px-2.5 py-1.5 text-[10px] leading-4 ${variantClasses[message.variant]}`}
      role={message.variant === "error" ? "alert" : "status"}
    >
      <span className="min-w-0 flex-1">{message.content}</span>
      <button
        className="pointer-events-auto mt-0.5 inline-grid h-3.5 w-3.5 flex-none place-items-center rounded opacity-70 hover:bg-black/5 hover:opacity-100"
        type="button"
        aria-label="Dismiss message"
        onClick={onClose}
      >
        <IconClose width="11" height="11" />
      </button>
    </div>
  );
}
