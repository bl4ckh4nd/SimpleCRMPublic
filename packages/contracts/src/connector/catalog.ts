import { z } from "zod";

export const MAX_PAGE_SIZE = 200;
export const MAX_RESULT_BYTES = 1024 * 1024;

const page = z.object({ cursor: z.number().int().nonnegative().default(0), limit: z.number().int().positive().max(MAX_PAGE_SIZE).default(100) });
const id = z.object({ id: z.number().int().positive() });

export const connectorOperations = {
  "customers.page": page,
  "customers.get": id,
  "products.page": page,
  "products.get": id,
  "reference.list": z.object({ kind: z.enum(["companies", "warehouses", "paymentMethods", "shippingMethods"]) }),
  "dashboard.summary": z.object({}),
  "orders.create": z.object({
    idempotencyKey: z.string().min(16).max(200), customerId: z.number().int().positive(), companyId: z.number().int().positive(),
    warehouseId: z.number().int().positive(), paymentMethodId: z.number().int().positive(), shippingMethodId: z.number().int().positive(),
    products: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().positive(), netPrice: z.number().nonnegative() })).min(1).max(200),
  }),
} as const;

export type ConnectorOperation = keyof typeof connectorOperations;

export function parseOperation(operation: string, input: unknown) {
  const schema = connectorOperations[operation as ConnectorOperation];
  if (!schema) throw new Error("CONNECTOR_OPERATION_NOT_ALLOWED");
  return { operation: operation as ConnectorOperation, input: schema.parse(input) };
}

export function assertResultSize(result: unknown) {
  if (new TextEncoder().encode(JSON.stringify(result)).byteLength > MAX_RESULT_BYTES) throw new Error("CONNECTOR_RESULT_TOO_LARGE");
  return result;
}

export function sourceKey(source: "jtl" | "crm", id: string | number) {
  if (String(id).includes(":")) throw new Error("INVALID_SOURCE_ID");
  return `${source}:${id}` as const;
}
