import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { InsertChatbot } from "@shared/schema";

interface ChatbotEditorProps {
  onBack: () => void;
}

const iconOptions = [
  "fa-file-alt",
  "fa-chart-bar", 
  "fa-cogs",
  "fa-calculator",
  "fa-clipboard-check",
  "fa-brain",
];

const tabs = [
  { id: "persona", label: "PERSONA", icon: "fa-user-tie" },
  { id: "interacao", label: "INTERAÇÃO", icon: "fa-comments" },
  { id: "tarefa", label: "TAREFA", icon: "fa-tasks" },
  { id: "instrucoes", label: "INSTRUÇÕES", icon: "fa-list-ol" },
  { id: "saida", label: "SAÍDA", icon: "fa-output" },
];

export function ChatbotEditor({ onBack }: ChatbotEditorProps) {
  const [activeTab, setActiveTab] = useState("persona");
  const [formData, setFormData] = useState<InsertChatbot>({
    name: "",
    persona: "",
    tarefa: "",
    instrucoes: "",
    saida: "",
    mensagemInicial: "",
    tipoDocumento: "personalizado",
    icon: "fa-robot",
  });
  const [incluirContato, setIncluirContato] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const saveChatbotMutation = useMutation({
    mutationFn: async (data: InsertChatbot) => {
      const response = await apiRequest("POST", "/api/chatbots", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Chatbot criado com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/chatbots"] });
      onBack();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao criar chatbot. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: keyof InsertChatbot, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleIconSelect = (icon: string) => {
    setFormData(prev => ({ ...prev, icon }));
  };

  const handleClearForm = () => {
    if (confirm("Tem certeza que deseja limpar todos os campos?")) {
      setFormData({
        name: "",
        persona: "",
        tarefa: "",
        instrucoes: "",
        saida: "",
        mensagemInicial: "",
        tipoDocumento: "personalizado",
        icon: "fa-robot",
      });
      setIncluirContato(false);
    }
  };

  const handleSaveChatbot = () => {
    // Basic validation
    const requiredFields: (keyof InsertChatbot)[] = ["name", "persona", "tarefa", "instrucoes", "saida"];
    const missingFields = requiredFields.filter(field => !formData[field]?.trim());

    if (missingFields.length > 0) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos antes de salvar.",
        variant: "destructive",
      });
      return;
    }

    saveChatbotMutation.mutate(formData);
  };

  const getConfigurationStatus = () => {
    const fields: { key: keyof InsertChatbot; label: string }[] = [
      { key: "persona", label: "PERSONA" },
      { key: "tarefa", label: "TAREFA" },
      { key: "instrucoes", label: "INSTRUÇÕES" },
      { key: "saida", label: "SAÍDA" },
    ];

    return fields.map(field => ({
      ...field,
      completed: (formData[field.key]?.trim()?.length || 0) > 0,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Gerenciar Chatbots</h2>
          <p className="text-gray-600 mt-1">Configure e gerencie assistentes virtuais personalizados</p>
        </div>
        <Button
          variant="outline"
          onClick={onBack}
          data-testid="button-back-to-main"
        >
          <i className="fas fa-arrow-left mr-2"></i>
          Voltar
        </Button>
      </div>

      {/* Chatbot Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor Panel */}
        <Card>
          {/* Editor Tabs */}
          <div className="border-b border-gray-200">
            <nav className="grid grid-cols-5 w-full">
              {tabs.map((tab) => (
                <Button
                  key={tab.id}
                  variant="ghost"
                  className={`px-2 py-4 text-xs font-medium rounded-none border-b-2 ${
                    activeTab === tab.id
                      ? "border-fab-blue text-fab-blue"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                  data-testid={`tab-${tab.id}`}
                >
                  <div className="flex flex-col items-center">
                    <i className={`fas ${tab.icon} text-sm mb-1`}></i>
                    <span className="text-xs">{tab.label}</span>
                  </div>
                </Button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* PERSONA Tab */}
            {activeTab === "persona" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome do Chatbot</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Ex: Assistente de Relatórios"
                    data-testid="input-chatbot-name"
                  />
                </div>
                <div>
                  <Label htmlFor="persona">Descrição da Persona</Label>
                  <Textarea
                    id="persona"
                    value={formData.persona}
                    onChange={(e) => handleInputChange("persona", e.target.value)}
                    rows={6}
                    placeholder="Descreva a especialização e características do assistente virtual..."
                    data-testid="textarea-persona"
                  />
                </div>
                <div>
                  <Label>Ícone</Label>
                  <div className="grid grid-cols-6 gap-2">
                    {iconOptions.map((icon) => (
                      <Button
                        key={icon}
                        variant="outline"
                        className={`w-10 h-10 p-0 ${
                          formData.icon === icon ? "border-fab-blue bg-blue-50" : ""
                        }`}
                        onClick={() => handleIconSelect(icon)}
                        data-testid={`icon-option-${icon}`}
                      >
                        <i className={`fas ${icon} text-gray-600`}></i>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* INTERAÇÃO Tab */}
            {activeTab === "interacao" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="tipoDocumento">Tipo do Chatbot</Label>
                  <div className="space-y-3 mt-2">
                    <div>
                      <Button
                        variant={formData.tipoDocumento === "documento" ? "default" : "outline"}
                        className={`w-full justify-start h-auto p-4 text-left ${
                          formData.tipoDocumento === "documento" ? "bg-fab-blue" : ""
                        }`}
                        onClick={() => handleInputChange("tipoDocumento", "documento")}
                        data-testid="button-tipo-documento"
                      >
                        <div className="w-full overflow-hidden">
                          <div className="flex items-center mb-2">
                            <i className="fas fa-file-alt mr-3 flex-shrink-0"></i>
                            <span className="font-medium break-words">Gerador de Documentos</span>
                          </div>
                          <p className="text-xs opacity-80 text-left leading-tight break-words whitespace-normal">
                            Mostra menu com opções de documentos (Ofício, E-mail, Relatório, Ata)
                          </p>
                        </div>
                      </Button>
                    </div>
                    <div>
                      <Button
                        variant={formData.tipoDocumento === "personalizado" ? "default" : "outline"}
                        className={`w-full justify-start h-auto p-4 text-left ${
                          formData.tipoDocumento === "personalizado" ? "bg-fab-blue" : ""
                        }`}
                        onClick={() => handleInputChange("tipoDocumento", "personalizado")}
                        data-testid="button-tipo-personalizado"
                      >
                        <div className="w-full overflow-hidden">
                          <div className="flex items-center mb-2">
                            <i className="fas fa-robot mr-3 flex-shrink-0"></i>
                            <span className="font-medium break-words">Chatbot Personalizado</span>
                          </div>
                          <p className="text-xs opacity-80 text-left leading-tight break-words whitespace-normal">
                            Usa mensagem inicial personalizada configurada abaixo
                          </p>
                        </div>
                      </Button>
                    </div>
                  </div>
                </div>

                {formData.tipoDocumento === "personalizado" && (
                  <div>
                    <Label htmlFor="mensagemInicial">Mensagem Inicial Personalizada</Label>
                    <Textarea
                      id="mensagemInicial"
                      value={formData.mensagemInicial || ""}
                      onChange={(e) => handleInputChange("mensagemInicial", e.target.value)}
                      rows={4}
                      placeholder="Ex: Olá! Sou especialista em análise de dados. Como posso ajudar você hoje?"
                      data-testid="textarea-mensagem-inicial"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Esta mensagem será exibida quando o usuário iniciar uma nova conversa
                    </p>
                  </div>
                )}

                {formData.tipoDocumento === "documento" && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <i className="fas fa-info-circle text-blue-600 mt-1"></i>
                      <div>
                        <p className="text-sm font-medium text-blue-800">Chatbot de Documentos</p>
                        <p className="text-xs text-blue-600 mt-1">
                          O usuário verá automaticamente um menu com as opções: Ofício Interno, Ofício Externo, E-mail, Relatório e Ata.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAREFA Tab */}
            {activeTab === "tarefa" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="objetivo">Objetivo Principal</Label>
                  <Textarea
                    id="objetivo"
                    value={formData.tarefa}
                    onChange={(e) => handleInputChange("tarefa", e.target.value)}
                    rows={4}
                    placeholder="Defina claramente qual é a função principal do chatbot..."
                    data-testid="textarea-tarefa"
                  />
                </div>
                <div>
                  <Label htmlFor="escopo">Escopo de Atuação</Label>
                  <Textarea
                    id="escopo"
                    rows={4}
                    placeholder="Especifique em quais áreas ou tipos de documentos o chatbot deve atuar..."
                    data-testid="textarea-escopo"
                  />
                </div>
                <div>
                  <Label htmlFor="limitacoes">Limitações</Label>
                  <Textarea
                    id="limitacoes"
                    rows={3}
                    placeholder="Defina o que o chatbot NÃO deve fazer..."
                    data-testid="textarea-limitacoes"
                  />
                </div>
              </div>
            )}

            {/* INSTRUÇÕES Tab */}
            {activeTab === "instrucoes" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="interacao">Regras de Interação</Label>
                  <Textarea
                    id="interacao"
                    value={formData.instrucoes}
                    onChange={(e) => handleInputChange("instrucoes", e.target.value)}
                    rows={6}
                    placeholder="Defina como o chatbot deve interagir com o usuário, incluindo tom, formato das perguntas, etc..."
                    data-testid="textarea-instrucoes"
                  />
                </div>
                <div>
                  <Label htmlFor="fluxo">Fluxo de Funcionamento</Label>
                  <Textarea
                    id="fluxo"
                    rows={6}
                    placeholder="Descreva passo a passo como o chatbot deve conduzir a conversa..."
                    data-testid="textarea-fluxo"
                  />
                </div>
                <div>
                  <Label htmlFor="regras">Regras Específicas</Label>
                  <Textarea
                    id="regras"
                    rows={4}
                    placeholder="Inclua regras específicas de formatação, normas, padrões, etc..."
                    data-testid="textarea-regras"
                  />
                </div>
              </div>
            )}

            {/* SAÍDA Tab */}
            {activeTab === "saida" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="formato">Formato Esperado</Label>
                  <Textarea
                    id="formato"
                    value={formData.saida}
                    onChange={(e) => handleInputChange("saida", e.target.value)}
                    rows={6}
                    placeholder="Descreva como as respostas devem ser estruturadas e formatadas..."
                    data-testid="textarea-saida"
                  />
                </div>
                <div>
                  <Label htmlFor="exemplo">Exemplo de Saída</Label>
                  <Textarea
                    id="exemplo"
                    rows={6}
                    placeholder="Forneça um exemplo concreto de como deve ser uma resposta típica..."
                    data-testid="textarea-exemplo"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="incluirContato"
                    checked={incluirContato}
                    onCheckedChange={(checked) => setIncluirContato(checked as boolean)}
                    data-testid="checkbox-incluir-contato"
                  />
                  <Label htmlFor="incluirContato">
                    Incluir informações de contato padrão
                  </Label>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="border-t border-gray-200 px-6 py-4 flex justify-between">
            <Button
              variant="ghost"
              onClick={handleClearForm}
              data-testid="button-clear-form"
            >
              <i className="fas fa-trash mr-2"></i>Limpar
            </Button>
            <div className="space-x-3">
              <Button
                variant="outline"
                data-testid="button-save-draft"
              >
                Salvar Rascunho
              </Button>
              <Button
                onClick={handleSaveChatbot}
                disabled={saveChatbotMutation.isPending}
                className="bg-fab-blue hover:bg-blue-700"
                data-testid="button-save-chatbot"
              >
                {saveChatbotMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Salvando...
                  </>
                ) : (
                  "Salvar Chatbot"
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Preview Panel */}
        <Card>
          <div className="border-b border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <i className="fas fa-eye mr-2 text-fab-blue"></i>
              Preview em Tempo Real
            </h3>
          </div>
          <div className="p-6">
            {/* Chatbot Card Preview */}
            <Card className="p-4 mb-6">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-fab-blue rounded-lg flex items-center justify-center">
                  <i className={`fas ${formData.icon} text-white`}></i>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900" data-testid="preview-chatbot-name">
                    {formData.name || "Novo Chatbot"}
                  </h4>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    Personalizado
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-gray-600" data-testid="preview-chatbot-description">
                {formData.persona || "Configure as seções para ver a descrição aqui..."}
              </p>
            </Card>

            {/* Configuration Summary */}
            <div className="space-y-4">
              <div className="border-l-4 border-fab-blue pl-4">
                <h4 className="font-medium text-gray-900 mb-2">Status da Configuração</h4>
                <div className="space-y-2 text-sm">
                  {getConfigurationStatus().map((field) => (
                    <div key={field.key} className="flex items-center space-x-2">
                      <i className={`fas fa-circle text-xs ${
                        field.completed ? "text-green-500" : "text-red-500"
                      }`}></i>
                      <span className="text-gray-600">
                        {field.label}: {field.completed ? "Configurado" : "Não configurado"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
