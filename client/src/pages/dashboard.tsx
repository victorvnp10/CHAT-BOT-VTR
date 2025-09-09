import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/header";
import { ChatbotCard, CreateChatbotCard } from "@/components/chatbot-card";
import { Card } from "@/components/ui/card";
import type { Chatbot } from "@shared/schema";

export default function Dashboard() {
  const [, navigate] = useLocation();
  
  const { data: chatbots, isLoading } = useQuery<Chatbot[]>({
    queryKey: ["/api/chatbots"],
  });

  const handleSelectChatbot = (chatbot: Chatbot) => {
    navigate(`/chat/${chatbot.id}`);
  };

  const handleEditChatbot = (chatbot: Chatbot) => {
    navigate(`/edit/${chatbot.id}`);
  };

  const handleCreateChatbot = () => {
    navigate("/admin");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Welcome Section */}
          <Card className="p-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Bem-vindo ao Sistema de Chatbots
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Selecione um chatbot especializado para auxiliá-lo na elaboração de documentos oficiais e outras tarefas administrativas.
              </p>
            </div>
          </Card>

          {/* Chatbots Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fab-blue"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="chatbots-grid">
              {chatbots?.map((chatbot) => (
                <ChatbotCard
                  key={chatbot.id}
                  chatbot={chatbot}
                  onSelect={handleSelectChatbot}
                  onEdit={handleEditChatbot}
                />
              ))}
              <CreateChatbotCard onCreate={handleCreateChatbot} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
