import "@/teardown";

import { bootstrap } from "@/bootstrap";
import { db } from "@/db/db";
import { users } from "@/db/schema/users";
import { exams, results } from "@/db/schema/exams";
import { consumer } from "@/broker/consumer";
import { producer } from "@/broker/producer";
import { Notification, Feedback, Results } from "@sd/contracts";
import { nanoid } from "nanoid";
import { marshal, TOPICS } from "@sd/broker";
import { eq } from "drizzle-orm";

async function main() {
  await bootstrap();

  // (temporário) insere 5 usuários no BD, ignorando conflitos de email
  await db.insert(users).values([
    { name: "Student1", age: 21, email: "student1@example.com" },
    { name: "Student2", age: 23, email: "student2@example.com" },
    { name: "Student3", age: 25, email: "student3@example.com" },
    { name: "Student4", age: 27, email: "student4@example.com" },
    { name: "Student5", age: 29, email: "student5@example.com" },
  ]).onConflictDoNothing(); // evita erro se o email já existir

  // assina o tópico PROCESS_FINISHED
  await consumer.subscribe({ topic: TOPICS.PROCESS_FINISHED, fromBeginning: true });

  // executa o consumidor
  await consumer.run({
    eachMessage: async ({ topic, message: { value } }) => {
      if (!value) return;

      if (topic === TOPICS.PROCESS_FINISHED) {
        const parsed: Results = JSON.parse(value.toString());

        // verifica se o exame já existe
        const [existingExam] = await db
          .select()
          .from(exams)
          .where(eq(exams.name, parsed.exam.name));

        let examId: number;

        if (existingExam) {
          examId = existingExam.id;
        } else {
          // insere o exame no BD
          const inserted = await db
            .insert(exams)
            .values({
              name: parsed.exam.name,
              date: parsed.exam.date,
            })
            .returning({ id: exams.id });

          examId = inserted[0].id;

          // insere as notas dos candidatos no BD
          for (const grade of parsed.grades) {
            await db.insert(results).values({
              id: examId,
              grade: grade.grade,
            });
          }
        }

        await producer.send({
          topic: TOPICS.PROCESS_FINISHED_RESPONSE,
          messages: [{
            value: marshal<Feedback>({
              id: nanoid(),
              message: "COPS: Resultados recebidos e processados com sucesso.",
            }),
          }],
        });

        // (to-do) organizar lista preliminar de aprovados

        // notifica todos os usuários
        const _users = await db.select().from(users);

        const notificationMessages = _users.map((user) => ({
          value: marshal<Notification>({
            id: nanoid(),
            to: user.email,
            // (to-do) devolver posição na lista preliminar
            message: `Process ${nanoid()} finished`,
          }),
        }));

        // (to-do) verificar recursos de nota
        // (to-do) solicitar validação de documentos
        // (to-do) organizar lista final de aprovados

        const finalNotificationMessages = _users.map((user) => ({
          value: marshal<Notification>({
            id: nanoid(),
            to: user.email,
            // (to-do) devolver posição na lista final
            message: `Process ${nanoid()} finished`,
          }),
        }));

        await Promise.all([
          producer.send({
            topic: TOPICS.NOTIFICATION,
            messages: notificationMessages,
          }),
          producer.send({
            topic: TOPICS.PROCESS_FINISHED_RESPONSE,
            messages: [{
              value: marshal<Feedback>({
                id: nanoid(),
                message: "COPS: Processo seletivo deferido.",
              }),
            }],
          }),
        ]);
      }
    },
  });
}

main().catch((error) => {
  console.error("Error in main:", error);
  process.exit(1);
});