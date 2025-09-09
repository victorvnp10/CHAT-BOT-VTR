import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertChatbotSchema, insertConversationSchema, messageSchema, insertUserSchema, loginSchema } from "../shared/schema";
import OpenAI from "openai";
import multer from "multer";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";
import session from "express-session";
import jwt from "jsonwebtoken";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// JWT functions
const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'dev-secret-key-change-in-production';

const generateToken = (userId: string) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '24h' });
};

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || "default_key" 
});

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Allow images, text files, and documents
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'text/plain', 'application/pdf',
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // JWT verification function
  const verifyToken = (token: string): any => {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return null;
    }
  };

  // JWT Authentication middleware
  const requireAuth = async (req: any, res: any, next: any) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const decoded = verifyToken(token);
      if (!decoded || !decoded.userId) {
        return res.status(401).json({ error: 'Invalid token' });
      }
      
      const user = await storage.getUserById(decoded.userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }
      
      if (!user.isActive) {
        return res.status(401).json({ error: 'Account disabled' });
      }
      
      req.user = user;
      next();
    } catch (error) {
      res.status(401).json({ error: 'Authentication required' });
    }
  };

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ error: "Email já está em uso" });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      
      // Create user
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
      });
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      // Set session
      (req.session as any).userId = user.id;
      
      res.status(201).json(userWithoutPassword);
    } catch (error: any) {
      console.error("Registration error:", error);
      if (error.issues) {
        res.status(400).json({ error: "Dados inválidos", details: error.issues });
      } else {
        res.status(500).json({ error: "Erro interno do servidor" });
      }
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      
      if (!user.isActive) {
        return res.status(401).json({ error: "Account disabled" });
      }
      
      const token = generateToken(user.id);
      const { password: _, ...userWithoutPassword } = user;
      
      res.json({
        user: userWithoutPassword,
        token,
        message: "Login successful"
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
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

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const { password, ...userWithoutPassword } = req.user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Chatbot routes
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

  app.post("/api/chatbots", async (req, res) => {
    try {
      const validatedData = insertChatbotSchema.parse(req.body);
      const chatbot = await storage.createChatbot(validatedData);
      res.status(201).json(chatbot);
    } catch (error) {
      console.error("Error creating chatbot:", error);
      res.status(400).json({ error: "Invalid chatbot data" });
    }
  });

  app.put("/api/chatbots/:id", async (req, res) => {
    try {
      const validatedData = insertChatbotSchema.partial().parse(req.body);
      const chatbot = await storage.updateChatbot(req.params.id, validatedData);
      res.json(chatbot);
    } catch (error) {
      console.error("Error updating chatbot:", error);
      res.status(400).json({ error: "Failed to update chatbot" });
    }
  });

  app.delete("/api/chatbots/:id", async (req, res) => {
    try {
      await storage.deleteChatbot(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting chatbot:", error);
      res.status(500).json({ error: "Failed to delete chatbot" });
    }
  });

  // Conversation routes
  app.get("/api/conversations/chatbot/:chatbotId", async (req, res) => {
    try {
      const conversations = await storage.getConversationsByChatbot(req.params.chatbotId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.post("/api/conversations", async (req, res) => {
    try {
      const validatedData = insertConversationSchema.parse(req.body);
      const conversation = await storage.createConversation(validatedData);
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(400).json({ error: "Invalid conversation data" });
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

  // Chat message route with file support
  app.post("/api/chat/:conversationId", upload.array('files', 3), async (req, res) => {
    try {
      const { message } = req.body;
      const conversationId = req.params.conversationId;
      const files = req.files as Express.Multer.File[];
      
      // Process chat message with optional files
      
      const validatedMessage = messageSchema.parse({
        role: "user",
        content: message
      });

      // Get conversation and chatbot
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      const chatbot = await storage.getChatbot(conversation.chatbotId!);
      if (!chatbot) {
        return res.status(404).json({ error: "Chatbot not found" });
      }

      // Create enhanced user message with file info
      let enhancedMessage = message;
      if (files && files.length > 0) {
        const fileDescriptions = files.map(f => `${f.originalname} (${f.mimetype})`).join(', ');
        enhancedMessage += `\n[Arquivos anexados: ${fileDescriptions}]`;
      }
      
      const enhancedValidatedMessage = messageSchema.parse({
        role: "user",
        content: enhancedMessage
      });
      
      // Add user message
      await storage.addMessageToConversation(conversationId, enhancedValidatedMessage);

      // Generate AI response - Direct structured prompt
      const systemPrompt = `PERSONA: ${chatbot.persona}

TAREFA: ${chatbot.tarefa}

INSTRUÇÕES: ${chatbot.instrucoes}

SAÍDA ESPERADA: ${chatbot.saida}

IMPORTANTE: SEMPRE comece gerando um documento completo inicial. Depois pergunte se deseja melhorias. Termine sempre com versão final.`;
      
      // Process files if any
      let processedContent = message;
      const messageContent: any[] = [{ type: "text", text: message }];
      let hasImages = false;
      
      if (files && files.length > 0) {
        // Processing attached files
        
        for (const file of files) {
          const fileType = file.mimetype;
          // Process images for OpenAI Vision
          if (fileType.startsWith('image/')) {
            const base64Image = file.buffer.toString('base64');
            messageContent.push({
              type: "image_url",
              image_url: {
                url: `data:${fileType};base64,${base64Image}`
              }
            });
            hasImages = true;
            processedContent += `\n[Imagem anexada: ${file.originalname}]`;
          }
          // Process text files
          else if (fileType.includes('text') || file.originalname.endsWith('.txt')) {
            const textContent = file.buffer.toString('utf-8');
            processedContent += `\n\n[Conteúdo do arquivo ${file.originalname}]:\n${textContent}`;
          }
          // Process PDFs
          else if (fileType === 'application/pdf') {
            try {
              const tempDir = path.join(__dirname, '../temp');
              if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
              }
              
              const tempFilePath = path.join(tempDir, `${Date.now()}-${file.originalname}`);
              fs.writeFileSync(tempFilePath, file.buffer);
              
              try {
                // Try to extract text using pdftotext (poppler-utils)
                const textOutput = execSync(`pdftotext "${tempFilePath}" -`, { encoding: 'utf8' });
                const extractedText = textOutput.trim();
                
                if (extractedText && extractedText.length > 10) {
                  processedContent += `\n\n[Conteúdo extraído do PDF ${file.originalname}]:\n${extractedText}`;
                } else {
                  processedContent += `\n[PDF anexado: ${file.originalname} (${(file.size / 1024).toFixed(1)} KB) - Texto não pôde ser extraído]`;
                }
              } catch (extractError) {
                processedContent += `\n[PDF anexado: ${file.originalname} (${(file.size / 1024).toFixed(1)} KB) - Processamento como imagem necessário]`;
              }
              
              // Clean up temp file
              if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
              }
            } catch (error) {
              console.error(`Error processing PDF ${file.originalname}:`, error);
              processedContent += `\n[PDF anexado: ${file.originalname} (${(file.size / 1024).toFixed(1)} KB)]`;
            }
          }
          // Process other documents (basic info only)
          else {
            processedContent += `\n[Documento anexado: ${file.originalname} (${(file.size / 1024).toFixed(1)} KB)]`;
          }
        }
      }
      
      // Determine which content format to use
      const finalContent = hasImages ? messageContent : processedContent;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...(conversation.messages || []).map(msg => ({
            role: msg.role as "user" | "assistant",
            content: msg.content
          })),
          { 
            role: "user", 
            content: finalContent
          }
        ],
        temperature: 0.3,
        max_tokens: 3000,
      });

      const assistantResponse = response.choices[0]?.message?.content || "Desculpe, não foi possível gerar uma resposta.";
      
      const assistantMessage = {
        role: "assistant" as const,
        content: assistantResponse
      };

      // Add assistant response
      await storage.addMessageToConversation(conversationId, assistantMessage);

      // Return updated conversation
      const updatedConversation = await storage.getConversation(conversationId);
      res.json(updatedConversation);

    } catch (error) {
      console.error("Error in chat:", error);
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });

  // File upload route
  app.post("/api/upload", upload.single("file"), async (req: MulterRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // For now, just return the file content as text
      // In a real implementation, you'd use libraries like pdf-parse or mammoth
      const fileContent = req.file!.buffer.toString('utf8');
      res.json({ content: fileContent });

    } catch (error) {
      console.error("Error processing file:", error);
      res.status(500).json({ error: "Failed to process file" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
