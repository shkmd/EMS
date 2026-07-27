-- Messaging launched with only test conversations so far (participant ids
-- pointed at Employee.id); wipe them before retargeting the FKs at User.id
-- rather than writing a data migration for throwaway rows.
DELETE FROM `messages`;
DELETE FROM `conversations`;

-- DropForeignKey
ALTER TABLE `conversations` DROP FOREIGN KEY `conversations_participantAId_fkey`;

-- DropForeignKey
ALTER TABLE `conversations` DROP FOREIGN KEY `conversations_participantBId_fkey`;

-- DropForeignKey
ALTER TABLE `messages` DROP FOREIGN KEY `messages_senderId_fkey`;

-- DropIndex
DROP INDEX `messages_senderId_fkey` ON `messages`;

-- AddForeignKey
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_participantAId_fkey` FOREIGN KEY (`participantAId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_participantBId_fkey` FOREIGN KEY (`participantBId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
