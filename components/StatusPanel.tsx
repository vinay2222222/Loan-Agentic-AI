import React from 'react';
import { AgentType, LoanDetails, AgentStatus } from '../types';
import AgentBadge from './AgentBadge';
import { CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react';

interface StatusPanelProps {
  activeAgentStatus: AgentStatus;
  loanDetails: LoanDetails;
}

const StatusPanel: React.FC<StatusPanelProps> = ({ activeAgentStatus, loanDetails }) => {
  
  const steps = [
    { label: "Consultation", status: "completed" },
    { label: "KYC Verification", status: loanDetails.status === 'initial' ? 'pending' : 'completed' },
    { label: "Credit Underwriting", status: ['initial', 'kyc_pending'].includes(loanDetails.status) ? 'pending' : 'completed' },
    { label: "Final Sanction", status: ['approved', 'rejected'].includes(loanDetails.status) ? 'completed' : 'pending' }
  ];

  return (
    <div className="h-full flex flex-col gap-6 p-6 bg-white border-l border-slate-200 overflow-y-auto">
      
      {/* Header with Granular Status */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-1">Live Status</h2>
        <div className="mt-3 bg-white p-3 rounded-lg border border-emerald-100 shadow-sm ring-1 ring-emerald-500/10">
          <div className="flex items-center gap-2 mb-1">
             <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">{activeAgentStatus.type}</span>
          </div>
          <p className="text-sm font-medium text-slate-700 pl-4.5 border-l-2 border-emerald-500 ml-1.5 py-0.5">
             {activeAgentStatus.statusMessage}
          </p>
        </div>
      </div>

      {/* Agents List */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Agent Workflow</h3>
        <div className="flex flex-col gap-2">
          {[AgentType.SALES, AgentType.KYC, AgentType.UNDERWRITING, AgentType.SANCTION].map((agent) => (
             <AgentBadge 
               key={agent} 
               agent={agent} 
               isActive={activeAgentStatus.type === agent} 
             />
          ))}
        </div>
      </div>

      {/* Decision Evidence Card */}
      {(loanDetails.decisionEvidence || loanDetails.status === 'rejected') && (
        <div className={`rounded-xl p-4 border ${loanDetails.status === 'approved' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <h3 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${loanDetails.status === 'approved' ? 'text-emerald-700' : 'text-red-700'}`}>
            Decision Rationale
          </h3>
          <p className="text-sm font-medium mb-1">{loanDetails.decisionReason}</p>
          <div className="flex items-start gap-2 mt-2 bg-white/60 p-2 rounded">
             <AlertTriangle size={14} className="mt-0.5 opacity-60" />
             <p className="text-xs italic leading-tight opacity-80">{loanDetails.decisionEvidence}</p>
          </div>
        </div>
      )}

      {/* Loan Summary */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Application Summary</h3>
        <div className="space-y-2 text-sm">
           <div className="flex justify-between">
            <span className="text-slate-500">Applicant:</span>
            <span className="font-medium text-slate-800">{loanDetails.applicantName || "--"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Amount:</span>
            <span className="font-medium text-slate-800">
              {loanDetails.loanAmount ? `$${loanDetails.loanAmount.toLocaleString()}` : "--"}
            </span>
          </div>
           <div className="flex justify-between items-center pt-2 mt-2 border-t border-slate-200">
            <span className="text-slate-500">Status:</span>
            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase
              ${loanDetails.status === 'approved' ? 'bg-green-100 text-green-700' : 
                loanDetails.status === 'rejected' ? 'bg-red-100 text-red-700' : 
                'bg-blue-100 text-blue-700'}`}>
              {loanDetails.status.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Workflow Steps */}
      <div className="flex-1">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Process Timeline</h3>
        <div className="relative pl-4 border-l-2 border-slate-100 space-y-6">
          {steps.map((step, idx) => (
            <div key={idx} className="relative">
              <div className={`absolute -left-[21px] top-0 bg-white p-0.5 rounded-full border-2 
                ${step.status === 'completed' ? 'border-emerald-500 text-emerald-500' : 'border-slate-300 text-slate-300'}`}>
                {step.status === 'completed' ? <CheckCircle size={14} fill="currentColor" className="text-white" /> : <Clock size={14} />}
              </div>
              <p className={`text-sm font-medium ${step.status === 'completed' ? 'text-slate-800' : 'text-slate-400'}`}>
                {step.label}
              </p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default StatusPanel;