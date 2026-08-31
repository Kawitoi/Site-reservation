/*
  Warnings:

  - You are about to drop the column `duration` on the `reservation` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "reservation" DROP COLUMN "duration";

-- AlterTable
ALTER TABLE "restaurant_location" ADD COLUMN     "email" TEXT;
