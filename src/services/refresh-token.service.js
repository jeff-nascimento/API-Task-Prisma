//cria o jwt
import jwt from "jsonwebtoken";
//coloca um identificador único para o refresh token
import { randomUUID } from "node:crypto";
//chamas as informações necessárias de env
import { env } from "../config/env.js";
//conexão com o banco de dados
import { prisma } from "../lib/prisma.js";
//hash do token para não guardar ele diretamente
import { sha256 } from "../utils/hash.js";
//transforma unidade de tempo em segundos
import { toSeconds } from "../utils/duration.js";

// Mesmo algoritmo do access token (veja token.service.js).
const ALGORITHM = "HS256";

// ---------------------------------------------------------------------------
// REFRESH TOKEN (longa duração, cookie HTTPOnly, guardado no banco como HASH)
// ---------------------------------------------------------------------------
// `db` pode ser o prisma normal OU o `tx` de uma transação (veja auth.service.js).
//o que essa função recebe, o usuário dono do refresh token, a familia desse token e o banco, se não for
//informado como padrão será o prisma
export async function issueRefreshToken({ userId, familyId, db = prisma }) {
  const id = randomUUID(); // vira o "jti" (id único do token) e a PK da linha no banco

  //converte a duração padrão do token estipulada no env para segundos
  const ttlSeconds = toSeconds(env.REFRESH_TOKEN_EXPIRES_IN);

  //relembrando, sign pode receber 3 argumentos, o payload que nesse caso será passado com os dados vazios mas
  //que vai receber os dados de config
  //o access token, nesse caso o refresh
  //por último vai receber as opções que são elas
  //algorithm: o tipo de algorítmo usado para salvar o hash do token no banco
  //subject: dono daquele refresh token
  //jwtid: id único do token
  //expiresIn: quando esse token vai expirar, definido no env e transformado em segundos pelo toSecond()

  //no payload quais dados vão ser passados?
  //sub -> com os dados do userId
  //jwti -> com os dados do id criados para o jwt
  //exp -> com o tempo que ele vai expirar
  //iat -> data e hora de quando o token foi criado
  const token = jwt.sign({}, env.REFRESH_TOKEN_SECRET, {
    algorithm: ALGORITHM,
    subject: userId,
    jwtid: id,
    expiresIn: ttlSeconds,
  });

  //agora salvando o refresh token no banco, vai criar na tabela refreshToken um registro contendo os dados
  //porque db? porque foi colocado se não for passado nada começa como prisma, refreshToken é o nome da tabela
  //que vai pegar e create é para criar um registro
  await db.refreshToken.create({
    data: {
      //id vai receber o id criado acima const id = randomUUID();
      id,
      //tokenHash cria o hash do token com o sha256 (função criada em utils que vai criar o hash)
      tokenHash: sha256(token), // guardamos o hash, nunca o token
      //familyid vai receber o valor do parâmetro
      familyId,
      //userid também o valor do parâmetro
      userId,
      //expirtesAt vai pegar a data atual somando com o valor de expirar em segundos vezes mil
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
    },
  });

  //retorna o token depois de criar ele
  return token;
}

//essa função vai verificar um token existente, recebe o token para verificar e ignoreExpiration, o que é isso
//vamos supor que o token tenha duração de 15m, se ignoreExpiration for true ele vai respeitar o tempo, caso
//não for ele não respeita esse tempo e não expira, agora sobre a desestruturação
//ignoreExpiration recebe falso como padrão, porém o objeto dela recebe um objeto vazio, o que isso quer dizer
//se não tiver um valor para ela ele assume como vazio, ocasionando em false
export function verifyRefreshToken(token, { ignoreExpiration = false } = {}) {
  //verify verifica dois tokens porém como ela aceita opções vamos passar o algoritmo aceito e se ela vai
  //ignorar expiração, mas por que ignorar a expiração?
  //A opção permite que um chamador específico ignore a expiração ao verificar a assinatura e decodificar um
  //token. Isso pode ser útil em fluxos muito específicos, como investigar a reutilização de um token expirado,
  //mas não deve ser interpretado como autorização para renovar uma sessão expirada.

  //apenas para curiosidade, essas são todas as opções que verify pode receber
  //1. Validações de Reclamações (Claims)
  // Essas opções servem para forçar a verificação de dados específicos que devem estar presentes dentro do
  // payload do token:

  // algorithms (Array de Strings):
  // NPM

  // O que faz: Lista com os algoritmos permitidos para a assinatura (ex: ['HS256', 'RS256']).

  // Por que importa: É altamente recomendável usar para evitar vulnerabilidades em que um invasor tenta
  // enganar o servidor mudando o algoritmo do cabeçalho do token.

  // audience (String, RegExp ou Array):
  // NPM

  // O que faz: Verifica se a propriedade aud (público-alvo) dentro do token corresponde ao valor que você
  // definiu aqui. Se não bater, rejeita o token.
  // Cryptr

  // issuer (String ou Array):
  // NPM

  // O que faz: Verifica se a propriedade iss (quem emitiu o token, ex: "meu-servidor.com") confere com o
  // esperado.

  // subject (String):
  // NPM

  // O que faz: Verifica se a propriedade sub (o assunto/usuário dono do token) confere com o valor esperado.

  // jwtid (String):
  // NPM

  // O que faz: Verifica se a propriedade jti (o ID único do token) confere com o esperado.

  // 2. Controle de Tempo e Tolerância
  // ignoreExpiration (Booleano - padrão: false):

  // O que faz: Se configurado como true, a função ignora a data de expiração (exp) do token, aceitando-o mesmo
  // se já tiver vencido.

  // ignoreNotBefore (Booleano - padrão: false):

  // O que faz: Se true, ignora a validação da propriedade nbf (not before), que define um horário a partir do
  // qual o token passa a ser válido.

  // clockTolerance (Número em segundos):
  // NPM

  // O que faz: Adiciona uma margem de tolerância para diferenças de relógio (clock drift) entre o servidor que
  // gerou o token e o servidor que o verificou (útil para exp e nbf). Exemplo: clockTolerance: 10 aceita
  // tokens que expiraram há até 10 segundos atrás devido a atrasos de sincronização.

  // 3. Outras Opções de Comportamento
  // complete (Booleano - padrão: false):
  // Cryptr

  // O que faz: Se configurado como true, a função não retorna apenas o payload decodificado. Ela retorna um
  // objeto completo contendo o payload, o header (cabeçalho) e a signature (assinatura).
  // NPM

  // maxAge (String ou Número):
  // Soham Kamani

  // O que faz: Define o tempo máximo permitido desde que o token foi emitido (com base na claim iat - issued
  // at). Se o token for mais velho que o maxAge permitido (mesmo que sua expiração original seja longa), ele é
  // rejeitado. Aceita formatos de string do pacote ms (ex: '2days', '10h') ou segundos em números.
  // NPM

  // allowInvalidAsymmetricKeyTypes (Booleano - padrão: false):
  // NPM

  // O que faz: Permite o uso de chaves assimétricas que não correspondam exatamente ao algoritmo especificado (geralmente mantido apenas para compatibilidade retroativa com códigos antigos).
  // NPM
  return jwt.verify(token, env.REFRESH_TOKEN_SECRET, {
    algorithms: [ALGORITHM],
    ignoreExpiration,
  });
}

// Revoga TODOS os tokens ainda ativos de uma "família" (uma sessão de login).
//recebe a familia e a conexão com o banco
export function revokeFamily(familyId, db = prisma) {
  //método updateMany é para atualizar mais de um registro, ou seja, ele vai atualizar todos os registros
  //que tiverem essas expecificações dentro da tabela de refreshToken
  return db.refreshToken.updateMany({
    //aqui vai procurar onde a familyId seja igual a do parâmetro e a coluna revokedAt seja null
    where: { familyId, revokedAt: null },
    //dados serão os dados que serão atualizados, atualiza a coluna revokedAt para a data atual, quando
    //ela for revogada
    data: { revokedAt: new Date() },
  });
}
