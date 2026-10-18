import { z } from "zod";

// Este arquivo define schemas reutilizáveis para validar o ID de um recurso
// e os parâmetros de paginação de uma requisição.
// Os schemas definem as regras que os dados precisam cumprir. A validação
// será executada pelo middleware validate.js.

// Parâmetro de rota :id (precisa ser um UUID).
// z.object() define um schema para validar um objeto e suas propriedades.
// A propriedade id utiliza z.uuid(), que verifica se o valor recebido
// possui um formato válido de UUID.
// Isso permite validar o ID recebido em uma rota como /tasks/:id.
export const idParam = z.object({ id: z.uuid() });

// Query string ?page=2&limit=20.
// Os parâmetros da query string normalmente chegam como textos (strings).
// z.coerce.number() tenta converter esses valores para números.
// A paginação divide os registros em páginas menores, evitando que a API
// precise retornar todos os registros de uma só vez.
// Neste schema, o limite padrão é de 20 registros por página, caso o cliente
// não informe outro valor. O máximo permitido é de 100 registros por página.

export const paginationQuery = z.object({
  // page representa o número da página que o cliente deseja consultar.
  // z.coerce.number() tenta converter o valor recebido para número.
  // .int() exige que o resultado seja um número inteiro.
  // .min(1) determina que o número da página deve ser, no mínimo, 1.
  // .default(1) utiliza a primeira página como padrão quando o campo estiver ausente.
  page: z.coerce.number().int().min(1).default(1),

  // limit representa a quantidade máxima de registros solicitados por página.
  // z.coerce.number() tenta converter o valor recebido para número.
  // .int() exige que o resultado seja um número inteiro.
  // .min(1) determina que o limite deve ser, no mínimo, 1 registro.
  // .max(100) impede que o cliente solicite mais de 100 registros por página.
  // .default(20) utiliza 20 como limite padrão quando o campo estiver ausente.
  // A consulta ao banco de dados deverá utilizar esses valores para aplicar
  // a paginação efetivamente.
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
