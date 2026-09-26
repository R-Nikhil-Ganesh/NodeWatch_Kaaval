import React, { useMemo, useState } from 'react';
import { AlertTriangle, Download, ExternalLink, FileArchive, FileText, Gavel, Loader2, LucideIcon, Pencil, ScrollText, Stamp, Upload } from 'lucide-react';
import { useCaseContext } from '../../components/layout/CaseLayout';
import { Badge, Button, Card, Drawer, EmptyState, Select } from '../../components/ui/Primitives';
import { CustodyTrail } from '../../components/case/CustodyTrail';
import { EditCaseFileModal } from '../../components/case/EditCaseFileModal';
import { UploadCaseFileModal } from '../../components/case/UploadCaseFileModal';
import { fetchCaseFiles } from '../../services/api';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../context/AuthContext';
import { CaseFile, CaseFileType, LegalDesignation } from '../../types';
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
  const { user } = useAuth();
  const isRegistrar = user?.designation === LegalDesignation.REGISTRAR;
  const { data: fetchedFiles, loading, error } = useAsync(() => fetchCaseFiles(courtCase.caseId), [courtCase.caseId]);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [selected, setSelected] = useState<CaseFile | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  // Edits/uploads are applied in place so the grid/drawer reflect the change
  // instantly, without a full refetch of every document in the case.
  const [overrides, setOverrides] = useState<Record<string, CaseFile>>({});
  const [additions, setAdditions] = useState<CaseFile[]>([]);
  const files = fetchedFiles && [...fetchedFiles.map((f) => overrides[f.fileId] || f), ...additions];

  const handleFileSaved = (updated: CaseFile) => {
    setOverrides((o) => ({ ...o, [updated.fileId]: updated }));
    setSelected(updated);
  };

  const handleFileUploaded = (uploaded: CaseFile) => {
    setAdditions((a) => [uploaded, ...a]);
  };

  // Files uploaded through the Registrar's "Upload File" flow have a real
  // presigned URL (selected.fileUrl) and are downloaded directly. Older
  // metadata-only records (filed before real uploads existed, or filed by
  // police/forensics through the legacy JSON-only endpoint) have no attached
  // binary, so "download" falls back to exporting the stored record as text.
  const handleDownload = (file: CaseFile) => {
    if (file.fileUrl) {
      window.open(file.fileUrl, '_blank', 'noopener');
      return;
    }
    const lines = [
      `Document: ${file.title}`,
      `Type: ${file.type}`,
      `Case: ${file.caseId}`,
      `Uploaded By: ${file.uploadedBy} (${file.uploadedByRole})`,
      `Uploaded On: ${formatDate(file.uploadedAt)}`,
      file.relatedSections?.length ? `Related Provisions: ${file.relatedSections.join(', ')}` : null,
      file.linkedEvidenceIds?.length ? `Linked Evidence: ${file.linkedEvidenceIds.join(', ')}` : null,
      '',
      'Summary:',
      file.summary || '(no summary recorded)',
    ].filter((l): l is string => l !== null);

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${file.fileId}-${file.title.replace(/[^a-z0-9]+/gi, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Renders the actual file inline in the drawer whenever one is attached —
  // no extra click needed. PDFs embed directly; images render as <img>;
  // other formats (DOCX) can't be previewed in-browser so fall back to a
  // link, and metadata-only legacy records show neither.
  const renderPreview = (file: CaseFile) => {
    if (!file.fileUrl) return null;
    if (file.fileFormat === 'PDF') {
      return (
        <iframe
          src={file.fileUrl}
          title={file.title}
          className="w-full h-[420px] rounded-sm border border-line-200 bg-paper-50"
        />
      );
    }
    if (file.fileFormat === 'JPEG') {
      return (
        <img
          src={file.fileUrl}
          alt={file.title}
          className="w-full max-h-[420px] object-contain rounded-sm border border-line-200 bg-paper-50"
        />
      );
    }
    return (
      <a
        href={file.fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 py-8 rounded-sm border border-dashed border-line-300 text-sm text-navy-700 hover:border-navy-500 transition-colors"
      >
        <ExternalLink size={15} /> Preview unavailable for {file.fileFormat} — open in a new tab
      </a>
    );
  };

  const types = Array.from(new Set((files || []).map((f) => f.type)));
  const visible = useMemo(
    () => (typeFilter === 'ALL' ? (files || []) : (files || []).filter((f) => f.type === typeFilter)),
    [files, typeFilter]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-navy-900">Case Files</h1>
          <p className="text-sm text-ink-500 mt-1">Every document filed in this case, from FIR to court orders — each tracked by chain of custody.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-64">
            <option value="ALL">All Document Types ({(files || []).length})</option>
            {types.map((t) => (
              <option key={t} value={t}>{t} ({(files || []).filter((f) => f.type === t).length})</option>
            ))}
          </Select>
          {isRegistrar && (
            <Button variant="primary" onClick={() => setUploadOpen(true)}>
              <Upload size={15} /> Upload File
            </Button>
          )}
        </div>
      </div>

      {isRegistrar && (
        <UploadCaseFileModal
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          caseId={courtCase.caseId}
          onUploaded={handleFileUploaded}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-ink-500 gap-2">
          <Loader2 size={18} className="animate-spin" /> Loading case files…
        </div>
      ) : error ? (
        <Card><EmptyState icon={<AlertTriangle size={40} />} title="Could not load case files" description={error} /></Card>
      ) : visible.length === 0 ? (
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

            {renderPreview(selected)}

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

            {!!selected.relatedSections?.length && (
              <div>
                <p className="text-xs font-medium text-ink-500 uppercase tracking-wide mb-1.5">Related Provisions</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.relatedSections.map((s) => <Badge key={s} tone="navy">{s}</Badge>)}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => handleDownload(selected)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm bg-navy-900 text-white text-sm font-medium hover:bg-navy-800 transition-colors"
              >
                <Download size={15} /> Download Document
              </button>
              {isRegistrar && (
                <Button variant="secondary" onClick={() => setEditOpen(true)}>
                  <Pencil size={14} /> Edit
                </Button>
              )}
            </div>

            <div>
              <p className="text-xs font-medium text-ink-500 uppercase tracking-wide mb-3">Chain of Custody</p>
              <CustodyTrail events={selected.custodyTrail} />
            </div>
          </div>
        )}
      </Drawer>

      {isRegistrar && selected && (
        <EditCaseFileModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          file={selected}
          onSaved={handleFileSaved}
        />
      )}
    </div>
  );
};
