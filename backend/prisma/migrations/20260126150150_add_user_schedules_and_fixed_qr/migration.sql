/*
  Warnings:

  - You are about to drop the column `password_hash` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[login_code]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `login_code` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "users_email_key";

-- AlterTable
ALTER TABLE "qr_codes" ADD COLUMN     "is_fixed" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "qr_date" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "password_hash",
ADD COLUMN     "login_code" TEXT NOT NULL,
ALTER COLUMN "email" DROP NOT NULL;

-- CreateTable
CREATE TABLE "user_schedules" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "shift" "ShiftType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_schedules_user_id_dayOfWeek_shift_key" ON "user_schedules"("user_id", "dayOfWeek", "shift");

-- CreateIndex
CREATE UNIQUE INDEX "users_login_code_key" ON "users"("login_code");

-- AddForeignKey
ALTER TABLE "user_schedules" ADD CONSTRAINT "user_schedules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
