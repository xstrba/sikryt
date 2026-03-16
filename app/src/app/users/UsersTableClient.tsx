'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUI } from '@/app/providers';
import { createUser, deleteUser } from '@/lib/actions';

export default function UsersTableClient({ users, currentUserId }: { users: any[], currentUserId: string }) {
    const router = useRouter();
    const { confirm, toast } = useUI();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [loading, setLoading] = useState(false);

    // New User State
    const [newEmail, setNewEmail] = useState('');
    const [newNickname, setNewNickname] = useState('');
    const [newName, setNewName] = useState('');
    const [newRole, setNewRole] = useState<'ADMIN' | 'USER'>('USER');

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const res = await createUser(newEmail, newNickname, newName, newRole);
        if (res.success) {
            toast('User created successfully!', 'success');
            setNewEmail('');
            setNewNickname('');
            setNewName('');
            setNewRole('USER');
            setShowCreateModal(false);
            router.refresh();
        } else {
            toast(res.error || 'Failed to create user', 'error');
        }
        setLoading(false);
    };

    const handleDelete = async (userId: string, email: string) => {
        const ok = await confirm({
            title: 'Delete User?',
            message: `Are you sure you want to delete ${email}? This action cannot be undone.`,
            danger: true
        });
        if (!ok) return;

        setLoading(true);
        const res = await deleteUser(userId);
        if (res.success) {
            toast('User deleted successfully', 'success');
            router.refresh();
        } else {
            toast(res.error || 'Failed to delete user', 'error');
        }
        setLoading(false);
    };

    return (
        <>
            <div className="flex items-center justify-between border-b border-slate-800 pb-6 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <span className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20 text-emerald-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        </span>
                        User Management
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Manage platform users and directory assignments.</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/20"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Add User
                </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800 custom-scrollbar">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-950 border-b border-slate-800">
                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">User</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Role</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Assignments</th>
                            <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                                <td className="px-4 py-3">
                                    <div className="font-semibold text-slate-200">{user.name || 'Unknown'}</div>
                                    <div className="text-xs text-emerald-400 font-mono">@{user.nickname}</div>
                                    <div className="text-xs text-slate-500">{user.email}</div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${user.role === 'ADMIN' ? 'bg-violet-500/15 text-violet-400' : 'bg-slate-700/50 text-slate-400'}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-xs text-slate-400">
                                    {user.role === 'ADMIN' ? 'Full Access' : `${user.assignedDirectories?.length || 0} assigned`}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    {user.id !== currentUserId && (
                                        <div className="flex items-center justify-end gap-2">
                                            <Link href={`/users/${user.id}`} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all" title="Edit Access">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(user.id, user.email)}
                                                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                                title="Delete User"
                                                disabled={loading}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
                    <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl max-w-lg w-full">
                        <h3 className="text-xl font-bold text-white mb-2">Add New User</h3>
                        <p className="text-sm text-slate-400 mb-6">Default password will be <span className="text-emerald-400 font-mono">Sikryt123!</span></p>

                        <form onSubmit={handleCreate} className="space-y-5">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Display Name</label>
                                <input autoFocus type="text" required value={newName} onChange={e => setNewName(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                                    placeholder="e.g. John Doe" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Nickname</label>
                                <input type="text" required value={newNickname} onChange={e => setNewNickname(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-mono"
                                    placeholder="e.g. jdoe" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Email Address</label>
                                <input type="email" required value={newEmail} onChange={e => setNewEmail(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                                    placeholder="john@example.com" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">System Role</label>
                                <select
                                    value={newRole}
                                    onChange={e => setNewRole(e.target.value as any)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all appearance-none"
                                >
                                    <option value="USER">Standard User</option>
                                    <option value="ADMIN">Administrator</option>
                                </select>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all font-medium">Cancel</button>
                                <button disabled={loading}
                                    className="flex-[2] bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-emerald-900/20">
                                    {loading ? 'Creating...' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
