import { BookOpen, CalendarDays, Sparkles, Users, Zap } from "lucide-react";
import ChatImage from "../assets/chat.png";
import { IconClose, IconEmail, IconFullscreen } from "../assets/icons";
import type { WidgetProfile } from "../api/widgetProfile";

function formatReplyTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes % 1440 === 0)
    return `${minutes / 1440} ${minutes === 1440 ? "day" : "days"}`;
  if (minutes % 60 === 0)
    return `${minutes / 60} ${minutes === 60 ? "hour" : "hours"}`;
  return `${minutes} min`;
}

const SUPPORT_DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SUPPORT_TIMEZONE_LABELS: Record<string, string> = {
  UTC: "UTC",
  "Asia/Kolkata": "IST",
  "Asia/Singapore": "SGT",
  "Asia/Tokyo": "JST",
  "Australia/Sydney": "AET",
  "Europe/London": "UK time",
  "Europe/Berlin": "CET",
  "America/New_York": "ET",
  "America/Los_Angeles": "PT",
};

type StructuredSupportHours = {
  version: 1;
  days: string[];
  start: string;
  end: string;
  timezone: string;
};

function formatSupportTime(value: string): string {
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour = hours % 12 || 12;
  return `${hour}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function formatSupportDays(days: string[]): string {
  const indexes = days
    .map((day) =>
      ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].indexOf(day),
    )
    .filter((index) => index >= 0)
    .sort((a, b) => a - b);
  if (!indexes.length) return "";

  const ranges: string[] = [];
  let start = indexes[0];
  let end = start;
  for (const index of indexes.slice(1)) {
    if (index === end + 1) {
      end = index;
    } else {
      ranges.push(
        start === end
          ? SUPPORT_DAY_LABELS[start]
          : `${SUPPORT_DAY_LABELS[start]}–${SUPPORT_DAY_LABELS[end]}`,
      );
      start = index;
      end = index;
    }
  }
  ranges.push(
    start === end
      ? SUPPORT_DAY_LABELS[start]
      : `${SUPPORT_DAY_LABELS[start]}–${SUPPORT_DAY_LABELS[end]}`,
  );
  return ranges.join(", ");
}

function formatSupportHours(value: string): string | null {
  try {
    const parsed = JSON.parse(value) as Partial<StructuredSupportHours>;
    if (
      parsed.version !== 1 ||
      !Array.isArray(parsed.days) ||
      typeof parsed.start !== "string" ||
      typeof parsed.end !== "string"
    ) {
      return value;
    }
    const days = formatSupportDays(parsed.days);
    if (!days) return null;
    const timezone = parsed.timezone
      ? SUPPORT_TIMEZONE_LABELS[parsed.timezone] || parsed.timezone
      : "UTC";
    return `${days}, ${formatSupportTime(parsed.start)}–${formatSupportTime(parsed.end)} ${timezone}`;
  } catch {
    return value;
  }
}

function buildSupportMailto(profile: WidgetProfile): string {
  const recipient = profile.supportEmail ?? "";
  const institute = profile.instituteName || profile.name;
  const team = profile.supportTeamName || "support team";
  const subject = `Support request — ${institute}`;
  const body = [
    `Hi ${team},`,
    "",
    `I'm contacting you through the ${profile.name} chat assistant.`,
    "",
    "My question:",
    "",
  ].join("\n");

  return `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function WidgetHeader(props: {
  profile: WidgetProfile;
  humanMode: boolean;
  agentConnected: boolean;
  isMobile: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onClose: () => void;
}) {
  const { profile, humanMode, agentConnected } = props;
  return (
    <header className="chat-panel-header chat-profile-header relative shrink-0">
      <div className="chat-profile-heading">
        <div className="chat-profile-avatar-wrap">
          <img
            className="chat-profile-avatar"
            src={profile.avatarUrl || ChatImage}
            alt=""
            referrerPolicy="no-referrer"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = ChatImage;
            }}
          />
        </div>
        <div className="chat-profile-identity">
          {profile.instituteName && (
            <div
              className="chat-profile-organization"
              title={profile.instituteName}
            >
              {profile.instituteName}
            </div>
          )}
          <div className="chat-profile-name" title={profile.name}>
            {profile.name}
          </div>
          <div
            className={[
              "chat-profile-mode",
              humanMode ? "chat-profile-mode--human" : "chat-profile-mode--ai",
            ].join(" ")}
          >
            {humanMode ? (
              <Users size={11} aria-hidden="true" />
            ) : (
              <Sparkles size={11} aria-hidden="true" />
            )}
            {agentConnected
              ? "Human support"
              : humanMode
                ? "Connecting you to the team"
                : "AI assistant"}
          </div>
        </div>
        <div className="chat-profile-actions">
          {profile.supportEmail && (
            <a
              className="chat-icon-button chat-profile-action"
              href={buildSupportMailto(profile)}
              aria-label="Email support"
              title={`Email ${profile.supportEmail}`}
            >
              <IconEmail />
            </a>
          )}
          {!props.isMobile && (
            <button
              className="chat-icon-button chat-profile-action"
              type="button"
              aria-label={
                props.isFullscreen ? "Exit fullscreen" : "Enter fullscreen"
              }
              title={
                props.isFullscreen ? "Exit fullscreen" : "Enter fullscreen"
              }
              onClick={props.onToggleFullscreen}
            >
              <IconFullscreen />
            </button>
          )}
          <button
            className="chat-icon-button chat-profile-action"
            type="button"
            aria-label="Close chat"
            title="Close chat"
            onClick={props.onClose}
          >
            <IconClose />
          </button>
        </div>
      </div>
      <div className="chat-profile-support">
        <div className="chat-profile-support-top">
          <span className="chat-profile-team">
            {profile.supportTeamName || "How can we help?"}
          </span>
          {profile.helpCenterUrl && (
            <a
              className="chat-profile-help"
              href={profile.helpCenterUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <BookOpen size={13} aria-hidden="true" />
              Help centre
            </a>
          )}
        </div>
        <div className="chat-profile-support-main">
          {profile.humanReplyMinutes ? (
            <span className="chat-profile-detail">
              <Zap size={12} aria-hidden="true" />
              Typically replies within{" "}
              {formatReplyTime(profile.humanReplyMinutes)}
            </span>
          ) : (
            <span className="chat-profile-detail">
              {humanMode
                ? "Your team will be with you as soon as possible"
                : "Ask a question or explore our resources"}
            </span>
          )}
          {profile.supportHours && formatSupportHours(profile.supportHours) && (
            <span className="chat-profile-hours">
              <CalendarDays size={11} aria-hidden="true" />
              Human support: {formatSupportHours(profile.supportHours)}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
