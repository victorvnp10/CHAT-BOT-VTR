import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Header } from "@/components/header";
import { ChatInterface } from "@/components/chat-interface";
import type { Chatbot, Conversation } from "@shared/schema";

export default function Chat() {
  const [match, params] = useRoute("/chat/:chatbotId");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const chatbotId = params?.chatbotId;

  const { data: chatbot, isLoading: chatbotLoading } = useQuery<Chatbot>({
    queryKey: ["/api/chatbots", chatbotId],
    enabled: !!chatbotId,
  });

  const createConversationMutation = useMutation({
    mutationFn: async (chatbotId: string) => {
      const response = await apiRequest("POST", "/api/conversations", {
        chatbotId,
        title: `Conversa com ${chatbot?.name || "Chatbot"}`,
      });
      return response.json();
    },
    onSuccess: (conversation: Conversation) => {
      setConversationId(conversation.id);
      queryClient.invalidateQueries({ 
        queryKey: ["/api/conversations", "chatbot", chatbotId] 
      });
    },
  });

  useEffect(() => {
    if (chatbotId && !conversationId) {
      createConversationMutation.mutate(chatbotId);
    }
  }, [chatbotId, conversationId]);

  const handleBack = () => {
    window.history.back();
  };

  const handleNewChat = () => {
    // Create a new conversation for the same chatbot
    if (chatbotId) {
      setConversationId(null); // Reset conversation
      createConversationMutation.mutate(chatbotId);
    }
  };

  if (!match || !chatbotId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Chatbot não encontrado</h1>
          <p className="text-gray-600 mt-2">O chatbot solicitado não existe.</p>
        </div>
      </div>
    );
  }

  if (chatbotLoading || createConversationMutation.isPending || !conversationId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fab-blue"></div>
        </div>
      </div>
    );
  }

  if (!chatbot) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Chatbot não encontrado</h1>
            <p className="text-gray-600 mt-2">O chatbot solicitado não existe.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ChatInterface
          chatbot={chatbot}
          conversationId={conversationId}
          onBack={handleBack}
          onNewChat={handleNewChat}
        />
      </main>
    </div>
  );
}
