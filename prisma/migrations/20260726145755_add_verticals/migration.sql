-- AlterTable
ALTER TABLE `employees` ADD COLUMN `verticalId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `verticals` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `startTime` VARCHAR(191) NOT NULL DEFAULT '09:00',
    `endTime` VARCHAR(191) NOT NULL DEFAULT '18:00',
    `workingDays` JSON NOT NULL,
    `graceMinutes` INTEGER NOT NULL DEFAULT 10,
    `halfDayHours` DECIMAL(4, 2) NOT NULL DEFAULT 4,
    `fullDayHours` DECIMAL(4, 2) NOT NULL DEFAULT 8,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `verticals_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `employees_verticalId_idx` ON `employees`(`verticalId`);

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_verticalId_fkey` FOREIGN KEY (`verticalId`) REFERENCES `verticals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
