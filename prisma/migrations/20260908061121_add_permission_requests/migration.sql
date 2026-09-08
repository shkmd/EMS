-- CreateTable
CREATE TABLE `permission_requests` (
    `id` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `hours` DECIMAL(3, 2) NOT NULL,
    `reason` TEXT NOT NULL,
    `status` ENUM('PENDING', 'MANAGER_APPROVED', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `managerId` VARCHAR(191) NULL,
    `managerActionAt` DATETIME(3) NULL,
    `managerComment` TEXT NULL,
    `hrId` VARCHAR(191) NULL,
    `hrActionAt` DATETIME(3) NULL,
    `hrComment` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `permission_requests_employeeId_idx`(`employeeId`),
    INDEX `permission_requests_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `permission_requests` ADD CONSTRAINT `permission_requests_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `permission_requests` ADD CONSTRAINT `permission_requests_managerId_fkey` FOREIGN KEY (`managerId`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `permission_requests` ADD CONSTRAINT `permission_requests_hrId_fkey` FOREIGN KEY (`hrId`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
