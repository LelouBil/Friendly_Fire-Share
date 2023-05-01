/*
  Warnings:

  - You are about to drop the column `SentryFile` on the `user` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `User` DROP COLUMN `SentryFile`,
    ADD COLUMN `MachineId` LONGBLOB NULL;
