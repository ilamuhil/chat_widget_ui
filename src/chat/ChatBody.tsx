import { getMessageMeta } from "../helpers";
import type { ChatMessage } from "./types";
import { toHHmm } from "./utils/time";
import DOMPurify from "dompurify";
import { Marked } from "marked";
import FormCapture from "./FormCapture";

const markdown = new Marked({
  breaks: true,
  gfm: true,
});

function normalizeDefinitionLists(source: string) {
  return source.replace(
    /^([^\n]+)\n: ([^\n]+)(?=\n|$)/gm,
    "<dl><dt>$1</dt><dd>$2</dd></dl>",
  );
}

function isThematicBreakMessage(source: string) {
  return /^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(source);
}

function openExternalLinksInNewTab(html: string) {
  return html.replace(/<a\b([^>]*)>/gi, (tag, attributes: string) => {
    const href = attributes.match(/\bhref=(["'])(.*?)\1/i)?.[2];
    if (!href || href.startsWith("#")) return tag;

    const cleanAttributes = attributes
      .replace(/\s+target=(["']).*?\1/gi, "")
      .replace(/\s+rel=(["']).*?\1/gi, "");

    return `<a${cleanAttributes} target="_blank" rel="noopener noreferrer">`;
  });
}

export default function ChatBody(props: {
  messages: Array<ChatMessage>;
  onFormSubmit: () => void;
  email: string;
  phone: string;
  name: string;
  setEmail: (email: string) => void;
  setPhone: (phone: string) => void;
  setName: (name: string) => void;
  showFormCapture: boolean;
  layoutFullscreen?: boolean;
}) {
  const {
    messages,
    onFormSubmit,
    email,
    phone,
    setEmail,
    setPhone,
    showFormCapture,
    name,
    setName,
    layoutFullscreen = false,
  } = props;
  const messagesMeta = getMessageMeta(messages);

  if (showFormCapture) {
    return (
      <FormCapture
        onFormSubmit={onFormSubmit}
        email={email}
        phone={phone}
        name={name}
        setEmail={setEmail}
        setPhone={setPhone}
        setName={setName}
        layoutFullscreen={layoutFullscreen}
      />
    );
  }

  return (
    <div className="flex flex-col gap-0.5 px-2 py-2">
      {messagesMeta.map((message, idx) => {
        if (isThematicBreakMessage(message.content)) {
          return (
            <div
              key={`${message.timestamp}-${idx}`}
              className="my-2 flex items-center px-3"
              role="separator"
              aria-hidden="true"
            >
              <hr className="chat-message-separator" />
            </div>
          );
        }

        const prev = idx > 0 ? messagesMeta[idx - 1] : undefined;
        const next =
          idx < messagesMeta.length - 1 ? messagesMeta[idx + 1] : undefined;
        const normalized = normalizeDefinitionLists(message.content);
        const rendered = markdown.parse(normalized, { async: false });
        const renderedHtml = typeof rendered === "string" ? rendered : "";
        const sanitizedHtml = DOMPurify.sanitize(
          renderedHtml
            .replaceAll("<table>", '<div class="chat-table-wrap"><table>')
            .replaceAll("</table>", "</table></div>"),
        );
        const html = openExternalLinksInNewTab(sanitizedHtml);
        const isContinued = !!prev && prev.side === message.side;
        const showAvatar = message.side === "staff" && message.isLastOfGroup;

        const timeText = toHHmm(message.timestamp);
        const nextTimeText = next ? toHHmm(next.timestamp) : undefined;
        const showTimestamp =
          !next || next.side !== message.side || nextTimeText !== timeText;

        const bubbleClassName = [
          "chat-bubble-shape",
          "text-[13px] leading-[1.45] tracking-[-0.01em]",
          "overflow-wrap:anywhere break-words",
          "w-fit px-[0.9em] py-[0.55em]",
          message.side === "user"
            ? "ml-auto max-w-[78%] chat-bubble-user"
            : "mr-auto max-w-[92%] chat-bubble-staff",
          message.isLastOfGroup
            ? message.side === "user"
              ? "chat-tail-user"
              : "chat-tail-staff"
            : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <div
            key={`${message.timestamp}-${idx}`}
            className={["flex flex-col", isContinued ? "mt-0.5" : "mt-2"].join(
              " ",
            )}
          >
            <div
              className={`${bubbleClassName} chat-markdown`}
              dangerouslySetInnerHTML={{ __html: html }}
            />

            {(showAvatar || showTimestamp) && (
              <div
                className={[
                  "mt-1 flex items-center gap-1.5 px-1.5",
                  message.side === "user" ? "justify-end" : "justify-start",
                ].join(" ")}
              >
                {showAvatar && (
                  <div className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-semibold tracking-[-0.02em] text-slate-600 ring-1 ring-slate-900/8 shadow-sm">
                    {message.initials}
                  </div>
                )}
                {showTimestamp && (
                  <div className="select-none text-[9px] italic leading-none text-slate-500/70">
                    {timeText}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
