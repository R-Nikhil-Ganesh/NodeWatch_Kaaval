import React from 'react';
import { IntegrityStatus, UserRole, CaseStatus } from '../types';
import { CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';

export const Button = ({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  className = '',
  size = 'md',
  type
}: {
  children?: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  type?: 'button' | 'submit' | 'reset';
}) => {
  const baseStyle = "font-medium transition-colors duration-150 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2";
  
  const variants = {
    primary: "bg-gov-800 hover:bg-gov-900 text-white focus:ring-gov-500 dark:bg-blue-600 dark:hover:bg-blue-700",
    secondary: "bg-white border border-gov-300 text-gov-700 hover:bg-gov-50 focus:ring-gov-500 dark:bg-gov-800 dark:border-gov-600 dark:text-gov-200 dark:hover:bg-gov-700",
    danger: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 dark:bg-red-700 dark:hover:bg-red-800",
    ghost: "text-gov-600 hover:bg-gov-100 focus:ring-gov-500 dark:text-gov-400 dark:hover:bg-gov-800"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
};

export const Card = ({ children, className = '', title }: { children?: React.ReactNode; className?: string, title?: string }) => (
  <div className={`bg-white border border-gov-200 shadow-sm rounded-lg overflow-hidden dark:bg-gov-800 dark:border-gov-700 ${className}`}>
    {title && (
      <div className="px-6 py-4 border-b border-gov-200 bg-gov-50 dark:bg-gov-900/50 dark:border-gov-700">
        <h3 className="text-lg font-semibold text-gov-800 dark:text-gov-100">{title}</h3>
      </div>
    )}
    <div className="p-6">{children}</div>
  </div>
);

export const Badge = ({ children, color }: { children?: React.ReactNode; color: 'green' | 'red' | 'yellow' | 'blue' | 'gray' }) => {
  const colors = {
    green: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    red: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    yellow: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    gray: "bg-gov-100 text-gov-800 dark:bg-gov-700 dark:text-gov-300"
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  );
};

export const IntegrityBadge = ({ status }: { status: IntegrityStatus }) => {
  switch (status) {
    case IntegrityStatus.VERIFIED:
      return <Badge color="green"><span className="flex items-center gap-1"><CheckCircle size={12} /> Verified</span></Badge>;
    case IntegrityStatus.COMPROMISED:
      return <Badge color="red"><span className="flex items-center gap-1"><XCircle size={12} /> Compromised</span></Badge>;
    case IntegrityStatus.PENDING:
      return <Badge color="yellow"><span className="flex items-center gap-1"><Clock size={12} /> Pending</span></Badge>;
    default:
      return <Badge color="gray"><span className="flex items-center gap-1"><AlertTriangle size={12} /> Not Checked</span></Badge>;
  }
};

export const RoleBadge = ({ role }: { role: UserRole }) => {
  const colors: Record<UserRole, 'blue' | 'gray' | 'yellow' | 'green'> = {
    [UserRole.ADMIN]: 'gray',
    [UserRole.POLICE]: 'blue',
    [UserRole.FORENSICS]: 'yellow',
    [UserRole.LEGAL]: 'green',
  };
  return <Badge color={colors[role]}>{role}</Badge>;
};

export const CaseStatusBadge = ({ status }: { status: CaseStatus }) => {
    const map: Record<CaseStatus, 'green' | 'blue' | 'yellow' | 'gray' | 'red'> = {
        [CaseStatus.OPEN]: 'blue',
        [CaseStatus.UNDER_INVESTIGATION]: 'yellow',
        [CaseStatus.SUBMITTED_TO_COURT]: 'green',
        [CaseStatus.CLOSED]: 'gray',
        [CaseStatus.FROZEN]: 'red'
    }
    return <Badge color={map[status]}>{status.replace(/_/g, ' ')}</Badge>
}

export const Table = ({ headers, children }: { headers: string[], children?: React.ReactNode }) => (
  <div className="overflow-x-auto border border-gov-200 rounded-lg dark:border-gov-700">
    <table className="min-w-full divide-y divide-gov-200 dark:divide-gov-700">
      <thead className="bg-gov-50 dark:bg-gov-900/50">
        <tr>
          {headers.map((h, i) => (
            <th key={i} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gov-500 uppercase tracking-wider dark:text-gov-400">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gov-200 dark:bg-gov-800 dark:divide-gov-700">
        {children}
      </tbody>
    </table>
  </div>
);

export const Input = ({ label, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) => (
    <div className="mb-4">
        {label && <label className="block text-sm font-medium text-gov-700 mb-1 dark:text-gov-300">{label}</label>}
        <input 
            className={`w-full px-3 py-2 border border-gov-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gov-500 focus:border-gov-500 sm:text-sm dark:bg-gov-900 dark:border-gov-600 dark:text-white dark:focus:ring-blue-500 ${className || ''}`}
            {...props}
        />
    </div>
);

// Utility to download CSV
export const downloadCSV = (data: any[], headers: string[], filename: string) => {
    const csvRows = [];
    
    // Add Header Row
    csvRows.push(headers.join(','));

    // Add Data Rows
    for (const row of data) {
        const values = headers.map(header => {
            const escaped = ('' + row[header]).replace(/"/g, '\\"');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};