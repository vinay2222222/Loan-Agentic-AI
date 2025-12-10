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
    if (!isActive) return "bg-slate-50 text-slate-400 border-slate-100";
    switch (agent) {
      case AgentType.SALES: return "bg-blue-50 text-blue-700 border-blue-200";
      case AgentType.KYC: return "bg-amber-50 text-amber-700 border-amber-200";
      case AgentType.UNDERWRITING: return "bg-purple-50 text-purple-700 border-purple-200";
      case AgentType.SANCTION: return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
  };

  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all duration-300 ${getColor()}`}>
      <div className="flex items-center gap-3">
        {getIcon()}
        <span className="text-sm font-medium">{agent}</span>
      </div>
      {isActive && (
        <span className="h-2 w-2 rounded-full bg-current animate-pulse"></span>
      )}
    </div>
  );
};

export default AgentBadge;