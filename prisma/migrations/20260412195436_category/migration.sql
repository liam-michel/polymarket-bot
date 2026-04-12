/*
  Warnings:

  - The `category` column on the `markets` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Category" AS ENUM ('Politics', 'Geopolitics', 'GlobalPolitics', 'Crypto', 'Sports', 'Finance', 'Economics', 'Tech', 'Culture', 'Weather', 'Mentions', 'Science', 'Other');

-- AlterTable
ALTER TABLE "markets" DROP COLUMN "category",
ADD COLUMN     "category" "Category";
