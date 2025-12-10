import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Loader2, Download, AlertCircle } from 'lucide-react';
import { Message, AgentType, LoanDetails, AgentStatus } from './types';
import ChatBubble from './components/ChatBubble';
import StatusPanel from './components/StatusPanel';
import { sendMessageToGemini } from './services/geminiService';
import { generateSanctionLetter } from './utils/pdfGenerator';

const INITIAL_LOAN_DETAILS: LoanDetails = {
  status: 'initial'
};

const AGENT_GREETINGS: Record<AgentType, string> = {
  [AgentType.SALES]: "Hello! How can I help you with a loan today?",
  [AgentType.KYC]: "Hello! I am the KYC Agent. To verify your identity, please upload a clear photo of your Identity Proof (Passport, Driver's License, or National ID).",
  [AgentType.UNDERWRITING]: "Hello! I am the Underwriting Agent. I need to assess your financial eligibility. Please upload your latest Salary Slip or Bank Statement.",
  [AgentType.SANCTION]: "Processing your final decision details...",
};

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'model',
      content: "Hello! I'm your dedicated Loan Sales Agent at SwiftLoan. I can help you get a personal loan approval in minutes. To start, may I ask how much funding you are looking for?",
      timestamp: new Date(),
      sender: AgentType.SALES
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeAgent, setActiveAgent] = useState<AgentType>(AgentType.SALES);
  const [agentStatusMsg, setAgentStatusMsg] = useState<string>("Discussing loan requirements");
  const [loanDetails, setLoanDetails] = useState<LoanDetails>(INITIAL_LOAN_DETAILS);
  const [uploadRequest, setUploadRequest] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (text: string, attachment?: { url: string, base64: string, type: 'image', mimeType: string }) => {
    if ((!text.trim() && !attachment) || isLoading) return;

    // 1. Add User Message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
      attachment: attachment
    };
    
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputValue('');
    setUploadRequest(null);
    setIsLoading(true);

    try {
      const apiKey = process.env.API_KEY || ''; 
      if (!apiKey) throw new Error("API Key missing");

      // Pass current context to service
      const response = await sendMessageToGemini(newHistory, apiKey, activeAgent, loanDetails);

      let nextAgent = activeAgent;
      let nextStatusMsg = agentStatusMsg;
      let nextLoanDetails = { ...loanDetails };
      let toolTriggered = false;

      // 3. Handle Function Calls
      if (response.functionCalls) {
        toolTriggered = true;
        for (const call of response.functionCalls) {
          console.log("Processing Tool:", call.name, call.args);
          
          if (call.name === 'updateLoanStage') {
            const { agent, stage, statusMessage } = call.args;
            nextAgent = agent as AgentType;
            nextLoanDetails.status = stage === 'decision' ? 'underwriting' : stage;
            nextStatusMsg = statusMessage || "Processing handover...";
          } 
          else if (call.name === 'requestDocument') {
            const { docType } = call.args;
            setUploadRequest(docType);
            nextStatusMsg = `Waiting for ${docType.replace('_', ' ')} upload`;
          }
          else if (call.name === 'approveLoan') {
            const { approvedAmount, interestRate, tenureMonths, applicantName, evidence } = call.args;
            nextLoanDetails = {
              ...nextLoanDetails,
              status: 'approved',
              loanAmount: approvedAmount,
              interestRate,
              tenureMonths,
              applicantName,
              decisionReason: "Meets financial criteria",
              decisionEvidence: evidence
            };
            nextAgent = AgentType.SANCTION;
            nextStatusMsg = "Finalizing Sanction Letter";
          }
          else if (call.name === 'rejectLoan') {
            const { reason, evidence } = call.args;
            nextLoanDetails = {
              ...nextLoanDetails,
              status: 'rejected',
              decisionReason: reason,
              decisionEvidence: evidence
            };
            nextAgent = AgentType.SANCTION;
            nextStatusMsg = "Application Closed";
          }
        }
      }

      // Batch state updates
      setActiveAgent(nextAgent);
      setAgentStatusMsg(nextStatusMsg);
      setLoanDetails(nextLoanDetails);

      // 4. Add Model Response
      // If the model called a tool but gave no text (or very little), we generate a context-aware fallback
      let finalText = response.text;
      
      if (toolTriggered && (!finalText || finalText.length < 10)) {
         // If we switched agents, use the standard greeting
         if (nextAgent !== activeAgent) {
           finalText = AGENT_GREETINGS[nextAgent];
         } 
         // If we stayed on same agent but requested a doc
         else if (uploadRequest) {
           finalText = `Please upload your ${uploadRequest.replace('_', ' ')}.`;
         }
      }

      // Fallback if still empty (though unlikely with above logic)
      if (!finalText && toolTriggered) {
         finalText = "I have updated the application details. Please continue.";
      }

      if (finalText) {
        const modelMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          content: finalText,
          timestamp: new Date(),
          // Visual tweak: if we just switched, attribute this message to the NEW agent
          sender: nextAgent 
        };
        setMessages(prev => [...prev, modelMsg]);
      }

    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: 'system',
        content: "System Error: Unable to reach the agent network. Please check your connection or API key.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      
      handleSendMessage("Here is the requested document.", {
        type: 'image',
        url: URL.createObjectURL(file),
        base64: base64String,
        mimeType: file.type
      });
    };
    reader.readAsDataURL(file);
  };

  const downloadSanctionLetter = () => {
    generateSanctionLetter(loanDetails);
  };

  // Construct status object for Panel
  const currentAgentStatus: AgentStatus = {
    type: activeAgent,
    isActive: true,
    statusMessage: agentStatusMsg
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative">
        
        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between">
           <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold">SL</div>
             <span className="font-bold text-slate-800">SwiftLoan AI</span>
           </div>
           <div className="flex flex-col items-end">
             <span className="text-xs font-bold text-emerald-700">{activeAgent}</span>
             <span className="text-[10px] text-slate-500">{agentStatusMsg}</span>
           </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-hide">
          <div className="max-w-3xl mx-auto">
            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
            ))}
            
            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex justify-start mb-4">
                 <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-3">
                    <Loader2 className="animate-spin text-emerald-600" size={16} />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-emerald-700">{activeAgent}</span>
                      <span className="text-[10px] text-slate-500">{agentStatusMsg}...</span>
                    </div>
                 </div>
              </div>
            )}
            
            {/* Sanction Letter / Rejection CTA */}
            {loanDetails.status === 'approved' && !isLoading && (
               <div className="flex justify-start mb-4 w-full">
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex flex-col sm:flex-row items-center gap-4 shadow-sm w-full md:w-auto max-w-lg">
                    <div className="bg-emerald-100 p-3 rounded-full text-emerald-600 flex-shrink-0">
                      <Download size={24} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-emerald-900">Loan Approved!</h4>
                      <p className="text-sm text-emerald-700 mb-2">
                        {loanDetails.decisionEvidence ? `Based on: ${loanDetails.decisionEvidence}` : "Your sanction letter is ready."}
                      </p>
                      <button 
                        onClick={downloadSanctionLetter}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors w-full sm:w-auto"
                      >
                        Download Sanction Letter
                      </button>
                    </div>
                  </div>
               </div>
            )}

            {loanDetails.status === 'rejected' && !isLoading && (
               <div className="flex justify-start mb-4 w-full">
                  <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-4 shadow-sm w-full md:w-auto max-w-lg">
                    <div className="bg-red-100 p-3 rounded-full text-red-600 flex-shrink-0">
                      <AlertCircle size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-red-900">Application Declined</h4>
                      <p className="text-sm text-red-700">{loanDetails.decisionReason}</p>
                      {loanDetails.decisionEvidence && (
                         <p className="text-xs text-red-600 mt-1 italic">"{loanDetails.decisionEvidence}"</p>
                      )}
                    </div>
                  </div>
               </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-200">
          <div className="max-w-3xl mx-auto flex items-end gap-2">
            
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileSelect}
            />

            <button 
              onClick={() => fileInputRef.current?.click()}
              className={`p-3 rounded-xl transition-colors ${uploadRequest ? 'bg-amber-100 text-amber-700 animate-pulse' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              title="Upload Document"
            >
              <Paperclip size={20} />
            </button>

            <div className="flex-1 relative">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(inputValue);
                  }
                }}
                placeholder={uploadRequest ? `Please upload your ${uploadRequest.replace('_', ' ')}...` : "Type your message..."}
                className="w-full bg-slate-50 border-slate-200 border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none max-h-32 text-slate-800 placeholder:text-slate-400"
                rows={1}
              />
            </div>

            <button 
              onClick={() => handleSendMessage(inputValue)}
              disabled={(!inputValue.trim() && !uploadRequest) || isLoading}
              className="p-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-md hover:shadow-lg"
            >
              <Send size={20} />
            </button>
          </div>
          <div className="max-w-3xl mx-auto mt-2 text-center">
            <p className="text-[10px] text-slate-400">
              Agent: <span className="font-semibold text-emerald-600">{activeAgent}</span> | Status: {agentStatusMsg}
            </p>
          </div>
        </div>
      </div>

      {/* Side Panel (Desktop Only) */}
      <div className="hidden md:block w-80 lg:w-96 h-full flex-shrink-0 shadow-xl z-10">
        <StatusPanel activeAgentStatus={currentAgentStatus} loanDetails={loanDetails} />
      </div>

    </div>
  );
};

export default App;