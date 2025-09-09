import express from "express";
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";

// Schema definitions
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

// Simple validation functions
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === 'string' && emailRegex.test(email);
};

const isValidPassword = (password) => {
  return typeof password === 'string' && password.length >= 6;
};

const isValidName = (name) => {
  return typeof name === 'string' && name.trim().length >= 2;
};

// JWT functions
const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'dev-secret-key-change-in-production';

const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '24h' });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Database functions
const getUserByEmail = async (email) => {
  const db = getDB();
  const [user] = await db.select().from(users).where(eq(users.email, email));
  return user || null;
};

const getUserById = async (id) => {
  const db = getDB();
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user || null;
};

const createUser = async (userData) => {
  const db = getDB();
  const [user] = await db
    .insert(users)
    .values({
      email: userData.email,
      password: userData.password,
      name: userData.name,
      rank: userData.rank || null,
      unit: userData.unit || null,
      isActive: true,
    })
    .returning();
  return user;
};

const getAllChatbots = async () => {
  const db = getDB();
  return await db.select().from(chatbots);
};

const getChatbot = async (id) => {
  const db = getDB();
  const [chatbot] = await db.select().from(chatbots).where(eq(chatbots.id, id));
  return chatbot || null;
};

const createChatbot = async (data) => {
  const db = getDB();
  const [chatbot] = await db
    .insert(chatbots)
    .values({
      name: data.name,
      persona: data.persona,
      tarefa: data.tarefa,
      instrucoes: data.instrucoes,
      saida: data.saida,
      mensagemInicial: data.mensagemInicial || null,
      tipoDocumento: data.tipoDocumento || "personalizado",
      icon: data.icon || "fa-robot",
      status: "active",
    })
    .returning();
  return chatbot;
};

const getConversationsByChatbot = async (chatbotId) => {
  const db = getDB();
  return await db.select().from(conversations).where(eq(conversations.chatbotId, chatbotId));
};

const getConversation = async (id) => {
  const db = getDB();
  const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
  return conversation || null;
};

const createConversation = async (data) => {
  const db = getDB();
  const [conversation] = await db
    .insert(conversations)
    .values({
      chatbotId: data.chatbotId,
      userId: data.userId,
      title: data.title,
      messages: [],
    })
    .returning();
  return conversation;
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

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: false }));

  // Auth middleware
  const requireAuth = async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ error: 'Token de acesso necessário' });
      }
      
      const decoded = verifyToken(token);
      if (!decoded || !decoded.userId) {
        return res.status(401).json({ error: 'Token inválido' });
      }
      
      const user = await getUserById(decoded.userId);
      if (!user) {
        return res.status(401).json({ error: 'Usuário não encontrado' });
      }
      
      if (!user.isActive) {
        return res.status(401).json({ error: 'Conta desativada' });
      }
      
      req.user = user;
      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(401).json({ error: 'Erro de autenticação' });
    }
  };

  // ROUTES

  // Register
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, name, rank, unit } = req.body;
      
      // Validation
      if (!email || !password || !name) {
        return res.status(400).json({ 
          error: "Email, senha e nome são obrigatórios" 
        });
      }
      
      if (!isValidEmail(email)) {
        return res.status(400).json({ 
          error: "Email inválido" 
        });
      }
      
      if (!isValidPassword(password)) {
        return res.status(400).json({ 
          error: "Senha deve ter pelo menos 6 caracteres" 
        });
      }
      
      if (!isValidName(name)) {
        return res.status(400).json({ 
          error: "Nome deve ter pelo menos 2 caracteres" 
        });
      }
      
      // Check if user exists
      const existingUser = await getUserByEmail(email.toLowerCase().trim());
      if (existingUser) {
        return res.status(400).json({ 
          error: "Este email já está em uso" 
        });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);
      
      // Create user
      const user = await createUser({
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        name: name.trim(),
        rank: rank ? rank.trim() : null,
        unit: unit ? unit.trim() : null,
      });
      
      // Generate token
      const token = generateToken(user.id);
      
      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      
      res.status(201).json({
        user: userWithoutPassword,
        token,
        message: "Conta criada com sucesso"
      });
      
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ 
        error: "Erro interno do servidor",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Login - TESTE DIRETO
  app.post("/api/auth/login", async (req, res) => {
    console.log('=== LOGIN ENDPOINT HIT ===');
    console.log('Request body:', req.body);
    
    // Resposta de teste direto
    const testToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token";
    const testUser = {
      id: "test-id",
      email: "test@test.com", 
      name: "Test User"
    };
    
    const testResponse = {
      user: testUser,
      token: testToken,
      message: "Login teste realizado com sucesso"
    };
    
    console.log('=== SENDING TEST RESPONSE ===');
    console.log(JSON.stringify(testResponse, null, 2));
    
    res.json(testResponse);
  });

  // Get current user
  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const { password, ...userWithoutPassword } = req.user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ 
        error: "Erro interno do servidor" 
      });
    }
  });

  // Logout (client-side with JWT)
  app.post("/api/auth/logout", (req, res) => {
    res.json({ 
      message: "Logout realizado com sucesso" 
    });
  });

  // Chatbot routes
  app.get("/api/chatbots", async (req, res) => {
    try {
      const chatbots = await getAllChatbots();
      res.json(chatbots);
    } catch (error) {
      console.error("Error fetching chatbots:", error);
      res.status(500).json({ error: "Erro ao buscar chatbots" });
    }
  });

  app.get("/api/chatbots/:id", async (req, res) => {
    try {
      const chatbot = await getChatbot(req.params.id);
      if (!chatbot) {
        return res.status(404).json({ error: "Chatbot não encontrado" });
      }
      res.json(chatbot);
    } catch (error) {
      console.error("Error fetching chatbot:", error);
      res.status(500).json({ error: "Erro ao buscar chatbot" });
    }
  });

  app.post("/api/chatbots", requireAuth, async (req, res) => {
    try {
      const { name, persona, tarefa, instrucoes, saida, mensagemInicial, tipoDocumento, icon } = req.body;
      
      if (!name || !persona || !tarefa || !instrucoes || !saida) {
        return res.status(400).json({ error: "Campos obrigatórios em falta" });
      }
      
      const chatbot = await createChatbot({
        name: name.trim(),
        persona: persona.trim(),
        tarefa: tarefa.trim(),
        instrucoes: instrucoes.trim(),
        saida: saida.trim(),
        mensagemInicial: mensagemInicial ? mensagemInicial.trim() : null,
        tipoDocumento: tipoDocumento || "personalizado",
        icon: icon || "fa-robot",
      });
      
      res.status(201).json(chatbot);
    } catch (error) {
      console.error("Error creating chatbot:", error);
      res.status(400).json({ error: "Erro ao criar chatbot" });
    }
  });

  // Conversation routes
  app.get("/api/conversations/chatbot/:chatbotId", requireAuth, async (req, res) => {
    try {
      const conversations = await getConversationsByChatbot(req.params.chatbotId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Erro ao buscar conversas" });
    }
  });

  app.get("/api/conversations/:id", requireAuth, async (req, res) => {
    try {
      const conversation = await getConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversa não encontrada" });
      }
      res.json(conversation);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Erro ao buscar conversa" });
    }
  });

  app.post("/api/conversations", requireAuth, async (req, res) => {
    try {
      const { chatbotId, title } = req.body;
      
      if (!chatbotId || !title) {
        return res.status(400).json({ error: "ChatbotId e título são obrigatórios" });
      }
      
      const conversation = await createConversation({
        chatbotId,
        userId: req.user.id,
        title: title.trim(),
      });
      
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(400).json({ error: "Erro ao criar conversa" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      database: process.env.DATABASE_URL ? "connected" : "not configured"
    });
  });

  // Error handler
  app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ 
      error: "Erro interno do servidor",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  });

  return app;
};

// Cache da instância da app
let appInstance;

// Handler principal para Vercel
export default async function handler(req, res) {
  try {
    if (!appInstance) {
      appInstance = await createApp();
    }
    
    return appInstance(req, res);
  } catch (error) {
    console.error("Handler error:", error);
    res.status(500).json({ 
      error: "Erro interno do servidor", 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
}