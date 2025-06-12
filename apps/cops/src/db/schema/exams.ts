import {
  sqliteTableCreator,
  int,
  text,
  real,
} from "drizzle-orm/sqlite-core";

const createTable = sqliteTableCreator((name) => `${name}`);

export const exams = createTable("exam", {
  id: int("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  date: text("date").notNull(),
});

export const results = createTable("result", {
  id: int("exam_id").references(() => exams.id),
  grade: real("grade").notNull(),
});