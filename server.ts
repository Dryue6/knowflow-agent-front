import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- Mock API Implementations ---

  // Auth
  app.post("/api/auth/login", (req, res) => {
    res.json({
      code: "0",
      message: "success",
      data: {
        token: "mock-token-123",
        user: { id: 1, username: "admin", displayName: "管理员", status: "ACTIVE" }
      },
      timestamp: new Date().toISOString()
    });
  });

  // Knowledge Bases
  let knowledgeBases = [
    {
      id: 1,
      name: "企业制度库",
      description: "公司制度、流程和报销文档",
      status: "ACTIVE",
      documentCount: 2,
      chunkCount: 18,
      createdAt: "2026-05-16T15:20:00",
      updatedAt: "2026-05-16T15:21:00"
    }
  ];

  app.get("/api/knowledge-bases", (req, res) => {
    res.json({
      code: "0",
      message: "success",
      data: { records: knowledgeBases, total: knowledgeBases.length, page: 1, size: 10 },
      timestamp: new Date().toISOString()
    });
  });

  // Documents
  let documents = [
    {
      id: 1,
      knowledgeBaseId: 1,
      fileName: "policy_01.pdf",
      originalFileName: "2024员工手册.pdf",
      fileType: "PDF",
      fileSize: 1024 * 512,
      title: "员工手册",
      status: "INDEXED",
      errorMessage: null,
      chunkCount: 12,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  app.get("/api/knowledge-bases/:kbId/documents", (req, res) => {
    res.json({
      code: "0",
      message: "success",
      data: { records: documents, total: documents.length, page: 1, size: 10 },
      timestamp: new Date().toISOString()
    });
  });

  app.post("/api/knowledge-bases", (req, res) => {
    const newKb = { ...req.body, id: Date.now(), status: "ACTIVE", documentCount: 0, chunkCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    knowledgeBases.push(newKb);
    res.json({ code: "0", message: "success", data: newKb, timestamp: new Date().toISOString() });
  });

  // Chat Sessions
  let sessions = [
    { id: 10, knowledgeBaseId: 1, title: "报销制度咨询", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ];

  app.get("/api/chat/sessions", (req, res) => {
    res.json({ code: "0", message: "success", data: { records: sessions, total: sessions.length, page: 1, size: 10 }, timestamp: new Date().toISOString() });
  });

  app.get("/api/chat/sessions/:sessionId/messages", (req, res) => {
    res.json({
      code: "0",
      message: "success",
      data: { 
        records: [
          { id: 101, sessionId: 10, role: "USER", content: "你好", createdAt: new Date().toISOString() },
          { id: 102, sessionId: 10, role: "ASSISTANT", content: "你好！我是 Knowflow 智能助手，有什么可以帮您的？", createdAt: new Date().toISOString() }
        ], 
        total: 2, page: 1, size: 20 
      },
      timestamp: new Date().toISOString()
    });
  });

  app.post("/api/chat/sessions", (req, res) => {
    const newSession = { ...req.body, id: Date.now(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    sessions.push(newSession);
    res.json({ code: "0", message: "success", data: newSession, timestamp: new Date().toISOString() });
  });

  // SSE Stream
  app.post("/api/chat/sessions/:sessionId/messages/stream", (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    res.write('event: userMessageId\ndata: 101\n\n');
    
    const words = "根据知识库内容，差旅报销通常需要提交真实有效发票、审批单和行程证明。".split('');
    let i = 0;
    const interval = setInterval(() => {
      if (i < words.length) {
        res.write(`event: message\ndata: ${JSON.stringify(words[i])}\n\n`);
        i++;
      } else {
        res.write('event: assistantMessageId\ndata: 102\n\n');
        res.write('event: citations\ndata: [{"documentId":1,"documentName":"差旅报销制度.pdf","chunkId":12,"chunkIndex":3,"contentPreview":"差旅报销需提交真实有效发票...","score":0.87}]\n\n');
        clearInterval(interval);
        res.end();
      }
    }, 50);
  });

  // Health
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
