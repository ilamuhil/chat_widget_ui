import type { Role } from "../helpers";

export type { Role };

export type ChatMessage = {
  role: Role;
  content: string;
  contentType: string;
  timestamp: string;
  agentName?: string;
};

export type FormCaptureData = {
  email: string;
  phone: string;
  name: string;
};

export type FileMessage = {
  file_key: string;
};

/** Counsellor search loader and its short result line. */
export type ServerAssistanceEvent = {
  type: "assistance";
  status: "searching" | "connected" | "busy";
  conversation_id: string;
};

export type ServerTypingEvent = {
  type: "typing";
  from: "system";
  is_typing: boolean;
  conversation_id: string;
};

export type ServerFormCapturedEvent = {
  type: "form_capture";
  role: "system";
  message: string;
  conversation_id: string;
};

export type ServerMessageEvent = {
  type?: "message" | string;
  role?: Role | string;
  agentName?: string;
  message?: unknown;
  content?: unknown;
  conversation_id?: string;
};

export type ServerErrorEvent = {
  type: "error" | string;
  message: string;
  conversation_id?: string;
};
