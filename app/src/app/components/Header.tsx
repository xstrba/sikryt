import Link from 'next/link';
import { auth } from '@/auth';
import Image from 'next/image';
import GlobalSearch from './GlobalSearch';
import UserMenu from './UserMenu';

export default async function Header() {
    let error: string | null = null;
    let isSwarm = false;

    const session = await auth();

    try {
        const Docker = (await import('dockerode')).default;
        const docker = new Docker({ socketPath: '/var/run/docker.sock' });
        const info = await docker.info();
        isSwarm = info.Swarm && info.Swarm.LocalNodeState === 'active';
    } catch (err: any) {
        console.error("Failed to connect to Docker socket:", err);
        error = err.message || "Failed to connect to Docker socket";
    }

    return (
        <header className="flex items-center justify-between border-b border-slate-800 pb-6 mb-8 gap-6 h-16">
            <div className="flex items-center gap-8 flex-1">
                <Link href="/" className="text-2xl font-bold tracking-tight text-white flex items-center gap-4 hover:opacity-80 transition-opacity shrink-0">
                    <Image src="/logo.png" alt="Sikryt Logo" width={40} height={40} className="rounded-xl shadow-lg border border-slate-700/50" unoptimized />
                    <span className="hidden sm:inline">Sikryt Dashboard</span>
                </Link>
                
                {session?.user && (
                    <div className="max-w-md w-full">
                        <GlobalSearch />
                    </div>
                )}
            </div>

            <div className="flex items-center gap-4">
                {session?.user && (
                    <UserMenu session={session} isSwarm={isSwarm} error={error} />
                )}
            </div>
        </header>
    );
}
