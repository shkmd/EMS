-- AlterTable
ALTER TABLE `employees` ADD COLUMN `workMode` ENUM('OFFICE', 'REMOTE', 'HYBRID') NOT NULL DEFAULT 'OFFICE';

-- AlterTable
ALTER TABLE `verticals` ADD COLUMN `officeIpAllowlist` TEXT NULL;
