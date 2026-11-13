import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const onlineProfilesTable = pgTable("online_profiles", {
  userId: text("user_id").primaryKey(),
  playerName: varchar("player_name", { length: 24 }).notNull(),
  petName: varchar("pet_name", { length: 18 }).notNull(),
  friendCode: varchar("friend_code", { length: 12 }).notNull().unique(),
  level: integer("level").notNull().default(1),
  publicProfile: boolean("public_profile").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const onlineCloudSavesTable = pgTable("online_cloud_saves", {
  userId: text("user_id")
    .primaryKey()
    .references(() => onlineProfilesTable.userId, { onDelete: "cascade" }),
  saveData: jsonb("save_data").$type<Record<string, unknown>>().notNull(),
  revision: integer("revision").notNull().default(1),
  imported: boolean("imported").notNull().default(false),
  importRequestId: varchar("import_request_id", { length: 64 }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type OnlineProfile = typeof onlineProfilesTable.$inferSelect;
export type OnlineCloudSave = typeof onlineCloudSavesTable.$inferSelect;
