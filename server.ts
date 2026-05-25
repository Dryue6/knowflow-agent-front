import dotenv from "dotenv";
import express from "express";
import type { Express, RequestHandler } from "express";
import path from "path";
import { Readable } from "stream";
import { createServer as createViteServer } from "vite";

dotenv.config({ path: ".env.local" });
dotenv.config();

type ApiMode = "real" | "mock";

const PORT = Number(process.env.PORT || 3000);
const API_PREFIX = "/api";

const normalizeApiMode = (value: string | undefined): ApiMode => {
  return value?.toLowerCase() === "mock" ? "mock" : "real";
};

const jsonResult = <T>(data: T, message = "success") => ({
  code: "0",
  message,
  data,
  timestamp: new Date().toISOString(),
});

const getBackendApiBaseUrl = () => {
  const explicitBackendUrl = process.env.BACKEND_API_URL || process.env.VITE_BACKEND_API_URL || "";
  if (explicitBackendUrl) {
    return explicitBackendUrl;
  }

  const frontendApiBaseUrl = process.env.VITE_API_BASE_URL || "";
  return /^https?:\/\//i.test(frontendApiBaseUrl) ? frontendApiBaseUrl : "";
};

const toProxyTarget = (backendApiBaseUrl: string, originalUrl: string) => {
  const baseUrl = backendApiBaseUrl.replace(/\/+$/, "");
  const pathWithQuery = originalUrl.replace(/^\/api(?=\/|\?|$)/, "");
  return `${baseUrl}${pathWithQuery || ""}`;
};

const createApiProxy = (backendApiBaseUrl: string): RequestHandler => {
  const skippedRequestHeaders = new Set(["host", "connection"]);
  const skippedResponseHeaders = new Set([
    "connection",
    "content-encoding",
    "content-length",
    "transfer-encoding",
  ]);

  return async (req, res) => {
    const targetUrl = toProxyTarget(backendApiBaseUrl, req.originalUrl);
    const headers = new Headers();

    for (const [key, value] of Object.entries(req.headers)) {
      if (skippedRequestHeaders.has(key.toLowerCase()) || value === undefined) {
        continue;
      }

      if (Array.isArray(value)) {
        value.forEach((item) => headers.append(key, item));
      } else {
        headers.set(key, value);
      }
    }

    try {
      const hasBody = req.method !== "GET" && req.method !== "HEAD";
      const proxyResponse = await fetch(targetUrl, {
        method: req.method,
        headers,
        body: hasBody ? (req as unknown as BodyInit) : undefined,
        duplex: "half",
      } as RequestInit & { duplex: "half" });

      res.status(proxyResponse.status);
      proxyResponse.headers.forEach((value, key) => {
        if (!skippedResponseHeaders.has(key.toLowerCase())) {
          res.setHeader(key, value);
        }
      });

      if (!proxyResponse.body) {
        res.end();
        return;
      }

      Readable.fromWeb(proxyResponse.body as any).pipe(res);
    } catch (error) {
      console.error(`Failed to proxy ${req.method} ${req.originalUrl} -> ${targetUrl}`, error);
      res.status(502).json({
        code: "BAD_GATEWAY",
        message: "Failed to proxy request to backend API",
        data: null,
        timestamp: new Date().toISOString(),
      });
    }
  };
};

const registerMockApi = (app: Express) => {
  app.use(express.json());

  let knowledgeBases = [
    {
      id: 1,
      name: "Enterprise Policy Base",
      description: "Company policies, workflows, and expense documents.",
      status: "ACTIVE",
      documentCount: 1,
      chunkCount: 18,
      createdAt: "2026-05-16T15:20:00",
      updatedAt: "2026-05-16T15:21:00",
    },
  ];

  let documents = [
    {
      id: 1,
      knowledgeBaseId: 1,
      fileName: "policy_01.pdf",
      originalFileName: "employee_handbook.pdf",
      fileType: "PDF",
      fileSize: 1024 * 512,
      title: "Employee Handbook",
      status: "INDEXED",
      errorMessage: null,
      chunkCount: 12,
      constraintLevel: "NORMAL",
      constraintPriority: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  let sessions = [
    {
      id: 10,
      knowledgeBaseId: 1,
      title: "Expense policy consultation",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const messagesBySession = new Map<number, any[]>([
    [
      10,
      [
        {
          id: 101,
          sessionId: 10,
          role: "USER",
          content: "Hello",
          citationsJson: null,
          createdAt: new Date().toISOString(),
        },
        {
          id: 102,
          sessionId: 10,
          role: "ASSISTANT",
          content: "Hello, I am the Knowflow assistant. How can I help?",
          citationsJson: null,
          createdAt: new Date().toISOString(),
        },
      ],
    ],
  ]);

  app.post(`${API_PREFIX}/auth/login`, (_req, res) => {
    res.json(
      jsonResult({
        token: "mock-token-123",
        user: { id: 1, username: "admin", displayName: "Admin", status: "ACTIVE" },
      }),
    );
  });

  app.post(`${API_PREFIX}/auth/register`, (req, res) => {
    res.json(
      jsonResult({
        id: Date.now(),
        username: req.body.username,
        displayName: req.body.displayName || req.body.username,
        status: "ACTIVE",
      }),
    );
  });

  app.get(`${API_PREFIX}/knowledge-bases`, (_req, res) => {
    res.json(jsonResult({ records: knowledgeBases, total: knowledgeBases.length, page: 1, size: 10 }));
  });

  app.post(`${API_PREFIX}/knowledge-bases`, (req, res) => {
    const newKb = {
      ...req.body,
      id: Date.now(),
      status: "ACTIVE",
      documentCount: 0,
      chunkCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    knowledgeBases = [newKb, ...knowledgeBases];
    res.json(jsonResult(newKb));
  });

  app.get(`${API_PREFIX}/knowledge-bases/:id`, (req, res) => {
    const kb = knowledgeBases.find((item) => item.id === Number(req.params.id));
    if (!kb) {
      res.status(404).json(jsonResult(null, "knowledge base not found"));
      return;
    }
    res.json(jsonResult(kb));
  });

  app.put(`${API_PREFIX}/knowledge-bases/:id`, (req, res) => {
    const id = Number(req.params.id);
    let updatedKb: any = null;
    knowledgeBases = knowledgeBases.map((item) => {
      if (item.id !== id) {
        return item;
      }

      updatedKb = { ...item, ...req.body, updatedAt: new Date().toISOString() };
      return updatedKb;
    });

    if (!updatedKb) {
      res.status(404).json(jsonResult(null, "knowledge base not found"));
      return;
    }

    res.json(jsonResult(updatedKb));
  });

  app.delete(`${API_PREFIX}/knowledge-bases/:id`, (req, res) => {
    const id = Number(req.params.id);
    knowledgeBases = knowledgeBases.filter((item) => item.id !== id);
    documents = documents.filter((item) => item.knowledgeBaseId !== id);
    res.json(jsonResult(null));
  });

  app.get(`${API_PREFIX}/knowledge-bases/:kbId/documents`, (req, res) => {
    const kbId = Number(req.params.kbId);
    const records = documents.filter((item) => item.knowledgeBaseId === kbId);
    res.json(jsonResult({ records, total: records.length, page: 1, size: 10 }));
  });

  app.post(`${API_PREFIX}/knowledge-bases/:kbId/documents/upload`, (req, res) => {
    const originalFileNameHeader = req.headers["x-file-name"];
    const originalFileName = Array.isArray(originalFileNameHeader)
      ? originalFileNameHeader[0]
      : originalFileNameHeader;
    const newDocument = {
      id: Date.now(),
      knowledgeBaseId: Number(req.params.kbId),
      fileName: `mock_${Date.now()}.pdf`,
      originalFileName: originalFileName || "uploaded_document.pdf",
      fileType: "PDF",
      fileSize: Number(req.headers["content-length"] || 0),
      title: "Uploaded Document",
      status: "INDEXED",
      errorMessage: null,
      chunkCount: 6,
      constraintLevel: "NORMAL",
      constraintPriority: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    documents = [newDocument, ...documents];
    knowledgeBases = knowledgeBases.map((item) =>
      item.id === newDocument.knowledgeBaseId
        ? {
            ...item,
            documentCount: item.documentCount + 1,
            chunkCount: item.chunkCount + newDocument.chunkCount,
            updatedAt: new Date().toISOString(),
          }
        : item,
    );
    res.json(jsonResult(newDocument));
  });

  app.delete(`${API_PREFIX}/documents/:id`, (req, res) => {
    const id = Number(req.params.id);
    documents = documents.filter((item) => item.id !== id);
    res.json(jsonResult(null));
  });

  app.get(`${API_PREFIX}/documents/:id`, (req, res) => {
    const document = documents.find((item) => item.id === Number(req.params.id));
    if (!document) {
      res.status(404).json(jsonResult(null, "document not found"));
      return;
    }
    res.json(jsonResult(document));
  });

  app.patch(`${API_PREFIX}/documents/:id/constraint`, (req, res) => {
    const id = Number(req.params.id);
    let updatedDocument: any = null;
    documents = documents.map((item) => {
      if (item.id !== id) {
        return item;
      }
      updatedDocument = {
        ...item,
        constraintLevel: req.body.constraintLevel || "NORMAL",
        constraintPriority: req.body.constraintPriority ?? 100,
        updatedAt: new Date().toISOString(),
      };
      return updatedDocument;
    });
    if (!updatedDocument) {
      res.status(404).json(jsonResult(null, "document not found"));
      return;
    }
    res.json(jsonResult(updatedDocument));
  });

  app.get(`${API_PREFIX}/documents/:id/file`, (req, res) => {
    const document = documents.find((item) => item.id === Number(req.params.id));
    if (!document) {
      res.status(404).json(jsonResult(null, "document not found"));
      return;
    }
    res.setHeader("Content-Type", document.fileType === "PDF" ? "application/pdf" : "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", `inline; filename="${document.originalFileName}"`);
    res.send(`Mock file content for ${document.originalFileName}`);
  });

  app.get(`${API_PREFIX}/documents/:id/download`, (req, res) => {
    const document = documents.find((item) => item.id === Number(req.params.id));
    if (!document) {
      res.status(404).json(jsonResult(null, "document not found"));
      return;
    }
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${document.originalFileName}"`);
    res.send(`Mock file content for ${document.originalFileName}`);
  });

  app.get(`${API_PREFIX}/documents/:id/preview-text`, (req, res) => {
    const document = documents.find((item) => item.id === Number(req.params.id));
    if (!document) {
      res.status(404).json(jsonResult(null, "document not found"));
      return;
    }
    res.json(
      jsonResult({
        documentId: document.id,
        fileName: document.originalFileName,
        fileType: document.fileType,
        content: `# ${document.originalFileName}\n\nThis is mock preview text for the selected document.`,
        previewMode: "TEXT",
      }),
    );
  });

  app.post(`${API_PREFIX}/documents/:id/reindex`, (req, res) => {
    res.json(jsonResult({ documentId: Number(req.params.id), status: "RUNNING", progress: 0 }));
  });

  app.get(`${API_PREFIX}/documents/:id/chunks`, (req, res) => {
    const documentId = Number(req.params.id);
    res.json(
      jsonResult({
        records: [
          {
            id: 1,
            documentId,
            chunkIndex: 0,
            content: "Mock chunk content from the selected document.",
            tokenCount: 12,
            vectorId: "mock-vector-1",
            createdAt: new Date().toISOString(),
          },
        ],
        total: 1,
        page: 1,
        size: 10,
      }),
    );
  });

  app.get(`${API_PREFIX}/documents/:id/index-job`, (req, res) => {
    const documentId = Number(req.params.id);
    res.json(
      jsonResult({
        id: documentId,
        documentId,
        knowledgeBaseId: 1,
        jobType: "INDEX",
        status: "SUCCESS",
        progress: 100,
        errorMessage: null,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    );
  });

  app.get(`${API_PREFIX}/chat/sessions`, (_req, res) => {
    res.json(jsonResult({ records: sessions, total: sessions.length, page: 1, size: 10 }));
  });

  app.post(`${API_PREFIX}/chat/sessions`, (req, res) => {
    const newSession = {
      ...req.body,
      id: Date.now(),
      knowledgeBaseId: req.body.knowledgeBaseId || 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    sessions = [newSession, ...sessions];
    messagesBySession.set(newSession.id, []);
    res.json(jsonResult(newSession));
  });

  app.get(`${API_PREFIX}/chat/sessions/:sessionId/messages`, (req, res) => {
    const sessionId = Number(req.params.sessionId);
    const records = messagesBySession.get(sessionId) || [];
    res.json(jsonResult({ records, total: records.length, page: 1, size: 20 }));
  });

  app.delete(`${API_PREFIX}/chat/sessions/:id`, (req, res) => {
    const id = Number(req.params.id);
    sessions = sessions.filter((item) => item.id !== id);
    messagesBySession.delete(id);
    res.json(jsonResult(null));
  });

  app.post(`${API_PREFIX}/chat/sessions/:sessionId/messages/stream`, (req, res) => {
    const sessionId = Number(req.params.sessionId);
    const userContent = req.body.content || "";
    const userMessage = {
      id: Date.now(),
      sessionId,
      role: "USER",
      content: userContent,
      citationsJson: null,
      createdAt: new Date().toISOString(),
    };
    const assistantMessage = {
      id: Date.now() + 1,
      sessionId,
      role: "ASSISTANT",
      content: "Based on the knowledge base content, reimbursements usually require valid invoices, approval records, and itinerary proof.",
      citationsJson: JSON.stringify([
        {
          documentId: 1,
          documentName: "travel_expense_policy.pdf",
          chunkId: 12,
          chunkIndex: 3,
          contentPreview: "Travel reimbursement requires valid invoices...",
          score: 0.87,
          pageNumber: 3,
          sectionTitle: "Travel expense policy",
          paragraphIndex: 5,
          locationText: "Page 3 / Travel expense policy / Paragraph 5",
        },
      ]),
      createdAt: new Date().toISOString(),
    };

    messagesBySession.set(sessionId, [
      ...(messagesBySession.get(sessionId) || []),
      userMessage,
      assistantMessage,
    ]);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.write(`event: userMessageId\ndata: ${userMessage.id}\n\n`);

    let i = 0;
    const tokens = assistantMessage.content.split("");
    const interval = setInterval(() => {
      if (i < tokens.length) {
        res.write(`event: message\ndata: ${JSON.stringify(tokens[i])}\n\n`);
        i += 1;
        return;
      }

      res.write(`event: assistantMessageId\ndata: ${assistantMessage.id}\n\n`);
      res.write(`event: citations\ndata: ${assistantMessage.citationsJson}\n\n`);
      clearInterval(interval);
      res.end();
    }, 25);
  });

  app.get(`${API_PREFIX}/health`, (_req, res) => {
    res.json({ status: "ok", mode: "mock" });
  });
};

async function startServer() {
  const app = express();
  const apiMode = normalizeApiMode(process.env.VITE_API_MODE || process.env.API_MODE);
  const backendApiBaseUrl = getBackendApiBaseUrl();

  if (apiMode === "mock") {
    registerMockApi(app);
    console.log("API mode: mock. Express mock API is enabled.");
  } else if (backendApiBaseUrl) {
    app.use(API_PREFIX, createApiProxy(backendApiBaseUrl));
    console.log(`API mode: real. Proxying ${API_PREFIX} to ${backendApiBaseUrl}`);
  } else {
    console.warn(
      "API mode: real. No BACKEND_API_URL or absolute VITE_API_BASE_URL is configured, so /api requests must be served by the deployment environment.",
    );
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
