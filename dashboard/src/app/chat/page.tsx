import { ChatInterface } from "@/components/chat/ChatInterface";
import { PageContainer } from "@/components/layout/PageContainer";

export default function ChatPage() {
  return (
    <PageContainer className="py-6 sm:py-8">
      <ChatInterface />
    </PageContainer>
  );
}
