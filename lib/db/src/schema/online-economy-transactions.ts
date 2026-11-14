import { jsonb, pgTable, serial, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { onlineProfilesTable } from "./online";

export const onlineEconomyTransactionsTable = pgTable(
  "online_economy_transactions",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull().references(() => onlineProfilesTable.userId, { onDelete: "cascade" }),
    requestId: varchar("request_id", { length: 64 }).notNull(),
    action: varchar("action", { length: 32 }).notNull(),
    response: jsonb("response").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("online_economy_transactions_user_request_idx").on(table.userId, table.requestId)],
);

export type OnlineEconomyTransaction = typeof onlineEconomyTransactionsTable.$inferSelect;
