// Erro "esperado": algo que o cliente pode ter causado (dados inválidos,
// não autenticado, não encontrado...). Carrega o status HTTP e um código
// estável (code) que o front-end pode usar sem depender do texto da mensagem.

//esse arquivo é responsável por definir todos os erros esperados pelo lado do cliente

//apperror extende erro para que ele mantenha o mesmo comportamento e formato de error
export class AppError extends Error {
  constructor(statusCode, code, message, details) {
    //recebe um super(message) de error, como ele herda de error, passando a mensagem interna que temos aqui
    //para ele, o erro nativo vai herdar essa mensagem na hora de imprimir na tela
    super(message);
    //analizando a mensagem de erro ela tem um nome, colocando esse nome como o nome do arquivo de erro
    //fica mais fácil de apurar depois esse erro
    this.name = "AppError";
    //é feito isso com todos os campos abaixo, passa as propriedades de erro com o valor do nosso novo erro
    this.statusCode = statusCode;
    this.code = code;
    this.details = details; // opcional: lista de problemas (ex.: validação)
  }

  //criando um métod estático fica mais fácil na hora de lançar o erro porque ai no código pode chamar apenas
  //AppError.badRequest() por exemplo, se caso não for passado nenhum valor ele já vem com um default na
  //mensagem,isso em todos os métodos para os erros

  static badRequest(message = "Requisição inválida", details) {
    //porque no return tem um new apperror, porque como classe ele tem que chamar uma nova instancia
    //então o return já faz isso para não precisar fazer em cima de cada arquivo, e já coloca os dados
    //necessários direto nele
    return new AppError(400, "BAD_REQUEST", message, details);
  }
  static validation(details) {
    return new AppError(400, "VALIDATION_ERROR", "Dados inválidos", details);
  }
  static unauthorized(message = "Não autenticado") {
    return new AppError(401, "UNAUTHORIZED", message);
  }
  static forbidden(message = "Você não tem permissão para esta ação") {
    return new AppError(403, "FORBIDDEN", message);
  }
  static notFound(message = "Recurso não encontrado") {
    return new AppError(404, "NOT_FOUND", message);
  }
  static conflict(message = "Conflito com o estado atual do recurso") {
    return new AppError(409, "CONFLICT", message);
  }
}
