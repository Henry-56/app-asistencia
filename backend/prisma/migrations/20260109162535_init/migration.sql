-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('COLABORADOR', 'PRACTICANTE', 'ADMIN');

-- CreateEnum
CREATE TYPE "QRType" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('AM', 'PM');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENTE', 'TARDE', 'FALTA');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "employee_code" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'COLABORADOR',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "radius_meters" INTEGER NOT NULL DEFAULT 100,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_codes" (
    "id" SERIAL NOT NULL,
    "qr_token" TEXT NOT NULL,
    "qr_date" DATE NOT NULL,
    "qr_type" "QRType" NOT NULL,
    "shift" "ShiftType" NOT NULL,
    "location_id" INTEGER NOT NULL,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_until" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qr_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "qr_id" INTEGER,
    "attendance_date" DATE NOT NULL,
    "shift" "ShiftType" NOT NULL,
    "check_in_time" TIMESTAMP(3),
    "check_in_lat" DECIMAL(10,8),
    "check_in_lng" DECIMAL(11,8),
    "check_in_accuracy_m" DECIMAL(6,2),
    "check_out_time" TIMESTAMP(3),
    "check_out_lat" DECIMAL(10,8),
    "check_out_lng" DECIMAL(11,8),
    "check_out_accuracy_m" DECIMAL(6,2),
    "late_minutes" INTEGER NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(6,2) NOT NULL DEFAULT 0.00,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENTE',
    "discount_applied" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT,
    "qr_id" INTEGER,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "accuracy_m" DECIMAL(6,2),
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_employee_code_key" ON "users"("employee_code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "qr_codes_qr_token_key" ON "qr_codes"("qr_token");

-- CreateIndex
CREATE INDEX "qr_codes_qr_token_idx" ON "qr_codes"("qr_token");

-- CreateIndex
CREATE INDEX "qr_codes_qr_date_shift_idx" ON "qr_codes"("qr_date", "shift");

-- CreateIndex
CREATE UNIQUE INDEX "qr_codes_qr_date_qr_type_shift_key" ON "qr_codes"("qr_date", "qr_type", "shift");

-- CreateIndex
CREATE INDEX "attendance_records_attendance_date_shift_idx" ON "attendance_records"("attendance_date", "shift");

-- CreateIndex
CREATE INDEX "attendance_records_user_id_attendance_date_idx" ON "attendance_records"("user_id", "attendance_date");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_user_id_attendance_date_shift_key" ON "attendance_records"("user_id", "attendance_date", "shift");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_qr_id_fkey" FOREIGN KEY ("qr_id") REFERENCES "qr_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_qr_id_fkey" FOREIGN KEY ("qr_id") REFERENCES "qr_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
