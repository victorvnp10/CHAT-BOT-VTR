import { type Chatbot, type InsertChatbot, type Conversation, type InsertConversation, type Message, type User, type InsertUser } from "../shared/schema";
import { chatbots, conversations, users } from "../shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User>;
  
  // Chatbot methods
  getChatbot(id: string): Promise<Chatbot | undefined>;
  getAllChatbots(): Promise<Chatbot[]>;
  createChatbot(chatbot: InsertChatbot): Promise<Chatbot>;
  updateChatbot(id: string, chatbot: Partial<InsertChatbot>): Promise<Chatbot>;
  deleteChatbot(id: string): Promise<void>;
  
  // Conversation methods
  getConversation(id: string): Promise<Conversation | undefined>;
  getConversationsByChatbot(chatbotId: string): Promise<Conversation[]>;
  getConversationsByUser(userId: string): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, messages: Message[]): Promise<void>;
  addMessageToConversation(conversationId: string, message: Message): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        isActive: true,
      })
      .returning();
    return user;
  }

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...userData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }

  // Chatbot methods
  async getChatbot(id: string): Promise<Chatbot | undefined> {
    const [chatbot] = await db.select().from(chatbots).where(eq(chatbots.id, id));
    return chatbot || undefined;
  }

  async getAllChatbots(): Promise<Chatbot[]> {
    return await db.select().from(chatbots);
  }

  async createChatbot(insertChatbot: InsertChatbot): Promise<Chatbot> {
    const [chatbot] = await db
      .insert(chatbots)
      .values({
        ...insertChatbot,
        status: "active",
        icon: insertChatbot.icon || "fa-robot",
        tipoDocumento: insertChatbot.tipoDocumento || "personalizado",
      })
      .returning();
    return chatbot;
  }

  async updateChatbot(id: string, updates: Partial<InsertChatbot>): Promise<Chatbot> {
    const [chatbot] = await db
      .update(chatbots)
      .set(updates)
      .where(eq(chatbots.id, id))
      .returning();
    if (!chatbot) {
      throw new Error("Chatbot not found");
    }
    return chatbot;
  }

  async deleteChatbot(id: string): Promise<void> {
    await db.delete(chatbots).where(eq(chatbots.id, id));
  }

  // Conversation methods
  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation || undefined;
  }

  async getConversationsByChatbot(chatbotId: string): Promise<Conversation[]> {
    return await db.select().from(conversations).where(eq(conversations.chatbotId, chatbotId));
  }

  async getConversationsByUser(userId: string): Promise<Conversation[]> {
    return await db.select().from(conversations).where(eq(conversations.userId, userId));
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values({
        ...insertConversation,
        messages: [],
      })
      .returning();
    return conversation;
  }

  async updateConversation(id: string, messages: Message[]): Promise<void> {
    const messagesWithMetadata = messages.map(msg => ({
      ...msg,
      id: randomUUID(),
      timestamp: new Date().toISOString(),
    }));
    
    await db
      .update(conversations)
      .set({
        messages: messagesWithMetadata,
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, id));
  }

  async addMessageToConversation(conversationId: string, message: Message): Promise<void> {
    const [existing] = await db.select().from(conversations).where(eq(conversations.id, conversationId));
    if (!existing) {
      throw new Error("Conversation not found");
    }

    const messageWithMetadata = {
      ...message,
      id: randomUUID(),
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...(existing.messages || []), messageWithMetadata];
    
    await db
      .update(conversations)
      .set({
        messages: updatedMessages,
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, conversationId));
  }
}

export const storage = new DatabaseStorage();
