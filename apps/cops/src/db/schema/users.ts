import {
  sqliteTableCreator,
  int,
  text,
} from "drizzle-orm/sqlite-core";

const createTable = sqliteTableCreator((name) => `${name}`);

export const users = createTable("users", {
  id: int("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  age: int("age").notNull(),
  email: text("email").notNull().unique(),
});