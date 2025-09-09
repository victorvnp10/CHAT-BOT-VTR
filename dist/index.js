var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  chatbots: () => chatbots,
  conversations: () => conversations,
  insertChatbotSchema: () => insertChatbotSchema,
  insertConversationSchema: () => insertConversationSchema,
  insertUserSchema: () => insertUserSchema,
  loginSchema: () => loginSchema,
  messageSchema: () => messageSchema,
  users: () => users
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var chatbots = pgTable("chatbots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  persona: text("persona").notNull(),
  tarefa: text("tarefa").notNull(),
  instrucoes: text("instrucoes").notNull(),
  saida: text("saida").notNull(),
  mensagemInicial: text("mensagem_inicial"),
  tipoDocumento: text("tipo_documento").default("personalizado"),
  // "documento" ou "personalizado"
  icon: text("icon").default("fa-robot"),
  status: text("status").default("active"),
  createdAt: timestamp("created_at").defaultNow()
});
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull().unique(),
  password: varchar("password").notNull(),
  name: varchar("name").notNull(),
  rank: varchar("rank"),
  // Posto/Graduação militar
  unit: varchar("unit"),
  // Unidade de origem
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatbotId: varchar("chatbot_id").references(() => chatbots.id),
  userId: varchar("user_id").references(() => users.id),
  title: text("title").notNull(),
  messages: jsonb("messages").$type().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertChatbotSchema = createInsertSchema(chatbots).pick({
  name: true,
  persona: true,
  tarefa: true,
  instrucoes: true,
  saida: true,
  mensagemInicial: true,
  tipoDocumento: true,
  icon: true
});
var insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  name: true,
  rank: true,
  unit: true
}).extend({
  email: z.string().email("Email inv\xE1lido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres")
});
var loginSchema = z.object({
  email: z.string().email("Email inv\xE1lido"),
  password: z.string().min(1, "Senha \xE9 obrigat\xF3ria")
});
var insertConversationSchema = createInsertSchema(conversations).pick({
  chatbotId: true,
  userId: true,
  title: true
});
var messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string()
});

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
var DatabaseStorage = class {
  // User methods
  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || void 0;
  }
  async getUserById(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || void 0;
  }
  async createUser(userData) {
    const [user] = await db.insert(users).values({
      ...userData,
      isActive: true
    }).returning();
    return user;
  }
  async updateUser(id, userData) {
    const [user] = await db.update(users).set({
      ...userData,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(users.id, id)).returning();
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }
  // Chatbot methods
  async getChatbot(id) {
    const [chatbot] = await db.select().from(chatbots).where(eq(chatbots.id, id));
    return chatbot || void 0;
  }
  async getAllChatbots() {
    return await db.select().from(chatbots);
  }
  async createChatbot(insertChatbot) {
    const [chatbot] = await db.insert(chatbots).values({
      ...insertChatbot,
      status: "active",
      icon: insertChatbot.icon || "fa-robot",
      tipoDocumento: insertChatbot.tipoDocumento || "personalizado"
    }).returning();
    return chatbot;
  }
  async updateChatbot(id, updates) {
    const [chatbot] = await db.update(chatbots).set(updates).where(eq(chatbots.id, id)).returning();
    if (!chatbot) {
      throw new Error("Chatbot not found");
    }
    return chatbot;
  }
  async deleteChatbot(id) {
    await db.delete(chatbots).where(eq(chatbots.id, id));
  }
  // Conversation methods
  async getConversation(id) {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation || void 0;
  }
  async getConversationsByChatbot(chatbotId) {
    return await db.select().from(conversations).where(eq(conversations.chatbotId, chatbotId));
  }
  async getConversationsByUser(userId) {
    return await db.select().from(conversations).where(eq(conversations.userId, userId));
  }
  async createConversation(insertConversation) {
    const [conversation] = await db.insert(conversations).values({
      ...insertConversation,
      messages: []
    }).returning();
    return conversation;
  }
  async updateConversation(id, messages) {
    const messagesWithMetadata = messages.map((msg) => ({
      ...msg,
      id: randomUUID(),
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }));
    await db.update(conversations).set({
      messages: messagesWithMetadata,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(conversations.id, id));
  }
  async addMessageToConversation(conversationId, message) {
    const [existing] = await db.select().from(conversations).where(eq(conversations.id, conversationId));
    if (!existing) {
      throw new Error("Conversation not found");
    }
    const messageWithMetadata = {
      ...message,
      id: randomUUID(),
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    const updatedMessages = [...existing.messages || [], messageWithMetadata];
    await db.update(conversations).set({
      messages: updatedMessages,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(conversations.id, conversationId));
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
import OpenAI from "openai";
import multer from "multer";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";
import session from "express-session";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || "default_key"
});
var upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "text/plain",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});
async function registerRoutes(app2) {
  app2.use(session({
    secret: process.env.SESSION_SECRET || "dev-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1e3
      // 24 hours
    }
  }));
  const requireAuth = (req, res, next) => {
    if (req.session?.userId) {
      next();
    } else {
      res.status(401).json({ error: "Authentication required" });
    }
  };
  app2.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ error: "Email j\xE1 est\xE1 em uso" });
      }
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword
      });
      const { password, ...userWithoutPassword } = user;
      req.session.userId = user.id;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Registration error:", error);
      if (error.issues) {
        res.status(400).json({ error: "Dados inv\xE1lidos", details: error.issues });
      } else {
        res.status(500).json({ error: "Erro interno do servidor" });
      }
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        return res.status(401).json({ error: "Email ou senha incorretos" });
      }
      const passwordMatch = await bcrypt.compare(validatedData.password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ error: "Email ou senha incorretos" });
      }
      if (!user.isActive) {
        return res.status(401).json({ error: "Conta desativada" });
      }
      req.session.userId = user.id;
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Login error:", error);
      if (error.issues) {
        res.status(400).json({ error: "Dados inv\xE1lidos", details: error.issues });
      } else {
        res.status(500).json({ error: "Erro interno do servidor" });
      }
    }
  });
  app2.post("/api/auth/logout", (req, res) => {
    req.session?.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "Erro ao fazer logout" });
      }
      res.json({ message: "Logout realizado com sucesso" });
    });
  });
  app2.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: "Usu\xE1rio n\xE3o encontrado" });
      }
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });
  app2.get("/api/chatbots", async (req, res) => {
    try {
      const chatbots2 = await storage.getAllChatbots();
      res.json(chatbots2);
    } catch (error) {
      console.error("Error fetching chatbots:", error);
      res.status(500).json({ error: "Failed to fetch chatbots" });
    }
  });
  app2.get("/api/chatbots/:id", async (req, res) => {
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
  app2.post("/api/chatbots", async (req, res) => {
    try {
      const validatedData = insertChatbotSchema.parse(req.body);
      const chatbot = await storage.createChatbot(validatedData);
      res.status(201).json(chatbot);
    } catch (error) {
      console.error("Error creating chatbot:", error);
      res.status(400).json({ error: "Invalid chatbot data" });
    }
  });
  app2.put("/api/chatbots/:id", async (req, res) => {
    try {
      const validatedData = insertChatbotSchema.partial().parse(req.body);
      const chatbot = await storage.updateChatbot(req.params.id, validatedData);
      res.json(chatbot);
    } catch (error) {
      console.error("Error updating chatbot:", error);
      res.status(400).json({ error: "Failed to update chatbot" });
    }
  });
  app2.delete("/api/chatbots/:id", async (req, res) => {
    try {
      await storage.deleteChatbot(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting chatbot:", error);
      res.status(500).json({ error: "Failed to delete chatbot" });
    }
  });
  app2.get("/api/conversations/chatbot/:chatbotId", async (req, res) => {
    try {
      const conversations2 = await storage.getConversationsByChatbot(req.params.chatbotId);
      res.json(conversations2);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });
  app2.post("/api/conversations", async (req, res) => {
    try {
      const validatedData = insertConversationSchema.parse(req.body);
      const conversation = await storage.createConversation(validatedData);
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(400).json({ error: "Invalid conversation data" });
    }
  });
  app2.get("/api/conversations/:id", async (req, res) => {
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
  app2.post("/api/chat/:conversationId", upload.array("files", 3), async (req, res) => {
    try {
      const { message } = req.body;
      const conversationId = req.params.conversationId;
      const files = req.files;
      const validatedMessage = messageSchema.parse({
        role: "user",
        content: message
      });
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const chatbot = await storage.getChatbot(conversation.chatbotId);
      if (!chatbot) {
        return res.status(404).json({ error: "Chatbot not found" });
      }
      let enhancedMessage = message;
      if (files && files.length > 0) {
        const fileDescriptions = files.map((f) => `${f.originalname} (${f.mimetype})`).join(", ");
        enhancedMessage += `
[Arquivos anexados: ${fileDescriptions}]`;
      }
      const enhancedValidatedMessage = messageSchema.parse({
        role: "user",
        content: enhancedMessage
      });
      await storage.addMessageToConversation(conversationId, enhancedValidatedMessage);
      const systemPrompt = `PERSONA: ${chatbot.persona}

TAREFA: ${chatbot.tarefa}

INSTRU\xC7\xD5ES: ${chatbot.instrucoes}

SA\xCDDA ESPERADA: ${chatbot.saida}

IMPORTANTE: SEMPRE comece gerando um documento completo inicial. Depois pergunte se deseja melhorias. Termine sempre com vers\xE3o final.`;
      let processedContent = message;
      const messageContent = [{ type: "text", text: message }];
      let hasImages = false;
      if (files && files.length > 0) {
        for (const file of files) {
          const fileType = file.mimetype;
          if (fileType.startsWith("image/")) {
            const base64Image = file.buffer.toString("base64");
            messageContent.push({
              type: "image_url",
              image_url: {
                url: `data:${fileType};base64,${base64Image}`
              }
            });
            hasImages = true;
            processedContent += `
[Imagem anexada: ${file.originalname}]`;
          } else if (fileType.includes("text") || file.originalname.endsWith(".txt")) {
            const textContent = file.buffer.toString("utf-8");
            processedContent += `

[Conte\xFAdo do arquivo ${file.originalname}]:
${textContent}`;
          } else if (fileType === "application/pdf") {
            try {
              const tempDir = path.join(__dirname, "../temp");
              if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
              }
              const tempFilePath = path.join(tempDir, `${Date.now()}-${file.originalname}`);
              fs.writeFileSync(tempFilePath, file.buffer);
              try {
                const textOutput = execSync(`pdftotext "${tempFilePath}" -`, { encoding: "utf8" });
                const extractedText = textOutput.trim();
                if (extractedText && extractedText.length > 10) {
                  processedContent += `

[Conte\xFAdo extra\xEDdo do PDF ${file.originalname}]:
${extractedText}`;
                } else {
                  processedContent += `
[PDF anexado: ${file.originalname} (${(file.size / 1024).toFixed(1)} KB) - Texto n\xE3o p\xF4de ser extra\xEDdo]`;
                }
              } catch (extractError) {
                processedContent += `
[PDF anexado: ${file.originalname} (${(file.size / 1024).toFixed(1)} KB) - Processamento como imagem necess\xE1rio]`;
              }
              if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
              }
            } catch (error) {
              console.error(`Error processing PDF ${file.originalname}:`, error);
              processedContent += `
[PDF anexado: ${file.originalname} (${(file.size / 1024).toFixed(1)} KB)]`;
            }
          } else {
            processedContent += `
[Documento anexado: ${file.originalname} (${(file.size / 1024).toFixed(1)} KB)]`;
          }
        }
      }
      const finalContent = hasImages ? messageContent : processedContent;
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...(conversation.messages || []).map((msg) => ({
            role: msg.role,
            content: msg.content
          })),
          {
            role: "user",
            content: finalContent
          }
        ],
        temperature: 0.3,
        max_tokens: 3e3
      });
      const assistantResponse = response.choices[0]?.message?.content || "Desculpe, n\xE3o foi poss\xEDvel gerar uma resposta.";
      const assistantMessage = {
        role: "assistant",
        content: assistantResponse
      };
      await storage.addMessageToConversation(conversationId, assistantMessage);
      const updatedConversation = await storage.getConversation(conversationId);
      res.json(updatedConversation);
    } catch (error) {
      console.error("Error in chat:", error);
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });
  app2.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const fileContent = req.file.buffer.toString("utf8");
      res.json({ content: fileContent });
    } catch (error) {
      console.error("Error processing file:", error);
      res.status(500).json({ error: "Failed to process file" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs2 from "fs";
import path3 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path2 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path2.resolve(import.meta.dirname, "client", "src"),
      "@shared": path2.resolve(import.meta.dirname, "shared"),
      "@assets": path2.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path2.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path2.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path3.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path3.resolve(import.meta.dirname, "public");
  if (!fs2.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path3.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path4 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path4.startsWith("/api")) {
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
