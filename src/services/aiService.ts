import { Type, FunctionDeclaration } from "@google/genai";

const HOSTED_URL = "https://egman-play-634970902396.europe-west2.run.app";

const getBaseUrl = () => {
  const origin = window.location.origin || "";
  
  // Detect native mobile containers/webviews (APKs) running locally on phone
  const isNativeApp = origin.startsWith("file://") || 
                      origin.startsWith("capacitor://") ||
                      origin.startsWith("ionic://") ||
                      (window.location.hostname === "localhost" && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));

  if (isNativeApp) {
    return HOSTED_URL;
  }
  return "";
};

// Definitions of functions the AI can call (kept for compatibility/future use)
export const AI_FUNCTIONS: FunctionDeclaration[] = [
  {
    name: "registarTransacao",
    description: "Regista uma nova entrada ou saída (despesa) no sistema.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        tipo: { type: Type.STRING, enum: ["entrada", "saida"], description: "Tipo da transação" },
        valor: { type: Type.NUMBER, description: "Valor monetário da transação" },
        descricao: { type: Type.STRING, description: "Descrição opcional do que se trata" },
        categoria: { type: Type.STRING, description: "Categoria (ex: Tempo, Bebida, Snack, Despesa)" },
        metodo: { type: Type.STRING, enum: ["Dinheiro", "Multicaixa", "Transferência"], description: "Método de pagamento" }
      },
      required: ["tipo", "valor", "descricao", "categoria", "metodo"]
    }
  },
  {
    name: "alterarConfiguracao",
    description: "Altera as configurações do sistema como preço por hora ou estado do sistema.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        precoHora: { type: Type.NUMBER, description: "Novo preço por hora" },
        sistemaAberto: { type: Type.BOOLEAN, description: "Define se o sistema está aberto ou fechado" }
      }
    }
  },
  {
    name: "bloquearFuncionario",
    description: "Bloqueia ou desbloqueia um funcionário pelo ID.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING, description: "ID do funcionário" },
        ativo: { type: Type.BOOLEAN, description: "Estado pretendido (true para ativo, false para bloqueado)" }
      },
      required: ["id", "ativo"]
    }
  }
];

export const getSystemIntelligence = async (appState: any) => {
  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/api/ai/intelligence`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ appState })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.recomendas || [];
  } catch (error) {
    console.error("AI Intelligence Error:", error);
    return [];
  }
};

export const chatWithManager = async (message: string, appState: any, history: any[] = []) => {
  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/api/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message, appState, history })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return { response: { text: () => data.text || "Sem resposta." } };
  } catch (error) {
    console.error("Chat Error:", error);
    return { response: { text: () => "Desculpa, ocorreu um erro ao contactar a minha inteligência central. Verifica a ligação à Internet." } };
  }
};
