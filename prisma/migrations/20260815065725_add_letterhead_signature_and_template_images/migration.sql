-- AlterTable
ALTER TABLE `company_settings` ADD COLUMN `letterheadImageUrl` VARCHAR(191) NULL,
    ADD COLUMN `signatureImageUrl` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `document_templates` ADD COLUMN `imageUrl` VARCHAR(191) NULL;
