-- AlterEnum
ALTER TYPE "AttendanceStatus" ADD VALUE 'JUSTIFICADO';

-- AlterTable
ALTER TABLE "attendance_records" ADD COLUMN     "is_justified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "justification_reason" TEXT;

-- AlterTable
ALTER TABLE "user_schedules" ADD COLUMN     "end_time" TEXT,
ADD COLUMN     "start_time" TEXT;
