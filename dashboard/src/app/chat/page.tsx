import { ChatInterface } from "@/components/chat/ChatInterface";
import { PageContainer } from "@/components/layout/PageContainer";

export default function ChatPage() {
  return (
    <PageContainer size="lg" fill className="max-w-4xl">
      <ChatInterface />
    </PageContainer>
  );
}
