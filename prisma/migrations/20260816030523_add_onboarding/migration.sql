-- CreateTable
CREATE TABLE `onboardings` (
    `id` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `status` ENUM('IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'IN_PROGRESS',
    `documentsCollected` BOOLEAN NOT NULL DEFAULT false,
    `documentsNotes` TEXT NULL,
    `orientationComplete` BOOLEAN NOT NULL DEFAULT false,
    `orientationNotes` TEXT NULL,
    `initiatedById` VARCHAR(191) NOT NULL,
    `completedAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `onboardings_employeeId_idx`(`employeeId`),
    INDEX `onboardings_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `onboardings` ADD CONSTRAINT `onboardings_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `onboardings` ADD CONSTRAINT `onboardings_initiatedById_fkey` FOREIGN KEY (`initiatedById`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
