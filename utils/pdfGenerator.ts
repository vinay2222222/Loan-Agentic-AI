import { jsPDF } from "jspdf";
import { LoanDetails } from "../types";

export const generateSanctionLetter = (details: LoanDetails): void => {
  const doc = new jsPDF();
  const margin = 20;
  let yPos = 20;

  // Header
  doc.setFontSize(22);
  doc.setTextColor(16, 185, 129); // Emerald 500
  doc.text("SwiftLoan NBFC", margin, yPos);
  
  yPos += 10;
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("123 Finance District, Fintech City, 400001", margin, yPos);
  yPos += 5;
  doc.text("support@swiftloan.ai | www.swiftloan.ai", margin, yPos);

  yPos += 15;
  doc.setDrawColor(200);
  doc.line(margin, yPos, 190, yPos);
  
  yPos += 15;
  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.text("LOAN SANCTION LETTER", 105, yPos, { align: "center" });

  yPos += 20;
  doc.setFontSize(12);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, yPos);
  
  yPos += 10;
  doc.text(`Dear ${details.applicantName || "Applicant"},`, margin, yPos);

  yPos += 10;
  doc.text("We are pleased to inform you that your personal loan application has been", margin, yPos);
  yPos += 6;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(16, 185, 129);
  doc.text("APPROVED", margin, yPos);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0);
  doc.text(" based on your credit profile and income verification.", margin + 28, yPos);

  yPos += 15;
  doc.setFontSize(14);
  doc.text("Sanction Details:", margin, yPos);
  
  yPos += 10;
  doc.setFontSize(11);
  doc.setFillColor(240, 253, 244); // Light green bg
  doc.rect(margin, yPos - 5, 170, 50, "F");
  
  const detailLine = (label: string, value: string, y: number) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, margin + 5, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, margin + 60, y);
  };

  detailLine("Sanctioned Amount:", `$${details.loanAmount?.toLocaleString()}`, yPos);
  yPos += 10;
  detailLine("Interest Rate:", `${details.interestRate}% p.a.`, yPos);
  yPos += 10;
  detailLine("Tenure:", `${details.tenureMonths} Months`, yPos);
  yPos += 10;
  detailLine("Monthly EMI (Est.):", `$${Math.round((details.loanAmount || 0) / (details.tenureMonths || 12) * 1.1).toLocaleString()}`, yPos);
  yPos += 10;
  detailLine("Purpose:", `${details.purpose}`, yPos);

  yPos += 20;
  doc.text("Terms & Conditions:", margin, yPos);
  yPos += 8;
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text("1. This sanction is valid for 30 days from the date of issuance.", margin, yPos);
  yPos += 6;
  doc.text("2. Final disbursement is subject to signing of the loan agreement.", margin, yPos);
  yPos += 6;
  doc.text("3. The interest rate is fixed for the tenure of the loan.", margin, yPos);

  yPos += 30;
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text("Authorized Signatory", margin, yPos);
  
  yPos += 15;
  doc.setFont("courier", "italic");
  doc.text("[ Digital Signature: SwiftLoan_Auto_Gen_AI_882 ]", margin, yPos);

  doc.save("SwiftLoan_Sanction_Letter.pdf");
};