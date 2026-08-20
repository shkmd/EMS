-- AlterTable
ALTER TABLE `projects` ADD COLUMN `verticalId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `_VerticalManagers` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_VerticalManagers_AB_unique`(`A`, `B`),
    INDEX `_VerticalManagers_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `projects_verticalId_idx` ON `projects`(`verticalId`);

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_verticalId_fkey` FOREIGN KEY (`verticalId`) REFERENCES `verticals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_VerticalManagers` ADD CONSTRAINT `_VerticalManagers_A_fkey` FOREIGN KEY (`A`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_VerticalManagers` ADD CONSTRAINT `_VerticalManagers_B_fkey` FOREIGN KEY (`B`) REFERENCES `verticals`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
