-- CreateTable
CREATE TABLE `document_templates` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('RESUME', 'OFFER_LETTER', 'APPOINTMENT_LETTER', 'ID_PROOF', 'ADDRESS_PROOF', 'EDUCATIONAL_CERTIFICATE', 'EXPERIENCE_CERTIFICATE', 'RELIEVING_LETTER', 'SALARY_CERTIFICATE', 'OTHER') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `bodyText` TEXT NOT NULL,
    `updatedById` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `document_templates_type_key`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `document_templates` ADD CONSTRAINT `document_templates_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
