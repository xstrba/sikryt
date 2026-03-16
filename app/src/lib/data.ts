import Docker from 'dockerode';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

export async function getDashboardData() {
    let dockerSecrets: any[] = [];
    let dockerConfigs: any[] = [];
    let error: string | null = null;

    try {
        const docker = new Docker({ socketPath: '/var/run/docker.sock' });
        const info = await docker.info();
        const isSwarm = info.Swarm && info.Swarm.LocalNodeState === 'active';

        if (isSwarm) {
            [dockerSecrets, dockerConfigs] = await Promise.all([
                docker.listSecrets(),
                docker.listConfigs()
            ]);
        } else {
            error = "Docker is not in Swarm mode, or Swarm is not active. Secrets and Configs require Swarm mode.";
        }
    } catch (err: any) {
        console.error("Failed to connect to Docker socket:", err);
        error = err.message || "Failed to connect to Docker socket";
    }

    let directories = await prisma.directory.findMany({ orderBy: { name: 'asc' } });
    let dbSecrets = await prisma.secret.findMany({
        include: { versions: { orderBy: { version: 'asc' } } },
        orderBy: { name: 'asc' }
    });

    const session = await auth();
    const isAdmin = session?.user?.role === 'ADMIN';

    if (!isAdmin && session?.user?.id) {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: { assignedDirectories: true }
        });

        const assignedIds = new Set(user?.assignedDirectories.map(d => d.id) || []);
        const fullAccessIds = new Set(assignedIds);

        // Fully accessible descendants
        let added = true;
        while (added) {
            added = false;
            for (const d of directories) {
                if (d.parentId && fullAccessIds.has(d.parentId) && !fullAccessIds.has(d.id)) {
                    fullAccessIds.add(d.id);
                    added = true;
                }
            }
        }

        // Ancestors only for navigation to reach assigned directories
        const ancestorIds = new Set<string>();
        for (const assignedId of assignedIds) {
            let currentDir = directories.find(d => d.id === assignedId);
            while (currentDir && currentDir.parentId) {
                ancestorIds.add(currentDir.parentId);
                currentDir = directories.find(d => d.id === currentDir!.parentId);
            }
        }

        const visibleDirs = new Set([...fullAccessIds, ...ancestorIds]);

        directories = directories.filter(d => visibleDirs.has(d.id));
        dbSecrets = dbSecrets.filter(s => s.directoryId && fullAccessIds.has(s.directoryId));

        return { directories, dockerSecrets, dockerConfigs, dbSecrets, error, fullAccessIds: Array.from(fullAccessIds) };
    }

    return { directories, dockerSecrets, dockerConfigs, dbSecrets, error, fullAccessIds: null };
}
