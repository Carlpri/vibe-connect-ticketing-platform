-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "ticketTypeId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceKes" INTEGER NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_items_ticketTypeId_idx" ON "order_items"("ticketTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "order_items_orderId_ticketTypeId_key" ON "order_items"("orderId", "ticketTypeId");

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "order_items" ADD CONSTRAINT oi_quantity_positive  CHECK (quantity > 0);
ALTER TABLE "order_items" ADD CONSTRAINT oi_price_not_negative CHECK ("unitPriceKes" >= 0);
ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;