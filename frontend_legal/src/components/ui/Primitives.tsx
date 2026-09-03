import React, { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, useEffect } from 'react';
import { X } from 'lucide-react';

// Closes an open overlay (Drawer / Modal) when the user presses Escape.
const useEscapeToClose = (open: boolean, onClose: () => void) => {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);
};

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = ({ variant = 'secondary', size = 'md', className = '', children, ...rest }: ButtonProps) => {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap';
  const sizes = { sm: 'text-xs px-3 py-1.5', md: 'text-sm px-4 py-2', lg: 'text-base px-5 py-2.5' };
  const variants = {
    primary: 'bg-saffron-500 text-white hover:bg-saffron-600 shadow-card',
    secondary: 'bg-white text-navy-900 border border-line-300 hover:bg-paper-100',
    ghost: 'text-navy-700 hover:bg-navy-50',
    danger: 'bg-status-urgent text-white hover:bg-red-800',
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
};

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export const Card = ({
  title,
  action,
  children,
  className = '',
  padded = true,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) => (
  <div className={`bg-white border border-line-200 rounded-sm shadow-card ${className}`}>
    {(title || action) && (
      <div className="flex items-center justify-between px-5 py-4 border-b border-line-200">
        {typeof title === 'string' ? <h3 className="text-sm font-semibold text-navy-900 tracking-wide uppercase">{title}</h3> : title}
        {action}
      </div>
    )}
    <div className={padded ? 'p-5' : ''}>{children}</div>
  </div>
);

// ---------------------------------------------------------------------------
// Badge / Status pill
// ---------------------------------------------------------------------------

type BadgeTone = 'navy' | 'saffron' | 'pending' | 'resolved' | 'urgent' | 'neutral';

export const Badge = ({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) => {
  const tones: Record<BadgeTone, string> = {
    navy: 'bg-navy-50 text-navy-800 border-navy-100',
    saffron: 'bg-saffron-50 text-saffron-700 border-saffron-200',
    pending: 'bg-status-pendingBg text-status-pending border-status-pending/20',
    resolved: 'bg-status-resolvedBg text-status-resolved border-status-resolved/20',
    urgent: 'bg-status-urgentBg text-status-urgent border-status-urgent/20',
    neutral: 'bg-paper-100 text-ink-500 border-line-300',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${tones[tone]}`}>
      {children}
    </span>
  );
};

// ---------------------------------------------------------------------------
// Input / Select
// ---------------------------------------------------------------------------

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

export const Input = ({ label, hint, className = '', id, ...rest }: InputProps) => {
  const inputId = id || label?.replace(/\s+/g, '-').toLowerCase();
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-ink-700 mb-1.5">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full px-3.5 py-2.5 border border-line-300 rounded-sm bg-white text-ink-900 placeholder:text-ink-300 text-sm outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 transition-colors ${className}`}
        {...rest}
      />
      {hint && <p className="mt-1.5 text-xs text-ink-500">{hint}</p>}
    </div>
  );
};

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export const Select = ({ label, className = '', id, children, ...rest }: SelectProps) => {
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

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

export const Table = ({ headers, children }: { headers: string[]; children: ReactNode }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="border-b border-line-200">
          {headers.map((h) => (
            <th key={h} className="px-5 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide whitespace-nowrap">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-line-200">{children}</tbody>
    </table>
  </div>
);

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

export const EmptyState = ({ icon, title, description }: { icon?: ReactNode; title: string; description?: string }) => (
  <div className="flex flex-col items-center justify-center text-center py-14 px-6">
    {icon && <div className="text-ink-300 mb-3">{icon}</div>}
    <p className="text-sm font-medium text-ink-700">{title}</p>
    {description && <p className="text-xs text-ink-500 mt-1 max-w-sm">{description}</p>}
  </div>
);

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------

export const Avatar = ({ initials: label, size = 40 }: { initials: string; size?: number }) => (
  <div
    className="rounded-full bg-navy-900 text-white flex items-center justify-center font-semibold shrink-0"
    style={{ width: size, height: size, fontSize: size * 0.38 }}
  >
    {label}
  </div>
);

// ---------------------------------------------------------------------------
// Drawer (slide-over panel used for file / evidence detail views)
// ---------------------------------------------------------------------------

export const Drawer = ({
  open,
  onClose,
  title,
  subtitle,
  children,
  widthClass = 'max-w-xl',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  widthClass?: string;
}) => {
  useEscapeToClose(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-navy-950/40 backdrop-blur-[1px] animate-fade-in" onClick={onClose} />
      <div className={`relative w-full ${widthClass} h-full bg-white shadow-2xl overflow-y-auto animate-slide-in`}>
        <div className="sticky top-0 bg-white border-b border-line-200 px-6 py-4 flex items-start justify-between z-10">
          <div>
            <h2 className="text-lg font-semibold text-navy-900">{title}</h2>
            {subtitle && <p className="text-xs text-ink-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-sm text-ink-500 hover:bg-paper-100 hover:text-ink-900">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Modal (centered dialog)
// ---------------------------------------------------------------------------

export const Modal = ({
  open,
  onClose,
  title,
  children,
  widthClass = 'max-w-md',
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  widthClass?: string;
}) => {
  useEscapeToClose(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy-950/40 backdrop-blur-[1px] animate-fade-in" onClick={onClose} />
      <div className={`relative w-full ${widthClass} bg-white rounded-sm shadow-2xl animate-fade-in`}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-line-200">
            <h2 className="text-base font-semibold text-navy-900">{title}</h2>
            <button onClick={onClose} className="p-1 rounded-sm text-ink-500 hover:bg-paper-100 hover:text-ink-900">
              <X size={18} />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Section heading with optional description — used atop page content
// ---------------------------------------------------------------------------

export const SectionHeading = ({ title, description, action }: { title: string; description?: string; action?: ReactNode }) => (
  <div className="flex items-start justify-between gap-4 mb-5">
    <div>
      <h2 className="text-xl font-bold text-navy-900">{title}</h2>
      {description && <p className="text-sm text-ink-500 mt-1">{description}</p>}
    </div>
    {action}
  </div>
);

// ---------------------------------------------------------------------------
// Key/value description row — used heavily in case detail panels
// ---------------------------------------------------------------------------

export const DescriptionRow = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="py-2.5 grid grid-cols-3 gap-4 border-b border-line-200 last:border-0">
    <dt className="text-xs font-medium text-ink-500 uppercase tracking-wide col-span-1">{label}</dt>
    <dd className="text-sm text-ink-900 col-span-2">{value}</dd>
  </div>
);
