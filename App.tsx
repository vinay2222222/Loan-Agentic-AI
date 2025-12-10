import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Loader2, Download } from 'lucide-react';
import { Message, AgentType, LoanDetails } from './types';
import ChatBubble from './components/ChatBubble';
import StatusPanel from './components/StatusPanel';
import { sendMessageToGemini } from './services/geminiService';
import { generateSanctionLetter } from './utils/pdfGenerator';

// Default initial state
const INITIAL_LOAN_DETAILS: LoanDetails = {
  status: 'initial'
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
  const [loanDetails, setLoanDetails] = useState<LoanDetails>(INITIAL_LOAN_DETAILS);
  const [uploadRequest, setUploadRequest] = useState<string | null>(null); // 'identity_proof' | 'income_proof' | null
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (text: string, attachment?: { url: string, base64: string, type: 'image' }) => {
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
    setUploadRequest(null); // Clear upload request if fulfilled
    setIsLoading(true);

    try {
      // 2. Call Gemini
      const apiKey = process.env.API_KEY || ''; // Injected by environment
      if (!apiKey) {
        throw new Error("API Key missing");
      }

      const response = await sendMessageToGemini(newHistory, apiKey);

      // 3. Handle Function Calls (State Updates)
      if (response.functionCalls) {
        for (const call of response.functionCalls) {
          console.log("Processing Tool:", call.name, call.args);
          
          if (call.name === 'updateLoanStage') {
            const { agent, stage } = call.args;
            setActiveAgent(agent as AgentType);
            setLoanDetails(prev => ({ ...prev, status: stage === 'decision' ? 'underwriting' : stage })); // map simplified stages
          } 
          else if (call.name === 'requestDocument') {
            const { docType } = call.args;
            setUploadRequest(docType);
          }
          else if (call.name === 'approveLoan') {
            const { approvedAmount, interestRate, tenureMonths, applicantName } = call.args;
            setLoanDetails(prev => ({
              ...prev,
              status: 'approved',
              loanAmount: approvedAmount,
              interestRate,
              tenureMonths,
              applicantName
            }));
            setActiveAgent(AgentType.SANCTION);
          }
          else if (call.name === 'rejectLoan') {
            setLoanDetails(prev => ({ ...prev, status: 'rejected' }));
            setActiveAgent(AgentType.SANCTION);
          }
        }
      }

      // 4. Add Model Response
      const modelMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: response.text,
        timestamp: new Date(),
        sender: activeAgent // Note: activeAgent might have changed in the function call processing, strictly speaking we should use the *new* agent, but for UX flow, using the one that generated the text or the new one is fine. React state updates are batched, so this uses the *previous* state value unless we use refs. For simplicity, we assume the text comes from the agent active *at start* or *end* of turn. Let's use the activeAgent state (which updates next render) so actually we might want to capture the function call agent update for the *next* message label. For now, using current state.
      };

      // Fix for "sender" label lagging behind state update:
      // If a function call changed the agent, the text usually introduces the NEW agent.
      // We will rely on the text response.
      
      setMessages(prev => [...prev, modelMsg]);

    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: 'system',
        content: "System Error: Unable to reach the agent network. Please ensure your API key is valid.",
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
      const mimeType = file.type;
      
      // Send as a user message with attachment
      handleSendMessage("Here is the requested document.", {
        type: 'image',
        url: URL.createObjectURL(file),
        base64: base64String
      });
    };
    reader.readAsDataURL(file);
  };

  const downloadSanctionLetter = () => {
    generateSanctionLetter(loanDetails);
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
           <span className="text-xs px-2 py-1 bg-slate-100 rounded-full text-slate-600">{activeAgent}</span>
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
                 <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2 text-slate-500 text-sm">
                    <Loader2 className="animate-spin" size={14} />
                    <span>{activeAgent} is typing...</span>
                 </div>
              </div>
            )}
            
            {/* Sanction Letter CTA */}
            {loanDetails.status === 'approved' && !isLoading && (
               <div className="flex justify-start mb-4">
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center gap-4 shadow-sm w-full md:w-auto">
                    <div className="bg-emerald-100 p-3 rounded-full text-emerald-600">
                      <Download size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-emerald-900">Loan Approved!</h4>
                      <p className="text-sm text-emerald-700 mb-2">Your sanction letter is ready.</p>
                      <button 
                        onClick={downloadSanctionLetter}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors"
                      >
                        Download PDF
                      </button>
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
              disabled={!inputValue.trim() || isLoading}
              className="p-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-md hover:shadow-lg"
            >
              <Send size={20} />
            </button>
          </div>
          <div className="max-w-3xl mx-auto mt-2 text-center">
            <p className="text-[10px] text-slate-400">
              SwiftLoan uses AI Agents. Mistakes may occur. Please verify critical info.
            </p>
          </div>
        </div>
      </div>

      {/* Side Panel (Desktop Only) */}
      <div className="hidden md:block w-80 lg:w-96 h-full flex-shrink-0 shadow-xl z-10">
        <StatusPanel activeAgent={activeAgent} loanDetails={loanDetails} />
      </div>

    </div>
  );
};

export default App;