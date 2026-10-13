import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";

//importa o prisma também que é o que realmente vai fazer a conexão com o prisma e o banco

//como visto no arquivo app ele que cria o express e chama o erroHandler, então para manter a fase de
//testes sem precisar abrir porta de rede
const app = createApp();

//coloca o server para ouvir na porta com uma funçao callback, deve chamar a porta de env que está em config
const server = app.listen(env.PORT, () => {
  console.log(`API rodando em http://localhost:${env.PORT} (docs em /docs)`);
});

// Encerramento "limpo": para de aceitar conexões e fecha a conexão com o banco.
//é uma forma segura e bem organizada de encerrar o servidor, esse nome é muito comum entre os devs
//shutdown recebe um signal, que é usado para finalizar a aplicação, quando usado esse sinal ele encerra
//deve ser async porque vai usar o server.close que é assíncrono
async function shutdown(signal) {
  //\n é só para quebrar linha, para o console.log ficar mais bonito
  console.log(`\n${signal} recebido, encerrando...`);

  //o que cada coisa aqui faz:
  //server.close vai encerrar todas as requisições http, porque não encerrar o banco primeiro? porque
  //se tiver alguma requisição em andamento antes do banco fechar ela vai cair, então por isso deve fechar
  //as requisições primeiro, close recebe uma função callback, porque async? porque também deve fechar o banco
  //abaixo, o fechamento do banco também é async, então por isso o callback também é

  //await prisma.$disconnect vai encerrar o contato com o banco, da mesma forma que o server.close fecha as
  //requisições

  //process fornece informações e controles relacionadas ao node, process.exit(0) indica que encerrou sem
  //erros
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

//o que é process.on, ele registra um ouvinte para o processo atual, se ouvir uma dessas duas palavras de
//signal ele fecha o servidor

//o que são esses dois argumentos abaixo? o primeiro é o sinal para o encerramento feito pelo usuário,
//geralmente usado para fechar com as teclad ctrl+c

//o segundo é solicitação de encerramento enviada por outro processo, sistema de gerenciamento ou ambiente de execução
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
