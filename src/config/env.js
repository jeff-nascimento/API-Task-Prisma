import { config } from "dotenv";
import { z } from "zod";

// ============================================================
// 1. CARREGAMENTO DAS VARIÁVEIS DE AMBIENTE
// ============================================================

// O dotenv é responsável por ler um arquivo .env e disponibilizar
// suas variáveis em process.env, para que o restante da aplicação
// consiga acessar essas configurações.
//
// NODE_ENV é uma variável convencionalmente utilizada para
// identificar o ambiente em que a aplicação está sendo executada.
//
// O operador ternário funciona assim:
// condição ? valor_se_verdadeiro : valor_se_falso
//
// Portanto:
// - Se process.env.NODE_ENV for "test", carrega o arquivo .env.test.
// - Caso contrário, carrega o arquivo .env.
//
// IMPORTANTE: NODE_ENV precisa estar definido antes desta chamada
// para que a seleção do arquivo de teste funcione corretamente.
// O dotenv não define NODE_ENV automaticamente como "test".
//
// quiet: true evita as mensagens informativas do dotenv no console.
// Isso não impede que outros erros da aplicação sejam exibidos.

config({
  path: process.env.NODE_ENV === "test" ? ".env.test" : ".env",
  quiet: true,
});

// ============================================================
// 2. CRIAÇÃO DE UMA REGRA REUTILIZÁVEL PARA DURAÇÕES
// ============================================================

// Criamos a constante duration para reutilizar a mesma regra de
// validação nas variáveis de expiração dos tokens.
//
// Dessa forma, não precisamos repetir a mesma expressão regular
// em cada campo que representa uma duração.
//
// z.string() exige que o valor seja uma string.
//
// .regex() exige que a string corresponda ao formato definido
// pela expressão regular.
//
// Entendendo a expressão /^\d+[smhd]$/:
//
// ^      -> indica o início do texto.
// \d     -> representa um dígito de 0 a 9.
// +      -> exige uma ou mais ocorrências do elemento anterior.
// [smhd] -> aceita exatamente um destes caracteres: s, m, h ou d.
// $      -> indica o final do texto.
//
// Na prática, são aceitos formatos como:
// "15s" -> 15 segundos.
// "15m" -> 15 minutos.
// "2h"  -> 2 horas.
// "7d"  -> 7 dias.
//
// Formatos como "15", "15min" e "abc" não são aceitos.
//
// O segundo argumento de regex() é a mensagem de erro que o Zod
// fornecerá caso o valor não corresponda ao formato esperado.
//
// ATENÇÃO: essa expressão verifica o formato, não se a duração
// é adequada para a segurança da aplicação. Por exemplo, "999999d"
// respeita o formato, mas pode ser um prazo inadequado.

const duration = z
  .string()
  .regex(/^\d+[smhd]$/, "use o formato número + s|m|h|d (ex.: 15m, 7d)");

// ============================================================
// 3. DEFINIÇÃO DO SCHEMA DE VALIDAÇÃO
// ============================================================

// envSchema descreve as regras que as variáveis de ambiente
// precisam cumprir antes de serem utilizadas pela aplicação.
//
// z.object() permite definir um schema para um objeto inteiro.
// Cada propriedade representa uma variável de ambiente e contém
// as regras específicas para validar seu valor.
//
// Posteriormente, utilizaremos esse schema para validar process.env.
//
// Lembre-se: variáveis de ambiente normalmente chegam como strings.
// O Zod permite validar esses valores e, quando necessário,
// convertê-los para os tipos que a aplicação espera.

const envSchema = z
  .object({
    // --------------------------------------------------------
    // NODE_ENV: ambiente de execução
    // --------------------------------------------------------

    // z.enum() restringe os valores aceitos às opções definidas.
    // Neste caso, só são aceitos:
    // "development", "test" ou "production".
    //
    // .default("development") define o valor padrão quando
    // NODE_ENV está ausente ou possui valor undefined.
    //
    // O padrão é aplicado ao resultado validado pelo Zod.
    // Isso não altera automaticamente process.env.NODE_ENV.

    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    // --------------------------------------------------------
    // PORT: porta em que o servidor será executado
    // --------------------------------------------------------

    // z.coerce.number() tenta converter o valor recebido para número.
    // Isso é necessário porque process.env normalmente contém strings.
    //
    // Exemplo: "3000" é convertido para o número 3000.
    //
    // .int() exige um número inteiro.
    // .positive() exige um número maior que zero.
    // .default(3000) define 3000 quando PORT está ausente ou undefined.
    //
    // A validação não verifica se a porta está disponível para uso
    // nem restringe o valor ao intervalo convencional das portas TCP.

    PORT: z.coerce.number().int().positive().default(3000),

    // --------------------------------------------------------
    // DATABASE_URL: endereço de conexão com o PostgreSQL
    // --------------------------------------------------------

    // z.string() exige que o valor seja uma string.
    //
    // .min(1, "obrigatória") exige pelo menos um caractere.
    // Se o valor for uma string vazia, essa mensagem será utilizada.
    //
    // ATENÇÃO: essa regra não confirma se a URL é válida nem se
    // consegue estabelecer uma conexão com o banco de dados.
    // Ela apenas exige uma string com pelo menos um caractere.

    DATABASE_URL: z.string().min(1, "obrigatória"),

    // --------------------------------------------------------
    // ACCESS_TOKEN_SECRET: segredo do token de acesso
    // --------------------------------------------------------

    // z.string() exige uma string.
    // .min(32) exige pelo menos 32 caracteres.
    //
    // Esse segredo é utilizado pelo código de autenticação para
    // assinar e verificar access tokens, conforme a configuração JWT.
    //
    // A quantidade mínima de caracteres não garante, sozinha,
    // que o segredo seja forte. Utilize um valor longo, aleatório
    // e mantenha-o fora do GitHub.

    ACCESS_TOKEN_SECRET: z.string().min(32, "use pelo menos 32 caracteres"),

    // --------------------------------------------------------
    // REFRESH_TOKEN_SECRET: segredo do token de renovação
    // --------------------------------------------------------

    // Segue a mesma regra de validação do segredo anterior:
    // deve ser uma string com pelo menos 32 caracteres.
    //
    // Esse segredo será utilizado pelo código responsável por
    // assinar e verificar refresh tokens.
    //
    // Mais adiante, a regra refine() garante que este segredo
    // seja diferente do segredo utilizado no access token.

    REFRESH_TOKEN_SECRET: z.string().min(32, "use pelo menos 32 caracteres"),

    // --------------------------------------------------------
    // ACCESS_TOKEN_EXPIRES_IN: validade do token de acesso
    // --------------------------------------------------------

    // Reutilizamos o schema duration definido anteriormente.
    //
    // Isso evita repetir a expressão regular e mantém o mesmo
    // formato de duração em todas as variáveis correspondentes.
    //
    // .default("15m") define 15 minutos como valor padrão.
    //
    // O código que gera o token precisa utilizar essa configuração
    // para que a expiração seja efetivamente aplicada.

    ACCESS_TOKEN_EXPIRES_IN: duration.default("15m"),

    // --------------------------------------------------------
    // REFRESH_TOKEN_EXPIRES_IN: validade do refresh token
    // --------------------------------------------------------

    // Utiliza a mesma regra duration.
    //
    // .default("7d") define sete dias como valor padrão.
    //
    // A validade real dependerá de como o código de autenticação
    // interpreta essa configuração e gera o refresh token.

    REFRESH_TOKEN_EXPIRES_IN: duration.default("7d"),

    // --------------------------------------------------------
    // FRONTEND_URL: origem ou origens do frontend
    // --------------------------------------------------------

    // z.string() exige uma string.
    //
    // .default() define a origem local utilizada no desenvolvimento
    // quando FRONTEND_URL está ausente ou undefined.
    //
    // Posteriormente, o valor poderá ser dividido em um array
    // para permitir várias origens na configuração do CORS.
    //
    // ATENÇÃO: este schema não verifica se o texto é uma URL válida.
    // Em produção, configure a origem real do frontend.

    FRONTEND_URL: z.string().default("http://localhost:5173"),

    // --------------------------------------------------------
    // BCRYPT_ROUNDS: fator de custo do bcrypt
    // --------------------------------------------------------

    // Esta variável configura o custo computacional utilizado
    // pelo bcrypt ao gerar hashes de senhas.
    //
    // Ela não representa o salt em si. O bcrypt utiliza um salt
    // durante o processo de hashing; esta variável controla o custo.
    //
    // z.coerce.number() tenta converter o valor para número.
    // .int() exige um número inteiro.
    // .min(4) impede valores inferiores a 4.
    // .max(15) impede valores superiores a 15.
    // .default(12) define 12 como valor padrão.
    //
    // Um custo maior exige mais processamento para gerar e verificar
    // hashes. A escolha deve considerar segurança e desempenho.

    BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),

    // --------------------------------------------------------
    // RATE LIMITING: limites de requisições
    // --------------------------------------------------------

    // Os quatro campos abaixo utilizam a mesma lógica de validação:
    //
    // z.coerce.number() -> tenta converter o valor para número.
    // .int()            -> exige um número inteiro.
    // .positive()       -> exige um número maior que zero.
    // .default()        -> define um valor padrão.
    //
    // Os valores representam quantas requisições cada limitador
    // poderá permitir dentro da janela de tempo configurada.
    //
    // IMPORTANTE: estes campos não configuram o rate limiting
    // sozinhos. O middleware deverá consumir esses valores e definir
    // a janela de tempo correspondente.

    // Limite geral de requisições por cliente.
    RATE_LIMIT_GLOBAL_MAX: z.coerce.number().int().positive().default(300),

    // Limite de tentativas na rota de login.
    RATE_LIMIT_LOGIN_MAX: z.coerce.number().int().positive().default(10),

    // Limite de tentativas na rota de cadastro.
    RATE_LIMIT_REGISTER_MAX: z.coerce.number().int().positive().default(10),

    // Limite de requisições na rota de renovação de tokens.
    RATE_LIMIT_REFRESH_MAX: z.coerce.number().int().positive().default(60),
  })

  // ----------------------------------------------------------
  // 4. REGRA PERSONALIZADA ENTRE OS SEGREDOS JWT
  // ----------------------------------------------------------

  // .refine() permite adicionar uma regra personalizada ao schema.
  //
  // O parâmetro e representa o objeto que está sendo validado.
  // Poderia ter outro nome, como env.
  //
  // A função retorna true quando os dois segredos são diferentes
  // e false quando são iguais.
  //
  // Se retornar false, o Zod considera a validação inválida e
  // utiliza a mensagem definida abaixo.
  //
  // message define a mensagem de erro.
  // path indica a qual campo o erro será associado.
  //
  // Neste caso, o erro será associado a REFRESH_TOKEN_SECRET.
  //
  // Essa regra garante que os valores sejam diferentes, mas não
  // garante que sejam aleatórios ou suficientemente fortes.

  .refine((e) => e.ACCESS_TOKEN_SECRET !== e.REFRESH_TOKEN_SECRET, {
    message: "ACCESS_TOKEN_SECRET e REFRESH_TOKEN_SECRET devem ser DIFERENTES",
    path: ["REFRESH_TOKEN_SECRET"],
  });

// ============================================================
// 5. VALIDAÇÃO DAS VARIÁVEIS DE AMBIENTE
// ============================================================

// Até aqui, apenas descrevemos as regras.
// Agora, safeParse() executa a validação dos valores de process.env.
//
// safeParse() retorna um objeto com a propriedade success:
// - true: a validação foi bem-sucedida.
// - false: foram encontrados erros de validação.
//
// Quando a validação é bem-sucedida, os valores ficam disponíveis
// em parsed.data. Eles já passaram pelas regras e transformações
// definidas no schema, incluindo coerções e valores padrão.
//
// Quando falha, os detalhes dos erros ficam em parsed.error.
//
// Diferentemente de parse(), safeParse() permite verificar o
// resultado sem lançar diretamente uma exceção de validação.

const parsed = envSchema.safeParse(process.env);

// ============================================================
// 6. TRATAMENTO DOS ERROS DE VALIDAÇÃO
// ============================================================

// O operador ! significa negação.
//
// Portanto, este if será executado quando parsed.success for false,
// ou seja, quando pelo menos uma regra de validação falhar.

if (!parsed.success) {
  // Exibe um título para facilitar a identificação do problema
  // no console ou nos logs de inicialização.

  console.error("Variáveis de ambiente inválidas:");

  // parsed.error.issues contém a lista dos problemas encontrados.
  //
  // O for...of percorre essa lista, colocando cada problema
  // individualmente na variável issue.

  for (const issue of parsed.error.issues) {
    // issue.path identifica o caminho do campo que falhou.
    // issue.message contém a explicação do erro.
    //
    // .join(".") transforma o caminho em uma string separada por pontos.
    // Isso também funciona com campos aninhados em objetos.
    //
    // A template string, delimitada por crases, permite inserir
    // valores usando ${...}.

    console.error(` - ${issue.path.join(".")}: ${issue.message}`);
  }

  // process.exit(1) encerra o processo do Node.js indicando falha.
  //
  // Por convenção, o código 0 indica término bem-sucedido e um
  // código diferente de zero indica falha.
  //
  // Encerramos a aplicação porque ela não deve iniciar com
  // configurações obrigatórias inválidas.
  //
  // Isso é conhecido como fail fast: identificar o problema
  // durante a inicialização, antes de atender às requisições.

  process.exit(1);
}

// ============================================================
// 7. EXPORTAÇÃO DO OBJETO DE CONFIGURAÇÃO
// ============================================================

// A partir daqui, a validação foi bem-sucedida.
//
// export permite que outros arquivos importem env e utilizem
// as configurações validadas, em vez de acessar process.env
// diretamente em cada parte da aplicação.
//
// O operador spread (...parsed.data) copia as propriedades
// enumeráveis de parsed.data para um novo objeto.
//
// Isso preserva os valores validados, as conversões de tipos
// e os valores padrão definidos anteriormente.
//
// ATENÇÃO: spread faz uma cópia superficial, não uma cópia profunda.
// Além disso, const impede a reatribuição da variável env, mas
// não torna automaticamente todas as suas propriedades imutáveis.

export const env = {
  ...parsed.data,

  // ----------------------------------------------------------
  // 8. TRANSFORMAÇÃO DE FRONTEND_URL EM FRONTEND_ORIGINS
  // ----------------------------------------------------------

  // FRONTEND_URL pode conter uma única origem ou várias origens
  // separadas por vírgulas.
  //
  // Exemplo de configuração:
  // FRONTEND_URL=http://localhost:5173,https://app.exemplo.com
  //
  // .split(",") divide a string em um array sempre que encontra
  // uma vírgula.

  FRONTEND_ORIGINS: parsed.data.FRONTEND_URL.split(",")

    // .map() percorre cada item do array e devolve um novo array
    // com os valores transformados.
    //
    // A variável o representa cada origem individualmente.
    // .trim() remove espaços em branco no início e no final.
    //
    // Isso evita que espaços após as vírgulas sejam mantidos
    // nos valores utilizados pela aplicação.

    .map((o) => o.trim())

    // .filter(Boolean) remove os valores falsy do array.
    //
    // Neste caso, o objetivo principal é remover strings vazias,
    // que poderiam surgir com configurações como:
    // "http://localhost:5173,,https://app.exemplo.com,"
    //
    // IMPORTANTE: isso não verifica se as origens são URLs válidas.
    // A validação de URLs, se necessária, deve ser feita separadamente.

    .filter(Boolean),

  // ----------------------------------------------------------
  // 9. INDICADORES DO AMBIENTE DE EXECUÇÃO
  // ----------------------------------------------------------

  // Estas propriedades facilitam a identificação do ambiente
  // em outros arquivos da aplicação.
  //
  // Se NODE_ENV for "production", isProduction será true.
  // Se NODE_ENV for "test", isTest será true.
  //
  // Nos demais casos, a respectiva propriedade será false.
  //
  // São apenas indicadores booleanos: eles não iniciam testes,
  // ativam produção ou alteram o comportamento automaticamente.
  // Os outros módulos precisam consultar essas propriedades
  // quando precisarem tomar decisões com base no ambiente.

  isProduction: parsed.data.NODE_ENV === "production",
  isTest: parsed.data.NODE_ENV === "test",
};
