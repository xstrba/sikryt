import prisma from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import SecretDetailClient from '@/app/components/SecretDetailClient';

export const dynamic = 'force-dynamic';

export default async function SecretPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const secret = await prisma.secret.findUnique({
        where: { id },
        include: {
            directory: true,
            versions: { orderBy: { version: 'asc' } }
        }
    });

    if (!secret) notFound();

    const directoryLink = secret.directoryId ? `/directory/${secret.directoryId}` : '/';
    const directoryName = secret.directory?.name || 'Root';

    return (
        <main className="space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-3 text-sm text-slate-400 bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                <Link href="/" className="hover:text-white transition-colors flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                </Link>

                {secret.directory && (
                    <>
                        <span>/</span>
                        <Link href={`/directory/${secret.directoryId}`} className="hover:text-white transition-colors">
                            {secret.directory.name}
                        </Link>
                    </>
                )}

                <span>/</span>
                <span className="text-emerald-400 font-mono select-all select-none">
                    {secret.name}
                </span>
            </div>

            <SecretDetailClient secret={secret as any} />
        </main>
    );
}
