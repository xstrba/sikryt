import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import UserDetailClient from './UserDetailClient';

export const dynamic = 'force-dynamic';

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
        notFound();
    }

    if (session.user.id === id) {
        notFound(); // Or redirect, but notFound is consistent with other unauthorized access.
    }

    const user = await prisma.user.findUnique({
        where: { id },
        include: { assignedDirectories: true }
    });

    if (!user) notFound();

    const directories = await prisma.directory.findMany({
        orderBy: { name: 'asc' }
    });

    return (
        <main className="space-y-6">
            <div className="flex items-center gap-3 text-sm text-slate-400 bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                <Link href="/" className="hover:text-white transition-colors flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                </Link>
                <span>/</span>
                <Link href="/users" className="hover:text-white transition-colors">Users</Link>
                <span>/</span>
                <span className="text-emerald-400 font-mono select-all select-none">{user.name || user.email}</span>
            </div>

            <UserDetailClient user={user as any} allDirectories={directories} />
        </main>
    );
}
