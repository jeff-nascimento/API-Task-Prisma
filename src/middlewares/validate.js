import { z } from "zod";
import { AppError } from "../utils/AppError.js";

//esse arquivo vai ser responsável por validar as informações enviadas pelo cliente no corpo da requisição

// Mensagens de erro do Zod em português do Brasil (vale para toda a aplicação).
//isso só funciona em toda a aplicação porque configuração global na bibilhoteca zod
z.config(z.locales.ptBR());

// Uso: validate({ params: schema, query: schema, body: schema })
//
// Para cada parte da requisição que tiver schema:
//   - valida; se falhar, junta TODOS os problemas e responde 400;
//   - se passar, guarda os dados JÁ VALIDADOS/CONVERTIDOS em req.validated.
//
// Por que não sobrescrever req.query? No Express 5, req.query é somente leitura.
// Por isso o controller sempre lê de req.validated, nunca de req.body/query direto.

//essa função como mostrada no parametro vai validar schemas completos
//lembrando, middlewares retornam outra função porque req, res, não ceita argumentos, por isso deve passar
//uma função antes dela que os recebe

export function validate(schemas) {
  return (req, res, next) => {
    //responsável por armazenar os dados que passam pela validação

    const validated = {};

    //armazena os problemas decorrente dessa validação

    const details = [];

    //vai fazer um for of passando na lista onde tem 3 argumentos

    for (const part of ["params", "query", "body"]) {
      //ignora as partes que não tem schema, usando o continue para ir para a próxima rotação do loop

      if (!schemas[part]) continue;

      //vou explicar essa expressão por partes
      //lembrando que quando pega com [] não pega a chave toda, apenas o valor
      //schemas[part]: recupera os schemas da part atual, se por exemplo part for body, pega schemas.body
      //req[part]: recupera de req, por exemplo se part for body, req.body
      //safeparse retorna um objeto contendo os valores e o erro, em vez de apenas o erro

      const result = schemas[part].safeParse(req[part]);

      //no safeparse tem um objeto success que tem true ou false, se caso der true, ou seja, sem erros

      if (result.success) {
        //salva os dados que também vem de safeparse no validate com a part que está sendo avalida

        validated[part] = result.data;
      } else {
        //por que issues? porque quando uma requisição falha o zod tem uma propriedade chamada issues que
        //fica dentro de um objeto chamado error esse objeto
        //armazena os problemas que ocorreram, por isso faz um for passando por cada issue que encontrou

        for (const issue of result.error.issues) {
          //adiciona cada uma dessas issues em um details utilizando o método push que adiciona ao final
          //do array, vai adicionar como um objeto para que mande todos os dados
          details.push({
            //lembrando que essas chaves são totalmente criadas pelo autor, nada "deve" ser assim porque deve
            //in: part, onde ocorreu o erro, params, body, etc

            in: part,

            //issue.path é o caminho exato até o campo que ocorreu o erro, junta com ponto cada palavra, tipo
            //user.email

            field: issue.path.join("."),

            //quando da um erro tem o campo mensagem normal que vai ser a mensagem de erro
            message: issue.message,
          });
        }
      }
    }

    //essa verificação aqui é para ver se tem pelo menos um erro em details, se details for vazio é porque não
    //ocorreu nenhum erro, caso ocorra ele vai mandar um throw que para tudo, e chama apperror que é nosso
    //arquivo que contém nossos erros reutilizados, pasando details nele

    //porque não lançar o erro logo no primeiro laço caso haja algum erro, porque isso travaria a verificação
    //dos outros erros, fazendo com que ficasse refazendo a requisição até dar certo, assim uma única mensagem
    //de erro mostra diversos erros
    if (details.length > 0) throw AppError.validation(details);

    //salva validate em req para utilizar em outros lugares
    //     Porque o seu projeto estabelece uma convenção: os dados originais ficam nas propriedades
    // tradicionais do Express, enquanto os resultados validados ficam em req.validated.
    // Essa convenção deixa explícito de onde vêm os dados utilizados pela lógica da aplicação.
    // Também evita misturar a entrada original com o resultado que passou pelas regras do Zod.
    // Por exemplo, se um schema transformar uma string numérica em número, o resultado transformado ficará em
    // req.validated.query, enquanto req.query continuará representando os dados originais da consulta.
    // Há ainda uma razão específica para req.query: no Express 5, essa propriedade é somente leitura, portanto
    // não é adequado tentar substituir o objeto atribuindo um novo valor a req.query.
    // A estratégia de utilizar req.validated contorna esse problema e estabelece um lugar único para os
    // resultados validados.
    req.validated = validated;

    //Essa linha informa ao Express que o middleware terminou seu trabalho e que o processamento pode continuar.
    next();
  };
}
