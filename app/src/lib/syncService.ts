import Docker from 'dockerode';
import { PrismaClient, Directory } from '@prisma/client';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });
const prisma = new PrismaClient();

// Regex to detect version suffix like "--v1", "--v2"
const VERSION_SUFFIX_RE = /--v(\d+)$/;

/** Parse a full Docker secret name into its components. */
function parseDockerName(fullName: string): { baseName: string; version: number } {
    const match = fullName.match(VERSION_SUFFIX_RE);
    if (match) {
        return { baseName: fullName.slice(0, fullName.length - match[0].length), version: parseInt(match[1]) };
    }
    return { baseName: fullName, version: 0 };
}

export async function syncSecrets() {
    console.log(`[sync] ${new Date().toISOString()} — Starting sync...`);
    try {
        const [dockerSecrets, dockerConfigs, dbVersions] = await Promise.all([
            docker.listSecrets(),
            docker.listConfigs(),
            prisma.secretVersion.findMany()
        ]);

        const dockerIds = new Set([
            ...dockerSecrets.map((s: any) => s.ID),
            ...dockerConfigs.map((c: any) => c.ID)
        ]);

        // Phase D: Remove DB versions whose Docker item no longer exists
        const orphanVersionIds = dbVersions.filter(v => !dockerIds.has(v.id)).map(v => v.id);
        if (orphanVersionIds.length > 0) {
            console.log(`[sync] Removing ${orphanVersionIds.length} orphaned version(s).`);
            await prisma.secretVersion.deleteMany({ where: { id: { in: orphanVersionIds } } });

            // Clean up logical secrets/configs with no versions left
            const secretIds = [...new Set(dbVersions.filter(v => orphanVersionIds.includes(v.id)).map(v => v.secretId))];
            for (const sid of secretIds) {
                const count = await prisma.secretVersion.count({ where: { secretId: sid } });
                if (count === 0) {
                    await prisma.secret.delete({ where: { id: sid } }).catch(() => { });
                }
            }
        }

        const trackedIds = new Set(dbVersions.map(v => v.id));

        // Combine for sync loop
        const allDockerItems = [
            ...dockerSecrets.map(s => ({ ...s, isConfig: false })),
            ...dockerConfigs.map(c => ({ ...c, isConfig: true }))
        ];

        // Phase B + C: Sync new Docker items into DB
        for (const ds of allDockerItems) {
            if (trackedIds.has(ds.ID)) continue;

            const fullName = ds.Spec?.Name;
            if (!fullName) continue;

            const { baseName, version } = parseDockerName(fullName);

            // Parse directory path from baseName via __ splitting
            const parts = baseName.split('__');
            const secretName = parts.pop() as string;
            const dirPath = parts;

            console.log(`[sync] New ${ds.isConfig ? 'Config' : 'Secret'}: "${fullName}" → dir=[${dirPath.join('/')}] name="${secretName}" version=${version}`);

            // Traverse / create directory tree
            let parentId: string | null = null;
            for (const dirName of dirPath) {
                const existing: Directory | null = await prisma.directory.findFirst({
                    where: { name: dirName, parentId }
                });
                if (existing) {
                    parentId = existing.id;
                } else {
                    const created: Directory = await prisma.directory.create({
                        data: { name: dirName, parentId }
                    });
                    parentId = created.id;
                }
            }

            // Find or create logical Secret/Config
            let secret = await prisma.secret.findFirst({
                where: { name: secretName, directoryId: parentId }
            });
            if (!secret) {
                secret = await (prisma.secret as any).create({
                    data: {
                        name: secretName,
                        isConfig: ds.isConfig,
                        directory: parentId ? { connect: { id: parentId } } : undefined
                    }
                });
            } else if ((secret as any).isConfig !== ds.isConfig) {
                // If it exists but flag is wrong, update it (edge case)
                secret = await prisma.secret.update({
                    where: { id: secret.id },
                    data: { isConfig: ds.isConfig } as any
                });
            }

            // Create the SecretVersion
            if (secret) {
                await prisma.secretVersion.create({
                    data: { id: ds.ID, secretId: (secret as any).id, version, dockerName: fullName }
                });
                console.log(`[sync]   ✓ Synced version ${version} for "${secretName}" (dockerId=${ds.ID})`);
            }
        }

        console.log(`[sync] ${new Date().toISOString()} — Done.`);
    } catch (err) {
        console.error('[sync] Error:', err);
    }
}
