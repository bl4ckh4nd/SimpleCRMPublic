import { DEAL_PRODUCTS_TABLE, DEALS_TABLE, PRODUCTS_TABLE } from './database-schema';
import { getDb } from './sqlite-service';

type Result =
  | { success: true; dealProductId: number; dealValue: number; changes?: number }
  | { success: false; error: string };

const fail = (error: unknown): Result => ({ success: false, error: error instanceof Error ? error.message : String(error) });

function recalculate(dealId: number) {
  const db = getDb();
  const value = (db.prepare(`
    SELECT COALESCE(SUM(quantity * price_at_time_of_adding), 0) AS value
    FROM ${DEAL_PRODUCTS_TABLE}
    WHERE deal_id = ?
  `).get(dealId) as { value: number }).value;
  db.prepare(`
    UPDATE ${DEALS_TABLE}
    SET value = CASE WHEN value_calculation_method = 'dynamic' THEN ? ELSE value END,
        last_modified = ?
    WHERE id = ?
  `).run(value, new Date().toISOString(), dealId);
  return (db.prepare(`SELECT value FROM ${DEALS_TABLE} WHERE id = ?`).get(dealId) as { value: number }).value;
}

export function addDealProduct(dealId: number, productId: number, quantity: number, unitPrice: number): Result {
  try {
    return getDb().transaction((): Result => {
      if (!getDb().prepare(`SELECT 1 FROM ${DEALS_TABLE} WHERE id = ?`).get(dealId)) throw new Error('Deal not found');
      if (!getDb().prepare(`SELECT 1 FROM ${PRODUCTS_TABLE} WHERE id = ?`).get(productId)) throw new Error('Product not found');
      getDb().prepare(`
        INSERT INTO ${DEAL_PRODUCTS_TABLE} (deal_id, product_id, quantity, price_at_time_of_adding)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(deal_id, product_id) DO UPDATE SET
          quantity = quantity + excluded.quantity,
          price_at_time_of_adding = excluded.price_at_time_of_adding
      `).run(dealId, productId, quantity, unitPrice);
      const row = getDb().prepare(`SELECT id FROM ${DEAL_PRODUCTS_TABLE} WHERE deal_id = ? AND product_id = ?`).get(dealId, productId) as { id: number };
      return { success: true, dealProductId: row.id, dealValue: recalculate(dealId) };
    })();
  } catch (error) {
    return fail(error);
  }
}

export function updateDealProductLine(dealProductId: number, quantity: number, unitPrice?: number): Result {
  try {
    return getDb().transaction((): Result => {
      const line = getDb().prepare(`SELECT deal_id, price_at_time_of_adding FROM ${DEAL_PRODUCTS_TABLE} WHERE id = ?`).get(dealProductId) as {
        deal_id: number;
        price_at_time_of_adding: number;
      } | undefined;
      if (!line) throw new Error('Deal product not found');
      const result = getDb().prepare(`
        UPDATE ${DEAL_PRODUCTS_TABLE}
        SET quantity = ?, price_at_time_of_adding = ?
        WHERE id = ?
      `).run(quantity, unitPrice ?? line.price_at_time_of_adding, dealProductId);
      return { success: true, dealProductId, changes: result.changes, dealValue: recalculate(line.deal_id) };
    })();
  } catch (error) {
    return fail(error);
  }
}

export function removeDealProductLine(dealProductId: number): Result {
  try {
    return getDb().transaction((): Result => {
      const line = getDb().prepare(`SELECT deal_id FROM ${DEAL_PRODUCTS_TABLE} WHERE id = ?`).get(dealProductId) as { deal_id: number } | undefined;
      if (!line) throw new Error('Deal product not found');
      const result = getDb().prepare(`DELETE FROM ${DEAL_PRODUCTS_TABLE} WHERE id = ?`).run(dealProductId);
      return { success: true, dealProductId, changes: result.changes, dealValue: recalculate(line.deal_id) };
    })();
  } catch (error) {
    return fail(error);
  }
}
