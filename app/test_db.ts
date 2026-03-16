import prisma from './src/lib/prisma'; async function test() { console.log(await prisma.secret.findMany({ select: { id: true, name: true, directoryId: true }})); } test();
