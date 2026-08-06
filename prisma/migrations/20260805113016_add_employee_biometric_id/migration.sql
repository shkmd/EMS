-- AlterTable
ALTER TABLE `employees` ADD COLUMN `biometricId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `employees_biometricId_key` ON `employees`(`biometricId`);
