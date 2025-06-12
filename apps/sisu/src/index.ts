import "@/teardown";

import { bootstrap } from "@/bootstrap";
import { producer } from "@/broker/producer";
import { consumer } from "@/broker/consumer";
import { marshal, TOPICS, unmarshal } from "@sd/broker";
import { Results, Feedback } from "@sd/contracts";
import { nanoid } from "nanoid";

async function main() {
  await bootstrap();

  // envia os resultados para a COPS
  await producer.send({
    topic: TOPICS.PROCESS_FINISHED,
    messages: [{
      value: marshal<Results>({
        id: nanoid(),
        exam: {
          name: "SISU",
          date: "2025-06-12"
        },
        grades: [
          { studentId: "student1", grade: 1.0 },
          { studentId: "student2", grade: 3.0 },
          { studentId: "student3", grade: 5.0 },
          { studentId: "student4", grade: 7.0 },
          { studentId: "student5", grade: 9.0 }
        ]
      }),
    }],
  });

  // espera a mensagem de feedback da COPS
  await consumer.subscribe({
    topic: TOPICS.PROCESS_FINISHED_RESPONSE,
    fromBeginning: true,
  });

  consumer.run({
    eachMessage: async ({ message: { value: message } }) => {
      if (message) console.log(unmarshal(message));
    },
  });
}

main().catch((error) => {
  console.error("Error in main:", error);
  process.exit(1);
});
