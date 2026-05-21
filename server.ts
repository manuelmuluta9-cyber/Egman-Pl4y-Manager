import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

  // API Route for system intelligence / insights
  app.post("/api/ai/intelligence", async (req, res) => {
    try {
      if (!ai) {
        return res.status(500).json({ error: "Gemini API key is not configured on the server." });
      }
      const { appState } = req.body;
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{
          role: "user",
          parts: [{
            text: `
            Analisa os seguintes dados do sistema EGMAN PLAY e fornece 3 recomendações curtas e diretas em formato JSON.
            Dados: ${JSON.stringify(appState)}
            
            O JSON deve ser um objeto com um array de strings chamado "recomendas".
            Exemplos de tom: "Sábado é o dia com mais lucro", "A Máquina 3 está a ser pouco rentável", "O Funcionário X é o que faturou mais".
            `
          }]
        }],
        config: {
          responseMimeType: "application/json",
        }
      });
      
      if (!response.text) return res.json({ recomendas: [] });
      const data = JSON.parse(response.text);
      return res.json({ recomendas: data.recomendas || [] });
    } catch (error: any) {
      console.error("Server AI Intelligence Error:", error);
      return res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // API Route for chat assistant
  app.post("/api/ai/chat", async (req, res) => {
    try {
      if (!ai) {
        return res.status(500).json({ error: "Gemini API key is not configured on the server." });
      }
      const { message, appState, history } = req.body;
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          ...history.map((h: any) => ({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.parts?.[0]?.text || h.text || "" }]
          })),
          { role: "user", parts: [{ text: message }] }
        ],
        config: {
          systemInstruction: `
            És o EGMAN MANAGER IA, o assistente inteligente oficial do sistema EGMAN PLAY.
            Tens acesso total aos dados (Transações, Máquinas, Funcionários, Sessões).
            Objetivo: Ajudar o administrador a gerir a empresa, dar insights e EXECUTAR ações através das ferramentas disponíveis.
            
            DADOS ATUAIS: ${JSON.stringify(appState)}
            
            Regras:
            1. Se o utilizador pedir para registar algo (ex: "vendi uma coca-cola por 500 em dinheiro"), a resposta deve indicar que estás pronto para ajudar mas como és uma ponte podes sugerir os campos.
            2. Dá sempre uma resposta textual explicativa curta.
            3. NÃO USES ASTERISCOS (*) OU FORMATAÇÃO MARKDOWN NO TEXTO. Escreve de forma limpa e natural.
            4. Sê profissional, direto e focado no crescimento do negócio.
            5. Podes prever lucros e tendências com base nas transações fornecidas.
          `,
        }
      });

      return res.json({ text: response.text || "Sem resposta." });
    } catch (error: any) {
      console.error("Server Chat Error:", error);
      return res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
