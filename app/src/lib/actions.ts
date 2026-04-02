'use server'

import prisma from './prisma'
import Docker from 'dockerode'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import bcrypt from 'bcryptjs'

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

// ─── Helpers ────────────────────────────────────────────────────────────────

async function checkAuth() {
    const session = await auth();
    if (!session || !session.user) throw new Error('Unauthorized');
    return session;
}

/**
 * Validates whether the current user has access to a given directory.
 * - ADMIN always has access.
 * - USER must be assigned to the current directory directly, or to one of its ancestors.
 */
async function verifyAccess(directoryId: string | null) {
    const session = await checkAuth();
    if (session.user.role === 'ADMIN') return;

    if (!directoryId) {
        throw new Error('Forbidden: Users cannot manage resources in the root directory.');
    }

    // Fetch user's assigned directories
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { assignedDirectories: true }
    });

    if (!user) throw new Error('Unauthorized');
    const assignedIds = new Set(user.assignedDirectories.map(d => d.id));

    // Traverse up the tree to see if any ancestor (or self) is assigned
    let currentId: string | null = directoryId;
    while (currentId) {
        if (assignedIds.has(currentId)) {
            return; // Access granted
        }
        const dir: any = await prisma.directory.findUnique({ where: { id: currentId } });
        if (!dir) break;
        currentId = dir.parentId;
    }

    throw new Error('Forbidden: You do not have access to this directory.');
}

/** Builds full directory prefix for a docker secret name, e.g. "production__api" */
async function buildDirPrefix(directoryId: string | null): Promise<string> {
    if (!directoryId) return '';
    const parts: string[] = [];
    let currentId: string | null = directoryId;
    while (currentId) {
        const dir: any = await prisma.directory.findUnique({ where: { id: currentId } });
        if (!dir) break;
        parts.unshift(dir.name);
        currentId = dir.parentId;
    }
    return parts.join('__');
}

/** Constructs the full Docker name for a version */
function buildDockerName(prefix: string, secretName: string, version: number): string {
    const base = prefix ? `${prefix}__${secretName}` : secretName;
    return version === 0 ? base : `${base}--v${version}`;
}

// ─── Directory actions ───────────────────────────────────────────────────────

export async function createDirectory(name: string, parentId: string | null = null) {
    try {
        await verifyAccess(parentId);
        // Validation: Check for duplicates in the same parent
        const existing = await prisma.directory.findFirst({
            where: { name, parentId }
        });

        if (existing) {
            return { success: false, error: `A directory named "${name}" already exists in this location.` };
        }

        const dir = await prisma.directory.create({ data: { name, parentId } });
        revalidatePath('/');
        return { success: true, directory: dir };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getDirectories() {
    const session = await checkAuth();
    if (session.user.role === 'ADMIN') {
        return await prisma.directory.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
    } else {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: { assignedDirectories: true }
        });
        // We will fetch all directories, but the frontend / page.tsx will filter the tree.
        return await prisma.directory.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
    }
}

/** Persist a new sort order for a list of sibling directories. */
export async function reorderDirectories(orderedIds: string[]) {
    try {
        const session = await checkAuth();
        // Verify the user has access to at least one directory in the list
        // (full check via verifyAccess on each is expensive; instead we verify first one)
        if (orderedIds.length === 0) return { success: true };

        await Promise.all(
            orderedIds.map((id, index) =>
                prisma.directory.update({
                    where: { id },
                    data: { sortOrder: index }
                })
            )
        );

        revalidatePath('/');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteDirectory(id: string) {
    try {
        // Prevent users from deleting assigned roots entirely (logic inside verifyAccess allows modification *inside*)
        // To do this strictly: A user can't delete exactly what was assigned to them unless they are admin.
        const session = await checkAuth();
        if (session.user.role !== 'ADMIN') {
            const user = await prisma.user.findUnique({
                where: { id: session.user.id },
                include: { assignedDirectories: true }
            });
            if (user?.assignedDirectories.some(d => d.id === id)) {
                return { success: false, error: 'Forbidden: You cannot delete a root directory assigned to you.' };
            }
        }
        // Then verify normal access to parent
        await verifyAccess(id);
        const dir = await prisma.directory.findUnique({
            where: { id },
            include: { children: true, secrets: true }
        });
        if (!dir) throw new Error('Directory not found');
        if (dir.children.length > 0 || dir.secrets.length > 0) {
            return { success: false, error: 'Cannot delete directory that contains subdirectories or secrets' };
        }
        await prisma.directory.delete({ where: { id } });
        revalidatePath('/');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ─── Secret actions ──────────────────────────────────────────────────────────

/** Create the initial version (version 0) of a new secret or config. */
export async function createSecret(name: string, value: string, directoryId: string | null = null, isConfig: boolean = false) {
    try {
        await verifyAccess(directoryId);
        // Validation 1: Check DB for logical duplicate
        const existingSecret = await prisma.secret.findFirst({
            where: { name, directoryId }
        });

        if (existingSecret) {
            return { success: false, error: `A ${isConfig ? 'config' : 'secret'} named "${name}" already exists in this directory.` };
        }

        const prefix = await buildDirPrefix(directoryId);
        const dockerName = buildDockerName(prefix, name, 0);

        // Validation 2: Check Docker Swarm for physical duplicate
        const existingDockerItems = isConfig
            ? await docker.listConfigs({ filters: { name: [dockerName] } })
            : await docker.listSecrets({ filters: { name: [dockerName] } });

        if (existingDockerItems.length > 0) {
            return { success: false, error: `The name "${dockerName}" is already taken in Docker Swarm. Please sync or choose a different name.` };
        }

        // Create physical docker secret or config
        const bufferValue = Buffer.from(value).toString('base64');
        let dockerId: string;

        try {
            if (isConfig) {
                const dockerConfig = await docker.createConfig({
                    Name: dockerName,
                    Labels: {},
                    Data: bufferValue,
                }) as any;
                dockerId = dockerConfig.id || dockerConfig.ID;
            } else {
                const dockerSecret = await docker.createSecret({
                    Name: dockerName,
                    Labels: {},
                    Data: bufferValue,
                }) as any;
                dockerId = dockerSecret.id || dockerSecret.ID;
            }
        } catch (err) {
            console.error(`[actions] Failed to create Docker ${isConfig ? 'Config' : 'Secret'}:`, err);
            return { success: false, error: `Failed to create Docker item: ${(err as Error).message}` };
        }

        // Create logical secret + version 0 in DB
        const dbSecret = await (prisma.secret as any).create({
            data: {
                name: name,
                isConfig: Boolean(isConfig),
                directory: directoryId ? { connect: { id: directoryId } } : undefined,
                versions: {
                    create: {
                        id: dockerId,
                        version: 0,
                        dockerName: dockerName,
                    }
                }
            },
            include: { versions: true }
        });

        revalidatePath('/');
        return { success: true, secret: dbSecret };
    } catch (error: any) {
        console.error(`Failed to create ${isConfig ? 'config' : 'secret'}:`, error);
        return { success: false, error: error.message };
    }
}

/** Create a new version of an existing logical secret. */
export async function createSecretVersion(secretId: string, value: string) {
    try {
        await checkAuth();
        const secret = await prisma.secret.findUnique({
            where: { id: secretId },
            include: { versions: { orderBy: { version: 'desc' } } }
        });
        if (!secret) throw new Error('Secret not found');
        await verifyAccess(secret.directoryId);

        const nextVersion = (secret.versions[0]?.version ?? -1) + 1;
        const prefix = await buildDirPrefix(secret.directoryId);
        const dockerName = buildDockerName(prefix, secret.name, nextVersion);

        // Validation: Check Docker Swarm for physical duplicate of this version
        const isConfig = (secret as any).isConfig;
        const existingDockerItems = isConfig
            ? await docker.listConfigs({ filters: { name: [dockerName] } })
            : await docker.listSecrets({ filters: { name: [dockerName] } });

        if (existingDockerItems.length > 0) {
            return { success: false, error: `The version name "${dockerName}" already exists in Docker Swarm.` };
        }

        const bufferValue = Buffer.from(value).toString('base64');
        let dockerId: string;

        if (isConfig) {
            const dockerConfig = await docker.createConfig({
                Name: dockerName,
                Labels: {},
                Data: bufferValue,
            }) as any;
            dockerId = dockerConfig.id || dockerConfig.ID;
        } else {
            const dockerSecret = await docker.createSecret({
                Name: dockerName,
                Labels: {},
                Data: bufferValue,
            }) as any;
            dockerId = dockerSecret.id || dockerSecret.ID;
        }

        const newVersion = await prisma.secretVersion.create({
            data: { id: dockerId, secretId, version: nextVersion, dockerName }
        });

        revalidatePath(`/secret/${secretId}`);
        return { success: true, version: newVersion };
    } catch (error: any) {
        // Find secret again if it exists to know if it was a config for logging
        const s = await prisma.secret.findUnique({ where: { id: secretId } });
        console.error(`Failed to create ${(s as any)?.isConfig ? 'config' : 'secret'} version:`, error);
        return { success: false, error: error.message };
    }
}

/** Delete a single version. If it's the last version, also deletes the logical secret. */
export async function deleteSecretVersion(versionId: string) {
    try {
        await checkAuth();
        const sv = await prisma.secretVersion.findUnique({
            where: { id: versionId },
            include: { secret: true }
        });
        if (!sv) throw new Error('Version not found');
        await verifyAccess(sv.secret.directoryId);

        // Remove from Docker
        try {
            const isConfig = (sv.secret as any).isConfig;
            if (isConfig) {
                await docker.getConfig(versionId).remove();
            } else {
                await docker.getSecret(versionId).remove();
            }
        } catch { /* already gone */ }

        await prisma.secretVersion.delete({ where: { id: versionId } });

        // If no versions remain, delete the logical secret too
        const remaining = await prisma.secretVersion.count({ where: { secretId: sv.secretId } });
        if (remaining === 0) {
            await prisma.secret.delete({ where: { id: sv.secretId } });
            revalidatePath('/');
            return { success: true, secretDeleted: true };
        }

        revalidatePath(`/secret/${sv.secretId}`);
        return { success: true, secretDeleted: false };
    } catch (error: any) {
        console.error('Failed to delete version:', error);
        return { success: false, error: error.message };
    }
}

/** Delete the whole logical secret/config and all its versions */
export async function deleteSecret(secretId: string) {
    try {
        await checkAuth();
        const secret = await prisma.secret.findUnique({
            where: { id: secretId },
            include: { versions: true }
        });
        if (!secret) throw new Error('Secret/Config not found');
        await verifyAccess(secret.directoryId);

        const isConfig = (secret as any).isConfig;
        for (const v of secret.versions) {
            try {
                if (isConfig) {
                    await docker.getConfig(v.id).remove();
                } else {
                    await docker.getSecret(v.id).remove();
                }
            } catch (err) { /* already gone */ }
        }

        await prisma.secret.delete({ where: { id: secretId } }); // cascades versions
        revalidatePath('/');
        return { success: true };
    } catch (error: any) {
        console.error('Failed to delete secret/config:', error);
        return { success: false, error: error.message };
    }
}

/** Read the raw plaintext value of a specific Docker secret via a temporary Swarm service */
export async function readSecretValue(dockerId: string, dockerName: string) {
    try {
        const session = await checkAuth();
        const sv = await prisma.secretVersion.findUnique({
            where: { id: dockerId },
            include: { secret: true }
        });

        if (sv) {
            await verifyAccess(sv.secret.directoryId);
        } else if (session.user.role !== 'ADMIN') {
            throw new Error('Forbidden: Only administrators can read unlinked secrets.');
        }

        const isConfig = sv ? (sv.secret as any).isConfig : false;

        // Optimization: Docker Configs can be read directly via inspect, unlike Secrets
        if (isConfig) {
            try {
                const configInfo = await docker.getConfig(dockerId).inspect() as any;
                const base64Data = configInfo.Spec?.Data;
                if (!base64Data) throw new Error('No data found in config');
                const decodedData = Buffer.from(base64Data, 'base64').toString('utf8');
                return { success: true, value: decodedData };
            } catch (err: any) {
                console.error(`[actions] Direct config read failed for ${dockerId}:`, err);
                // Fallback to service-based read if needed, though inspect should generally work
            }
        }

        const uniqueSuffix = Math.random().toString(36).substring(2, 10);
        const serviceName = `sikryt-reader-${Date.now()}-${uniqueSuffix}`;
        const mountName = dockerName;

        const isManagerOnly = process.env.MANAGER_ONLY === 'true';
        const constraints = isManagerOnly ? [] : ['node.role == worker'];

        const service = await docker.createService({
            Name: serviceName,
            TaskTemplate: {
                ContainerSpec: {
                    Image: 'alpine:latest',
                    Command: ['sh', '-c', `cat /run/${isConfig ? 'configs' : 'secrets'}/${mountName}`],
                    Secrets: isConfig ? [] : [{
                        SecretName: dockerName,
                        SecretID: dockerId,
                        File: { Name: mountName, UID: '0', GID: '0', Mode: 292 }
                    }],
                    Configs: isConfig ? [{
                        ConfigName: dockerName,
                        ConfigID: dockerId,
                        File: { Name: mountName, UID: '0', GID: '0', Mode: 292 }
                    }] : []
                },
                RestartPolicy: { Condition: 'none' },
                Placement: {
                    Constraints: constraints
                }
            }
        });

        let extractedLog = '';
        while (true) {
            const tasks = await docker.listTasks({ filters: { service: [serviceName] } });
            if (tasks.length > 0 && ['complete', 'failed', 'rejected'].includes(tasks[0].Status.State)) {
                try {
                    const stream = await service.logs({ stdout: true, stderr: true });
                    extractedLog = (stream as any).toString('utf8').replace(/^[\u0000-\u0007].{7}/gm, '').trim();
                } catch { /* ignore log errors */ }
                break;
            }
            await new Promise(r => setTimeout(r, 500));
        }

        await service.remove();
        return { success: true, value: extractedLog };
    } catch (error: any) {
        console.error('Failed to read secret value:', error);
        return { success: false, error: error.message };
    }
}

// ─── User Management actions (ADMIN ONLY) ───────────────────────────────────

export async function updateUserRole(userId: string, role: 'ADMIN' | 'USER') {
    try {
        const session = await checkAuth();
        if (session.user.role !== 'ADMIN') throw new Error('Forbidden');

        if (session.user.id === userId) throw new Error('You cannot change your own role.');

        // Prevent removing the last admin? Good practice, but let's assume at least one admin exists.
        await prisma.user.update({
            where: { id: userId },
            data: { role }
        });
        revalidatePath('/users');
        revalidatePath(`/users/${userId}`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateUserAssignments(userId: string, directoryIds: string[]) {
    try {
        const session = await checkAuth();
        if (session.user.role !== 'ADMIN') throw new Error('Forbidden');

        if (session.user.id === userId) throw new Error('You cannot change your own assignments.');

        await prisma.user.update({
            where: { id: userId },
            data: {
                assignedDirectories: {
                    set: directoryIds.map(id => ({ id }))
                }
            }
        });
        revalidatePath('/users');
        revalidatePath(`/users/${userId}`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function createUser(email: string, nickname: string, name: string, role: 'ADMIN' | 'USER') {
    try {
        const session = await checkAuth();
        if (session.user.role !== 'ADMIN') throw new Error('Forbidden');

        // Simple default password for new users
        const hashedPassword = await bcrypt.hash('Sikryt123!', 10);

        await prisma.user.create({
            data: {
                email,
                nickname,
                name,
                role,
                password: hashedPassword
            }
        });

        revalidatePath('/users');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteUser(userId: string) {
    try {
        const session = await checkAuth();
        if (session.user.role !== 'ADMIN') throw new Error('Forbidden');

        // Prevent self-deletion
        if (session.user.id === userId) throw new Error('You cannot delete yourself.');

        await prisma.user.delete({
            where: { id: userId }
        });

        revalidatePath('/users');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateProfile(data: { nickname?: string, email?: string, name?: string, password?: string }) {
    try {
        const session = await checkAuth();
        const userId = session.user.id;

        const updateData: any = {};
        if (data.nickname) updateData.nickname = data.nickname;
        if (data.email) updateData.email = data.email;
        if (data.name !== undefined) updateData.name = data.name;

        if (data.password) {
            updateData.password = await bcrypt.hash(data.password, 10);
        }

        await prisma.user.update({
            where: { id: userId },
            data: updateData
        });

        revalidatePath('/profile');
        revalidatePath('/users'); // In case name/email changed for admins viewing users
        return { success: true };
    } catch (error: any) {
        if (error.code === 'P2002') {
            const target = error.meta?.target || [];
            if (target.includes('nickname')) return { success: false, error: 'This nickname is already taken.' };
            if (target.includes('email')) return { success: false, error: 'This email is already registered.' };
        }
        return { success: false, error: error.message };
    }
}

export async function searchSecrets(query: string) {
    if (!query || query.length < 2) return [];

    try {
        const session = await checkAuth();
        const isAdmin = session.user.role === 'ADMIN';

        let accessibleDirectoryIds: Set<string> | null = null;

        if (!isAdmin) {
            const user = await prisma.user.findUnique({
                where: { id: session.user.id },
                include: { assignedDirectories: true }
            });

            if (!user) return [];

            const directories = await prisma.directory.findMany();
            const allowedIds = new Set(user.assignedDirectories.map(d => d.id));
            
            // Expand to descendants
            let added = true;
            while (added) {
                added = false;
                for (const d of directories) {
                    if (d.parentId && allowedIds.has(d.parentId) && !allowedIds.has(d.id)) {
                        allowedIds.add(d.id);
                        added = true;
                    }
                }
            }
            accessibleDirectoryIds = allowedIds;
        }

        const searchTerms = query.trim().split(/\s+/).filter(term => term.length > 0);

        const matches = await prisma.secretVersion.findMany({
            where: {
                AND: [
                    ...searchTerms.map(term => ({
                        dockerName: {
                            contains: term,
                            mode: 'insensitive' as const
                        }
                    })),
                    accessibleDirectoryIds ? {
                        secret: {
                            directoryId: {
                                in: Array.from(accessibleDirectoryIds)
                            }
                        }
                    } : {}
                ]
            },
            include: {
                secret: true
            },
            take: 10,
            orderBy: {
                version: 'desc'
            }
        });

        return matches.map(m => ({
            id: m.secretId,
            dockerName: m.dockerName,
            version: m.version,
            secretName: m.secret.name,
            isConfig: (m.secret as any).isConfig
        }));
    } catch (error) {
        console.error('Search error:', error);
        return [];
    }
}
