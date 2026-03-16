import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import UsersTableClient from './UsersTableClient';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
        notFound();
    }

    const users = await prisma.user.findMany({
        orderBy: { email: 'asc' },
        include: { assignedDirectories: true }
    });

    return (
        <main className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
                <UsersTableClient users={users as any} currentUserId={session.user.id!} />
            </div>
        </main>
    );
}
