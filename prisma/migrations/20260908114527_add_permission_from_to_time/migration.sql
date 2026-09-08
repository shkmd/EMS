-- AlterTable
ALTER TABLE `permission_requests` ADD COLUMN `fromTime` VARCHAR(191) NULL,
    ADD COLUMN `toTime` VARCHAR(191) NULL;
