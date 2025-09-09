import express from "express";
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import session from "express-session";
import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";

// Schema definitions (inline to avoid import issues)
const chatbots = pgTable("chatbots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  persona: text("persona").notNull(),
  tarefa: text("tarefa").notNull(),
  instrucoes: text("instrucoes").notNull(),
  saida: text("saida").notNull(),
  mensagemInicial: text("mensagem_inicial"),
  tipoDocumento: text("tipo_documento").default("personalizado"),
  icon: text("icon").default("fa-robot"),
  status: text("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull().unique(),
  password: varchar("password").notNull(),
  name: varchar("name").notNull(),
  rank: varchar("rank"),
  unit: varchar("unit"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatbotId: varchar("chatbot_id").references(() => chatbots.id),
  userId: varchar("user_id").references(() => users.id),
  title: text("title").notNull(),
  messages: jsonb("messages").$type().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Database setup
neonConfig.webSocketConstructor = ws;

let db;
const getDB = () => {
  if (!db) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL must be set");
    }
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle({ client: pool, schema: { chatbots, users, conversations } });
  }
  return db;
};

// Storage methods
const storage = {
  async getUserByEmail(email) {
    const db = getDB();
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  },

  async getUserById(id) {
    const db = getDB();
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  },

  async createUser(userData) {
    const db = getDB();
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        isActive: true,
      })
      .returning();
    return user;
  },

  async getAllChatbots() {
    const db = getDB();
    return await db.select().from(chatbots);
  },

  async getChatbot(id) {
    const db = getDB();
    const [chatbot] = await db.select().from(chatbots).where(eq(chatbots.id, id));
    return chatbot || undefined;
  },

  async createChatbot(chatbotData) {
    const db = getDB();
    const [chatbot] = await db
      .insert(chatbots)
      .values({
        ...chatbotData,
        status: "active",
        icon: chatbotData.icon || "fa-robot",
        tipoDocumento: chatbotData.tipoDocumento || "personalizado",
      })
      .returning();
    return chatbot;
  },

  async getConversationsByChatbot(chatbotId) {
    const db = getDB();
    return await db.select().from(conversations).where(eq(conversations.chatbotId, chatbotId));
  },

  async getConversation(id) {
    const db = getDB();
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation || undefined;
  },

  async createConversation(conversationData) {
    const db = getDB();
    const [conversation] = await db
      .insert(conversations)
      .values({
        ...conversationData,
        messages: [],
      })
      .returning();
    return conversation;
  }
};

// Create Express app
const createApp = async () => {
  const app = express();
  
  // CORS middleware
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Session configuration for serverless
  app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000
    }
  }));

  // Authentication middleware
  const requireAuth = (req, res, next) => {
    if (req.session?.userId) {
      next();
    } else {
      res.status(401).json({ error: 'Authentication required' });
    }
  };

  // Routes
  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }
      
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email e senha são obrigatórios" });
      }
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Email ou senha incorretos" });
      }
      
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ error: "Email ou senha incorretos" });
      }
      
      if (!user.isActive) {
        return res.status(401).json({ error: "Conta desativada" });
      }
      
      req.session.userId = user.id;
      
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, name, rank, unit } = req.body;
      
      if (!email || !password || !name) {
        return res.status(400).json({ error: "Email, senha e nome são obrigatórios" });
      }
      
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email já está em uso" });
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        name,
        rank,
        unit,
      });
      
      const { password: _, ...userWithoutPassword } = user;
      req.session.userId = user.id;
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session?.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "Erro ao fazer logout" });
      }
      res.json({ message: "Logout realizado com sucesso" });
    });
  });

  app.get("/api/chatbots", async (req, res) => {
    try {
      const chatbots = await storage.getAllChatbots();
      res.json(chatbots);
    } catch (error) {
      console.error("Error fetching chatbots:", error);
      res.status(500).json({ error: "Failed to fetch chatbots" });
    }
  });

  app.get("/api/chatbots/:id", async (req, res) => {
    try {
      const chatbot = await storage.getChatbot(req.params.id);
      if (!chatbot) {
        return res.status(404).json({ error: "Chatbot not found" });
      }
      res.json(chatbot);
    } catch (error) {
      console.error("Error fetching chatbot:", error);
      res.status(500).json({ error: "Failed to fetch chatbot" });
    }
  });

  app.get("/api/conversations/chatbot/:chatbotId", async (req, res) => {
    try {
      const conversations = await storage.getConversationsByChatbot(req.params.chatbotId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", async (req, res) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      res.json(conversation);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.post("/api/conversations", async (req, res) => {
    try {
      const { chatbotId, userId, title } = req.body;
      
      if (!chatbotId || !title) {
        return res.status(400).json({ error: "chatbotId e title são obrigatórios" });
      }
      
      const conversation = await storage.createConversation({
        chatbotId,
        userId: userId || req.session.userId,
        title,
      });
      
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(400).json({ error: "Invalid conversation data" });
    }
  });

  // Error handler
  app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  });

  return app;
};

// Cache da instância da app
let appInstance;

// Handler principal para Vercel
export default async function handler(req, res) {
  try {
    // Log da requisição para debugging
    console.log(`${req.method} ${req.url} - User-Agent: ${req.headers['user-agent']}`);
    
    // Verificar variáveis de ambiente críticas
    if (!process.env.DATABASE_URL) {
      console.error("DATABASE_URL not found in environment variables");
      return res.status(500).json({ 
        error: "Database configuration missing",
        timestamp: new Date().toISOString()
      });
    }
    
    if (!appInstance) {
      console.log("Creating new app instance...");
      appInstance = await createApp();
      console.log("App instance created successfully");
    }
    
    return appInstance(req, res);
  } catch (error) {
    console.error("Handler error:", error);
    console.error("Error stack:", error.stack);
    
    res.status(500).json({ 
      error: "Internal Server Error", 
      details: error.message,
      timestamp: new Date().toISOString(),
      path: req.url
    });
  }
}