-- AlterTable
ALTER TABLE "ConsultantProfile" ADD COLUMN     "avatarImage" TEXT,
ADD COLUMN     "coverImage" TEXT,
ADD COLUMN     "messengers" JSONB,
ADD COLUMN     "website" TEXT;
