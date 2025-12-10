import { GoogleGenAI, GenerateContentResponse, FunctionDeclaration, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { Message, AgentType, LoanDetails } from "../types";

// --- Function Declarations for the Model ---

const updateStageTool: FunctionDeclaration = {
  name: "updateLoanStage",
  description: "Updates the current stage and active agent. Call this when handing off to the next agent.",
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
      statusMessage: {
        type: Type.STRING,
        description: "A short, specific status description for the UI (e.g., 'Verifying ID document', 'Analyzing income proof', 'Calculating credit score')."
      }
    },
    required: ["stage", "agent", "statusMessage"],
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
      applicantName: { type: Type.STRING, description: "The applicant's full name extracted from documents." },
      evidence: { type: Type.STRING, description: "Specific data points used for approval (e.g., 'Monthly income $5000 > $1500 threshold')." }
    },
    required: ["approvedAmount", "interestRate", "tenureMonths", "applicantName", "evidence"],
  },
};

const rejectLoanTool: FunctionDeclaration = {
  name: "rejectLoan",
  description: "Rejects the loan application.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      reason: { type: Type.STRING, description: "The main reason for rejection." },
      evidence: { type: Type.STRING, description: "Specific data points used for rejection (e.g., 'Credit score 550 < 650 requirement')." }
    },
    required: ["reason", "evidence"],
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
  activeAgent: AgentType,
  loanDetails: LoanDetails
): Promise<GeminiResponse> => {
  const ai = new GoogleGenAI({ apiKey });
  const modelId = "gemini-2.5-flash";

  const systemInstruction = `
    You are the "Master Orchestrator" for SwiftLoan NBFC.
    
    CURRENT CONTEXT:
    - Active Agent: ${activeAgent} (You MUST act as this agent)
    - Loan Status: ${loanDetails.status}
    - Applicant Name: ${loanDetails.applicantName || "Unknown"}
    
    Your goal is to guide the user from "Hi" to a generated Sanction Letter.

    AGENTS & WORKFLOW:

    1. **Sales Agent**
       - Goal: Gather Loan Amount & Purpose.
       - Handover Condition: Once amount/purpose are known.
       - Action: Call 'updateLoanStage(stage='kyc', agent='KYC Agent', statusMessage='Initializing Identity Verification')'.
       - REQUIRED TEXT RESPONSE: "Great! I've noted your requirements. I am now connecting you to our KYC Agent for identity verification.\n\nHello! I am the KYC Agent. To proceed, please upload a valid Identity Proof (Passport, ID Card, or Driver's License)."

    2. **KYC Agent**
       - Goal: Verify Identity & Extract Name.
       - Input: User uploads image.
       - Action: Analyze image. Extract Name. Call 'updateLoanStage(stage='underwriting', agent='Underwriting Agent', statusMessage='Assessing Financial Eligibility')'.
       - REQUIRED TEXT RESPONSE: "Thank you. I have verified your identity as [Name from ID]. I am now transferring you to Underwriting.\n\nHello! I am the Underwriting Agent. Please upload your latest Income Proof (Salary Slip or Bank Statement) so I can assess your loan eligibility."

    3. **Underwriting Agent**
       - Goal: Assess Affordability.
       - Input: User uploads income proof (or provides salary details).
       - Action: Analyze income.
         - IF VALID (Income > 2x EMI): Call 'approveLoan(..., evidence='Income $X covers EMI $Y...')'.
         - IF INVALID: Call 'rejectLoan(..., evidence='...')'.

    CRITICAL RULES:
    - When calling a tool to switch agents, you MUST include the introductory text for the NEW agent in your response.
    - If the user provides an image, assume it is the requested document.
    - The 'statusMessage' parameter in 'updateLoanStage' must be descriptive (e.g. "Verifying ID document", "Analyzing income proof").
    - Provide data-driven 'evidence' for approvals/rejections.
  `;

  const contents = history.map(msg => {
    const parts: any[] = [{ text: msg.content }];
    if (msg.role === 'user' && msg.attachment) {
       const base64Data = msg.attachment.base64.split(',')[1];
       parts.push({
         inlineData: {
           mimeType: msg.attachment.mimeType || 'image/jpeg',
           data: base64Data
         }
       });
    }
    return {
      role: msg.role === 'model' ? 'model' : 'user',
      parts: parts
    };
  });

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelId,
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.2, // Lower temperature for more rigid adherence to scripts
        tools: [{ functionDeclarations: tools }],
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ]
      }
    });

    const resultText = response.text || "";
    
    let functionCalls: Array<{ name: string; args: any }> = [];
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
      text: "I'm having trouble connecting to the SwiftLoan network. Please check your internet connection."
    };
  }
};
