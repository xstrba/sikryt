-- Baseline schema for Sikryt.
--
-- Written to be idempotent: on an empty database it creates everything, and on a database that was
-- created by `prisma db push` in a release before 1.2.0 it only adds what is missing, e.g.
-- "Directory"."sortOrder" or "User"."nickname" from older versions.
-- Generated from prisma/schema.prisma with `prisma migrate diff --from-empty` and made re-runnable.

CREATE SCHEMA IF NOT EXISTS "public";

-- Enum
DO $$ BEGIN
    CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tables
CREATE TABLE IF NOT EXISTS "Directory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Directory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Secret" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "directoryId" TEXT,
    "isConfig" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Secret_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SecretVersion" (
    "id" TEXT NOT NULL,
    "secretId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "dockerName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecretVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "_UserDirectories" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserDirectories_AB_pkey" PRIMARY KEY ("A","B")
);

-- Columns added after the first releases (no-ops on fresh databases)
ALTER TABLE "Directory" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "nickname" TEXT;
UPDATE "User" SET "nickname" = "email" WHERE "nickname" IS NULL;
ALTER TABLE "User" ALTER COLUMN "nickname" SET NOT NULL;

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "Directory_name_parentId_key" ON "Directory"("name", "parentId");
CREATE UNIQUE INDEX IF NOT EXISTS "Secret_name_directoryId_key" ON "Secret"("name", "directoryId");
CREATE UNIQUE INDEX IF NOT EXISTS "SecretVersion_secretId_version_key" ON "SecretVersion"("secretId", "version");
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "User_nickname_key" ON "User"("nickname");
CREATE INDEX IF NOT EXISTS "_UserDirectories_B_index" ON "_UserDirectories"("B");

-- Foreign keys
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Directory_parentId_fkey') THEN
        ALTER TABLE "Directory" ADD CONSTRAINT "Directory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Directory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Secret_directoryId_fkey') THEN
        ALTER TABLE "Secret" ADD CONSTRAINT "Secret_directoryId_fkey" FOREIGN KEY ("directoryId") REFERENCES "Directory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SecretVersion_secretId_fkey') THEN
        ALTER TABLE "SecretVersion" ADD CONSTRAINT "SecretVersion_secretId_fkey" FOREIGN KEY ("secretId") REFERENCES "Secret"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_UserDirectories_A_fkey') THEN
        ALTER TABLE "_UserDirectories" ADD CONSTRAINT "_UserDirectories_A_fkey" FOREIGN KEY ("A") REFERENCES "Directory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_UserDirectories_B_fkey') THEN
        ALTER TABLE "_UserDirectories" ADD CONSTRAINT "_UserDirectories_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
