import { MessageSquare } from "lucide-react";

export function EmptyConversationState({ onStartChat }: { onStartChat: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MessageSquare className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">Start a Conversation</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Connect with teachers, parents, students and school staff.
        </p>
      </div>
      <button
        onClick={onStartChat}
        className="mt-1 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
      >
        + Start New Chat
      </button>
    </div>
  );
}

export function NoMessagesState({ otherUserFirstName }: { otherUserFirstName: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1.5 px-6 py-10 text-center">
      <span className="text-2xl">👋</span>
      <p className="text-sm font-medium text-foreground">No messages yet.</p>
      <p className="text-sm text-muted-foreground">Say hello to {otherUserFirstName}.</p>
    </div>
  );
}
