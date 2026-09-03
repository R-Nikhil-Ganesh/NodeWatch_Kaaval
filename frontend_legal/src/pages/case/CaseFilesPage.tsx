import React, { useMemo, useState } from 'react';
import { Download, FileArchive, FileText, Gavel, LucideIcon, ScrollText, Stamp } from 'lucide-react';
import { useCaseContext } from '../../components/layout/CaseLayout';
import { Badge, Card, Drawer, EmptyState, Select } from '../../components/ui/Primitives';
import { CustodyTrail } from '../../components/case/CustodyTrail';
import { getFilesForCase } from '../../data/mockData';
import { CaseFile, CaseFileType } from '../../types';
import { formatDate, formatFileSize } from '../../utils/format';

const TYPE_ICON: Record<CaseFileType, LucideIcon> = {
  'FIR': FileText,
  'Consent Form / Panchnama': Stamp,
  'Section 63 BSA Certificate': FileArchive,
  'Arrest Warrant': Gavel,
  'Search Warrant': Gavel,
  'Production Warrant': Gavel,
  'Request Form': ScrollText,
  'Chargesheet': FileText,
  'Court Order': Gavel,
  'Bail Order': Gavel,
  'Medical / Post-mortem Report': FileText,
};

export const CaseFilesPage = () => {
  const { courtCase } = useCaseContext();
  const files = getFilesForCase(courtCase.caseId);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [selected, setSelected] = useState<CaseFile | null>(null);

  const types = Array.from(new Set(files.map((f) => f.type)));
  const visible = useMemo(
    () => (typeFilter === 'ALL' ? files : files.filter((f) => f.type === typeFilter)),
    [files, typeFilter]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-navy-900">Case Files</h1>
          <p className="text-sm text-ink-500 mt-1">Every document filed in this case, from FIR to court orders — each tracked by chain of custody.</p>
        </div>
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-64">
          <option value="ALL">All Document Types ({files.length})</option>
          {types.map((t) => (
            <option key={t} value={t}>{t} ({files.filter((f) => f.type === t).length})</option>
          ))}
        </Select>
      </div>

      {visible.length === 0 ? (
        <Card><EmptyState icon={<FileText size={40} />} title="No documents in this category" /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map((f) => {
            const Icon = TYPE_ICON[f.type] ?? FileText;
            return (
              <button
                key={f.fileId}
                onClick={() => setSelected(f)}
                className="text-left bg-white border border-line-200 rounded-sm p-4 hover:border-navy-500 transition-colors flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="w-9 h-9 rounded-sm bg-navy-50 text-navy-700 flex items-center justify-center shrink-0">
                    <Icon size={17} />
                  </div>
                  <Badge tone="neutral">{f.fileFormat}</Badge>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-saffron-700 uppercase tracking-wide">{f.type}</p>
                  <h3 className="text-sm font-semibold text-navy-900 mt-0.5 leading-snug">{f.title}</h3>
                </div>
                <p className="text-xs text-ink-500 line-clamp-2">{f.summary}</p>
                <div className="flex items-center gap-1.5 text-xs text-ink-500 pt-2 border-t border-line-200">
                  <span>{formatDate(f.uploadedAt)}</span>
                  <span>·</span>
                  <span>{formatFileSize(f.fileSizeKb, 'KB')}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title}
        subtitle={selected ? `${selected.type} · ${courtCase.caseId}` : ''}
      >
        {selected && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Badge tone="navy">{selected.fileFormat}</Badge>
              <Badge tone="neutral">{formatFileSize(selected.fileSizeKb, 'KB')}</Badge>
            </div>

            <div>
              <p className="text-xs font-medium text-ink-500 uppercase tracking-wide mb-1.5">Summary</p>
              <p className="text-sm text-ink-900 leading-relaxed">{selected.summary}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-ink-500">Uploaded By</p>
                <p className="text-ink-900 font-medium mt-0.5">{selected.uploadedBy}</p>
                <p className="text-xs text-ink-500">{selected.uploadedByRole}</p>
              </div>
              <div>
                <p className="text-xs text-ink-500">Uploaded On</p>
                <p className="text-ink-900 font-medium mt-0.5">{formatDate(selected.uploadedAt)}</p>
              </div>
            </div>

            {selected.relatedSections && (
              <div>
                <p className="text-xs font-medium text-ink-500 uppercase tracking-wide mb-1.5">Related Provisions</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.relatedSections.map((s) => <Badge key={s} tone="navy">{s}</Badge>)}
                </div>
              </div>
            )}

            <button
              onClick={() => alert('This is a UI-only preview build — file download will be wired up once the document store is connected.')}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm bg-navy-900 text-white text-sm font-medium hover:bg-navy-800 transition-colors"
            >
              <Download size={15} /> Download Document
            </button>

            <div>
              <p className="text-xs font-medium text-ink-500 uppercase tracking-wide mb-3">Chain of Custody</p>
              <CustodyTrail events={selected.custodyTrail} />
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
