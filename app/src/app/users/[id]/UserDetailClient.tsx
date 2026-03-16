'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUI } from '@/app/providers';
import { updateUserRole, updateUserAssignments } from '@/lib/actions';

export default function UserDetailClient({ user, allDirectories }: { user: any, allDirectories: any[] }) {
    const router = useRouter();
    const { toast } = useUI();

    const [role, setRole] = useState<'ADMIN' | 'USER'>(user.role);
    const [assignedDirs, setAssignedDirs] = useState<Set<string>>(new Set(user.assignedDirectories.map((d: any) => d.id)));
    const [savingRole, setSavingRole] = useState(false);
    const [savingAssignments, setSavingAssignments] = useState(false);

    // Build directory tree for display
    const dirTree: Record<string, any[]> = { root: [] };
    allDirectories.forEach(d => {
        const pId = d.parentId || 'root';
        if (!dirTree[pId]) dirTree[pId] = [];
        dirTree[pId].push(d);
    });

    const handleRoleChange = async (newRole: 'ADMIN' | 'USER') => {
        setSavingRole(true);
        const res = await updateUserRole(user.id, newRole);
        if (res.success) {
            setRole(newRole);
            toast(`User role updated to ${newRole}`, 'success');
            router.refresh();
        } else {
            toast(res.error || 'Failed to update role', 'error');
        }
        setSavingRole(false);
    };

    const toggleAssignment = (dirId: string) => {
        const next = new Set(assignedDirs);
        if (next.has(dirId)) next.delete(dirId);
        else next.add(dirId);
        setAssignedDirs(next);
    };

    const handleSaveAssignments = async () => {
        setSavingAssignments(true);
        const res = await updateUserAssignments(user.id, Array.from(assignedDirs));
        if (res.success) {
            toast('Directory assignments saved', 'success');
            router.refresh();
        } else {
            toast(res.error || 'Failed to save assignments', 'error');
        }
        setSavingAssignments(false);
    };

    const renderTree = (parentId: string, depth = 0) => {
        const nodes = dirTree[parentId] || [];
        if (nodes.length === 0) return null;

        return (
            <ul className={`space-y-2 ${depth > 0 ? 'ml-6 pl-4 border-l border-slate-800' : 'mt-4'}`}>
                {nodes.map(node => (
                    <li key={node.id} className="pt-2">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={assignedDirs.has(node.id)}
                                onChange={() => toggleAssignment(node.id)}
                                className="w-4 h-4 rounded-sm border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-950 transition-all cursor-pointer"
                            />
                            <div className="flex items-center gap-2 text-slate-300 group-hover:text-white transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500/70"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
                                {node.name}
                            </div>
                        </label>
                        {renderTree(node.id, depth + 1)}
                    </li>
                ))}
            </ul>
        );
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-6 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <span className="bg-violet-500/10 p-2 rounded-xl border border-violet-500/20 text-violet-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                        </span>
                        {user.name || 'User Profile'}
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">{user.email}</p>
                </div>
            </div>

            <div className="space-y-8">
                {/* Role Section */}
                <section>
                    <h2 className="text-lg font-semibold text-slate-200 mb-4">Privilege Level</h2>
                    <div className="flex gap-4">
                        <button
                            onClick={() => handleRoleChange('USER')}
                            disabled={savingRole}
                            className={`flex flex-col items-start p-4 rounded-xl border transition-all flex-1 text-left ${role === 'USER' ? 'bg-slate-800 border-slate-600 ring-2 ring-slate-800' : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                                }`}
                        >
                            <span className="font-semibold text-slate-200">Standard User</span>
                            <span className="text-xs text-slate-500 mt-1 leading-relaxed">Can only access and manage resources within explicitly assigned directories.</span>
                        </button>

                        <button
                            onClick={() => handleRoleChange('ADMIN')}
                            disabled={savingRole}
                            className={`flex flex-col items-start p-4 rounded-xl border transition-all flex-1 text-left ${role === 'ADMIN' ? 'bg-violet-500/10 border-violet-500/50 ring-2 ring-violet-500/20 ring-offset-2 ring-offset-slate-900' : 'bg-slate-950/50 border-slate-800 hover:border-violet-500/30'
                                }`}
                        >
                            <span className={`font-semibold ${role === 'ADMIN' ? 'text-violet-400' : 'text-slate-200'}`}>Administrator</span>
                            <span className="text-xs text-slate-500 mt-1 leading-relaxed">Has unconditional, global access to all directories, secrets, and user management.</span>
                        </button>
                    </div>
                </section>

                {/* Directory Assignments */}
                {role === 'USER' && (
                    <section className="pt-6 border-t border-slate-800">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-200">Directory Assignments</h2>
                                <p className="text-xs text-slate-500 mt-1">Select the root directories this user should have full access to manage.</p>
                            </div>
                            <button
                                onClick={handleSaveAssignments}
                                disabled={savingAssignments}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/20 disabled:opacity-50"
                            >
                                {savingAssignments ? 'Saving...' : 'Save Assignments'}
                            </button>
                        </div>

                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {allDirectories.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-6">No directories exist yet.</p>
                            ) : (
                                renderTree('root')
                            )}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}
