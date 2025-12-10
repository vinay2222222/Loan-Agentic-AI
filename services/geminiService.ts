import { GoogleGenAI, GenerateContentResponse, FunctionDeclaration, Type } from "@google/genai";
import { Message, AgentType } from "../types";

// --- Function Declarations for the Model ---

const updateStageTool: FunctionDeclaration = {
  name: "updateLoanStage",
  description: "Updates the current stage of the loan application process and sets the active agent.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      stage: {
        type: Type.STRING,
        enum: ["kyc", "underwriting", "decision", "sanction"],
        description: "The new stage to move to.",
      },
      agent: {
        type: Type.STRING,
        enum: ["Sales Agent", "KYC Agent", "Underwriting Agent", "Sanction Authority"],
        description: "The name of the agent now handling the conversation.",
      },
    },
    required: ["stage", "agent"],
  },
};

const requestDocTool: FunctionDeclaration = {
  name: "requestDocument",
  description: "Requests the user to upload a specific document type.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      docType: {
        type: Type.STRING,
        enum: ["identity_proof", "income_proof"],
        description: "The type of document to request.",
      },
    },
    required: ["docType"],
  },
};

const approveLoanTool: FunctionDeclaration = {
  name: "approveLoan",
  description: "Approves the loan and provides final details for the sanction letter.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      approvedAmount: { type: Type.NUMBER, description: "The final approved loan amount." },
      interestRate: { type: Type.NUMBER, description: "The interest rate percentage per annum." },
      tenureMonths: { type: Type.NUMBER, description: "The loan tenure in months." },
      applicantName: { type: Type.STRING, description: "The applicant's full name extracted from documents." }
    },
    required: ["approvedAmount", "interestRate", "tenureMonths", "applicantName"],
  },
};

const rejectLoanTool: FunctionDeclaration = {
  name: "rejectLoan",
  description: "Rejects the loan application.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      reason: { type: Type.STRING, description: "The reason for rejection." },
    },
    required: ["reason"],
  },
};

const tools = [updateStageTool, requestDocTool, approveLoanTool, rejectLoanTool];

// --- Service Logic ---

export interface GeminiResponse {
  text: string;
  functionCalls?: Array<{ name: string; args: any }>;
}

export const sendMessageToGemini = async (
  history: Message[],
  apiKey: string,
  latestImage?: { base64: string; mimeType: string }
): Promise<GeminiResponse> => {
  const ai = new GoogleGenAI({ apiKey });
  
  // We use gemini-2.5-flash for speed and multimodal capabilities
  const modelId = "gemini-2.5-flash";

  const systemInstruction = `
    You are the "Master Orchestrator" for SwiftLoan NBFC, an agentic AI loan processing system.
    You manage a team of virtual workers: Sales Agent, KYC Agent, Underwriting Agent, and Sanction Authority.
    
    Your goal is to guide the user from "Hi" to a generated Sanction Letter.
    
    RULES:
    1. Start as "Sales Agent". Be friendly, ask for loan amount and purpose.
    2. Once basic info is collected, use 'updateLoanStage' to move to 'kyc' and switch to "KYC Agent".
    3. As "KYC Agent", use 'requestDocument' to ask for "identity_proof". Wait for the user to upload an image.
    4. Once an ID image is provided, acknowledge it, extract the name (simulate extraction or read from image), then use 'updateLoanStage' to move to 'underwriting' and switch to "Underwriting Agent".
    5. As "Underwriting Agent", ask for income details or use 'requestDocument' for "income_proof".
    6. Analyze the income/financials. If valid (monthly income > 30% of loan EMI roughly), approve.
    7. To approve, use 'approveLoan' with realistic terms (10-14% interest).
    8. To reject, use 'rejectLoan'.
    
    Maintain the persona of the current active agent. 
    Keep responses concise and chatty (mobile-first experience).
    If the user uploads an image, analyze it. For ID cards, verify the name. For salary slips, verify income.
  `;

  // Construct history for the API
  // We need to format the history correctly for the `generateContent` call or use `chats`.
  // Given the complexity of mixing text/images manually in stateless calls, let's format it explicitly.
  
  const contents = history.map(msg => {
    const parts: any[] = [{ text: msg.content }];
    if (msg.role === 'user' && msg.attachment) {
       // Clean base64 string if it has the prefix
       const base64Data = msg.attachment.base64.split(',')[1];
       parts.push({
         inlineData: {
           mimeType: 'image/jpeg', // Assuming jpeg for simplicity in this mapper, or extract from url
           data: base64Data
         }
       });
    }
    return {
      role: msg.role === 'model' ? 'model' : 'user',
      parts: parts
    };
  });

  // If there is a "latestImage" that hasn't been added to history yet (e.g., this is the current turn)
  // It should be handled by the caller appending it to history or sending it here.
  // For this implementation, we assume the caller adds the image to the `history` array before calling this.

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelId,
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.4, // Low temperature for consistent rule following
        tools: [{ functionDeclarations: tools }]
      }
    });

    const resultText = response.text || "";
    
    // Parse function calls
    const functionCalls: Array<{ name: string; args: any }> = [];
    const candidates = response.candidates || [];
    
    if (candidates.length > 0 && candidates[0].content && candidates[0].content.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.functionCall) {
          functionCalls.push({
            name: part.functionCall.name,
            args: part.functionCall.args
          });
        }
      }
    }

    return {
      text: resultText,
      functionCalls: functionCalls.length > 0 ? functionCalls : undefined
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      text: "I'm experiencing a temporary connection issue with the central server. Please try again."
    };
  }
};