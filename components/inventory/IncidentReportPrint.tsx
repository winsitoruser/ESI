import React from 'react';
import { useTranslation } from '@/lib/i18n';

interface IncidentReportPrintProps {
  incidentData: any;
}

const IncidentReportPrint: React.FC<IncidentReportPrintProps> = ({ incidentData }) => {
  const { formatCurrency } = useTranslation();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="print-container bg-white p-8 max-w-4xl mx-auto" style={{ fontFamily: 'Arial, sans-serif' }}>
      <style jsx>{`
        @media print {
          @page {
            size: A4;
            margin: 20mm;
          }
          
          .print-container {
            padding: 0;
          }
          
          .page-break {
            page-break-after: always;
          }
          
          .no-print {
            display: none;
          }
        }
      `}</style>

      {/* Header */}
      <div className="border-b-4 border-gray-800 pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">BEDAGANG CLOUD POS</h1>
            <p className="text-sm text-gray-600">Inventory Management System</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">ISO 9001:2015 Certified</p>
            <p className="text-xs text-gray-500">Document Control: INC-FORM-001</p>
          </div>
        </div>
      </div>

      {/* Document Title */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          STOCK OPNAME VARIANCE INCIDENT REPORT
        </h2>
        <p className="text-sm text-gray-600">
          Nonconformity & Corrective Action Report
        </p>
        <p className="text-sm text-gray-600">
          ISO 9001:2015 Clause 10.2 | ISO 22000:2018 Clause 8.9
        </p>
      </div>

      {/* Incident Number */}
      <div className="bg-gray-100 p-4 rounded mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-600">Incident Number:</p>
            <p className="text-lg font-bold">{incidentData.incidentNumber}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Report Date:</p>
            <p className="text-lg font-bold">{formatDate(incidentData.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Created By:</p>
            <p className="text-lg font-bold">{incidentData.createdBy}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Status:</p>
            <p className="text-lg font-bold text-yellow-600">{incidentData.approval.status.toUpperCase()}</p>
          </div>
        </div>
      </div>

      {/* Section 1: Variance Details */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 bg-gray-200 px-3 py-2 mb-3">
          1. VARIANCE DETAILS
        </h3>
        
        <table className="w-full border border-gray-300 text-sm">
          <tbody>
            <tr className="border-b border-gray-300">
              <td className="px-3 py-2 bg-gray-50 font-semibold w-1/3">Product Name:</td>
              <td className="px-3 py-2">{incidentData.varianceItem.productName}</td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="px-3 py-2 bg-gray-50 font-semibold">SKU:</td>
              <td className="px-3 py-2">{incidentData.varianceItem.sku}</td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="px-3 py-2 bg-gray-50 font-semibold">Location:</td>
              <td className="px-3 py-2">{incidentData.varianceItem.location}</td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="px-3 py-2 bg-gray-50 font-semibold">System Stock:</td>
              <td className="px-3 py-2 font-bold">{incidentData.varianceItem.systemStock} units</td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="px-3 py-2 bg-gray-50 font-semibold">Physical Count (1st):</td>
              <td className="px-3 py-2 font-bold">{incidentData.varianceItem.physicalStock} units</td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="px-3 py-2 bg-gray-50 font-semibold">Physical Count (Recount):</td>
              <td className="px-3 py-2 font-bold">{incidentData.recount.value} units</td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="px-3 py-2 bg-gray-50 font-semibold">Variance Quantity:</td>
              <td className="px-3 py-2 font-bold text-red-600">{incidentData.varianceItem.difference} units</td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="px-3 py-2 bg-gray-50 font-semibold">Variance Percentage:</td>
              <td className="px-3 py-2 font-bold text-red-600">{incidentData.varianceItem.variancePercentage.toFixed(2)}%</td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="px-3 py-2 bg-gray-50 font-semibold">Unit Cost:</td>
              <td className="px-3 py-2">{formatCurrency(incidentData.varianceItem.unitCost)}</td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="px-3 py-2 bg-gray-50 font-semibold">Financial Impact:</td>
              <td className="px-3 py-2 font-bold text-red-600">{formatCurrency(Math.abs(incidentData.varianceItem.varianceValue))}</td>
            </tr>
            <tr>
              <td className="px-3 py-2 bg-gray-50 font-semibold">Variance Category:</td>
              <td className="px-3 py-2">
                <span className="font-bold text-red-600 uppercase">{incidentData.varianceItem.varianceCategory}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Section 2: Recount Verification */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 bg-gray-200 px-3 py-2 mb-3">
          2. RECOUNT VERIFICATION
        </h3>
        
        <table className="w-full border border-gray-300 text-sm">
          <tbody>
            <tr className="border-b border-gray-300">
              <td className="px-3 py-2 bg-gray-50 font-semibold w-1/3">Recount Performed By:</td>
              <td className="px-3 py-2">{incidentData.recount.by}</td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="px-3 py-2 bg-gray-50 font-semibold">Recount Date:</td>
              <td className="px-3 py-2">{formatDate(incidentData.recount.date)}</td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="px-3 py-2 bg-gray-50 font-semibold">Recount Result:</td>
              <td className="px-3 py-2 font-bold">{incidentData.recount.value} units</td>
            </tr>
            <tr>
              <td className="px-3 py-2 bg-gray-50 font-semibold">Variance Confirmed:</td>
              <td className="px-3 py-2">
                <span className={`font-bold ${incidentData.recount.confirmed ? 'text-red-600' : 'text-green-600'}`}>
                  {incidentData.recount.confirmed ? 'YES' : 'NO'}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Page Break */}
      <div className="page-break"></div>

      {/* Section 3: Investigation & Root Cause Analysis */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 bg-gray-200 px-3 py-2 mb-3">
          3. ROOT CAUSE ANALYSIS (5 WHYS METHOD)
        </h3>
        
        <div className="border border-gray-300 p-4 mb-4">
          <p className="text-sm font-semibold mb-2">Problem Statement:</p>
          <p className="text-sm">
            Variance detected: {incidentData.varianceItem.difference} units 
            ({incidentData.varianceItem.variancePercentage.toFixed(2)}%) 
            with financial impact of {formatCurrency(Math.abs(incidentData.varianceItem.varianceValue))}
          </p>
        </div>

        <div className="space-y-3">
          <div className="border border-gray-300 p-3">
            <p className="text-xs font-semibold text-gray-600 mb-1">Why 1:</p>
            <p className="text-sm">{incidentData.investigation.fiveWhys.why1 || '-'}</p>
          </div>
          <div className="border border-gray-300 p-3">
            <p className="text-xs font-semibold text-gray-600 mb-1">Why 2:</p>
            <p className="text-sm">{incidentData.investigation.fiveWhys.why2 || '-'}</p>
          </div>
          <div className="border border-gray-300 p-3">
            <p className="text-xs font-semibold text-gray-600 mb-1">Why 3:</p>
            <p className="text-sm">{incidentData.investigation.fiveWhys.why3 || '-'}</p>
          </div>
          <div className="border border-gray-300 p-3">
            <p className="text-xs font-semibold text-gray-600 mb-1">Why 4:</p>
            <p className="text-sm">{incidentData.investigation.fiveWhys.why4 || '-'}</p>
          </div>
          <div className="border border-gray-300 p-3">
            <p className="text-xs font-semibold text-gray-600 mb-1">Why 5:</p>
            <p className="text-sm">{incidentData.investigation.fiveWhys.why5 || '-'}</p>
          </div>
        </div>

        <div className="border-2 border-red-500 bg-red-50 p-4 mt-4">
          <p className="text-sm font-bold text-red-900 mb-2">ROOT CAUSE IDENTIFIED:</p>
          <p className="text-sm">{incidentData.investigation.rootCause}</p>
        </div>
      </div>

      {/* Section 4: Evidence & Documentation */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 bg-gray-200 px-3 py-2 mb-3">
          4. EVIDENCE & DOCUMENTATION
        </h3>
        
        <div className="border border-gray-300 p-4 mb-3">
          <p className="text-sm font-semibold mb-2">Evidence Collected:</p>
          <p className="text-sm whitespace-pre-wrap">{incidentData.investigation.evidence || 'No evidence documented'}</p>
        </div>

        <div className="border border-gray-300 p-4">
          <p className="text-sm font-semibold mb-2">Witness Statement:</p>
          <p className="text-sm whitespace-pre-wrap">{incidentData.investigation.witness || 'No witness statement'}</p>
        </div>
      </div>

      {/* Page Break */}
      <div className="page-break"></div>

      {/* Section 5: Corrective & Preventive Actions */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 bg-gray-200 px-3 py-2 mb-3">
          5. CORRECTIVE & PREVENTIVE ACTIONS
        </h3>
        
        <div className="space-y-4">
          <div className="border border-gray-300 p-4">
            <p className="text-sm font-bold text-orange-600 mb-2">A. IMMEDIATE ACTION:</p>
            <p className="text-sm whitespace-pre-wrap">{incidentData.correctiveAction.immediate}</p>
          </div>

          <div className="border border-gray-300 p-4">
            <p className="text-sm font-bold text-blue-600 mb-2">B. CORRECTIVE ACTION:</p>
            <p className="text-sm whitespace-pre-wrap">{incidentData.correctiveAction.corrective}</p>
          </div>

          <div className="border border-gray-300 p-4">
            <p className="text-sm font-bold text-green-600 mb-2">C. PREVENTIVE ACTION:</p>
            <p className="text-sm whitespace-pre-wrap">{incidentData.correctiveAction.preventive}</p>
          </div>
        </div>

        <table className="w-full border border-gray-300 text-sm mt-4">
          <tbody>
            <tr className="border-b border-gray-300">
              <td className="px-3 py-2 bg-gray-50 font-semibold w-1/3">Responsible Person (PIC):</td>
              <td className="px-3 py-2">{incidentData.correctiveAction.responsible || '-'}</td>
            </tr>
            <tr>
              <td className="px-3 py-2 bg-gray-50 font-semibold">Target Completion Date:</td>
              <td className="px-3 py-2">{incidentData.correctiveAction.targetDate || '-'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Section 6: Financial Impact */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 bg-gray-200 px-3 py-2 mb-3">
          6. FINANCIAL IMPACT
        </h3>
        
        <table className="w-full border border-gray-300 text-sm">
          <tbody>
            <tr className="border-b border-gray-300">
              <td className="px-3 py-2 bg-gray-50 font-semibold w-1/3">Variance Value:</td>
              <td className="px-3 py-2 font-bold text-red-600">{formatCurrency(Math.abs(incidentData.varianceItem.varianceValue))}</td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="px-3 py-2 bg-gray-50 font-semibold">Cost Category:</td>
              <td className="px-3 py-2">
                {incidentData.varianceItem.difference < 0 ? 'Inventory Shrinkage Expense' : 'Inventory Adjustment Income'}
              </td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="px-3 py-2 bg-gray-50 font-semibold">GL Account:</td>
              <td className="px-3 py-2">
                {incidentData.varianceItem.difference < 0 ? '5-1500 (Shrinkage Expense)' : '4-1500 (Adjustment Income)'}
              </td>
            </tr>
            <tr>
              <td className="px-3 py-2 bg-gray-50 font-semibold">Adjustment Required:</td>
              <td className="px-3 py-2 font-bold text-red-600">YES</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Section 7: Approval Signatures */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 bg-gray-200 px-3 py-2 mb-3">
          7. APPROVALS
        </h3>
        
        <div className="border border-gray-300 p-4 mb-3">
          <p className="text-sm font-semibold mb-2">Required Approval Level:</p>
          <p className="text-lg font-bold text-purple-600">{incidentData.approval.level}</p>
        </div>

        <table className="w-full border border-gray-300 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 text-left border-r border-gray-300">Role</th>
              <th className="px-3 py-2 text-left border-r border-gray-300">Name</th>
              <th className="px-3 py-2 text-left border-r border-gray-300">Signature</th>
              <th className="px-3 py-2 text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-300">
              <td className="px-3 py-8 border-r border-gray-300">Investigated By:</td>
              <td className="px-3 py-8 border-r border-gray-300">{incidentData.createdBy}</td>
              <td className="px-3 py-8 border-r border-gray-300"></td>
              <td className="px-3 py-8">{formatDate(incidentData.createdAt)}</td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="px-3 py-8 border-r border-gray-300">Reviewed By (Supervisor):</td>
              <td className="px-3 py-8 border-r border-gray-300"></td>
              <td className="px-3 py-8 border-r border-gray-300"></td>
              <td className="px-3 py-8"></td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="px-3 py-8 border-r border-gray-300">Approved By ({incidentData.approval.level}):</td>
              <td className="px-3 py-8 border-r border-gray-300"></td>
              <td className="px-3 py-8 border-r border-gray-300"></td>
              <td className="px-3 py-8"></td>
            </tr>
            <tr>
              <td className="px-3 py-8 border-r border-gray-300">Finance Approval:</td>
              <td className="px-3 py-8 border-r border-gray-300"></td>
              <td className="px-3 py-8 border-r border-gray-300"></td>
              <td className="px-3 py-8"></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-gray-800 pt-4 mt-8">
        <div className="flex justify-between text-xs text-gray-600">
          <div>
            <p>Document: INC-FORM-001</p>
            <p>Revision: 01</p>
            <p>Effective Date: 2024-01-01</p>
          </div>
          <div className="text-right">
            <p>ISO 9001:2015 Clause 10.2</p>
            <p>ISO 22000:2018 Clause 8.9</p>
            <p className="font-bold text-red-600 mt-2">CONFIDENTIAL</p>
          </div>
        </div>
      </div>

      {/* Print Button */}
      <div className="no-print mt-8 text-center">
        <button
          onClick={() => window.print()}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
        >
          Print This Report
        </button>
      </div>
    </div>
  );
};

export default IncidentReportPrint;
