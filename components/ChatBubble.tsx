import React from 'react';
import { Message } from '../types';
import { User, Bot } from 'lucide-react';

interface ChatBubbleProps {
  message: Message;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[85%] md:max-w-[70%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
        
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isUser ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {isUser ? <User size={16} /> : <Bot size={16} />}
        </div>

        {/* Bubble */}
        <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
          {message.sender && !isUser && (
            <span className="text-xs text-slate-500 ml-1 font-medium">{message.sender}</span>
          )}
          
          <div className={`px-4 py-3 rounded-2xl shadow-sm ${
            isUser 
              ? 'bg-indigo-600 text-white rounded-br-none' 
              : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
          }`}>
             {message.attachment && (
              <div className="mb-2">
                <img 
                  src={message.attachment.url} 
                  alt="Attachment" 
                  className="max-w-full h-auto rounded-lg max-h-48 object-cover border border-white/20" 
                />
              </div>
            )}
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
          </div>
          
          <span className="text-[10px] text-slate-400 px-1">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;