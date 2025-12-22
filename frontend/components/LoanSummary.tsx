'use client';

export default function LoanSummary() {
  // This would come from API/props in production
  const loanData = {
    totalOwed: 562.50,
    originalAmount: 500.00,
    daysOverdue: 45,
    nextPaymentDue: '2024-01-15',
  };

  return (
    <div className="bg-gradient-to-r from-tala-purple to-tala-blue text-white mx-4 my-3 rounded-lg shadow-md p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-xs opacity-90 mb-1">Outstanding Balance</p>
          <p className="text-2xl font-bold">${loanData.totalOwed.toFixed(2)}</p>
        </div>
        <div className="bg-white/20 rounded-full px-3 py-1">
          <p className="text-xs font-medium">{loanData.daysOverdue} days overdue</p>
        </div>
      </div>
      <div className="flex gap-4 text-xs">
        <div>
          <p className="opacity-75">Original Loan</p>
          <p className="font-semibold">${loanData.originalAmount.toFixed(2)}</p>
        </div>
        <div>
          <p className="opacity-75">Fees & Interest</p>
          <p className="font-semibold">${(loanData.totalOwed - loanData.originalAmount).toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}
