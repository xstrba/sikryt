const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Use raw query because Prisma Client v6+ blocks null checks on required fields
    const users = await prisma.$queryRaw`SELECT id, email FROM "User" WHERE nickname IS NULL`;

    console.log(`Found ${users.length} users with missing nicknames.`);

    for (const user of users) {
        await prisma.user.update({
            where: { id: user.id },
            data: { nickname: user.email }
        });
        console.log(`Updated user ${user.email} with nickname ${user.email}`);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
