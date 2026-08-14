-- CreateTable
CREATE TABLE `offboardings` (
    `id` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `resignationDate` DATE NULL,
    `lastWorkingDay` DATE NOT NULL,
    `reason` ENUM('RESIGNATION', 'TERMINATION', 'RETIREMENT', 'END_OF_CONTRACT', 'OTHER') NOT NULL,
    `reasonNotes` TEXT NULL,
    `status` ENUM('IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'IN_PROGRESS',
    `duesCleared` BOOLEAN NOT NULL DEFAULT false,
    `handoverComplete` BOOLEAN NOT NULL DEFAULT false,
    `handoverNotes` TEXT NULL,
    `initiatedById` VARCHAR(191) NOT NULL,
    `completedAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `offboardings_employeeId_idx`(`employeeId`),
    INDEX `offboardings_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `offboardings` ADD CONSTRAINT `offboardings_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `offboardings` ADD CONSTRAINT `offboardings_initiatedById_fkey` FOREIGN KEY (`initiatedById`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
