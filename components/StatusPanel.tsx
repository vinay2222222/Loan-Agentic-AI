import React from 'react';
import { AgentType, LoanDetails } from '../types';
import AgentBadge from './AgentBadge';
import { CheckCircle, Clock, XCircle } from 'lucide-react';

interface StatusPanelProps {
  activeAgent: AgentType;
  loanDetails: LoanDetails;
}

const StatusPanel: React.FC<StatusPanelProps> = ({ activeAgent, loanDetails }) => {
  
  const steps = [
    { label: "Consultation", status: "completed" },
    { label: "KYC Verification", status: loanDetails.status === 'initial' ? 'pending' : 'completed' },
    { label: "Credit Underwriting", status: ['initial', 'kyc_pending'].includes(loanDetails.status) ? 'pending' : 'completed' },
    { label: "Final Sanction", status: loanDetails.status === 'approved' ? 'completed' : 'pending' }
  ];

  return (
    <div className="h-full flex flex-col gap-6 p-6 bg-white border-l border-slate-200 overflow-y-auto">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-1">Live Application Status</h2>
        <p className="text-sm text-slate-500">Trace your loan journey in real-time.</p>
      </div>

      {/* Active Agents Grid */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Agents</h3>
        <div className="flex flex-col gap-3">
          <AgentBadge agent={AgentType.SALES} isActive={activeAgent === AgentType.SALES} />
          <AgentBadge agent={AgentType.KYC} isActive={activeAgent === AgentType.KYC} />
          <AgentBadge agent={AgentType.UNDERWRITING} isActive={activeAgent === AgentType.UNDERWRITING} />
          <AgentBadge agent={AgentType.SANCTION} isActive={activeAgent === AgentType.SANCTION} />
        </div>
      </div>

      {/* Loan Summary Card */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Application Summary</h3>
        <div className="space-y-2 text-sm">
           <div className="flex justify-between">
            <span className="text-slate-500">Applicant:</span>
            <span className="font-medium text-slate-800">{loanDetails.applicantName || "--"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Requested:</span>
            <span className="font-medium text-slate-800">
              {loanDetails.loanAmount ? `$${loanDetails.loanAmount.toLocaleString()}` : "--"}
            </span>
          </div>
           <div className="flex justify-between">
            <span className="text-slate-500">Purpose:</span>
            <span className="font-medium text-slate-800">{loanDetails.purpose || "--"}</span>
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

      {/* Progress Steps */}
      <div className="flex-1">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Workflow Log</h3>
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
              <p className="text-xs text-slate-400">
                {step.status === 'completed' ? 'Done' : 'Waiting...'}
              </p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default StatusPanel;