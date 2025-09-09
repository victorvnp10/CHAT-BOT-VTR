import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Chatbot, Conversation } from "@shared/schema";

interface ChatInterfaceProps {
  chatbot: Chatbot;
  conversationId: string;
  onBack: () => void;
  onNewChat: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export function ChatInterface({ chatbot, conversationId, onBack, onNewChat }: ChatInterfaceProps) {
  const [message, setMessage] = useState("");
  const [charCount, setCharCount] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: conversation, isLoading } = useQuery<Conversation>({
    queryKey: ["/api/conversations", conversationId],
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { message: string; files?: File[] }) => {
      const formData = new FormData();
      formData.append("message", data.message);
      
      if (data.files) {
        data.files.forEach((file, index) => {
          formData.append(`files`, file);
        });
      }
      
      const response = await fetch(`/api/chat/${conversationId}`, {
        method: "POST",
        body: formData,
      });
      return response.json();
    },
    onSuccess: () => {
      setMessage("");
      setCharCount(0);
      setUploadedFiles([]); // Clear uploaded files
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      // Invalidate and refetch the conversation
      queryClient.invalidateQueries({
        queryKey: ["/api/conversations", conversationId]
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao enviar mensagem. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || sendMessageMutation.isPending) return;

    sendMessageMutation.mutate({
      message: trimmedMessage,
      files: uploadedFiles.length > 0 ? uploadedFiles : undefined
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= 2000) {
      setMessage(value);
      setCharCount(value.length);
      
      // Auto-resize textarea
      const textarea = e.target;
      textarea.style.height = "auto";
      textarea.style.height = textarea.scrollHeight + "px";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files).slice(0, 3); // Limit to 3 files
      setUploadedFiles(prev => [...prev, ...newFiles].slice(0, 3));
      
      toast({
        title: "Arquivos anexados",
        description: `${newFiles.length} arquivo(s) anexado(s) com sucesso.`,
      });
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fab-blue"></div>
      </div>
    );
  }

  const messages = conversation?.messages || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-12rem)]">
      {/* Chat Interface */}
      <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
        {/* Chat Header */}
        <div className="border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              data-testid="button-back-to-dashboard"
            >
              <i className="fas fa-arrow-left"></i>
            </Button>
            <div className="w-10 h-10 bg-fab-blue rounded-lg flex items-center justify-center">
              <i className={`fas ${chatbot.icon} text-white`}></i>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900" data-testid="text-current-chatbot-name">
                {chatbot.name}
              </h3>
              <p className="text-sm text-green-600">Online</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onNewChat}
              className="bg-white hover:bg-gray-50 text-fab-blue border-fab-blue"
              data-testid="button-new-chat"
            >
              <i className="fas fa-plus mr-1"></i>
              Novo Chat
            </Button>
            <Button variant="ghost" size="sm" data-testid="button-download-conversation">
              <i className="fas fa-download"></i>
            </Button>
            <Button variant="ghost" size="sm" data-testid="button-conversation-options">
              <i className="fas fa-ellipsis-v"></i>
            </Button>
          </div>
        </div>

        {/* Chat Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4" data-testid="chat-messages">
            {/* Welcome Message */}
            {messages.length === 0 && (
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-fab-blue rounded-full flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-robot text-white text-sm"></i>
                </div>
                <div className="flex-1">
                  <div className="bg-gray-100 rounded-2xl rounded-tl-md p-4 max-w-2xl">
                    {/* Se for chatbot de documentos, mostra menu de opções */}
                    {chatbot?.tipoDocumento === "documento" ? (
                      <>
                        <p className="text-gray-800">
                          Olá! Como posso auxiliá-lo na elaboração de documentos? Selecione uma das opções abaixo:
                        </p>
                        <div className="grid grid-cols-2 gap-2 mt-4">
                          <Button 
                            variant="outline" 
                            className="justify-start h-auto p-3"
                            onClick={() => setMessage("Desejo criar um Ofício Interno")}
                            data-testid="button-option-oficio-interno"
                          >
                            <i className="fas fa-file-text text-fab-blue mr-2"></i>
                            <span className="text-sm font-medium">Ofício Interno</span>
                          </Button>
                          <Button 
                            variant="outline" 
                            className="justify-start h-auto p-3"
                            onClick={() => setMessage("Desejo criar um Ofício Externo")}
                            data-testid="button-option-oficio-externo"
                          >
                            <i className="fas fa-file-export text-fab-blue mr-2"></i>
                            <span className="text-sm font-medium">Ofício Externo</span>
                          </Button>
                          <Button 
                            variant="outline" 
                            className="justify-start h-auto p-3"
                            onClick={() => setMessage("Desejo criar um E-mail")}
                            data-testid="button-option-email"
                          >
                            <i className="fas fa-envelope text-fab-blue mr-2"></i>
                            <span className="text-sm font-medium">E-mail</span>
                          </Button>
                          <Button 
                            variant="outline" 
                            className="justify-start h-auto p-3"
                            onClick={() => setMessage("Desejo criar um Relatório")}
                            data-testid="button-option-relatorio"
                          >
                            <i className="fas fa-chart-line text-fab-blue mr-2"></i>
                            <span className="text-sm font-medium">Relatório</span>
                          </Button>
                          <Button 
                            variant="outline" 
                            className="justify-start h-auto p-3"
                            onClick={() => setMessage("Desejo criar uma Ata")}
                            data-testid="button-option-ata"
                          >
                            <i className="fas fa-clipboard-list text-fab-blue mr-2"></i>
                            <span className="text-sm font-medium">Ata</span>
                          </Button>
                        </div>
                      </>
                    ) : (
                      /* Se for chatbot personalizado, mostra mensagem personalizada */
                      <p className="text-gray-800">
                        {chatbot?.mensagemInicial || "Olá! Como posso ajudá-lo?"}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Agora</p>
                </div>
              </div>
            )}

            {/* Conversation Messages */}
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex items-start space-x-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
                data-testid={`message-${msg.role}-${msg.id}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 bg-fab-blue rounded-full flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-robot text-white text-sm"></i>
                  </div>
                )}
                <div className={`flex-1 ${msg.role === 'user' ? 'flex justify-end' : ''}`}>
                  <div className={`rounded-2xl p-4 max-w-2xl ${
                    msg.role === 'user' 
                      ? 'bg-fab-blue text-white rounded-tr-md' 
                      : 'bg-gray-100 text-gray-800 rounded-tl-md'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-user text-gray-600 text-sm"></i>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Chat Input */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <div className="relative">
                <Textarea
                  ref={textareaRef}
                  value={message}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite sua mensagem..."
                  className="min-h-[44px] max-h-32 resize-none pr-12"
                  disabled={sendMessageMutation.isPending}
                  data-testid="input-message"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-3 bottom-3"
                  onClick={triggerFileUpload}
                  data-testid="button-attach-file"
                >
                  <i className="fas fa-paperclip text-gray-400"></i>
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                <span>Shift + Enter para nova linha</span>
                <span className={charCount > 2000 ? 'text-red-500' : ''} data-testid="text-char-count">
                  {charCount}/2000
                </span>
              </div>
              
              {/* Uploaded Files Display */}
              {uploadedFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-100 p-2 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <i className="fas fa-file text-fab-blue"></i>
                        <span className="text-sm text-gray-700 truncate max-w-[200px]">{file.name}</span>
                        <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="h-6 w-6 p-0 hover:bg-red-100"
                      >
                        <i className="fas fa-times text-red-500 text-xs"></i>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || sendMessageMutation.isPending || charCount > 2000}
              className="bg-fab-blue hover:bg-blue-700"
              data-testid="button-send-message"
            >
              {sendMessageMutation.isPending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <i className="fas fa-paper-plane"></i>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Chat Sidebar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Histórico de Conversas</h3>
        <div className="space-y-3">
          {/* This would be populated with actual conversation history */}
          <div className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
            <p className="text-sm font-medium text-gray-900 truncate">Conversa atual</p>
            <p className="text-xs text-gray-500 mt-1">Agora</p>
          </div>
        </div>
      </div>
    </div>
  );
}
