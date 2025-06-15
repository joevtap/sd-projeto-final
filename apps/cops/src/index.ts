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
import { eq, desc } from "drizzle-orm";

async function simulateDB() {
  for(let i = 0; i < 10; i++){
    await db.insert(users)
      .values({
        id: i,
        name: "student" + i,
        age: i + 20,
        email: "student" + i + "@example.com"
      })
  }
}

async function main() {
  await bootstrap();

  // simula o banco de dados de usuários
  await simulateDB();

  await consumer.subscribe({
    topic: TOPICS.PROCESS_FINISHED,
    fromBeginning: true
  });

  await consumer.run({
    eachMessage: async ({ topic, message: { value } }) => {
      if (!value) return;

      if (topic === TOPICS.PROCESS_FINISHED) {
        const parsed: Results = JSON.parse(value.toString());

        // verifica se o exame já existe no banco de dados
        const [existingExam] = await db
          .select()
          .from(exams)
          .where(eq(exams.name, parsed.exam.name));

        let examId: number;

        if (existingExam) {
        // se o exame já tiver sido criado,

          examId = existingExam.id; // recupera o identificador
        } else {
        // se o exame não existir,

          // insere o exame no banco de dados
          const inserted = await db
            .insert(exams)
            .values({
              name: parsed.exam.name,
              date: parsed.exam.date,
            })
            .returning({ id: exams.id });

          examId = inserted[0].id;
        }

        // insere as notas do BD
        for (const grade of parsed.grades) {
          await db.insert(results).values({
            exam_id: examId,
            user_id: grade.userId,
            grade: grade.grade,
          });
        }

        // envia um feedback ao sistema de PS
        await producer.send({
          topic: TOPICS.PROCESS_FINISHED_RESPONSE,
          messages: [{
            value: marshal<Feedback>({
              id: nanoid(),
              message: "COPS: Resultados recebidos e processados com sucesso.",
            }),
          }],
        });

        // gera lista preliminar de aprovados
        const ranked = await db
          .select({
            name: users.name,
            email: users.email,
            grade: results.grade,
          })
          .from(results)
          .innerJoin(users, eq(users.id, results.user_id))
          .where(eq(results.exam_id, examId))
          .orderBy(desc(results.grade));

        const notificationMessages = ranked.map((user, index) => ({
          value: marshal<Notification>({
            id: nanoid(),
            to: user.email,
            message: `Você está em ${index + 1}º lugar no exame ${parsed.exam.name}.`,
          }),
        }));

        await Promise.all([
          // notifica o resultado preliminar aos candidatos
          producer.send({
            topic: TOPICS.NOTIFICATION,
            messages: notificationMessages,
          }),
          // envia um feedback ao sistema de PS
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