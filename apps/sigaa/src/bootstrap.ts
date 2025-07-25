import { broker } from "@/broker/broker";
import { consumer } from "@/broker/consumer";
import { ensureTopicsExist, TOPICS } from "@sd/broker";
import { producer } from "@/broker/producer";

export async function bootstrap() {
  await ensureTopicsExist(broker, [
    TOPICS.DOCUMENT_REVIEWED,
    TOPICS.PROCESS_FINISHED,
    TOPICS.REGISTRATION_FINISHED,
    TOPICS.NOTIFICATION,
  ]);
  await consumer.connect();
  await producer.connect();
}
