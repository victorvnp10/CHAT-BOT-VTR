import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const chatbots = pgTable("chatbots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  persona: text("persona").notNull(),
  tarefa: text("tarefa").notNull(),
  instrucoes: text("instrucoes").notNull(),
  saida: text("saida").notNull(),
  mensagemInicial: text("mensagem_inicial"),
  tipoDocumento: text("tipo_documento").default("personalizado"), // "documento" ou "personalizado"
  icon: text("icon").default("fa-robot"),
  status: text("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull().unique(),
  password: varchar("password").notNull(),
  name: varchar("name").notNull(),
  rank: varchar("rank"), // Posto/Graduação militar
  unit: varchar("unit"), // Unidade de origem
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatbotId: varchar("chatbot_id").references(() => chatbots.id),
  userId: varchar("user_id").references(() => users.id),
  title: text("title").notNull(),
  messages: jsonb("messages").$type<Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertChatbotSchema = createInsertSchema(chatbots).pick({
  name: true,
  persona: true,
  tarefa: true,
  instrucoes: true,
  saida: true,
  mensagemInicial: true,
  tipoDocumento: true,
  icon: true,
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  name: true,
  rank: true,
  unit: true,
}).extend({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
});

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  chatbotId: true,
  userId: true,
  title: true,
});

export const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

export type InsertChatbot = z.infer<typeof insertChatbotSchema>;
export type Chatbot = typeof chatbots.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type LoginData = z.infer<typeof loginSchema>;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type Message = z.infer<typeof messageSchema>;
