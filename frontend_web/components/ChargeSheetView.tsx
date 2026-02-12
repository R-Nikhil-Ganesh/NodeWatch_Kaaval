
import React, { useState } from 'react';
import { useStore } from '../store';
import { Card, Button, Input, Badge } from './Common';
import { LegalDocument, UserRole, Evidence, IntegrityStatus, CaseStatus } from '../types';
import { Gavel, Scale, File as FileIcon, CheckSquare } from 'lucide-react';

export const ChargeSheetView = () => {
    const { documents, cases, evidence, currentUser, addDocument } = useStore();

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
                <h2 className="text-2xl font-bold text-gov-900 dark:text-white flex items-center gap-2">
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
                    <div className="p-12 text-center bg-gov-50 dark:bg-gov-900/50 rounded-lg border border-gov-200 dark:border-gov-800 border-dashed">
                        <Scale className="w-12 h-12 text-gov-300 mx-auto mb-2" />
                        <p className="text-gov-500">No charge sheets have been filed in the system.</p>
                    </div>
                ) : (
                    chargeSheets.map(doc => (
                        // FIX: Added a wrapping div with the key prop to resolve typing error on Card component.
                        <div key={doc.docId}>
                            <Card className="hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="font-bold text-lg text-gov-900 dark:text-white">{doc.title}</h3>
                                            <Badge color="red">FILED</Badge>
                                            <Badge color="blue">{doc.caseId}</Badge>
                                        </div>
                                        <p className="text-xs text-gov-500 font-mono mb-4">ID: {doc.docId} • Filed by {doc.uploadedBy}</p>
                                        
                                        <div className="bg-gov-50 dark:bg-gov-900 p-3 rounded-md border border-gov-100 dark:border-gov-800 text-sm whitespace-pre-line mb-4">
                                            {doc.description}
                                        </div>

                                        {doc.linkedEvidenceIds && doc.linkedEvidenceIds.length > 0 && (
                                            <div>
                                                <p className="text-xs font-bold uppercase text-gov-500 mb-2">Attached Verified Evidence</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {doc.linkedEvidenceIds.map(eid => {
                                                        const ev = evidence.find(e => e.evidenceId === eid);
                                                        return (
                                                            <span key={eid} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs rounded border border-blue-100 dark:border-blue-800">
                                                                <FileIcon size={10} />
                                                                {ev ? ev.fileName : eid}
                                                            </span>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-right text-xs text-gov-400">
                                        {new Date(doc.timestamp).toLocaleString()}
                                    </div>
                                </div>
                            </Card>
                        </div>
                    ))
                )}
            </div>

            {chargeSheetModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto" title="File New Charge Sheet">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gov-700 dark:text-gov-300 mb-1">Select Case</label>
                                     <select 
                                        value={selectedCaseId}
                                        onChange={(e) => setSelectedCaseId(e.target.value)}
                                        className="w-full px-3 py-2 border border-gov-300 rounded-md bg-white dark:bg-gov-900 dark:border-gov-600 dark:text-white"
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
                                    <label className="block text-sm font-medium text-gov-700 dark:text-gov-300 mb-1">Charges</label>
                                    <textarea 
                                        className="w-full px-3 py-2 border border-gov-300 rounded-md bg-white dark:bg-gov-900 dark:border-gov-600 dark:text-white focus:ring-blue-500"
                                        rows={3}
                                        value={chargeData.charges}
                                        onChange={(e) => setChargeData({...chargeData, charges: e.target.value})}
                                        placeholder="List sections of law..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gov-700 dark:text-gov-300 mb-1">Investigation Details</label>
                                    <textarea 
                                        className="w-full px-3 py-2 border border-gov-300 rounded-md bg-white dark:bg-gov-900 dark:border-gov-600 dark:text-white focus:ring-blue-500"
                                        rows={4}
                                        value={chargeData.details}
                                        onChange={(e) => setChargeData({...chargeData, details: e.target.value})}
                                        placeholder="Brief summary of findings..."
                                    />
                                </div>
                            </div>
                            
                            <div className="border-l border-gov-200 dark:border-gov-700 pl-6">
                                <label className="block text-sm font-medium text-gov-700 dark:text-gov-300 mb-2">Attach Verified Evidence</label>
                                <p className="text-xs text-gov-500 mb-3">Only integrity-verified assets for the selected case can be attached.</p>
                                
                                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                                    {!selectedCaseId ? (
                                        <p className="text-xs text-yellow-600 italic">Please select a case first.</p>
                                    ) : verifiedEvidenceForCase.length === 0 ? (
                                        <p className="text-xs text-red-500 italic">No verified evidence available for this case.</p>
                                    ) : (
                                        verifiedEvidenceForCase.map(e => (
                                            <div 
                                                key={e.evidenceId}
                                                onClick={() => handleToggleChargeEvidence(e.evidenceId)}
                                                className={`p-2 rounded border cursor-pointer transition-colors ${
                                                    chargeEvidenceIds.includes(e.evidenceId) 
                                                    ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700'
                                                    : 'bg-white border-gov-200 dark:bg-gov-800 dark:border-gov-700 hover:border-blue-300'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${chargeEvidenceIds.includes(e.evidenceId) ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-400'}`}>
                                                        {chargeEvidenceIds.includes(e.evidenceId) && <CheckSquare size={12} />}
                                                    </div>
                                                    <span className="text-sm font-medium text-gov-900 dark:text-white truncate">{e.fileName}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-2 pt-4 border-t border-gov-100 dark:border-gov-800">
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