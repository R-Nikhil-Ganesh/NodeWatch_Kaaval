import React from 'react';
import { IntegrityStatus, UserRole, CaseStatus } from '../types';
import { CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';

// Shared UI primitives for the whole web app — restyled to match the
// navy/saffron/paper/ink/line/status design system introduced by the Legal
// portal (frontend_web/legal). Prop signatures are kept unchanged so every
// existing call site across the app picks up the new look automatically.

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
  const baseStyle = "font-medium transition-colors duration-150 rounded-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap";

  const variants = {
    primary: "bg-saffron-500 hover:bg-saffron-600 text-white shadow-card",
    secondary: "bg-white border border-line-300 text-navy-900 hover:bg-paper-100",
    danger: "bg-status-urgent hover:bg-red-800 text-white",
    ghost: "text-navy-700 hover:bg-navy-50"
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

export const Card = ({
  children,
  className = '',
  title,
  action,
  padded = true,
}: {
  children?: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  action?: React.ReactNode;
  padded?: boolean;
}) => (
  <div className={`bg-white border border-line-200 shadow-card rounded-sm overflow-hidden ${className}`}>
    {(title || action) && (
      <div className="flex items-center justify-between px-5 py-4 border-b border-line-200 bg-paper-50">
        {typeof title === 'string' ? <h3 className="text-sm font-semibold text-navy-900 tracking-wide uppercase">{title}</h3> : title}
        {action}
      </div>
    )}
    <div className={padded ? 'p-5' : ''}>{children}</div>
  </div>
);

export const Badge = ({ children, color }: { children?: React.ReactNode; color: 'green' | 'red' | 'yellow' | 'blue' | 'gray' }) => {
  // Named colors are kept as the prop API (used throughout the app) but now
  // render through the Legal portal's status/navy palette instead of the
  // generic Tailwind green/red/yellow/blue swatches.
  const colors = {
    green: "bg-status-resolvedBg text-status-resolved border-status-resolved/20",
    red: "bg-status-urgentBg text-status-urgent border-status-urgent/20",
    yellow: "bg-status-pendingBg text-status-pending border-status-pending/20",
    blue: "bg-navy-50 text-navy-800 border-navy-100",
    gray: "bg-paper-100 text-ink-500 border-line-300"
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colors[color]}`}>
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
  <div className="overflow-x-auto border border-line-200 rounded-sm">
    <table className="min-w-full divide-y divide-line-200">
      <thead className="bg-paper-50">
        <tr>
          {headers.map((h, i) => (
            <th key={i} scope="col" className="px-5 py-3 text-left text-xs font-semibold text-ink-500 uppercase tracking-wide whitespace-nowrap">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-line-200">
        {children}
      </tbody>
    </table>
  </div>
);

export const Select = ({ label, className = '', id, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) => {
  const selectId = id || label?.replace(/\s+/g, '-').toLowerCase();
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-ink-700 mb-1.5">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full px-3.5 py-2.5 border border-line-300 rounded-sm bg-white text-ink-900 text-sm outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 transition-colors ${className}`}
        {...rest}
      >
        {children}
      </select>
    </div>
  );
};

export const Input = ({ label, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) => (
    <div className="mb-4">
        {label && <label className="block text-sm font-medium text-ink-700 mb-1.5">{label}</label>}
        <input
            className={`w-full px-3.5 py-2.5 border border-line-300 rounded-sm bg-white text-ink-900 placeholder:text-ink-300 text-sm outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 transition-colors ${className || ''}`}
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
