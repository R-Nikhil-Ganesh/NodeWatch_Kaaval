
import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { Case, Evidence, IntegrityStatus, UserRole, CaseStatus, EvidenceType, LegalDocument, EvidenceClassification } from '../types';
import { Card, Button, Table, Badge, CaseStatusBadge, IntegrityBadge, Input } from './Common';
import { ArrowLeft, Upload, FileText, Lock, Eye, AlertTriangle, ShieldCheck, Download, History, File as FileIcon, Loader2, Link as LinkIcon, CheckSquare, Square, ChevronDown, Fingerprint, Shield, X, Send, Gavel, LayoutList, Scale, CheckCircle, Video, FileBadge, Edit2 } from 'lucide-react';

// --- Security Modal Component ---
const StatusChangeSecurityModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    targetStatus 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    onConfirm: () => void; 
    targetStatus: CaseStatus | null 
}) => {
    const [stage, setStage] = useState<'PIN' | 'BIOMETRIC'>('PIN');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [isScanning, setIsScanning] = useState(false);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setStage('PIN');
            setPin('');
            setError('');
            setIsScanning(false);
        }
    }, [isOpen]);

    if (!isOpen || !targetStatus) return null;

    const handlePinSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (pin === '1234') {
            setStage('BIOMETRIC');
            setError('');
        } else {
            setError('Invalid Admin PIN');
            setPin('');
        }
    };

    const handleBiometricScan = () => {
        setIsScanning(true);
        // Simulate hardware delay
        setTimeout(() => {
            setIsScanning(false);
            onConfirm();
        }, 2000);
    };

    return (
        <div className="fixed inset-0 bg-navy-950/50 backdrop-blur-[1px] flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-sm overflow-hidden relative shadow-2xl border-2 border-line-300">
                 <button onClick={onClose} className="absolute top-3 right-3 text-ink-300 hover:text-navy-700">
                    <X size={20} />
                </button>

                <div className="text-center mb-6 pt-2">
                    <div className="mx-auto w-12 h-12 rounded-full bg-status-urgentBg text-status-urgent flex items-center justify-center mb-3">
                        <ShieldAlertIcon stage={stage} />
                    </div>
                    <h3 className="text-lg font-bold text-navy-900">
                        {stage === 'PIN' ? 'Admin Authorization' : 'Biometric Confirm'}
                    </h3>
                    <p className="text-xs text-ink-500 px-4 mt-1">
                        Changing Case Status to <span className="font-bold text-navy-900">{targetStatus}</span> requires Level 2 clearance.
                    </p>
                </div>

                {stage === 'PIN' && (
                    <form onSubmit={handlePinSubmit} className="space-y-4">
                        <div className="flex justify-center">
                            <input
                                type="password"
                                maxLength={4}
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                                className="w-32 text-center text-3xl tracking-[0.5em] font-mono py-2 border-b-2 border-line-300 focus:border-status-urgent bg-transparent outline-none text-navy-900 transition-colors"
                                placeholder="••••"
                                autoFocus
                            />
                        </div>
                        {error && <p className="text-center text-xs text-status-urgent font-bold animate-pulse">{error}</p>}
                        <Button className="w-full" type="submit">Verify PIN</Button>
                    </form>
                )}

                {stage === 'BIOMETRIC' && (
                    <div className="space-y-6 flex flex-col items-center">
                        <div className="relative">
                            {isScanning && (
                                <div className="absolute inset-0 rounded-full bg-status-urgent/20 animate-ping"></div>
                            )}
                            <div
                                onClick={!isScanning ? handleBiometricScan : undefined}
                                className={`w-20 h-20 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${
                                    isScanning
                                    ? 'border-status-urgent bg-status-urgentBg text-status-urgent'
                                    : 'border-line-300 hover:border-status-urgent/60 text-ink-300 hover:text-status-urgent hover:bg-paper-50'
                                }`}
                            >
                                <Fingerprint size={40} />
                            </div>
                        </div>
                        <p className="text-xs text-ink-500 text-center">
                             {isScanning ? 'Verifying Identity...' : 'Touch sensor to confirm transaction signature.'}
                        </p>
                        <Button 
                            className="w-full" 
                            disabled={isScanning} 
                            onClick={!isScanning ? handleBiometricScan : undefined}
                            variant="danger"
                        >
                            {isScanning ? 'Processing...' : 'Authorize Change'}
                        </Button>
                    </div>
                )}
            </Card>
        </div>
    );
};

const ShieldAlertIcon = ({ stage }: { stage: string }) => {
    if (stage === 'PIN') return <Lock size={24} />;
    return <Fingerprint size={24} />;
};


export const CaseDetail = ({ caseId, onBack }: { caseId: string, onBack: () => void }) => {
    const { cases, evidence, logs, documents, users, currentUser, addEvidence, addLog, updateCaseStatus, verifyEvidence, approveEvidence, toggleIntegrityHack, addDocument, transferCaseCustody, reassignCase } = useStore();
    const currentCase = cases.find(c => c.caseId === caseId);
    
    // View State
    const [activeTab, setActiveTab] = useState<'evidence' | 'charges'>('evidence');

    // Derived Data
    const rawCaseEvidence = evidence.filter(e => e.caseId === caseId);
    // Constraint: Legal can ONLY see approved evidence
    const isLegal = currentUser.role === UserRole.LEGAL;
    const caseEvidence = isLegal ? rawCaseEvidence.filter(e => e.approvedForLegal) : rawCaseEvidence;
    const verifiedEvidence = caseEvidence.filter(e => e.integrityStatus === IntegrityStatus.VERIFIED);
    const caseLogs = logs.filter(l => l.caseId === caseId || rawCaseEvidence.some(e => e.evidenceId === l.evidenceId));
    const caseDocuments = documents.filter(d => d.caseId === caseId);
    
    // Custody Logic: Police-only
    const hasCustody = (
        (currentCase?.currentCustodian === currentUser.name) ||
        (currentCase?.currentCustodian?.startsWith?.("Police") ?? false)
    ) && currentUser.role === UserRole.POLICE;

    // Upload Modal State
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [evidenceNotes, setEvidenceNotes] = useState('');
    const [linkedEvidenceIds, setLinkedEvidenceIds] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    // New Fields for Primary/Secondary
    const [sourceHash, setSourceHash] = useState('');
    const [liftingVideo, setLiftingVideo] = useState<File | null>(null);
    
    // Charge Sheet Modal State
    const [chargeSheetModalOpen, setChargeSheetModalOpen] = useState(false);
    const [chargeData, setChargeData] = useState({ accused: '', charges: '', details: '' });
    const [chargeEvidenceIds, setChargeEvidenceIds] = useState<string[]>([]);

    // Transfer Custody Modal State
    const [transferModalOpen, setTransferModalOpen] = useState(false);
    const [transferTarget, setTransferTarget] = useState({ role: UserRole.POLICE, userId: '', notes: '', overrideReason: '' });

    // Edit Assignment Modal State (Admin only)
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [assignTarget, setAssignTarget] = useState({ custodianId: '', forensicsId: '' });

    // Audit & Status Modal State
    const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null); 
    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [pendingStatus, setPendingStatus] = useState<CaseStatus | null>(null);

    if (!currentCase) return <div>Case not found</div>;

    // Permissions
    const canUpload = currentUser.role === UserRole.POLICE && hasCustody;
    const canApprove = currentUser.role === UserRole.ADMIN;
    const canVerify = currentUser.role === UserRole.FORENSICS || currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.LEGAL;
    const canFileChargeSheet = currentUser.role === UserRole.POLICE && hasCustody;
    const canTransferCustody = (currentUser.role === UserRole.POLICE && hasCustody) || currentUser.role === UserRole.ADMIN;
    const isAdminOverrideTransfer = currentUser.role === UserRole.ADMIN;
    const canEditAssignment = currentUser.role === UserRole.ADMIN;
    
    const handleToggleLink = (id: string) => {
        setLinkedEvidenceIds(prev => 
            prev.includes(id) ? prev.filter(lid => lid !== id) : [...prev, id]
        );
    };

    const handleToggleChargeEvidence = (id: string) => {
        setChargeEvidenceIds(prev => 
            prev.includes(id) ? prev.filter(lid => lid !== id) : [...prev, id]
        );
    };

    // --- Status Change Handler ---
    const handleStatusDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value as CaseStatus;
        if (newStatus !== currentCase.status) {
            setPendingStatus(newStatus);
            setStatusModalOpen(true);
        }
    };

    const confirmStatusChange = () => {
        if (pendingStatus) {
            updateCaseStatus(caseId, pendingStatus);
            setStatusModalOpen(false);
            setPendingStatus(null);
        }
    };

    // --- Charge Sheet Handler ---
    const handleSubmitChargeSheet = () => {
        if (!chargeData.accused || !chargeData.charges) return;

        const newDoc: LegalDocument = {
            docId: `CS-${Date.now().toString().slice(-6)}`,
            caseId: caseId,
            title: `Charge Sheet: ${chargeData.accused}`,
            type: 'CHARGE_SHEET',
            description: `Charges: ${chargeData.charges}\nDetails: ${chargeData.details}\nSupporting Evidence Count: ${chargeEvidenceIds.length}`,
            uploadedBy: currentUser.id,
            timestamp: new Date().toISOString(),
            linkedEvidenceIds: chargeEvidenceIds
        };
        
        addDocument(newDoc);

        // Filing the chargesheet IS the procedural act of sending a case to
        // court — without this, the case status never leaves
        // UNDER_INVESTIGATION/OPEN, the backend never stamps a court_stage,
        // and the case silently never appears in the Legal (Court
        // Management) portal even though the chargesheet document exists.
        if (currentCase.status !== CaseStatus.SUBMITTED_TO_COURT) {
            updateCaseStatus(caseId, CaseStatus.SUBMITTED_TO_COURT);
        }

        setChargeSheetModalOpen(false);
        setChargeData({ accused: '', charges: '', details: '' });
        setChargeEvidenceIds([]);
    };

    // --- Transfer Custody Handler ---
    const handleTransferCustody = () => {
        if (!transferTarget.role) return;
        if (isAdminOverrideTransfer && !transferTarget.overrideReason.trim()) return;

        const targetId = transferTarget.userId || `${transferTarget.role} Department`;

        transferCaseCustody(caseId, targetId, transferTarget.role, transferTarget.notes, isAdminOverrideTransfer ? transferTarget.overrideReason : undefined);
        setTransferModalOpen(false);
        setTransferTarget({ role: UserRole.POLICE, userId: '', notes: '', overrideReason: '' });
    };

    // --- Edit Assignment Handler (Admin) ---
    const handleSubmitAssignment = () => {
        if (!assignTarget.custodianId && !assignTarget.forensicsId) return;

        reassignCase(caseId, {
            currentCustodianId: assignTarget.custodianId || undefined,
            assignedForensicsId: assignTarget.forensicsId || undefined,
        });
        setAssignModalOpen(false);
        setAssignTarget({ custodianId: '', forensicsId: '' });
    };

    const handleUpload = () => {
        if (!selectedFile) return;
        
        const typeStr = selectedFile.type.includes('image') ? EvidenceType.IMAGE : 
                        selectedFile.type.includes('pdf') ? EvidenceType.PDF : EvidenceType.WORD;

        if (currentUser.role === UserRole.POLICE && typeStr !== EvidenceType.IMAGE) {
            alert("Police can only upload images.");
            return;
        }

        setIsUploading(true);

        const finalizeUpload = (locationStr: string) => {
            const newEvidence: Evidence = {
                evidenceId: `EV-${Date.now().toString().slice(-6)}`,
                caseId: caseId,
                type: typeStr,
                fileName: selectedFile.name,
                uploadedBy: currentUser.id,
                role: currentUser.role,
                timestamp: new Date().toISOString(),
                location: locationStr,
                fileHash: `0x${Math.random().toString(16).slice(2)}...`,
                metadataHash: `0x${Math.random().toString(16).slice(2)}...`,
                custodian: 'Police Evidence Room',
                integrityStatus: IntegrityStatus.NOT_CHECKED,
                approvedForLegal: false,
                visibility: {
                    isRestricted: false,
                    allowedRoles: [],
                    allowedDesignations: [],
                    allowedUserIds: []
                },
                notes: evidenceNotes,
                linkedEvidenceIds: linkedEvidenceIds,
                classification: EvidenceClassification.SECONDARY,
                sourceHash: sourceHash || undefined,
                liftingVideo: liftingVideo ? liftingVideo.name : undefined,
                liftingVideoHash: liftingVideo ? `0x${Math.random().toString(16).slice(2)}...` : undefined
            };
    
            addEvidence(newEvidence);
            setUploadModalOpen(false);
            setSelectedFile(null);
            setEvidenceNotes('');
            setLinkedEvidenceIds([]);
            setSourceHash('');
            setLiftingVideo(null);
            setIsUploading(false);
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    finalizeUpload(`GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
                },
                (error) => {
                    console.error("Geolocation error:", error);
                    const proceed = confirm("Could not acquire live location. Upload without precise GPS?");
                    if (proceed) {
                        finalizeUpload("GPS: Unavailable (Signal Lost/Denied)");
                    } else {
                        setIsUploading(false);
                    }
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            alert("Geolocation is not supported by your browser.");
            finalizeUpload("GPS: Not Supported");
        }
    };

    const handleViewEvidence = (e: Evidence) => {
        if (currentUser.role === UserRole.LEGAL && !e.approvedForLegal) {
            alert("Evidence not approved for Legal review.");
            addLog({
                evidenceId: e.evidenceId,
                caseId: e.caseId,
                accessedBy: currentUser.id,
                role: currentUser.role,
                action: 'VIEW',
                details: 'Unauthorized view attempt blocked'
            });
            return;
        }
        
        addLog({
             evidenceId: e.evidenceId,
             caseId: e.caseId,
             accessedBy: currentUser.id,
             role: currentUser.role,
             action: 'VIEW',
             details: `Viewed evidence ${e.fileName}`
        });

        alert(`Viewing ${e.fileName}\nHash: ${e.fileHash}\n\n(File content simulated)`);
    };

    const tableHeaders = isLegal 
        ? ['ID', 'File', 'Type', 'Class', 'Date', 'Integrity', 'Actions']
        : ['ID', 'File', 'Type', 'Class', 'Date', 'Integrity', 'Status', 'Actions'];

    return (
        <div className="space-y-6">
            {/* Compact Case Context Header */}
            <div className="bg-white border border-line-200 rounded-md p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        onClick={onBack}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded text-ink-600 hover:text-navy-900 hover:bg-paper-100 border border-line-200 transition-colors shrink-0"
                    >
                        <ArrowLeft size={14} /> Back to Cases
                    </button>
                    <span className="text-line-300 hidden sm:inline">|</span>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-navy-900 bg-navy-50 px-2 py-0.5 rounded border border-navy-100">
                                {currentCase.caseId}
                            </span>
                            <h2 className="text-base font-bold text-navy-900 truncate">
                                {currentCase.title}
                            </h2>
                            <CaseStatusBadge status={currentCase.status} />
                        </div>
                        <p className="text-[11px] text-ink-500 mt-0.5">
                            Created by {currentCase.createdBy} · {new Date(currentCase.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {currentUser.role === UserRole.ADMIN && (
                        <div className="flex items-center gap-2 bg-paper-100 p-1 rounded border border-line-200 mr-1">
                            <span className="text-[10px] font-bold text-ink-500 uppercase px-1.5 tracking-wider flex items-center gap-1">
                                <Shield size={10} /> Admin
                            </span>
                            <div className="relative">
                                <select
                                    value={currentCase.status}
                                    onChange={handleStatusDropdownChange}
                                    className="appearance-none pl-2.5 pr-7 py-1 text-xs font-medium bg-white border border-line-300 rounded focus:outline-none text-navy-900 cursor-pointer"
                                >
                                    {Object.values(CaseStatus).map((status) => (
                                        <option key={status} value={status}>
                                            {status.replace(/_/g, ' ')}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown size={13} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-ink-300 pointer-events-none" />
                            </div>
                            {canEditAssignment && (
                                <Button size="sm" variant="secondary" onClick={() => setAssignModalOpen(true)}>
                                    <Edit2 size={13} /> Reassign
                                </Button>
                            )}
                        </div>
                    )}
                    
                    {!hasCustody && currentUser.role === UserRole.POLICE && (
                         <div className="px-2.5 py-1 bg-status-pendingBg text-status-pending text-xs font-semibold rounded border border-status-pending/20 flex items-center gap-1">
                             <Lock size={12} /> View Only
                         </div>
                    )}

                    {canTransferCustody && (
                         <Button variant="secondary" size="sm" onClick={() => setTransferModalOpen(true)}>
                            <Send size={14} /> Transfer Custody
                        </Button>
                    )}

                    {canUpload && (
                        <Button size="sm" onClick={() => setUploadModalOpen(true)}>
                            <Upload size={14} /> Upload Evidence
                        </Button>
                    )}
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center border-b border-line-200 space-x-6">
                <button
                    onClick={() => setActiveTab('evidence')}
                    className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                        activeTab === 'evidence'
                            ? 'border-saffron-500 text-navy-900'
                            : 'border-transparent text-ink-500 hover:text-navy-700'
                    }`}
                >
                    <LayoutList size={16} /> Evidence Chain ({caseEvidence.length})
                </button>
                {currentUser.role === UserRole.POLICE && (
                    <button
                        onClick={() => setActiveTab('charges')}
                        className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                            activeTab === 'charges'
                                ? 'border-saffron-500 text-navy-900'
                                : 'border-transparent text-ink-500 hover:text-navy-700'
                        }`}
                    >
                        <Gavel size={16} /> Charge Sheets ({caseDocuments.filter(d => d.type === 'CHARGE_SHEET').length})
                    </button>
                )}
            </div>

            {/* Main Content Area */}
            {activeTab === 'evidence' ? (
                <Card title="Evidence Ledger">
                    <Table headers={tableHeaders}>
                        {caseEvidence.map(e => (
                            <tr key={e.evidenceId} className={`${e.integrityStatus === IntegrityStatus.COMPROMISED ? 'bg-status-urgentBg' : 'hover:bg-paper-50'}`}>
                                <td className="px-6 py-4 text-xs font-mono text-ink-700">{e.evidenceId}</td>
                                <td className="px-6 py-4 text-sm font-medium">
                                    <div className="flex items-center gap-2 text-navy-900">
                                        <FileIcon size={14} className="text-ink-300" /> {e.fileName}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-ink-500">{e.type}</td>

                                <td className="px-6 py-4 text-sm">
                                    <Badge color={e.classification === EvidenceClassification.PRIMARY ? 'green' : 'yellow'}>
                                        {e.classification}
                                    </Badge>
                                </td>

                                <td className="px-6 py-4 text-sm text-ink-500">{new Date(e.timestamp).toLocaleDateString()}</td>
                                <td className="px-6 py-4">
                                    <IntegrityBadge status={e.integrityStatus} />
                                    {e.integrityStatus === IntegrityStatus.COMPROMISED && (
                                        <div className="text-xs text-status-urgent font-bold mt-1">HASH MISMATCH</div>
                                    )}
                                </td>
                                {!isLegal && (
                                    <td className="px-6 py-4">
                                        {e.approvedForLegal ? (
                                            <Badge color="green">Legal Approved</Badge>
                                        ) : (
                                            <Badge color="gray">Restricted</Badge>
                                        )}
                                    </td>
                                )}
                                <td className="px-6 py-4 flex items-center gap-2">
                                    <button onClick={() => handleViewEvidence(e)} title="View" className="text-ink-700 hover:text-navy-700"><Eye size={16}/></button>

                                    {canVerify && (
                                        <button onClick={() => verifyEvidence(e.evidenceId)} title="Verify Integrity" className="text-ink-700 hover:text-status-resolved"><ShieldCheck size={16}/></button>
                                    )}

                                    {canApprove && !e.approvedForLegal && (
                                        <button
                                            onClick={() => approveEvidence(e.evidenceId)}
                                            title={e.classification === EvidenceClassification.SECONDARY && !e.section63Certificate ? "Secondary Evidence requires Section 63 Cert" : "Approve for Legal"}
                                            className={`transition-colors ${
                                                e.classification === EvidenceClassification.SECONDARY && !e.section63Certificate
                                                ? 'text-ink-300 cursor-not-allowed'
                                                : 'text-ink-700 hover:text-status-resolved'
                                            }`}
                                            disabled={e.classification === EvidenceClassification.SECONDARY && !e.section63Certificate}
                                        >
                                            <Lock size={16}/>
                                        </button>
                                    )}

                                    <button onClick={() => setSelectedEvidenceId(e.evidenceId)} title="View Logs" className="text-ink-700 hover:text-navy-700"><History size={16}/></button>

                                    {currentUser.role === UserRole.ADMIN && (
                                        <button onClick={() => toggleIntegrityHack(e.evidenceId)} title="Simulate Tamper" className="text-status-urgent/50 hover:text-status-urgent"><AlertTriangle size={16}/></button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </Table>
                </Card>
            ) : (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-ink-500">Formal charges filed against accused persons in this case.</p>
                        {canFileChargeSheet && (
                            <Button onClick={() => setChargeSheetModalOpen(true)}>
                                <Gavel size={16} /> Create Charge Sheet
                            </Button>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                        {caseDocuments.filter(d => d.type === 'CHARGE_SHEET').length === 0 ? (
                            <div className="p-8 text-center bg-paper-50 rounded-sm border border-line-200 border-dashed">
                                <Scale className="w-12 h-12 text-line-300 mx-auto mb-2" />
                                <p className="text-ink-500">No charge sheets filed.</p>
                            </div>
                        ) : (
                            caseDocuments.filter(d => d.type === 'CHARGE_SHEET').map(doc => (
                                <div key={doc.docId}>
                                    <Card className="hover:shadow-card transition-shadow">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h3 className="font-bold text-lg text-navy-900">{doc.title}</h3>
                                                    <Badge color="red">FILED</Badge>
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
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <div className="lg:col-span-2">
                     <Card title="Chain of Custody Timeline">
                        <div className="relative border-l-2 border-line-200 ml-3 space-y-6 py-2">
                            {caseLogs.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((log) => (
                                <div key={log.id} className="relative pl-8">
                                    <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white ${
                                        log.action === 'COMPROMISED' ? 'bg-status-urgent' :
                                        log.action === 'VERIFY' ? 'bg-status-resolved' :
                                        log.action === 'TRANSFER_CUSTODY' ? 'bg-navy-700' :
                                        log.action === 'REASSIGN_CASE' ? 'bg-saffron-500' :
                                        log.action === 'ISSUE_CERT' ? 'bg-ashoka-600' :
                                        'bg-navy-500'
                                    }`}></div>
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                                        <div>
                                            <p className="text-sm font-bold text-navy-900">{log.action.replace(/_/g, ' ')}</p>
                                            <p className="text-sm text-ink-700">{log.details}</p>
                                            {log.evidenceId && <p className="text-xs text-ink-300 font-mono mt-1">Ref: {log.evidenceId}</p>}
                                        </div>
                                        <div className="text-right mt-1 sm:mt-0">
                                            <p className="text-xs font-medium text-ink-500">{new Date(log.timestamp).toLocaleDateString()}</p>
                                            <p className="text-xs text-ink-300">{new Date(log.timestamp).toLocaleTimeString()}</p>
                                            <span className="text-xs font-bold text-ink-700 block mt-1">{log.accessedBy} ({log.role})</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                     </Card>
                 </div>
                 
                 <div>
                     <Card title="Case Metadata">
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-ink-300 uppercase font-bold">Current Status</label>
                                <div className="mt-1"><CaseStatusBadge status={currentCase.status}/></div>
                            </div>
                            <div>
                                <label className="text-xs text-ink-300 uppercase font-bold">Current Custodian</label>
                                <div className={`mt-1 flex items-center gap-2 p-2 rounded-sm text-sm font-bold border ${hasCustody ? 'bg-status-resolvedBg text-status-resolved border-status-resolved/20' : 'bg-navy-50 text-navy-800 border-navy-100'}`}>
                                    {hasCustody ? <CheckCircle size={14} /> : <Shield size={14} />}
                                    {currentCase.currentCustodian}
                                    {hasCustody && <span className="ml-auto text-[10px] uppercase bg-white/50 px-1 rounded-sm">You</span>}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-ink-300 uppercase font-bold">Investigator</label>
                                <p className="text-sm font-medium text-navy-900">{currentCase.createdBy}</p>
                            </div>
                             <div>
                                <label className="text-xs text-ink-300 uppercase font-bold">Forensics Lead</label>
                                <p className="text-sm font-medium text-navy-900">{currentCase.assignedToForensics || 'Unassigned'}</p>
                            </div>
                            <div className="pt-4 border-t border-paper-100">
                                <p className="text-xs text-ink-500 italic">{currentCase.description}</p>
                            </div>
                        </div>
                     </Card>
                 </div>
            </div>

            {chargeSheetModalOpen && (
                <div className="fixed inset-0 bg-navy-950/40 backdrop-blur-[1px] flex items-center justify-center z-50 p-4">
                     <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" title="File Charge Sheet">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <Input 
                                    label="Accused Name" 
                                    value={chargeData.accused}
                                    onChange={(e) => setChargeData({...chargeData, accused: e.target.value})}
                                    placeholder="Full name of suspect"
                                />
                                <div>
                                    <label className="block text-sm font-medium text-ink-700 mb-1">Charges</label>
                                    <textarea
                                        className="w-full px-3 py-2 border border-line-300 rounded-sm bg-white text-ink-900 outline-none focus:ring-1 focus:ring-navy-500 focus:border-navy-500"
                                        rows={3}
                                        value={chargeData.charges}
                                        onChange={(e) => setChargeData({...chargeData, charges: e.target.value})}
                                        placeholder="List sections of law..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-ink-700 mb-1">Investigation Details</label>
                                    <textarea
                                        className="w-full px-3 py-2 border border-line-300 rounded-sm bg-white text-ink-900 outline-none focus:ring-1 focus:ring-navy-500 focus:border-navy-500"
                                        rows={4}
                                        value={chargeData.details}
                                        onChange={(e) => setChargeData({...chargeData, details: e.target.value})}
                                        placeholder="Brief summary of findings..."
                                    />
                                </div>
                            </div>

                            <div className="border-l border-line-200 pl-6">
                                <label className="block text-sm font-medium text-ink-700 mb-2">Attach Verified Evidence</label>
                                <p className="text-xs text-ink-500 mb-3">Only integrity-verified assets can be attached to a charge sheet.</p>

                                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                                    {verifiedEvidence.length === 0 && (
                                        <p className="text-xs text-status-urgent italic">No verified evidence available.</p>
                                    )}
                                    {verifiedEvidence.map(e => (
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
                                            <div className="flex justify-between items-center text-xs text-ink-500 ml-6">
                                                <span>{e.type}</span>
                                                <span className="font-mono">{e.evidenceId}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-right text-ink-300 mt-2">
                                    {chargeEvidenceIds.length} items selected
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-2 pt-4 border-t border-paper-100">
                            <Button variant="secondary" onClick={() => setChargeSheetModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleSubmitChargeSheet} disabled={!chargeData.accused || !chargeData.charges}>
                                Sign & Submit Charge Sheet
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {transferModalOpen && (
                <div className="fixed inset-0 bg-navy-950/40 backdrop-blur-[1px] flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md" title={isAdminOverrideTransfer ? "Admin Override: Force Custody Transfer" : "Transfer Case Custody"}>
                        <div className="p-3 mb-4 bg-status-pendingBg text-status-pending text-xs rounded-sm border border-status-pending/20">
                            <strong>Warning:</strong> {isAdminOverrideTransfer
                                ? "This forces a custody change without the current custodian's participation. An override reason is required and will be recorded in the audit trail."
                                : "Transferring custody shifts legal responsibility. You will lose ability to add evidence or modify charge sheets."}
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-ink-700 mb-1">Transfer To</label>
                                <select
                                    className="w-full px-3 py-2 border border-line-300 rounded-sm bg-white text-ink-900"
                                    value={transferTarget.role}
                                    disabled
                                >
                                    <option value={UserRole.POLICE}>Police Department (Internal Transfer)</option>
                                </select>
                                <p className="text-xs text-ink-300 mt-1">Police can only transfer custody to other Police units or officers.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-ink-700 mb-1">Receiving Officer / Station</label>
                                <select
                                    className="w-full px-3 py-2 border border-line-300 rounded-sm bg-white text-ink-900"
                                    value={transferTarget.userId}
                                    onChange={(e) => setTransferTarget({...transferTarget, userId: e.target.value})}
                                >
                                    <option value="">-- Select Recipient --</option>
                                    <option value="Police Station 2">Police Station 2 (General)</option>
                                    <option value="Cyber Crime Unit">Cyber Crime Unit</option>
                                    {users.filter(u => u.role === UserRole.POLICE && u.id !== currentUser.id).map(u => (
                                        <option key={u.id} value={u.id}>{u.name} ({u.designation})</option>
                                    ))}
                                </select>
                            </div>

                             <div>
                                <label className="block text-sm font-medium text-ink-700 mb-1">Transfer Notes</label>
                                <textarea
                                    className="w-full px-3 py-2 border border-line-300 rounded-sm bg-white text-ink-900 outline-none focus:ring-1 focus:ring-navy-500 focus:border-navy-500"
                                    rows={2}
                                    value={transferTarget.notes}
                                    onChange={(e) => setTransferTarget({...transferTarget, notes: e.target.value})}
                                    placeholder="Reason for transfer, special instructions..."
                                />
                            </div>

                            {isAdminOverrideTransfer && (
                                <div>
                                    <label className="block text-sm font-medium text-status-urgent mb-1">Override Reason (required)</label>
                                    <textarea
                                        className="w-full px-3 py-2 border border-status-urgent/40 rounded-sm bg-white text-ink-900 outline-none focus:ring-1 focus:ring-status-urgent focus:border-status-urgent"
                                        rows={2}
                                        value={transferTarget.overrideReason}
                                        onChange={(e) => setTransferTarget({...transferTarget, overrideReason: e.target.value})}
                                        placeholder="Justification for bypassing the current custodian (e.g. officer on leave, misassignment correction)..."
                                    />
                                </div>
                            )}
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => setTransferModalOpen(false)}>Cancel</Button>
                            <Button
                                variant="danger"
                                onClick={handleTransferCustody}
                                disabled={!transferTarget.userId || (isAdminOverrideTransfer && !transferTarget.overrideReason.trim())}
                            >
                                {isAdminOverrideTransfer ? "Force Transfer" : "Sign & Transfer Custody"}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {assignModalOpen && (
                <div className="fixed inset-0 bg-navy-950/40 backdrop-blur-[1px] flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md" title="Edit Case Assignment">
                        <p className="text-xs text-ink-500 mb-4">
                            Leave a field on "-- Keep current --" to leave it unchanged. Current custodian: <strong>{currentCase.currentCustodian}</strong>. Current forensics lead: <strong>{currentCase.assignedToForensics || 'Unassigned'}</strong>.
                        </p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-ink-700 mb-1">Custodian (Police)</label>
                                <select
                                    className="w-full px-3 py-2 border border-line-300 rounded-sm bg-white text-ink-900"
                                    value={assignTarget.custodianId}
                                    onChange={(e) => setAssignTarget({...assignTarget, custodianId: e.target.value})}
                                >
                                    <option value="">-- Keep current --</option>
                                    {users.filter(u => u.role === UserRole.POLICE).map(u => (
                                        <option key={u.id} value={u.id}>{u.name} ({u.designation})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-ink-700 mb-1">Forensics Lead</label>
                                <select
                                    className="w-full px-3 py-2 border border-line-300 rounded-sm bg-white text-ink-900"
                                    value={assignTarget.forensicsId}
                                    onChange={(e) => setAssignTarget({...assignTarget, forensicsId: e.target.value})}
                                >
                                    <option value="">-- Keep current --</option>
                                    {users.filter(u => u.role === UserRole.FORENSICS).map(u => (
                                        <option key={u.id} value={u.id}>{u.name} ({u.designation})</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => setAssignModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleSubmitAssignment} disabled={!assignTarget.custodianId && !assignTarget.forensicsId}>
                                Save Assignment
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {uploadModalOpen && (
                <div className="fixed inset-0 bg-navy-950/40 backdrop-blur-[1px] flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto" title="Upload New Evidence">
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-ink-700 mb-1">Select File</label>
                            <input
                                type="file"
                                onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                                className="w-full text-sm text-ink-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-navy-50 file:text-navy-700 hover:file:bg-navy-100"
                                accept={currentUser.role === UserRole.POLICE ? "image/*" : ".pdf,.doc,.docx,image/*"}
                            />
                            {currentUser.role === UserRole.POLICE && <p className="text-xs text-ink-500 mt-1">Police restricted to Image uploads only.</p>}
                        </div>

                        <div className="mb-4 p-3 bg-navy-50 rounded-sm border border-navy-100">
                            <h4 className="text-sm font-bold text-navy-800 mb-2">Primary Evidence Requirements</h4>
                            <p className="text-xs text-navy-700 mb-3">Include these fields to mark evidence as PRIMARY. Otherwise, it will be classified as SECONDARY.</p>
                            
                            <div className="space-y-3">
                                <Input 
                                    label="Source Hash (Pre-Lifting)"
                                    value={sourceHash}
                                    onChange={(e) => setSourceHash(e.target.value)}
                                    placeholder="e.g. 0x..."
                                    className="bg-white"
                                />
                                <div>
                                    <label className="block text-sm font-medium text-ink-700 mb-1">Lifting Video</label>
                                    <input
                                        type="file"
                                        accept="video/*"
                                        onChange={(e) => setLiftingVideo(e.target.files ? e.target.files[0] : null)}
                                        className="w-full text-xs text-ink-500 file:mr-2 file:py-1 file:px-3 file:rounded-sm file:border-0 file:bg-navy-200 file:text-navy-800"
                                    />
                                </div>
                            </div>
                        </div>
                        
                        <div className="mb-4">
                             <Input 
                                label="Notes / Description" 
                                value={evidenceNotes} 
                                onChange={e => setEvidenceNotes(e.target.value)} 
                                placeholder="Describe location, condition, etc."
                            />
                        </div>

                        {caseEvidence.length > 0 && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-ink-700 mb-2">Link to Related Evidence</label>
                                <div className="border border-line-300 rounded-sm max-h-40 overflow-y-auto bg-paper-50">
                                    {caseEvidence.map(e => (
                                        <div
                                            key={e.evidenceId}
                                            onClick={() => handleToggleLink(e.evidenceId)}
                                            className="flex items-center p-2 hover:bg-paper-100 cursor-pointer border-b border-line-200 last:border-0"
                                        >
                                            <div className={`mr-3 ${linkedEvidenceIds.includes(e.evidenceId) ? 'text-navy-700' : 'text-ink-300'}`}>
                                                {linkedEvidenceIds.includes(e.evidenceId) ? <CheckSquare size={16} /> : <Square size={16} />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-navy-900">{e.fileName}</p>
                                                <p className="text-xs text-ink-500 font-mono">{e.evidenceId}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-ink-500 mt-1">Select items to establish a direct chain of connection on the Pinboard.</p>
                            </div>
                        )}

                        <div className="p-3 bg-status-pendingBg rounded-sm text-xs text-status-pending mb-4">
                            <strong>Note:</strong> File content is hashed client-side. Live location coordinates will be attached.
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => !isUploading && setUploadModalOpen(false)} disabled={isUploading}>Cancel</Button>
                            <Button onClick={handleUpload} disabled={!selectedFile || isUploading}>
                                {isUploading ? <><Loader2 className="animate-spin" size={16}/> Acquiring Location...</> : "Sign & Upload"}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
             
            {selectedEvidenceId && (
                <div className="fixed inset-0 bg-navy-950/40 backdrop-blur-[1px] flex items-center justify-center z-50">
                     <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto" title={`Audit History: ${selectedEvidenceId}`}>
                        <Table headers={['Time', 'User', 'Action', 'Details']}>
                            {logs.filter(l => l.evidenceId === selectedEvidenceId).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(l => (
                                <tr key={l.id}>
                                    <td className="px-4 py-2 text-xs text-ink-500">{new Date(l.timestamp).toLocaleString()}</td>
                                    <td className="px-4 py-2 text-xs font-medium text-navy-900">{l.accessedBy} ({l.role})</td>
                                    <td className="px-4 py-2 text-xs text-navy-900">{l.action}</td>
                                    <td className="px-4 py-2 text-xs text-ink-700">{l.details}</td>
                                </tr>
                            ))}
                        </Table>
                        <div className="mt-4 flex justify-end">
                            <Button onClick={() => setSelectedEvidenceId(null)}>Close Audit</Button>
                        </div>
                     </Card>
                </div>
            )}

            <StatusChangeSecurityModal 
                isOpen={statusModalOpen} 
                onClose={() => setStatusModalOpen(false)} 
                onConfirm={confirmStatusChange}
                targetStatus={pendingStatus}
            />
        </div>
    );
};
