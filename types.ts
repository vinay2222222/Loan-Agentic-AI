export enum AgentType {
  SALES = 'Sales Agent',
  KYC = 'KYC Agent',
  UNDERWRITING = 'Underwriting Agent',
  SANCTION = 'Sanction Authority'
}

export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: Date;
  sender?: string; // e.g., "Sales Agent"
  attachment?: {
    type: 'image';
    url: string;
    base64: string;
  };
}

export interface LoanDetails {
  applicantName?: string;
  loanAmount?: number;
  purpose?: string;
  monthlyIncome?: number;
  creditScore?: number; // Simulated
  status: 'initial' | 'kyc_pending' | 'underwriting' | 'approved' | 'rejected';
  sanctionDate?: string;
  interestRate?: number;
  tenureMonths?: number;
}

export interface AgentStatus {
  type: AgentType;
  isActive: boolean;
  statusMessage: string;
}