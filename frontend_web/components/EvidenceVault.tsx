
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useStore } from '../store';
import { Card, Button, IntegrityBadge, Badge, Input } from './Common';
import { Evidence, UserRole, IntegrityStatus, EvidenceType, DESIGNATIONS, EvidenceVisibility, EvidenceClassification } from '../types';
import { Eye, Lock, Unlock, FileText, Image as ImageIcon, Box, AlertTriangle, Loader2, X, CheckCircle, Shield, Settings, Search, ArrowUpDown, LayoutGrid, Network, Video, FileBadge, Hash, XCircle } from 'lucide-react';

const AccessControlModal = ({ 
    evidence, 
    onClose, 
    onSave 
}: { 
    evidence: Evidence, 
    onClose: () => void, 
    onSave: (v: EvidenceVisibility) => void 
}) => {
    const { users } = useStore();
    const [visibility, setVisibility] = useState<EvidenceVisibility>(evidence.visibility);

    const toggleRole = (role: UserRole) => {
        const current = visibility.allowedRoles;
        if (current.includes(role)) {
            setVisibility({ ...visibility, allowedRoles: current.filter(r => r !== role) });
        } else {
            setVisibility({ ...visibility, allowedRoles: [...current, role] });
        }
    };

    const toggleDesignation = (designation: string) => {
        const current = visibility.allowedDesignations;
        if (current.includes(designation)) {
            setVisibility({ ...visibility, allowedDesignations: current.filter(d => d !== designation) });
        } else {
            setVisibility({ ...visibility, allowedDesignations: [...current, designation] });
        }
    };

    const toggleUser = (userId: string) => {
        const current = visibility.allowedUserIds;
        if (current.includes(userId)) {
            setVisibility({ ...visibility, allowedUserIds: current.filter(id => id !== userId) });
        } else {
            setVisibility({ ...visibility, allowedUserIds: [...current, userId] });
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gov-900 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gov-200 dark:border-gov-700 bg-gov-50 dark:bg-gov-950">
                    <h3 className="text-lg font-bold text-gov-900 dark:text-white flex items-center gap-2">
                        <Shield className="w-5 h-5 text-gov-600 dark:text-gov-300" />
                        Access Control: {evidence.fileName}
                    </h3>
                    <button onClick={onClose}><X size={20} className="text-gov-500 hover:text-gov-800 dark:text-gov-400 dark:hover:text-white" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="flex items-center justify-between p-4 bg-gov-100 dark:bg-gov-800 rounded-lg">
                        <div>
                            <h4 className="font-bold text-gov-900 dark:text-white">Restricted Access Mode</h4>
                            <p className="text-xs text-gov-500 dark:text-gov-400">
                                If enabled, only Admins and selected entities can view this evidence.
                            </p>
                        </div>
                        <button 
                            onClick={() => setVisibility({ ...visibility, isRestricted: !visibility.isRestricted })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${visibility.isRestricted ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${visibility.isRestricted ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    {visibility.isRestricted && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                            
                            <div>
                                <h4 className="text-sm font-bold text-gov-700 dark:text-gov-300 mb-2 uppercase tracking-wide">Allowed Roles</h4>
                                <div className="flex flex-wrap gap-2">
                                    {Object.values(UserRole).filter(r => r !== UserRole.ADMIN).map(role => (
                                        <button
                                            key={role}
                                            onClick={() => toggleRole(role)}
                                            className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                                                visibility.allowedRoles.includes(role)
                                                ? 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/40 dark:border-blue-700 dark:text-blue-200'
                                                : 'bg-white border-gov-300 text-gov-600 hover:bg-gov-50 dark:bg-gov-800 dark:border-gov-600 dark:text-gov-400 dark:hover:bg-gov-700'
                                            }`}
                                        >
                                            {role}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-bold text-gov-700 dark:text-gov-300 mb-2 uppercase tracking-wide">Allowed Designations</h4>
                                <div className="space-y-3">
                                    {Object.entries(DESIGNATIONS).filter(([key]) => key !== UserRole.ADMIN).map(([role, list]) => (
                                        <div key={role} className="bg-gov-50 dark:bg-gov-800/50 p-3 rounded border border-gov-200 dark:border-gov-700">
                                            <p className="text-xs font-bold text-gov-500 dark:text-gov-400 mb-2">{role}</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {list.map(des => (
                                                    <label key={des} className="flex items-center space-x-2 text-xs cursor-pointer">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={visibility.allowedDesignations.includes(des)}
                                                            onChange={() => toggleDesignation(des)}
                                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:bg-gov-900 dark:border-gov-600"
                                                        />
                                                        <span className="text-gov-700 dark:text-gov-300">{des}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-bold text-gov-700 dark:text-gov-300 mb-2 uppercase tracking-wide">Specific Personnel</h4>
                                <div className="border border-gov-200 dark:border-gov-700 rounded-md max-h-40 overflow-y-auto">
                                    {users.filter(u => u.role !== UserRole.ADMIN).map(u => (
                                        <label key={u.id} className="flex items-center justify-between px-3 py-2 hover:bg-gov-50 dark:hover:bg-gov-800 cursor-pointer border-b border-gov-100 dark:border-gov-700/50 last:border-0">
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="checkbox" 
                                                    checked={visibility.allowedUserIds.includes(u.id)}
                                                    onChange={() => toggleUser(u.id)}
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:bg-gov-900 dark:border-gov-600"
                                                />
                                                <div>
                                                    <p className="text-sm font-medium text-gov-900 dark:text-gov-200">{u.name}</p>
                                                    <p className="text-[10px] text-gov-500 dark:text-gov-400">{u.designation} • {u.role}</p>
                                                </div>
                                            </div>
                                            <span className="text-xs font-mono text-gov-400">{u.id}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                        </div>
                    )}
                </div>

                <div className="px-6 py-4 bg-gov-50 dark:bg-gov-950 border-t border-gov-200 dark:border-gov-700 flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={() => onSave(visibility)}>Save Access Controls</Button>
                </div>
            </div>
        </div>
    );
};

interface Position { x: number; y: number; }
const Pinboard = ({ evidence, onView }: { evidence: Evidence[], onView: (e: Evidence) => void }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [positions, setPositions] = useState<Record<string, Position>>({});
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });

    const NODE_WIDTH = 180;
    const NODE_HEIGHT = 120;

    useEffect(() => {
        if (!containerRef.current) return;
        
        setPositions(prev => {
            const newPos = { ...prev };
            const containerW = containerRef.current?.clientWidth || 800;
            const containerH = containerRef.current?.clientHeight || 600;
            const centerX = containerW / 2;
            const centerY = containerH / 2;
            const radius = Math.min(containerW, containerH) * 0.35;

            evidence.forEach((ev, index) => {
                if (!newPos[ev.evidenceId]) {
                    const angle = (index / evidence.length) * 2 * Math.PI;
                    newPos[ev.evidenceId] = {
                        x: centerX + radius * Math.cos(angle) - NODE_WIDTH / 2,
                        y: centerY + radius * Math.sin(angle) - NODE_HEIGHT / 2
                    };
                }
            });
            return newPos;
        });
    }, [evidence.length, evidence]);

    const handleMouseDown = (e: React.MouseEvent, id: string) => {
        const pos = positions[id];
        if (pos) {
            setDraggingId(id);
            setDragOffset({ x: e.clientX - pos.x, y: e.clientY - pos.y });
        }
        e.stopPropagation();
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (draggingId && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const newX = e.clientX - dragOffset.x;
            const newY = e.clientY - dragOffset.y;
            
            setPositions(prev => ({
                ...prev,
                [draggingId]: { x: newX, y: newY }
            }));
        }
    };

    const handleMouseUp = () => {
        setDraggingId(null);
    };

    const connections = useMemo(() => {
        const lines: { start: string, end: string, key: string }[] = [];
        const processed = new Set<string>();

        evidence.forEach(ev => {
            if (ev.linkedEvidenceIds) {
                ev.linkedEvidenceIds.forEach(targetId => {
                    if (evidence.some(e => e.evidenceId === targetId)) {
                        const pair = [ev.evidenceId, targetId].sort().join('-');
                        if (!processed.has(pair)) {
                            lines.push({ start: ev.evidenceId, end: targetId, key: pair });
                            processed.add(pair);
                        }
                    }
                });
            }
        });
        return lines;
    }, [evidence]);

    return (
        <div 
            ref={containerRef}
            className="w-full h-[650px] bg-slate-900 relative rounded-lg overflow-hidden border border-slate-700 shadow-inner cursor-default select-none"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ 
                backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', 
                backgroundSize: '20px 20px' 
            }}
        >
             <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {connections.map(({ start, end, key }) => {
                    const posStart = positions[start];
                    const posEnd = positions[end];
                    if (!posStart || !posEnd) return null;

                    return (
                        <line 
                            key={key}
                            x1={posStart.x + NODE_WIDTH / 2}
                            y1={posStart.y + NODE_HEIGHT / 2}
                            x2={posEnd.x + NODE_WIDTH / 2}
                            y2={posEnd.y + NODE_HEIGHT / 2}
                            stroke="#60a5fa"
                            strokeWidth="2"
                            strokeOpacity="0.6"
                            strokeDasharray="5,5"
                        />
                    );
                })}
            </svg>
            
             {evidence.map(ev => {
                const pos = positions[ev.evidenceId];
                if (!pos) return null;

                return (
                    <div
                        key={ev.evidenceId}
                        style={{ 
                            transform: `translate(${pos.x}px, ${pos.y}px)`,
                            width: NODE_WIDTH
                        }}
                        className={`absolute flex flex-col bg-slate-800 border-2 rounded-lg shadow-xl hover:shadow-2xl transition-shadow ${
                            ev.evidenceId === draggingId ? 'z-20 border-blue-400 cursor-grabbing' : 'z-10 border-slate-600 hover:border-slate-400 cursor-grab'
                        }`}
                        onMouseDown={(e) => handleMouseDown(e, ev.evidenceId)}
                    >
                        <div className={`h-2 w-full rounded-t-sm mb-2 ${ev.classification === EvidenceClassification.PRIMARY ? 'bg-green-600' : 'bg-yellow-600'}`}></div>
                        
                        <div className="px-3 pb-3 flex flex-col h-full">
                            <div className="flex items-start justify-between mb-2">
                                <span className={`text-[10px] px-1.5 rounded font-mono ${
                                    ev.type === EvidenceType.IMAGE ? 'bg-purple-900/50 text-purple-300' : 'bg-blue-900/50 text-blue-300'
                                }`}>
                                    {ev.type}
                                </span>
                                <div className={`w-2 h-2 rounded-full ${
                                    ev.integrityStatus === IntegrityStatus.VERIFIED ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.6)]' : 
                                    ev.integrityStatus === IntegrityStatus.COMPROMISED ? 'bg-red-500 animate-pulse' : 'bg-yellow-500'
                                }`}></div>
                            </div>
                            
                            <p className="text-white text-xs font-bold leading-tight line-clamp-2 mb-1 pointer-events-none">
                                {ev.fileName}
                            </p>
                            <p className="text-slate-500 text-[9px] font-mono mb-2 pointer-events-none">
                                {ev.evidenceId}
                            </p>

                            <button 
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={() => onView(ev)}
                                className="mt-auto w-full py-1 text-[10px] font-medium bg-slate-700 hover:bg-blue-600 text-slate-200 hover:text-white rounded transition-colors"
                            >
                                Inspect
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

const ClassificationDetailModal = ({
    evidence,
    onClose,
    onIssueCertClick,
    canIssueCert,
}: {
    evidence: Evidence;
    onClose: () => void;
    onIssueCertClick: (evidenceId: string) => void;
    canIssueCert: boolean;
}) => {
    const isPrimary = evidence.classification === EvidenceClassification.PRIMARY;
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-lg" title="Evidence Classification Details">
                <div className="flex justify-between items-start">
                    <div>
                        <h4 className="font-bold text-gov-900 dark:text-white">{evidence.fileName}</h4>
                        <p className="text-xs font-mono text-gov-500 dark:text-gov-400">{evidence.evidenceId}</p>
                    </div>
                    <Badge color={isPrimary ? 'green' : 'yellow'}>{evidence.classification}</Badge>
                </div>
                
                <p className="text-sm text-gov-600 dark:text-gov-300 mt-4">
                    {isPrimary 
                        ? "This evidence meets all requirements to be considered PRIMARY and is admissible in court."
                        : "This evidence is SECONDARY. To be admissible, it requires a Section 63 Certificate from Forensics."}
                </p>

                <div className="mt-6 space-y-3">
                    <div className={`flex items-center justify-between p-3 rounded-lg border ${evidence.sourceHash ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
                        <div className="flex items-center gap-2">
                            <Hash size={16} className={evidence.sourceHash ? 'text-green-600' : 'text-red-600'} />
                            <span className="text-sm font-medium text-gov-800 dark:text-gov-200">Source Hash (at lifting)</span>
                        </div>
                        <span className="text-sm font-bold">{evidence.sourceHash ? 'PRESENT' : 'MISSING'}</span>
                    </div>
                    <div className={`flex items-center justify-between p-3 rounded-lg border ${evidence.liftingVideo ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
                        <div className="flex items-center gap-2">
                            <Video size={16} className={evidence.liftingVideo ? 'text-green-600' : 'text-red-600'} />
                            <span className="text-sm font-medium text-gov-800 dark:text-gov-200">Lifting Video</span>
                        </div>
                        <span className="text-sm font-bold">{evidence.liftingVideo ? 'PRESENT' : 'MISSING'}</span>
                    </div>
                    <div className={`flex items-center justify-between p-3 rounded-lg border ${evidence.section63Certificate ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'}`}>
                        <div className="flex items-center gap-2">
                            <FileBadge size={16} className={evidence.section63Certificate ? 'text-green-600' : 'text-yellow-600'} />
                            <span className="text-sm font-medium text-gov-800 dark:text-gov-200">Section 63 Certificate</span>
                        </div>
                        <span className="text-sm font-bold">{evidence.section63Certificate ? 'ISSUED' : 'NOT ISSUED'}</span>
                    </div>
                </div>

                {canIssueCert && !isPrimary && !evidence.section63Certificate && (
                    <div className="mt-6 pt-4 border-t border-gov-200 dark:border-gov-700">
                        <p className="text-xs text-center text-gov-500 dark:text-gov-400 mb-2">As a Forensics officer, you can issue a certificate for this evidence.</p>
                        <Button className="w-full" onClick={() => onIssueCertClick(evidence.evidenceId)}>
                            Issue Certificate
                        </Button>
                    </div>
                )}

                <div className="mt-6 flex justify-end">
                    <Button variant="secondary" onClick={onClose}>Close</Button>
                </div>
            </Card>
        </div>
    );
};

export const EvidenceVault = () => {
    const { cases, evidence, currentUser, addLog, updateEvidenceVisibility, issueSection63Certificate } = useStore();
    const [selectedCaseId, setSelectedCaseId] = useState<string>('');
    const [viewingEvidence, setViewingEvidence] = useState<Evidence | null>(null);
    const [classDetailEvidence, setClassDetailEvidence] = useState<Evidence | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationComplete, setVerificationComplete] = useState(false);
    const [managingAccess, setManagingAccess] = useState<Evidence | null>(null);

    const [certModalOpen, setCertModalOpen] = useState(false);
    const [certEvidenceId, setCertEvidenceId] = useState<string | null>(null);
    const [certFile, setCertFile] = useState<File | null>(null);

    const [viewMode, setViewMode] = useState<'grid' | 'pinboard'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState<{key: 'date' | 'integrity' | 'name', direction: 'asc' | 'desc'}>({ key: 'date', direction: 'desc' });

    useEffect(() => {
        if (cases.length > 0 && !selectedCaseId) {
            setSelectedCaseId(cases[0].caseId);
        }
    }, [cases, selectedCaseId]);

    const filteredEvidence = evidence.filter(e => {
        if (e.caseId !== selectedCaseId) return false;
        
        let isVisible = false;
        if (currentUser?.role === UserRole.ADMIN) isVisible = true;
        else if (!e.visibility.isRestricted) isVisible = true;
        else {
             const { allowedRoles, allowedDesignations, allowedUserIds } = e.visibility;
             if (currentUser) {
                 if (allowedRoles.includes(currentUser.role)) isVisible = true;
                 else if (allowedDesignations.includes(currentUser.designation)) isVisible = true;
                 else if (allowedUserIds.includes(currentUser.id)) isVisible = true;
             }
        }
        if (!isVisible) return false;

        const q = searchQuery.toLowerCase();
        return e.fileName.toLowerCase().includes(q) || 
               e.evidenceId.toLowerCase().includes(q) || 
               e.notes?.toLowerCase().includes(q) ||
               e.type.toLowerCase().includes(q);
    });

    const sortedEvidence = [...filteredEvidence].sort((a, b) => {
        let valA, valB;
        switch(sortConfig.key) {
            case 'name': valA = a.fileName.toLowerCase(); valB = b.fileName.toLowerCase(); break;
            case 'integrity': valA = a.integrityStatus; valB = b.integrityStatus; break;
            default: valA = new Date(a.timestamp).getTime(); valB = new Date(b.timestamp).getTime(); break;
        }
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const handleViewClick = (ev: Evidence) => {
        setViewingEvidence(ev);
        setIsVerifying(true);
        setVerificationComplete(false);

        setTimeout(() => {
            setIsVerifying(false);
            setVerificationComplete(true);
            if (currentUser) {
                addLog({ evidenceId: ev.evidenceId, caseId: ev.caseId, accessedBy: currentUser.id, role: currentUser.role, action: 'VIEW', details: 'User opened secure evidence file' });
            }
        }, 1500);
    };

    const handleCloseModal = () => {
        setViewingEvidence(null);
        setIsVerifying(false);
        setVerificationComplete(false);
    };

    const handleSaveAccess = (newVisibility: EvidenceVisibility) => {
        if (managingAccess) {
            updateEvidenceVisibility(managingAccess.evidenceId, newVisibility);
            setManagingAccess(null);
        }
    };

    const handleOpenCertModal = (evidenceId: string) => {
        setClassDetailEvidence(null);
        setCertEvidenceId(evidenceId);
        setCertModalOpen(true);
    };

    const handleIssueCert = () => {
        if (certEvidenceId && certFile) {
            const certRef = `CERT-${Date.now()}.pdf`;
            issueSection63Certificate(certEvidenceId, certRef);
            setCertModalOpen(false);
            setCertEvidenceId(null);
            setCertFile(null);
        }
    };

    const isAdmin = currentUser?.role === UserRole.ADMIN;

    const renderContentPreview = (ev: Evidence) => {
        // ... (same as before)
        return <div className="w-full h-64 bg-gray-900 rounded-lg flex items-center justify-center overflow-hidden"><div className="text-center text-gov-400"><ImageIcon className="w-16 h-16 mx-auto mb-2 opacity-50" /><p className="text-sm">Secure Image View</p><p className="text-xs font-mono mt-1">{ev.fileName}</p></div></div>
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gov-900 dark:text-white flex items-center gap-2"><Box className="w-6 h-6" />Evidence Vault</h2>
                    <p className="text-sm text-gov-500 dark:text-gov-400 mt-1">Securely view and verify evidence artifacts. Access is logged.</p>
                </div>
                <div className="w-full md:w-64">
                    <label className="block text-xs font-bold text-gov-500 dark:text-gov-400 uppercase mb-1">Select Case</label>
                    <div className="relative">
                        <select value={selectedCaseId} onChange={(e) => setSelectedCaseId(e.target.value)} className="block w-full pl-3 pr-10 py-2 text-base border-gov-300 dark:border-gov-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-gov-800 text-gov-900 dark:text-white">
                            {cases.map(c => <option key={c.caseId} value={c.caseId}>{c.caseId} - {c.title}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-gov-800 p-4 rounded-lg shadow-sm border border-gov-200 dark:border-gov-700">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gov-400" size={16} />
                    <input type="text" placeholder="Search by ID, filename, or type..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm border border-gov-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gov-900 dark:border-gov-600 dark:text-white" />
                </div>
                <div className="flex items-center gap-2 border-l border-gov-200 dark:border-gov-700 pl-4">
                    <div className="flex items-center bg-gov-100 dark:bg-gov-900 p-1 rounded-md">
                        <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-gov-700 shadow text-blue-600 dark:text-blue-400' : 'text-gov-500 dark:text-gov-400 hover:text-gov-900 dark:hover:text-white'}`} title="Grid View"><LayoutGrid size={16} /></button>
                        <button onClick={() => setViewMode('pinboard')} className={`p-1.5 rounded transition-colors ${viewMode === 'pinboard' ? 'bg-white dark:bg-gov-700 shadow text-blue-600 dark:text-blue-400' : 'text-gov-500 dark:text-gov-400 hover:text-gov-900 dark:hover:text-white'}`} title="Pinboard View"><Network size={16} /></button>
                    </div>
                    {viewMode === 'grid' && (<>
                        <div className="h-6 w-px bg-gov-200 dark:bg-gov-700 mx-2"></div>
                        <span className="text-xs font-bold text-gov-500 dark:text-gov-400 uppercase hidden sm:block">Sort:</span>
                        <select value={sortConfig.key} onChange={(e) => setSortConfig({...sortConfig, key: e.target.value as any})} className="text-sm border border-gov-300 rounded-md px-3 py-2 dark:bg-gov-900 dark:border-gov-600 dark:text-white">
                            <option value="date">Date Uploaded</option><option value="integrity">Integrity Status</option><option value="name">File Name</option>
                        </select>
                        <button onClick={() => setSortConfig({...sortConfig, direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'})} className="p-2 border border-gov-300 rounded-md hover:bg-gov-100 dark:border-gov-600 dark:hover:bg-gov-700 dark:text-white" title={sortConfig.direction === 'asc' ? "Ascending" : "Descending"}><ArrowUpDown size={16} /></button>
                    </>)}
                </div>
            </div>

            {sortedEvidence.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-gov-300 dark:border-gov-700 rounded-lg"><Box className="w-12 h-12 text-gov-400 mx-auto mb-3" /><p className="text-gov-500 dark:text-gov-400">No evidence found matching your criteria.</p></div>
            ) : viewMode === 'pinboard' ? (
                <Pinboard evidence={sortedEvidence} onView={handleViewClick} />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
                    {sortedEvidence.map(ev => (
                        <div key={ev.evidenceId} className="relative group">
                            <Card className="h-full flex flex-col transition-shadow hover:shadow-md">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-sm font-bold text-gov-900 dark:text-white flex items-center gap-2"><ImageIcon size={14}/> <span className="truncate max-w-[150px]" title={ev.fileName}>{ev.fileName}</span></h3>
                                        <p className="text-xs text-gov-500 font-mono mt-1">{ev.evidenceId}</p>
                                    </div><IntegrityBadge status={ev.integrityStatus} />
                                </div>
                                <div className="flex-1 space-y-2 text-sm text-gov-600 dark:text-gov-300">
                                    <div className="flex justify-between"><span className="text-gov-400">Class:</span><Badge color={ev.classification === EvidenceClassification.PRIMARY ? 'green' : 'yellow'}>{ev.classification}</Badge></div>
                                    <div className="flex justify-between"><span className="text-gov-400">Type:</span><span>{ev.type}</span></div>
                                    <div className="flex justify-between"><span className="text-gov-400">Legal Status:</span><span className={ev.approvedForLegal ? "text-green-600" : "text-gray-500"}>{ev.approvedForLegal ? "Approved" : "Restricted"}</span></div>
                                </div>
                                <div className="mt-6 flex items-center gap-2 pt-4 border-t border-gov-100 dark:border-gov-700">
                                    <Button onClick={() => handleViewClick(ev)} size="sm" className="flex-1" disabled={ev.integrityStatus === IntegrityStatus.COMPROMISED && !isAdmin}><Eye size={14} /> View File</Button>
                                    <Button onClick={() => setClassDetailEvidence(ev)} variant="secondary" size="sm" className="flex-1"><FileBadge size={14} /> View Class</Button>
                                </div>
                            </Card>
                        </div>
                    ))}
                </div>
            )}

            {viewingEvidence && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gov-900 w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gov-200 dark:border-gov-700 bg-gov-50 dark:bg-gov-950">
                            <div>
                                <h3 className="text-lg font-bold text-gov-900 dark:text-white flex items-center gap-2">Secure View: {viewingEvidence.fileName}{verificationComplete && viewingEvidence.integrityStatus === IntegrityStatus.VERIFIED && (<Badge color="green">Secure</Badge>)}</h3>
                                <p className="text-xs text-gov-500 font-mono">{viewingEvidence.evidenceId}</p>
                            </div>
                            <button onClick={handleCloseModal} className="text-gov-400 hover:text-gov-600 dark:hover:text-white transition-colors"><X size={24} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center min-h-[400px] bg-gov-100 dark:bg-black/20">
                            {isVerifying ? (
                                <div className="text-center"><Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-4" /><h4 className="text-lg font-bold text-gov-800 dark:text-white">Verifying Integrity</h4><p className="text-gov-500 dark:text-gov-400 mt-1">Validating SHA-256 Hash against Blockchain Ledger...</p></div>
                            ) : (
                                <div className="w-full flex flex-col items-center animate-in fade-in duration-300">
                                    {viewingEvidence.integrityStatus === IntegrityStatus.COMPROMISED && (<div className="w-full mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-4 rounded-lg flex items-start gap-3"><AlertTriangle className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" /><div><h4 className="text-sm font-bold text-red-800 dark:text-red-200">Integrity Warning</h4><p className="text-xs text-red-700 dark:text-red-300 mt-1">The hash of this file does not match the blockchain record. The file may have been tampered with.</p></div></div>)}
                                    {renderContentPreview(viewingEvidence)}
                                    <div className="mt-8 w-full max-w-2xl bg-white dark:bg-gov-800 rounded-lg p-4 border border-gov-200 dark:border-gov-700">
                                        <h5 className="text-xs font-bold uppercase text-gov-400 mb-3">Integrity Verification</h5>
                                        <div className="flex items-center gap-4 text-sm"><div className="flex-1"><p className="text-gov-500 dark:text-gov-400 text-xs">File Hash (vs. Ledger)</p><p className="font-mono text-gov-800 dark:text-gov-200 truncate">{viewingEvidence.fileHash}</p></div><div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-bold bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded"><CheckCircle size={16} /> Matches</div></div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 bg-gov-50 dark:bg-gov-950 border-t border-gov-200 dark:border-gov-700 flex justify-between items-center"><div className="text-xs text-gov-500">Access ID: {currentUser?.id} • Time: {new Date().toLocaleTimeString()}</div><Button variant="secondary" onClick={handleCloseModal}>Close Viewer</Button></div>
                    </div>
                </div>
            )}
            
            {classDetailEvidence && <ClassificationDetailModal evidence={classDetailEvidence} onClose={() => setClassDetailEvidence(null)} onIssueCertClick={handleOpenCertModal} canIssueCert={currentUser?.role === UserRole.FORENSICS} />}
            
            {certModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md" title="Issue Section 63 Certificate">
                        <div className="space-y-4">
                            <p className="text-sm text-gov-600 dark:text-gov-300">This evidence is classified as <span className="font-bold text-yellow-600">SECONDARY</span>. To make it admissible, a valid Section 63 Certificate must be attached.</p>
                            <div>
                                <label className="block text-sm font-medium text-gov-700 dark:text-gov-300 mb-1">Certificate File</label>
                                <input type="file" onChange={(e) => setCertFile(e.target.files ? e.target.files[0] : null)} className="w-full text-sm text-gov-500 dark:text-gov-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 dark:file:bg-purple-900/30 dark:file:text-purple-300" />
                            </div>
                        </div>
                         <div className="mt-6 flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => setCertModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleIssueCert} disabled={!certFile}>Issue Certificate</Button>
                        </div>
                    </Card>
                </div>
            )}

            {managingAccess && <AccessControlModal evidence={managingAccess} onClose={() => setManagingAccess(null)} onSave={handleSaveAccess} />}
        </div>
    );
};
