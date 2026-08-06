-- CreateTable
CREATE TABLE `conversation_participants` (
    `id` VARCHAR(191) NOT NULL,
    `conversationId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `lastReadAt` DATETIME(3) NULL,
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `conversation_participants_userId_idx`(`userId`),
    UNIQUE INDEX `conversation_participants_conversationId_userId_key`(`conversationId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `conversations` ADD COLUMN `createdById` VARCHAR(191) NULL,
    ADD COLUMN `isGroup` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `name` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversation_participants` ADD CONSTRAINT `conversation_participants_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `conversations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversation_participants` ADD CONSTRAINT `conversation_participants_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: turn every existing 1:1 (participantAId/participantBId) row into
-- two conversation_participants rows. lastReadAt is derived from the old
-- readAt flag (the newest message from the OTHER participant that had
-- already been marked read) rather than blanket-set to now(), so genuinely
-- unread messages from before this migration still show as unread after.
INSERT INTO `conversation_participants` (`id`, `conversationId`, `userId`, `lastReadAt`, `joinedAt`)
SELECT UUID(), c.id, c.participantAId,
    (SELECT MAX(m.createdAt) FROM `messages` m WHERE m.conversationId = c.id AND m.senderId = c.participantBId AND m.readAt IS NOT NULL),
    c.createdAt
FROM `conversations` c;

INSERT INTO `conversation_participants` (`id`, `conversationId`, `userId`, `lastReadAt`, `joinedAt`)
SELECT UUID(), c.id, c.participantBId,
    (SELECT MAX(m.createdAt) FROM `messages` m WHERE m.conversationId = c.id AND m.senderId = c.participantAId AND m.readAt IS NOT NULL),
    c.createdAt
FROM `conversations` c;

-- DropForeignKey
ALTER TABLE `conversations` DROP FOREIGN KEY `conversations_participantAId_fkey`;

-- DropForeignKey
ALTER TABLE `conversations` DROP FOREIGN KEY `conversations_participantBId_fkey`;

-- DropIndex
DROP INDEX `conversations_participantAId_participantBId_key` ON `conversations`;

-- DropIndex
DROP INDEX `conversations_participantBId_idx` ON `conversations`;

-- AlterTable
ALTER TABLE `conversations` DROP COLUMN `participantAId`,
    DROP COLUMN `participantBId`;

-- AlterTable
ALTER TABLE `messages` DROP COLUMN `readAt`;
