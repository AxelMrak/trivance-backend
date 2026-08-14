-- Prevent non-positive order amounts; NULL allowed for legacy orders without a price
ALTER TABLE orders
  ADD CONSTRAINT orders_amount_positive
  CHECK (amount IS NULL OR amount > 0);