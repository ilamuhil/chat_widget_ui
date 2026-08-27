import { useEffect, useRef, useState } from "react";
import { IconPaperclip, IconSend } from "../assets/icons";
import type { BannerMessage } from "./components/InfoBanner";
import { Spinner } from "./components/Spinner";

//When the form is shown the text area and the send button will be disabled...

const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const API_URL_BASE = import.meta.env.VITE_API_URL_BASE as string | undefined;
  if (!API_URL_BASE) throw new Error("File upload is unavailable");

  //limit file size to 5mb
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("File size must be less than 5MB");
  }
  console.log("file size is less than 5mb");

  // only pdf, docx, img, txt files are allowed
  const allowedExtensions = ["pdf", "docx", "img", "txt"];
  const extension = file.name.split(".").pop();
  if (!extension || !allowedExtensions.includes(extension)) {
    throw new Error("Allowed file types are pdf, docx, img, txt");
  }
  console.log("file type is allowed");

  const formData = new FormData();
  formData.append("file", file);
  const token = sessionStorage.getItem("token");
  if (!token) throw new Error("Unauthorized");
  const response = await fetch(`${API_URL_BASE}/api/conversations/upload`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let responseBody: { message?: unknown; detail?: unknown } | null = null;
    try {
      responseBody = await response.json();
    } catch (jsonErr) {
      console.error("Failed to parse error response JSON:", jsonErr);
      throw new Error("Unknown Error Occurred");
    }
    const serverMessage =
      typeof responseBody?.message === "string"
        ? responseBody.message
        : typeof responseBody?.detail === "string"
          ? responseBody.detail
          : null;

    console.error("File upload failed:", {
      status: response.status,
      statusText: response.statusText,
      responseBody,
    });

    throw new Error(
      serverMessage ?? `Failed to upload file (${response.status})`,
    );
  }
  return `${file.name}`;
};

export default function ChatComposer(props: {
  onSend: (message: string | { type: "file"; file_key: string }) => void;
  showFormCapture: boolean;
  onBannerMessage: (message: BannerMessage) => void;
}) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [fileUploading, setFileUploading] = useState(false);

  const handleSend = () => {
    const text = value.trim();
    if (!text) return;
    props.onSend(text);
    setValue("");
  };

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setFileUploading(true);
      const fileKey = await handleFileUpload(event);
      if (!fileKey) {
        props.onBannerMessage({
          content: "No file was selected",
          variant: "warning",
        });
        return;
      }
      props.onSend({
        type: "file",
        file_key: fileKey,
      });
      props.onBannerMessage({
        content: "File uploaded successfully",
        variant: "info",
      });
    } catch (error) {
      props.onBannerMessage({
        content:
          error instanceof Error ? error.message : "Failed to upload file",
        variant: "error",
      });
    } finally {
      event.target.value = "";
      setFileUploading(false);
    }
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = value.trim() ? `${el.scrollHeight}px` : "36px";
  }, [value]);

  return (
    <div className="chat-panel-composer flex flex-col gap-1.5 p-2.5">
      <div className="flex items-end gap-2 rounded-2xl border border-slate-200/70 bg-white/80 p-1.5 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
        <label className="pointer-events-auto inline-grid h-9 w-9 cursor-pointer place-items-center rounded-full text-slate-600/80 hover:bg-slate-900/5 hover:text-slate-800">
          <input
            className="sr-only"
            type="file"
            disabled={props.showFormCapture}
            onChange={onFileChange}
          />
          <span aria-label="Add attachment">
            {fileUploading ? <Spinner /> : <IconPaperclip />}
          </span>
        </label>

        <textarea
          title={
            props.showFormCapture
              ? "Please fill in the form to continue the conversation"
              : "Type a message…"
          }
          disabled={props.showFormCapture}
          className="pointer-events-auto h-9 min-h-9 flex-1 resize-none rounded-xl bg-transparent px-2 py-2 text-[13px] leading-5 tracking-[-0.01em] text-slate-900 outline-none placeholder:text-[13px] placeholder:text-slate-400/90 disabled:opacity-60"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Type a message…"
          rows={1}
          style={{ maxHeight: "120px" }}
          ref={textareaRef}
          onKeyDown={(e) => {
            // Allow newline with Shift+Enter, send with Enter (WhatsApp-like)
            if (e.key !== "Enter") return;
            if (e.shiftKey) return;
            if (e.nativeEvent.isComposing) return;
            e.preventDefault();
            handleSend();
          }}
        />

        <button
          className="pointer-events-auto inline-grid h-9 w-9 place-items-center rounded-full bg-sky-600 text-white shadow-sm transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
          type="button"
          disabled={!value.trim() || props.showFormCapture}
          aria-label="Send message"
          onClick={handleSend}
        >
          <IconSend />
        </button>
      </div>
    </div>
  );
}
