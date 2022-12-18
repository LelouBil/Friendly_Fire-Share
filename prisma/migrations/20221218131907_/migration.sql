/*
  Warnings:

  - You are about to alter the column `MachineId` on the `user` table. The data in that column could be lost. The data in that column will be cast from `LongBlob` to `VarChar(310)`.

*/
-- AlterTable
ALTER TABLE `user` MODIFY `MachineId` VARCHAR(310) NULL;
