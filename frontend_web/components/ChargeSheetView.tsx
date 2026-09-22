
import React, { useState } from 'react';
import { useStore } from '../store';
import { Card, Button, Input, Badge } from './Common';
import { LegalDocument, UserRole, Evidence, IntegrityStatus, CaseStatus } from '../types';
import { Gavel, Scale, File as FileIcon, CheckSquare } from 'lucide-react';

export const ChargeSheetView = () => {
    const { documents, cases, evidence, currentUser, addDocument, updateCaseStatus } = useStore();

    const [chargeSheetModalOpen, setChargeSheetModalOpen] = useState(false);
    const [selectedCaseId, setSelectedCaseId] = useState<string>('');
    const [chargeData, setChargeData] = useState({ accused: '', charges: '', details: '' });
    const [chargeEvidenceIds, setChargeEvidenceIds] = useState<string[]>([]);
    
    const chargeSheets = documents.filter(d => d.type === 'CHARGE_SHEET');
    const activeCases = cases.filter(c => c.status === CaseStatus.UNDER_INVESTIGATION);

    const handleToggleChargeEvidence = (id: string) => {
        setChargeEvidenceIds(prev =>
            prev.includes(id) ? prev.filter(lid => lid !== id) : [...prev, id]
        );
    };

    const handleSubmitChargeSheet = () => {
        if (!chargeData.accused || !chargeData.charges || !selectedCaseId) return;

        const newDoc: LegalDocument = {
            docId: `CS-${Date.now().toString().slice(-6)}`,
            caseId: selectedCaseId,
            title: `Charge Sheet: ${chargeData.accused}`,
            type: 'CHARGE_SHEET',
            description: `Charges: ${chargeData.charges}\nDetails: ${chargeData.details}\nSupporting Evidence Count: ${chargeEvidenceIds.length}`,
            uploadedBy: currentUser!.id,
            timestamp: new Date().toISOString(),
            linkedEvidenceIds: chargeEvidenceIds
        };

        addDocument(newDoc);

        // Filing the chargesheet IS the procedural act of sending a case to
        // court — without this, the case status never leaves
        // UNDER_INVESTIGATION/OPEN, the backend never stamps a court_stage,
        // and the case silently never appears in the Legal (Court
        // Management) portal even though the chargesheet document exists.
        // Mirrors the same submit handler in CaseViews.tsx's CaseDetail.
        const targetCase = cases.find(c => c.caseId === selectedCaseId);
        if (targetCase && targetCase.status !== CaseStatus.SUBMITTED_TO_COURT) {
            updateCaseStatus(selectedCaseId, CaseStatus.SUBMITTED_TO_COURT);
        }

        setChargeSheetModalOpen(false);
        setChargeData({ accused: '', charges: '', details: '' });
        setChargeEvidenceIds([]);
        setSelectedCaseId('');
    };
    
    const verifiedEvidenceForCase = selectedCaseId 
        ? evidence.filter(e => e.caseId === selectedCaseId && e.integrityStatus === IntegrityStatus.VERIFIED)
        : [];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-navy-900 flex items-center gap-2">
                    <Gavel /> Charge Sheet Management
                </h2>
                {currentUser?.role === UserRole.POLICE && (
                    <Button onClick={() => setChargeSheetModalOpen(true)}>
                        <Gavel size={16} /> Create New Charge Sheet
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 gap-4">
                {chargeSheets.length === 0 ? (
                    <div className="p-12 text-center bg-paper-50 rounded-sm border border-line-200 border-dashed">
                        <Scale className="w-12 h-12 text-ink-300 mx-auto mb-2" />
                        <p className="text-ink-500">No charge sheets have been filed in the system.</p>
                    </div>
                ) : (
                    chargeSheets.map(doc => (
                        // FIX: Added a wrapping div with the key prop to resolve typing error on Card component.
                        <div key={doc.docId}>
                            <Card className="hover:shadow-card transition-shadow">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="font-bold text-lg text-navy-900">{doc.title}</h3>
                                            <Badge color="red">FILED</Badge>
                                            <Badge color="blue">{doc.caseId}</Badge>
                                        </div>
                                        <p className="text-xs text-ink-500 font-mono mb-4">ID: {doc.docId} • Filed by {doc.uploadedBy}</p>

                                        <div className="bg-paper-50 p-3 rounded-sm border border-paper-100 text-sm whitespace-pre-line mb-4">
                                            {doc.description}
                                        </div>

                                        {doc.linkedEvidenceIds && doc.linkedEvidenceIds.length > 0 && (
                                            <div>
                                                <p className="text-xs font-bold uppercase text-ink-500 mb-2">Attached Verified Evidence</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {doc.linkedEvidenceIds.map(eid => {
                                                        const ev = evidence.find(e => e.evidenceId === eid);
                                                        return (
                                                            <span key={eid} className="inline-flex items-center gap-1 px-2 py-1 bg-navy-50 text-navy-800 text-xs rounded-sm border border-navy-100">
                                                                <FileIcon size={10} />
                                                                {ev ? ev.fileName : eid}
                                                            </span>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-right text-xs text-ink-300">
                                        {new Date(doc.timestamp).toLocaleString()}
                                    </div>
                                </div>
                            </Card>
                        </div>
                    ))
                )}
            </div>

            {chargeSheetModalOpen && (
                <div className="fixed inset-0 bg-navy-950/40 backdrop-blur-[1px] flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto" title="File New Charge Sheet">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-ink-700 mb-1">Select Case</label>
                                     <select
                                        value={selectedCaseId}
                                        onChange={(e) => setSelectedCaseId(e.target.value)}
                                        className="w-full px-3 py-2 border border-line-300 rounded-sm bg-white"
                                    >
                                        <option value="">-- Choose an active case --</option>
                                        {activeCases.map(c => (
                                            <option key={c.caseId} value={c.caseId}>{c.caseId}: {c.title}</option>
                                        ))}
                                    </select>
                                </div>
                                <Input 
                                    label="Accused Name" 
                                    value={chargeData.accused}
                                    onChange={(e) => setChargeData({...chargeData, accused: e.target.value})}
                                    placeholder="Full name of suspect"
                                />
                                <div>
                                    <label className="block text-sm font-medium text-ink-700 mb-1">Charges</label>
                                    <textarea
                                        className="w-full px-3 py-2 border border-line-300 rounded-sm bg-white focus:outline-none focus:ring-1 focus:ring-navy-500 focus:border-navy-500"
                                        rows={3}
                                        value={chargeData.charges}
                                        onChange={(e) => setChargeData({...chargeData, charges: e.target.value})}
                                        placeholder="List sections of law..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-ink-700 mb-1">Investigation Details</label>
                                    <textarea
                                        className="w-full px-3 py-2 border border-line-300 rounded-sm bg-white focus:outline-none focus:ring-1 focus:ring-navy-500 focus:border-navy-500"
                                        rows={4}
                                        value={chargeData.details}
                                        onChange={(e) => setChargeData({...chargeData, details: e.target.value})}
                                        placeholder="Brief summary of findings..."
                                    />
                                </div>
                            </div>
                            
                            <div className="border-l border-line-200 pl-6">
                                <label className="block text-sm font-medium text-ink-700 mb-2">Attach Verified Evidence</label>
                                <p className="text-xs text-ink-500 mb-3">Only integrity-verified assets for the selected case can be attached.</p>

                                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                                    {!selectedCaseId ? (
                                        <p className="text-xs text-status-pending italic">Please select a case first.</p>
                                    ) : verifiedEvidenceForCase.length === 0 ? (
                                        <p className="text-xs text-status-urgent italic">No verified evidence available for this case.</p>
                                    ) : (
                                        verifiedEvidenceForCase.map(e => (
                                            <div
                                                key={e.evidenceId}
                                                onClick={() => handleToggleChargeEvidence(e.evidenceId)}
                                                className={`p-2 rounded-sm border cursor-pointer transition-colors ${
                                                    chargeEvidenceIds.includes(e.evidenceId)
                                                    ? 'bg-navy-50 border-navy-300'
                                                    : 'bg-white border-line-200 hover:border-navy-300'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className={`w-4 h-4 rounded-sm border flex items-center justify-center ${chargeEvidenceIds.includes(e.evidenceId) ? 'bg-navy-700 border-navy-700 text-white' : 'border-line-300'}`}>
                                                        {chargeEvidenceIds.includes(e.evidenceId) && <CheckSquare size={12} />}
                                                    </div>
                                                    <span className="text-sm font-medium text-navy-900 truncate">{e.fileName}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-2 pt-4 border-t border-paper-100">
                            <Button variant="secondary" onClick={() => setChargeSheetModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleSubmitChargeSheet} disabled={!chargeData.accused || !chargeData.charges || !selectedCaseId}>
                                Sign & Submit Charge Sheet
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};