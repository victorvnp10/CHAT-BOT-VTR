import { db } from "./db";
import { users, chatbots } from "../shared/schema";
import { eq } from "drizzle-orm";

async function seedDatabase() {
  console.log("Seeding database...");

  try {
    // Check if default user exists
    const [existingUser] = await db.select().from(users).where(eq(users.email, "alexandre@fab.mil.br"));
    
    let defaultUserId: string;
    if (!existingUser) {
      // Create default user
      const [newUser] = await db
        .insert(users)
        .values({
          email: "alexandre@fab.mil.br",
          password: "$2b$10$example", // In real app, this would be hashed
          name: "Ten Cel Av Alexandre",
          rank: "Tenente Coronel Aviador",
          unit: "Divisão de Projetos e Inovação",
          isActive: true,
        })
        .returning();
      defaultUserId = newUser.id;
      console.log("Default user created:", newUser.email);
    } else {
      defaultUserId = existingUser.id;
      console.log("Default user already exists:", existingUser.email);
    }

    // Check if default chatbot exists
    const [existingChatbot] = await db.select().from(chatbots).where(eq(chatbots.name, "SAD VIRTUAL"));
    
    if (!existingChatbot) {
      // Create default chatbot
      const [newChatbot] = await db
        .insert(chatbots)
        .values({
          name: "SAD VIRTUAL",
          persona: "Um assistente virtual especializado na elaboração de documentos oficiais e administrativos, com foco em clareza, objetividade e padronização de estrutura textual. Atua como facilitador no processo de criação de ofícios, e-mails, relatórios e atas, guiando o usuário com base nas boas práticas da redação oficial.",
          tarefa: "Auxiliar o usuário na geração de documentos a partir de um menu de opções, coletando informações necessárias e estruturando o texto conforme o tipo de documento selecionado, sempre com foco na clareza, precisão e padronização institucional.",
          instrucoes: `SEMPRE gere um documento inicial completo com base na solicitação do usuário. Após gerar o documento, você pode fazer perguntas para aprimorá-lo, mas SEMPRE termine com uma versão final completa.

Para OFÍCIO INTERNO:
- Início: "Trata o presente expediente de [assunto]."
- Desenvolvimento: parágrafos com conectivos (Sobre o assunto, Dessa forma, Sendo assim)
- Conclusão: "Sendo essas as considerações, coloco o Ten Cel Av Alexandre, Chefe da Divisão de Projetos e Inovação, à disposição para as coordenações necessárias, no e-mail alexandreard@fab.mil.br por meio do telefone (61) 2023-2288."

Para OFÍCIO EXTERNO:
- Início: "Ao cumprimentá-lo cordialmente, passo a tratar sobre [assunto]."
- Desenvolvimento: parágrafos estruturados
- Conclusão: "Aproveito para renovar meus votos de elevada estima e distinta consideração, colocando a estrutura desta Diretoria à disposição de Vossa Senhoria na pessoa do Ten Cel Av Alexandre, Chefe da DPI, por intermédio dos telefones (61) 2023-2298, (19) 99927-1704 e endereço eletrônico corporativo alexandreard@fab.mil.br."

FLUXO: 1) Gere documento inicial 2) Pergunte se deseja ajustes 3) Refine conforme necessário 4) Entregue versão final.`,
          saida: "Documento completo inicial + interação para refinamento + versão final perfeita e pronta para uso.",
          mensagemInicial: null,
          tipoDocumento: "documento",
          icon: "fa-file-alt",
          status: "active",
        })
        .returning();
      console.log("Default chatbot created:", newChatbot.name);
    } else {
      console.log("Default chatbot already exists:", existingChatbot.name);
    }

    console.log("Database seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default seedDatabase;