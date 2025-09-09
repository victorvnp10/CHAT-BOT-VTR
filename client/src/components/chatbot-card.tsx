import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Chatbot } from "@shared/schema";

interface ChatbotCardProps {
  chatbot: Chatbot;
  onSelect: (chatbot: Chatbot) => void;
  onEdit: (chatbot: Chatbot) => void;
}

export function ChatbotCard({ chatbot, onSelect, onEdit }: ChatbotCardProps) {
  const isDefault = chatbot.id === "sad-virtual";
  
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    onEdit(chatbot);
  };
  
  return (
    <Card 
      className="hover:shadow-md transition-all duration-200 cursor-pointer group relative"
      onClick={() => onSelect(chatbot)}
      data-testid={`card-chatbot-${chatbot.id}`}
    >
      {/* Edit Button */}
      <Button
        size="sm"
        variant="ghost"
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onClick={handleEdit}
        data-testid={`button-edit-${chatbot.id}`}
      >
        <i className="fas fa-edit text-gray-400 hover:text-fab-blue"></i>
      </Button>

      <div className="p-6">
        <div className="flex items-center space-x-3 mb-4 pr-8"> {/* Add padding to avoid edit button */}
          <div className="w-12 h-12 bg-fab-blue rounded-lg flex items-center justify-center">
            <i className={`fas ${chatbot.icon} text-white text-xl`}></i>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900" data-testid={`text-chatbot-name-${chatbot.id}`}>
              {chatbot.name}
            </h3>
            <Badge 
              variant={isDefault ? "default" : "secondary"}
              className={isDefault ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}
            >
              {isDefault ? "Ativo" : "Personalizado"}
            </Badge>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-4 line-clamp-3" data-testid={`text-chatbot-description-${chatbot.id}`}>
          {chatbot.persona}
        </p>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            <i className="fas fa-comments mr-1"></i>
            Última conversa: Hoje
          </span>
          <span>
            <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
          </span>
        </div>
      </div>
    </Card>
  );
}

export function CreateChatbotCard({ onCreate }: { onCreate: () => void }) {
  return (
    <Card 
      className="bg-gray-50 border-2 border-dashed border-gray-300 hover:border-fab-blue transition-all duration-200 cursor-pointer group"
      onClick={onCreate}
      data-testid="card-create-chatbot"
    >
      <div className="p-6 text-center h-full flex flex-col justify-center">
        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-fab-blue group-hover:text-white transition-colors">
          <i className="fas fa-plus text-xl"></i>
        </div>
        <h3 className="font-semibold text-gray-700 mb-2">Criar Novo Chatbot</h3>
        <p className="text-sm text-gray-500">
          Configure um assistente personalizado para suas necessidades específicas.
        </p>
      </div>
    </Card>
  );
}
