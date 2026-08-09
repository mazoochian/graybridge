-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "helpful" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ReviewVote" (
    "id" SERIAL NOT NULL,
    "reviewId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReviewVote_reviewId_idx" ON "ReviewVote"("reviewId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewVote_reviewId_customerId_key" ON "ReviewVote"("reviewId", "customerId");

-- AddForeignKey
ALTER TABLE "ReviewVote" ADD CONSTRAINT "ReviewVote_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewVote" ADD CONSTRAINT "ReviewVote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
