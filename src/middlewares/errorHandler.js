import { Prisma } from "@prisma/client";

import { env } from "../config/env.js";

import { AppError } from "../utils/AppError.js";

/**
 * Este arquivo tem uma responsabilidade diferente da classe AppError.
 *
 * A classe AppError, definida em outro arquivo, representa erros conhecidos
 * da nossa aplicação. Por exemplo: requisição inválida, usuário não autenticado,
 * recurso não encontrado ou conflito com dados que já existem.
 *
 * Já este arquivo centraliza o tratamento dos erros que acontecem durante
 * o processamento das requisições. Ele reconhece erros que podem vir de
 * diferentes partes da aplicação e transforma os erros conhecidos em respostas
 * HTTP padronizadas.
 *
 * Por exemplo, podemos receber:
 *
 * - Um AppError criado pela nossa própria aplicação.
 * - Um erro causado por um JSON malformado enviado pelo cliente.
 * - Um erro conhecido do Prisma, como uma violação de unicidade no banco.
 * - Um erro inesperado, como um bug ou uma falha de conexão com o banco.
 *
 * Por que importamos Prisma?
 *
 * O Prisma pode lançar erros de tipos diferentes. Um deles é
 * Prisma.PrismaClientKnownRequestError, que representa um erro conhecido
 * durante uma operação do Prisma.
 *
 * Esse tipo de erro possui uma propriedade chamada code, que identifica
 * a categoria do erro. Por exemplo:
 *
 * - P2002: uma operação violou uma restrição de unicidade.
 * - P2025: uma operação exigia encontrar um registro, mas ele não foi encontrado.
 *
 * Importamos Prisma para identificar especificamente essa classe de erro.
 * Não estamos importando aqui a instância do Prisma Client usada para consultar
 * o banco de dados.
 *
 * Por que importamos env?
 *
 * Importamos as configurações da aplicação para consultar env.isTest.
 * Essa informação será utilizada para evitar que o errorHandler registre
 * erros inesperados no console durante os testes automatizados.
 *
 * Por que importamos AppError?
 *
 * Para reconhecer os erros padronizados da nossa aplicação e reutilizar
 * seus métodos, como AppError.badRequest(), AppError.notFound() e
 * AppError.conflict(), quando precisarmos transformar outros erros.
 */

/**
 * Middleware responsável por tratar requisições para rotas inexistentes.
 *
 * Ele cria um AppError com status HTTP 404 e o encaminha para o errorHandler
 * usando next(error).
 *
 * Assim, não precisamos escrever uma resposta de erro diferente em cada
 * situação em que uma rota não existe. O errorHandler centraliza a resposta.
 */
export function notFound(req, res, next) {
  // req.method contém o método HTTP utilizado na requisição, como GET, POST,
  // PUT, PATCH ou DELETE.
  //
  // req.originalUrl contém a URL original solicitada pelo cliente, incluindo
  // o caminho e, se houver, a query string.
  //
  // Juntamos essas informações à mensagem para facilitar a identificação
  // da rota que não foi encontrada.
  //
  // AppError.notFound() cria um erro padronizado com status 404.
  //
  // next(error) informa ao Express que ocorreu um erro e encaminha esse erro
  // para o middleware de tratamento de erros, em vez de responder diretamente.
  next(
    AppError.notFound(`Rota não encontrada: ${req.method} ${req.originalUrl}`),
  );
}

/**
 * Função auxiliar que reconhece e normaliza erros conhecidos.
 *
 * Normalizar significa transformar diferentes tipos de erro em um formato
 * consistente que a nossa aplicação consiga tratar.
 *
 * Aqui, o formato padronizado é o AppError, que contém informações como
 * statusCode, code, message e, opcionalmente, details.
 *
 * A função não envia nenhuma resposta HTTP. Sua responsabilidade é apenas
 * analisar o erro recebido e devolver um AppError equivalente quando souber
 * como tratá-lo.
 *
 * Se o erro não corresponder a nenhum caso conhecido, retorna null.
 * O errorHandler usará esse null para identificar um erro inesperado.
 */
function normalize(err) {
  // 1. Erros que já foram padronizados pela nossa aplicação.
  //
  // instanceof verifica se err é uma instância de AppError.
  //
  // Se for, não precisamos criar outro erro nem alterar suas informações.
  // Simplesmente devolvemos o próprio erro, que já possui statusCode, code
  // e message definidos.
  if (err instanceof AppError) return err;

  // 2. Erros relacionados ao corpo da requisição JSON.
  //
  // O express.json() tenta interpretar o corpo da requisição como JSON.
  // Se a interpretação falhar, ele pode encaminhar um erro ao Express.
  //
  // A propriedade type identifica a categoria desse erro.
  //
  // Importante: entity.parse.failed não significa que faltam campos
  // obrigatórios. Significa que o conteúdo não pôde ser interpretado
  // como JSON válido.
  //
  // Por exemplo, um JSON com aspas ou chaves malformadas pode causar esse erro.
  //
  // Como queremos apresentar uma resposta consistente, transformamos esse
  // erro em um AppError de status 400 (Bad Request).
  if (err.type === "entity.parse.failed") {
    return AppError.badRequest("O corpo da requisição não é um JSON válido");
  }

  // entity.too.large identifica um corpo de requisição que ultrapassou
  // o limite de tamanho configurado no middleware responsável por interpretar
  // o corpo da requisição, como express.json().
  //
  // O limite não é necessariamente 100 KB: depende da configuração utilizada.
  //
  // Nesse caso, usamos o status HTTP 413 (Content Too Large), pois o problema
  // é o tamanho do conteúdo enviado, e não a validade do JSON.
  //
  // Criamos um AppError diretamente porque, na versão atual da classe AppError,
  // não existe um método específico como AppError.payloadTooLarge().
  //
  // O construtor recebe, nesta ordem:
  // 1. 413: o status HTTP.
  // 2. PAYLOAD_TOO_LARGE: um código estável que identifica o tipo do erro.
  // 3. A mensagem que será apresentada ao cliente.
  //
  // O código do erro deve seguir um padrão consistente. Aqui utilizamos
  // letras maiúsculas, assim como nos demais códigos da aplicação.
  if (err.type === "entity.too.large") {
    return new AppError(
      413,
      "PAYLOAD_TOO_LARGE",
      "Corpo da requisição grande demais",
    );
  }

  // 3. Erros conhecidos gerados pelo Prisma durante operações no banco.
  //
  // Primeiro verificamos se err é uma instância de
  // Prisma.PrismaClientKnownRequestError.
  //
  // Essa verificação é importante porque não queremos interpretar qualquer
  // propriedade code de qualquer erro como se fosse um código do Prisma.
  //
  // Se o erro pertencer a essa classe, podemos analisar err.code para
  // identificar qual erro conhecido aconteceu.
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002 indica uma violação de uma restrição de unicidade.
    //
    // Por exemplo, se o campo email for único no banco e tentarmos cadastrar
    // outro usuário com um e-mail que já existe, a operação pode gerar P2002.
    //
    // Transformamos esse erro em um AppError de status 409 (Conflict),
    // porque a operação entrou em conflito com uma restrição dos dados.
    //
    // A mensagem é genérica de propósito: ela não expõe detalhes internos
    // do banco nem depende de um campo específico.
    if (err.code === "P2002")
      return AppError.conflict("Já existe um registro com esses dados");

    // P2025 indica que uma operação exigia encontrar um registro, mas ele
    // não foi encontrado.
    //
    // Por exemplo, isso pode acontecer ao tentar atualizar ou excluir uma
    // tarefa que não existe, dependendo da operação realizada.
    //
    // Transformamos esse erro em um AppError de status 404 (Not Found).
    if (err.code === "P2025")
      return AppError.notFound("Registro não encontrado");
  }

  // 4. Erros que não foram reconhecidos pelos casos anteriores.
  //
  // Retornar null NÃO significa que o erro deixou de existir nem que ele
  // será ignorado.
  //
  // Significa apenas que esta função não possui uma regra específica para
  // normalizá-lo.
  //
  // O errorHandler receberá esse null e tratará o erro como inesperado,
  // registrando os detalhes no servidor e devolvendo uma resposta genérica
  // com status HTTP 500 ao cliente.
  //
  // Isso pode acontecer, por exemplo, com um bug no código ou com um tipo
  // de erro do Prisma que ainda não foi tratado explicitamente aqui.
  return null;
}

/**
 * Middleware central de tratamento de erros do Express.
 *
 * Um middleware de erro do Express possui quatro parâmetros:
 * (err, req, res, next).
 *
 * A presença dos quatro parâmetros é importante para que o Express reconheça
 * a função como um middleware de erro.
 *
 * O fluxo geral é:
 *
 * 1. Verificar se a resposta já começou a ser enviada.
 * 2. Tentar normalizar o erro recebido.
 * 3. Se o erro for conhecido, devolver sua resposta padronizada.
 * 4. Se for inesperado, registrar o erro no servidor e devolver uma resposta
 *    genérica ao cliente.
 */
export function errorHandler(err, req, res, next) {
  // headersSent indica que os cabeçalhos da resposta HTTP já foram enviados.
  //
  // Depois desse ponto, normalmente não é possível iniciar outra resposta
  // HTTP com um novo status e um novo corpo.
  //
  // Por isso, se os cabeçalhos já tiverem sido enviados, encaminhamos o erro
  // novamente com next(err), permitindo que o Express o entregue a outro
  // tratamento de erros disponível.
  //
  // Isso evita tentar enviar uma segunda resposta para a mesma requisição.
  if (res.headersSent) return next(err);

  // Chamamos normalize() para verificar se conhecemos esse tipo de erro.
  //
  // A variável known receberá:
  // - Um AppError, caso o erro seja reconhecido e normalizado.
  // - null, caso a função não saiba como normalizá-lo.
  const known = normalize(err);

  // Se known for um objeto AppError, significa que temos informações
  // padronizadas para construir a resposta HTTP.
  //
  // Objetos são valores truthy em JavaScript. Como normalize() retorna
  // um AppError ou null, esta condição verifica se recebemos um AppError.
  if (known) {
    // res.status(known.statusCode) define o status HTTP da resposta.
    //
    // Por exemplo:
    // - 400: requisição inválida.
    // - 401: usuário não autenticado.
    // - 404: recurso não encontrado.
    // - 409: conflito.
    //
    // .json() envia o corpo da resposta em formato JSON.
    //
    // O objeto error agrupa as informações do erro para manter um formato
    // consistente entre as respostas da API.
    return res.status(known.statusCode).json({
      error: {
        // code é o código estável do erro, como CONFLICT ou NOT_FOUND.
        // O cliente pode utilizá-lo para identificar o tipo de erro sem
        // depender do texto da mensagem.
        code: known.code,

        // message é a mensagem descritiva associada ao erro.
        message: known.message,

        // details é uma propriedade opcional que pode conter informações
        // adicionais, como uma lista de problemas de validação.
        //
        // Destrinchando a expressão:
        //
        // known.details && { details: known.details }
        //
        // O operador && avalia primeiro o valor à esquerda.
        // Se esse valor for falsy, ele próprio será o resultado da expressão.
        // Se for truthy, a expressão retornará o valor à direita.
        //
        // Portanto, se known.details for undefined, a expressão retorna
        // undefined. Se details contiver um array, inclusive um array vazio,
        // ele será considerado truthy e o objeto será produzido.
        //
        // O operador spread (...) adiciona ao objeto error as propriedades
        // do objeto retornado pela expressão.
        //
        // Como undefined não possui propriedades enumeráveis para adicionar,
        // a propriedade details acaba não sendo incluída quando seu valor
        // é undefined.
        //
        // Assim, details só aparece na resposta quando existe um valor
        // fornecido para esse campo.
        //
        // Atenção: os detalhes devem ser seguros para exposição ao cliente.
        // Não devemos enviar senhas, tokens ou informações internas sensíveis.
        ...(known.details && { details: known.details }),
      },
    });
  }

  // Se chegamos até aqui, normalize() retornou null.
  // Portanto, este é um erro que não foi reconhecido pelos casos previstos.
  //
  // Registramos o erro completo no console do servidor para que o
  // desenvolvedor consiga investigar a causa.
  //
  // Porém, fazemos isso somente fora do ambiente de testes.
  // env.isTest deve indicar corretamente se a aplicação está sendo executada
  // nesse ambiente.
  //
  // O operador ! significa negação:
  // !env.isTest será true quando env.isTest for false.
  //
  // Em produção, os registros de erro devem ser gerenciados de maneira
  // adequada para o ambiente, preferencialmente com um sistema de logs.
  //
  // Não enviamos o objeto err completo ao cliente porque ele pode conter
  // detalhes internos, mensagens técnicas ou informações sensíveis.
  if (!env.isTest) console.error(err);

  // Devolvemos uma resposta genérica para erros inesperados.
  //
  // 500 (Internal Server Error) indica que ocorreu um problema interno
  // no servidor e que a requisição não pôde ser concluída.
  //
  // INTERNAL_ERROR é o código estável que identifica essa categoria.
  //
  // A mensagem não revela a causa técnica do problema. Os detalhes completos
  // ficam nos logs do servidor, não na resposta enviada ao cliente.
  //
  // Importante: este bloco não significa que o erro foi corrigido.
  // Ele apenas impede que a API exponha detalhes internos na resposta HTTP.
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Erro interno do servidor",
    },
  });
}
