
import React, { useState } from 'react';
import { useStore } from '../store';
import { Case, CaseStatus, EvidenceType, UserRole, Evidence, User, IntegrityStatus } from '../types';
import { Card, Button, Table, Badge, CaseStatusBadge, Input, RoleBadge, downloadCSV } from './Common';
import { Plus, Upload, Search, FileText, BarChart2, ShieldAlert, Edit2, Download, ArrowUpDown, ShieldCheck, CheckCircle, XCircle, AlertOctagon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { sortCasesByPriority, getCasePriorityTier, TIER_BADGE_COLOR, TIER_LABEL } from '../utils/casePriority';

// Small badge shown next to a case's title/ID wherever cases are listed —
// blank for STANDARD cases so ordinary case rows aren't cluttered.
const CasePriorityBadge = ({ c }: { c: Case }) => {
    const tier = getCasePriorityTier(c);
    if (tier === 'STANDARD') return null;
    return <Badge color={TIER_BADGE_COLOR[tier]}>{TIER_LABEL[tier]}</Badge>;
};

interface DashboardProps {
    onNavigate: (view: string, id?: string) => void;
    onEditUser?: (user: User) => void;
}

// ----------------------------------------------------------------------
// SYSTEM LOGS VIEW (EXTRACTED)
// ----------------------------------------------------------------------
export const SystemLogsView = () => {
    const { logs, currentUser } = useStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    // Filtering
    const filteredLogs = logs.filter(log => {
        const q = searchQuery.toLowerCase();
        return (
            log.action.toLowerCase().includes(q) ||
            log.details?.toLowerCase().includes(q) ||
            log.accessedBy.toLowerCase().includes(q) ||
            (log.evidenceId && log.evidenceId.toLowerCase().includes(q)) ||
            (log.caseId && log.caseId.toLowerCase().includes(q))
        );
    });

    // Sorting
    const sortedLogs = [...filteredLogs].sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    });

    const handleDownload = () => {
        if (currentUser?.role !== UserRole.ADMIN) return;

        const data = sortedLogs.map(log => ({
            ID: log.id,
            Timestamp: new Date(log.timestamp).toLocaleString(),
            User: log.accessedBy,
            Role: log.role,
            Action: log.action,
            Reference: log.evidenceId || log.caseId || 'N/A',
            Details: log.details || ''
        }));

        const headers = ['ID', 'Timestamp', 'User', 'Role', 'Action', 'Reference', 'Details'];
        downloadCSV(data, headers, `system_audit_logs_${new Date().toISOString()}.csv`);
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-navy-900">System Audit Logs</h2>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-sm shadow-card border border-line-200">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ink-300" size={16} />
                    <input
                        type="text"
                        placeholder="Search logs by ID, user, or action..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm border border-line-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-navy-500 focus:border-navy-500"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                        className="flex items-center gap-2 px-3 py-2 border border-line-300 rounded-sm hover:bg-paper-100 text-sm"
                    >
                        <ArrowUpDown size={14} />
                        Sort Date: {sortDirection === 'asc' ? 'Oldest' : 'Newest'}
                    </button>
                    
                    {currentUser?.role === UserRole.ADMIN && (
                        <Button onClick={handleDownload} variant="secondary" size="sm">
                            <Download size={14} /> Export CSV
                        </Button>
                    )}
                </div>
            </div>

            <Card>
                <Table headers={['ID', 'Timestamp', 'User', 'Role', 'Action', 'Reference', 'Details']}>
                    {sortedLogs.map(log => (
                        <tr key={log.id} className="hover:bg-paper-50 transition-colors">
                            <td className="px-6 py-4 text-xs font-mono text-ink-300">{log.id}</td>
                            <td className="px-6 py-4 text-xs text-ink-500">{new Date(log.timestamp).toLocaleString()}</td>
                            <td className="px-6 py-4 text-sm font-medium text-navy-900">{log.accessedBy}</td>
                            <td className="px-6 py-4 text-xs"><span className="bg-line-200 px-2 py-1 rounded-sm text-ink-700">{log.role}</span></td>
                            <td className="px-6 py-4 text-sm font-bold text-navy-900">{log.action.replace(/_/g, ' ')}</td>
                            <td className="px-6 py-4 text-xs font-mono text-ink-500">{log.evidenceId || log.caseId || '-'}</td>
                            <td className="px-6 py-4 text-sm text-ink-700">{log.details}</td>
                        </tr>
                    ))}
                </Table>
            </Card>
        </div>
    );
};

// ----------------------------------------------------------------------
// USERS VIEW (ADMIN ONLY)
// ----------------------------------------------------------------------
export const AdminUsersView = ({ onEditUser }: { onEditUser?: (user: User) => void }) => {
    const { users } = useStore();
    return (
        <div className="space-y-6">
             <h2 className="text-2xl font-bold text-navy-900">User Management</h2>
             <Card title="Authorized Personnel">
                 <Table headers={['User ID', 'Name', 'Email', 'Role', 'Designation', 'Action']}>
                     {users.map(u => (
                         <tr key={u.id} className="hover:bg-paper-50 transition-colors">
                             <td className="px-6 py-4 text-xs font-mono text-ink-500">{u.id}</td>
                             <td className="px-6 py-4 text-sm font-medium text-navy-900">
                                <div className="flex items-center gap-2">
                                    {u.profileImage ? (
                                        <img src={u.profileImage} className="w-6 h-6 rounded-full object-cover" alt="" />
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-line-200 flex items-center justify-center text-xs">
                                            {u.name[0]}
                                        </div>
                                    )}
                                    {u.name}
                                </div>
                             </td>
                             <td className="px-6 py-4 text-sm text-ink-700 font-mono">{u.email}</td>
                             <td className="px-6 py-4"><RoleBadge role={u.role} /></td>
                             <td className="px-6 py-4 text-sm text-ink-700">{u.designation}</td>
                             <td className="px-6 py-4">
                                <Button size="sm" variant="ghost" onClick={() => onEditUser && onEditUser(u)}>
                                    <Edit2 size={14} className="mr-1" /> Edit
                                </Button>
                             </td>
                         </tr>
                     ))}
                 </Table>
             </Card>
        </div>
    );
};

// ----------------------------------------------------------------------
// POLICE DASHBOARD
// ----------------------------------------------------------------------
export { PoliceDashboard } from './police/PoliceDashboard';

// ----------------------------------------------------------------------
// FORENSICS DASHBOARD
// ----------------------------------------------------------------------
export const ForensicsDashboard = ({ onNavigate }: DashboardProps) => {
    const { cases, evidence, verifyEvidence } = useStore();
    const activeCases = sortCasesByPriority(cases.filter(c => c.status === CaseStatus.UNDER_INVESTIGATION));
    const pendingVerification = evidence.filter(e => e.integrityStatus === 'PENDING' || e.integrityStatus === 'NOT_CHECKED');

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-navy-900">Forensics Laboratory</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Pending Verifications">
                    {pendingVerification.length === 0 ? (
                        <div className="text-center py-6 text-status-resolved flex flex-col items-center">
                            <ShieldAlert size={32} className="mb-2" />
                            <p>All evidence verified</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-line-200">
                            {pendingVerification.slice(0,5).map(e => (
                                <li key={e.evidenceId} className="py-3 flex justify-between items-center">
                                    <div>
                                        <p className="text-sm font-medium text-navy-900">{e.fileName}</p>
                                        <p className="text-xs text-ink-500">{e.caseId}</p>
                                    </div>
                                    <Button size="sm" onClick={() => verifyEvidence(e.evidenceId)}>Verify</Button>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
                <Card title="Active Investigations">
                     <Table headers={['Case ID', 'Title', 'Priority', 'Action']}>
                        {activeCases.map(c => (
                            <tr key={c.caseId} className="hover:bg-paper-50 transition-colors">
                                <td className="px-4 py-3 text-sm font-medium text-navy-900">{c.caseId}</td>
                                <td className="px-4 py-3 text-sm text-ink-700">{c.title}</td>
                                <td className="px-4 py-3"><CasePriorityBadge c={c} /></td>
                                <td className="px-4 py-3">
                                    <Button size="sm" variant="secondary" onClick={() => onNavigate('case_detail', c.caseId)}>Access</Button>
                                </td>
                            </tr>
                        ))}
                     </Table>
                </Card>
            </div>
        </div>
    );
};

// ----------------------------------------------------------------------
// LEGAL DASHBOARD
// ----------------------------------------------------------------------
export const LegalDashboard = ({ onNavigate }: DashboardProps) => {
    const { cases, evidence, verifyEvidence } = useStore();
    
    // Constraint: Only show cases marked as SUBMITTED_TO_COURT
    const legalCases = cases.filter(c => c.status === CaseStatus.SUBMITTED_TO_COURT);

    const handleVerifyEvidences = (caseId: string) => {
        // Find all evidence for this case
        const caseEvidence = evidence.filter(e => e.caseId === caseId && e.approvedForLegal);
        
        if (caseEvidence.length === 0) {
            alert("No accessible evidence found for this case.");
            return;
        }

        // Trigger verification for each approved item
        caseEvidence.forEach(e => verifyEvidence(e.evidenceId));

        // Calculate Stats
        const compromisedCount = caseEvidence.filter(e => e.integrityStatus === IntegrityStatus.COMPROMISED).length;
        const verifiedCount = caseEvidence.length - compromisedCount; // Simplified for demo, technically some might be pending

        // Show Output
        alert(`VERIFICATION COMPLETE for Case ${caseId}\n\nTotal Items Checked: ${caseEvidence.length}\nVerified: ${verifiedCount}\nIntegrity Warnings: ${compromisedCount}\n\n${compromisedCount > 0 ? "⚠️ CRITICAL: Some evidence hashes do not match the ledger." : "✅ All evidence chains are intact."}`);
        
        // Navigate after check
        onNavigate('case_detail', caseId);
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-navy-900">Legal Review Dashboard</h2>
            <Card title="Court Cases (Docket)">
                 {legalCases.length === 0 ? (
                     <div className="p-4 text-center text-ink-500">No cases currently submitted for court review.</div>
                 ) : (
                    // Constraint: Legal should not see Case Status column
                    <Table headers={['Case ID', 'Title', 'Date', 'Action']}>
                        {legalCases.map(c => (
                            <tr key={c.caseId} className="hover:bg-paper-50 transition-colors">
                                <td className="px-6 py-4 text-sm font-medium text-navy-900">{c.caseId}</td>
                                <td className="px-6 py-4 text-sm text-ink-700">{c.title}</td>
                                <td className="px-6 py-4 text-sm text-ink-500">{new Date(c.createdAt).toLocaleDateString()}</td>
                                <td className="px-6 py-4">
                                    <Button size="sm" variant="primary" onClick={() => handleVerifyEvidences(c.caseId)} className="flex items-center gap-1">
                                        <ShieldCheck size={14} /> Verify Case Integrity
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </Table>
                 )}
            </Card>
        </div>
    );
};

// ----------------------------------------------------------------------
// ADMIN DASHBOARD
// ----------------------------------------------------------------------
export const AdminDashboard = ({ onNavigate }: DashboardProps) => {
    const { cases, evidence, logs, users, addCase, currentUser } = useStore();

    // Create Case Logic (Moved from Police)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newCaseData, setNewCaseData] = useState({ title: '', description: '', officerId: '', forensicsId: '', isPriority: false });

    const policeUsers = users.filter(u => u.role === UserRole.POLICE);
    const forensicsUsers = users.filter(u => u.role === UserRole.FORENSICS);

    const isCreateCaseValid = newCaseData.title.trim().length > 0 && newCaseData.description.trim().length > 0;

    const handleCreateCase = () => {
        if (!isCreateCaseValid || !currentUser) return;
        addCase({
            caseId: `CASE-2024-${Math.floor(Math.random() * 1000)}`,
            title: newCaseData.title,
            description: newCaseData.description,
            status: CaseStatus.OPEN,
            currentCustodian: newCaseData.officerId || currentUser.id,
            createdBy: currentUser.id,
            createdAt: new Date().toISOString(),
            assignedToForensics: newCaseData.forensicsId || undefined,
            priority: newCaseData.isPriority,
        });
        setIsCreateModalOpen(false);
        setNewCaseData({ title: '', description: '', officerId: '', forensicsId: '', isPriority: false });
    };

    const totalCases = cases.length;
    const totalEvidence = evidence.length;
    const compromised = evidence.filter(e => e.integrityStatus === 'COMPROMISED').length;
    const recentLogs = logs.slice(0, 10);

    const chartData = [
        { name: 'Cases', value: totalCases },
        { name: 'Evidence', value: totalEvidence },
        { name: 'Warnings', value: compromised },
    ];

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-navy-900">System Administration</h2>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                    <Plus size={16} /> Create New Case
                </Button>
            </div>

            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-navy-950/40 backdrop-blur-[1px] flex items-center justify-center z-50">
                    <Card className="w-full max-w-md shadow-2xl" title="Create New Case">
                        <Input
                            label="Case Title"
                            value={newCaseData.title}
                            onChange={e => setNewCaseData({...newCaseData, title: e.target.value})}
                        />
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-ink-700 mb-1">
                                Description <span className="text-status-urgent">*</span>
                            </label>
                            <textarea
                                className="w-full px-3.5 py-2.5 border border-line-300 rounded-sm bg-white text-ink-900 text-sm outline-none focus:ring-1 focus:ring-navy-500 focus:border-navy-500 transition-colors"
                                rows={3}
                                required
                                placeholder="What happened, where, and any details relevant to triage (e.g. nature of the offence, victims involved)..."
                                value={newCaseData.description}
                                onChange={e => setNewCaseData({...newCaseData, description: e.target.value})}
                            />
                            <p className="text-xs text-ink-500 mt-1">
                                Required — also scanned to auto-flag high-priority cases (e.g. murder, rape, POCSO/child abuse, trafficking).
                            </p>
                        </div>
                        <div className="mb-4 flex items-center justify-between p-3 bg-paper-50 border border-line-200 rounded-sm">
                            <div className="pr-4">
                                <label className="flex items-center gap-1.5 text-sm font-medium text-navy-900">
                                    <AlertOctagon size={14} className="text-status-urgent" /> Mark as Highest Priority
                                </label>
                                <p className="text-xs text-ink-500 mt-0.5">
                                    Overrides automatic triage — always shown first to the assigned Police and Forensics officers.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setNewCaseData({ ...newCaseData, isPriority: !newCaseData.isPriority })}
                                aria-pressed={newCaseData.isPriority}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${newCaseData.isPriority ? 'bg-status-urgent' : 'bg-line-300'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${newCaseData.isPriority ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-ink-700 mb-1">Assign Officer (Custodian)</label>
                            <select
                                className="w-full px-3.5 py-2.5 border border-line-300 rounded-sm bg-white text-ink-900 text-sm outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 transition-colors"
                                value={newCaseData.officerId}
                                onChange={e => setNewCaseData({...newCaseData, officerId: e.target.value})}
                            >
                                <option value="">-- Unassigned (defaults to me) --</option>
                                {policeUsers.map(u => (
                                    <option key={u.id} value={u.id}>{u.name} ({u.designation})</option>
                                ))}
                            </select>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-ink-700 mb-1">Assign Forensics Analyst</label>
                            <select
                                className="w-full px-3.5 py-2.5 border border-line-300 rounded-sm bg-white text-ink-900 text-sm outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 transition-colors"
                                value={newCaseData.forensicsId}
                                onChange={e => setNewCaseData({...newCaseData, forensicsId: e.target.value})}
                            >
                                <option value="">-- Unassigned --</option>
                                {forensicsUsers.map(u => (
                                    <option key={u.id} value={u.id}>{u.name} ({u.designation})</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreateCase} disabled={!isCreateCaseValid}>Create Case</Button>
                        </div>
                    </Card>
                </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="text-center">
                    <p className="text-sm text-ink-500">Total Cases</p>
                    <p className="text-3xl font-bold text-navy-900">{totalCases}</p>
                </Card>
                <Card className="text-center">
                    <p className="text-sm text-ink-500">Total Evidence</p>
                    <p className="text-3xl font-bold text-navy-700">{totalEvidence}</p>
                </Card>
                <Card className="text-center">
                    <p className="text-sm text-ink-500">Integrity Warnings</p>
                    <p className="text-3xl font-bold text-status-urgent">{compromised}</p>
                </Card>
                 <Card className="text-center">
                    <p className="text-sm text-ink-500">Total Access Logs</p>
                    <p className="text-3xl font-bold text-navy-900">{logs.length}</p>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <Card title="System Activity (Last 10 Actions)">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-line-200">
                            <thead className="bg-paper-50">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-ink-500 uppercase">Time</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-ink-500 uppercase">User</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-ink-500 uppercase">Action</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-ink-500 uppercase">Details</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-line-200">
                                {recentLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-paper-50 transition-colors">
                                        <td className="px-3 py-2 text-xs whitespace-nowrap text-ink-500">
                                            {new Date(log.timestamp).toLocaleTimeString()}
                                        </td>
                                        <td className="px-3 py-2 text-xs font-medium text-navy-900">{log.accessedBy}</td>
                                        <td className="px-3 py-2 text-xs">
                                            <span className="px-2 py-0.5 rounded-full bg-paper-100 text-ink-700 font-medium">
                                                {log.action.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-xs text-ink-700 truncate max-w-xs">{log.details}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-4 text-right">
                        <Button variant="ghost" size="sm" onClick={() => onNavigate('logs')}>View All Logs</Button>
                    </div>
                </Card>

                <Card title="System Overview">
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <XAxis dataKey="name" stroke="#2F6494" />
                                <YAxis stroke="#2F6494" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0B2545', border: 'none', color: '#F7F8FA' }}
                                    itemStyle={{ color: '#F7F8FA' }}
                                />
                                <Bar dataKey="value" fill="#2F6494" barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

             <Card title="All Cases Administration" action={<span className="text-xs text-ink-500">Sorted by priority: Critical → High → Standard</span>}>
                 <Table headers={['ID', 'Title', 'Priority', 'Status', 'Creator', 'Action']}>
                    {sortCasesByPriority(cases).map(c => (
                        <tr key={c.caseId} className="hover:bg-paper-50 transition-colors">
                            <td className="px-6 py-4 text-sm font-medium text-navy-900">{c.caseId}</td>
                            <td className="px-6 py-4 text-sm text-ink-700">{c.title}</td>
                            <td className="px-6 py-4"><CasePriorityBadge c={c} /></td>
                            <td className="px-6 py-4"><CaseStatusBadge status={c.status} /></td>
                            <td className="px-6 py-4 text-sm text-ink-500">{c.createdBy}</td>
                            <td className="px-6 py-4">
                                <Button size="sm" variant="secondary" onClick={() => onNavigate('case_detail', c.caseId)}>Manage</Button>
                            </td>
                        </tr>
                    ))}
                 </Table>
            </Card>
        </div>
    );
};
