import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "../config/env.js";

//o que é prisma client? é uma interface do prisma utilizada para realizar operações no banco de dados

//o que é prisma Pg? ele adapta a comunicação prisma ao driver postgresql

//env de config vai ser o arquivo que faz a leitura e a validação dos dados da .env

// Prisma 7 exige um "driver adapter": é o driver "pg" que realmente conversa
// com o PostgreSQL. O Prisma Client monta as queries e entrega ao adapter.

//para fazer a conversa com o banco vamos precisar de uma nova instância de prismaPg, essa instância pode
//receber uma das 3 coisas, uma string, que seria diretamente a url, um pool criado pelo pg em outro arquivo
//ou um poolOrConfig, que é nosso caso, poolOrConfig recebe um objeto, uma das propriedades desse objeto é:

//o connectionString que recebe uma url também, so que diferente da string essa url pode vir de outro lugar
//não apenas de string local, deixando menos seguro
//também pode receber o host, algo como o local host do servidor
//port, porta do servidor, etc

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

// UMA única instância para toda a aplicação (ela gerencia um pool de conexões).
// Criar um PrismaClient por requisição esgotaria as conexões do banco.
// log: só avisos. Erros inesperados já são registrados pelo errorHandler; se
// deixássemos "error" aqui, o Prisma também imprimiria erros que TRATAMOS de
// propósito (ex.: e-mail duplicado -> 409), gerando ruído no console.

//o prisma client pode receber diversas propriedades, uma delas é o adapter que é a ligação direta com o
//banco, porque tem somente um? porque o adapter que ele deve receber é o mesmo que foi criado para o prismapg
//ele pode receber também outras propriedades, como log, que vai ser para decidir o que vai ser mostrado
//nesse caso queremos mostrar apenas um aviso (warn), porque não mostrar o erro? porque já tem um arquivo de
//tratamento de erros, que é o errorhandler, então não queremos poluição no log
export const prisma = new PrismaClient({ adapter, log: ["warn"] });
