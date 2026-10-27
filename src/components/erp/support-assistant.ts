// Shared content/logic for the Akira Assistant chat, used by both the docked
// panel on Support Center and the dedicated full-page /support-assistant
// route, so the conversation script lives in exactly one place.

export type ChatMessage = { role: "assistant" | "user"; text: string };

export const INITIAL_MESSAGE: ChatMessage = {
  role: "assistant",
  text: "Hi! I'm Akira Assistant. I can help you find answers, guide you through features, or help you raise a support ticket.",
};

export const CHAT_SUGGESTIONS = [
  "How to create examination series?",
  "How to generate report cards?",
  "Reset my login password",
  "I want to raise a support ticket",
  "Talk to a human agent",
];

// Deliberately scripted, offline responses — this is a UI-only demo assistant,
// not a real LLM integration. Never claims to be live/AI-generated beyond this.
const SCRIPTED_REPLIES: { match: RegExp; reply: string }[] = [
  { match: /examination series/i, reply: "To create an examination series: go to Examinations → Examination Series → New Series. Pick the board, academic year, and date range, then save as Draft." },
  { match: /report card/i, reply: "Report Card Generation lives under Examinations → Report Card Generation. You'll need a Published template and calculated results before you can generate cards for a class." },
  { match: /password/i, reply: "You can reset your password from the login screen using \"Forgot Password\", or ask your School Admin to reset it from Staff Setup." },
  { match: /ticket/i, reply: "I've noted you'd like to raise a ticket. Use the \"Raise a Support Ticket\" card on the Support Center, or tell me the issue here and I'll help you describe it." },
  { match: /human|agent/i, reply: "Connecting you to a human agent isn't available in this preview yet — please use Email or Call support during support hours." },
];

export function scriptedReply(input: string): string {
  const found = SCRIPTED_REPLIES.find((r) => r.match.test(input));
  return found?.reply ?? "I don't have a scripted answer for that yet in this preview — try one of the suggestions below, or raise a support ticket and our team will follow up.";
}
