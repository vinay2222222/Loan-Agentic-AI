import React from 'react';
import { AgentType } from '../types';
import { Bot, FileSearch, ShieldCheck, FileSignature } from 'lucide-react';

interface AgentBadgeProps {
  agent: AgentType;
  isActive: boolean;
}

const AgentBadge: React.FC<AgentBadgeProps> = ({ agent, isActive }) => {
  const getIcon = () => {
    switch (agent) {
      case AgentType.SALES: return <Bot size={18} />;
      case AgentType.KYC: return <FileSearch size={18} />;
      case AgentType.UNDERWRITING: return <ShieldCheck size={18} />;
      case AgentType.SANCTION: return <FileSignature size={18} />;
    }
  };

  const getColor = () => {
    if (!isActive) return "bg-gray-100 text-gray-400 border-gray-200";
    switch (agent) {
      case AgentType.SALES: return "bg-blue-100 text-blue-700 border-blue-300 ring-2 ring-blue-100";
      case AgentType.KYC: return "bg-amber-100 text-amber-700 border-amber-300 ring-2 ring-amber-100";
      case AgentType.UNDERWRITING: return "bg-purple-100 text-purple-700 border-purple-300 ring-2 ring-purple-100";
      case AgentType.SANCTION: return "bg-emerald-100 text-emerald-700 border-emerald-300 ring-2 ring-emerald-100";
    }
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-full border transition-all duration-300 ${getColor()} ${isActive ? 'shadow-sm scale-105' : 'opacity-60 grayscale'}`}>
      {getIcon()}
      <span className="text-sm font-medium whitespace-nowrap">{agent}</span>
      {isActive && (
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
        </span>
      )}
    </div>
  );
};

export default AgentBadge;