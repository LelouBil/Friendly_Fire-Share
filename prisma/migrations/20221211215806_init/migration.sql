-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(17) NOT NULL,
    `RefreshToken` VARCHAR(191) NULL,
    `SentryFile` LONGBLOB NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_AllowedBorrows` (
    `A` VARCHAR(17) NOT NULL,
    `B` VARCHAR(17) NOT NULL,

    UNIQUE INDEX `_AllowedBorrows_AB_unique`(`A`, `B`),
    INDEX `_AllowedBorrows_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_AllowedBorrows` ADD CONSTRAINT `_AllowedBorrows_A_fkey` FOREIGN KEY (`A`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_AllowedBorrows` ADD CONSTRAINT `_AllowedBorrows_B_fkey` FOREIGN KEY (`B`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
