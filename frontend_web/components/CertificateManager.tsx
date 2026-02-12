
import React, { useState } from 'react';
import { useStore } from '../store';
import { Card, Button, Table, Badge } from './Common';
import { Evidence, EvidenceClassification, UserRole } from '../types';
import { FileBadge, FileText, AlertTriangle } from 'lucide-react';

export const CertificateManager = () => {
    const { evidence, issueSection63Certificate } = useStore();

    const [certModalOpen, setCertModalOpen] = useState(false);
    const [certEvidenceId, setCertEvidenceId] = useState<string | null>(null);
    const [certFile, setCertFile] = useState<File | null>(null);

    const pendingEvidence = evidence.filter(e => 
        e.classification === EvidenceClassification.SECONDARY && !e.section63Certificate
    );
    
    const handleOpenCertModal = (evidenceId: string) => {
        setCertEvidenceId(evidenceId);
        setCertModalOpen(true);
    };

    const handleIssueCert = () => {
        if (certEvidenceId && certFile) {
            const certRef = `CERT-${Date.now()}.pdf`; // Mock file ref
            issueSection63Certificate(certEvidenceId, certRef);
            setCertModalOpen(false);
            setCertEvidenceId(null);
            setCertFile(null);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gov-900 dark:text-white flex items-center gap-2">
                <FileBadge /> Certificate Manager
            </h2>
            <p className="text-sm text-gov-500 dark:text-gov-400">
                Issue Section 63 Certificates for SECONDARY evidence to make them admissible in court.
            </p>

            <Card title="Pending Certification">
                {pendingEvidence.length === 0 ? (
                    <div className="p-12 text-center text-gov-500 dark:text-gov-400">
                        <FileText className="w-12 h-12 mx-auto mb-2 opacity-50"/>
                        No evidence is currently pending certification.
                    </div>
                ) : (
                    <Table headers={['Evidence ID', 'File Name', 'Case ID', 'Classification', 'Action']}>
                        {pendingEvidence.map(ev => (
                            <tr key={ev.evidenceId}>
                                <td className="px-6 py-4 font-mono text-xs">{ev.evidenceId}</td>
                                <td className="px-6 py-4 font-medium text-gov-800 dark:text-white">{ev.fileName}</td>
                                <td className="px-6 py-4">{ev.caseId}</td>
                                <td className="px-6 py-4"><Badge color="yellow">{ev.classification}</Badge></td>
                                <td className="px-6 py-4">
                                    <Button size="sm" onClick={() => handleOpenCertModal(ev.evidenceId)}>
                                        <FileBadge size={14} /> Issue Certificate
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </Table>
                )}
            </Card>

            {certModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md" title="Issue Section 63 Certificate">
                        <div className="space-y-4">
                             <div className="p-3 mb-2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-xs rounded border border-yellow-200 dark:border-yellow-800 flex items-start gap-2">
                                <AlertTriangle size={24} className="shrink-0"/>
                                <strong>Warning:</strong> Issuing this certificate attests to the integrity of the secondary evidence. This is a legally binding action.
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gov-700 dark:text-gov-300 mb-1">Upload Signed Certificate</label>
                                <input 
                                    type="file" 
                                    accept=".pdf"
                                    onChange={(e) => setCertFile(e.target.files ? e.target.files[0] : null)}
                                    className="w-full text-sm text-gov-500 dark:text-gov-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 dark:file:bg-purple-900/30 dark:file:text-purple-300" 
                                />
                            </div>
                        </div>
                         <div className="mt-6 flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => setCertModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleIssueCert} disabled={!certFile}>
                                Sign & Issue
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};
