import ClientDashboard from '../../components/ClientDashboard';
import { getDashboardData } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function DirectoryPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { directories, dockerSecrets, dbSecrets, error, fullAccessIds } = await getDashboardData();

    if (error) {
        return (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                <div className="flex items-start gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <div>
                        <h3 className="font-semibold text-red-300">Connection Error</h3>
                        <p className="text-sm mt-1">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    const canManage = fullAccessIds === null || fullAccessIds.includes(id);

    return (
        <ClientDashboard
            directories={directories}
            dbSecrets={dbSecrets}
            currentDirId={id}
            canManage={canManage}
        />
    );
}
