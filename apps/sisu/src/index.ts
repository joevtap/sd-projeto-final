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
          date: "2025"
        },
        grades: [
          { userId: 0, grade: 0.0 },
          { userId: 1, grade: 1.0 },
          { userId: 2, grade: 2.0 },
          { userId: 3, grade: 3.0 },
          { userId: 4, grade: 4.0 },
          { userId: 5, grade: 5.0 },
          { userId: 6, grade: 6.0 },
          { userId: 7, grade: 7.0 },
          { userId: 8, grade: 8.0 },
          { userId: 9, grade: 9.0 }
        ]
      }),
    }],
  });

  // espera a mensagem de feedback da COPS
  await consumer.subscribe({
    topic: TOPICS.PROCESS_FINISHED_RESPONSE,
    fromBeginning: true,
  });

  // imprime o resultado preliminar
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
