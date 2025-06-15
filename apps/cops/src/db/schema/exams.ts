import {
  sqliteTableCreator,
  int,
  text,
  real,
} from "drizzle-orm/sqlite-core";

import { users } from '@/db/schema/users';

const createTable = sqliteTableCreator((name) => `${name}`);

export const exams = createTable("exam", {
  id: int("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  date: text("date").notNull(),
});

export const results = createTable("result", {
  exam_id: int("exam_id").references(() => exams.id),
  user_id: int("user_id").references(() => users.id),
  grade: real("grade").notNull(),
});