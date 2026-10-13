import express from "express";
//importa todas as duas funções para tratamento de erro do erroHandler
import { notFound, errorHandler } from "./middlewares/errorHandler.js";
import routes from "./routes/index.js";

// Separar "criar o app" de "ligar o servidor" permite que os testes usem o app
// (via Supertest) sem abrir uma porta de rede.
export function createApp() {
  const app = express();

  // Lê o corpo das requisições com "Content-Type: application/json" e coloca
  // o resultado em req.body (com limite de tamanho).

  //lembra que tem um tratamento de erro para caso o json vier grande de mais? é aqui que ocorre o limite, colocando para 10kb
  app.use(express.json({ limit: "10kb" }));

  app.use(routes);

  // Por último: rota não encontrada e tratamento centralizado de erros.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
