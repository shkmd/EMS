-- CreateTable
CREATE TABLE `expense_claims` (
    `id` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `category` ENUM('TRAVEL', 'FOOD', 'ACCOMMODATION', 'OFFICE_SUPPLIES', 'COMMUNICATION', 'TRAINING', 'OTHER') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `expenseDate` DATE NOT NULL,
    `receiptUrl` VARCHAR(191) NULL,
    `receiptName` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'MANAGER_APPROVED', 'APPROVED', 'REJECTED', 'REIMBURSED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `managerId` VARCHAR(191) NULL,
    `managerActionAt` DATETIME(3) NULL,
    `managerComment` TEXT NULL,
    `hrId` VARCHAR(191) NULL,
    `hrActionAt` DATETIME(3) NULL,
    `hrComment` TEXT NULL,
    `reimbursedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `expense_claims_employeeId_idx`(`employeeId`),
    INDEX `expense_claims_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `expense_claims` ADD CONSTRAINT `expense_claims_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expense_claims` ADD CONSTRAINT `expense_claims_managerId_fkey` FOREIGN KEY (`managerId`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expense_claims` ADD CONSTRAINT `expense_claims_hrId_fkey` FOREIGN KEY (`hrId`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
