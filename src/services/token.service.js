import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
//toseconds converte todos a duração de tempo em segundos, ou seja, 1m (60s) etc
import { toSeconds } from "../utils/duration.js";

//arquivo responsável por criar e verificar o access token

// Algoritmo da assinatura: HS256 (HMAC + SHA-256, uma chave secreta só).
// Sempre informamos o algoritmo ao verificar, para o servidor nunca aceitar
// um token que "escolheu" outro algoritmo no próprio header.

//esse algoritmo hs256 é a junção de duas coisas
//HMAC: um mecanismo que utiliza uma chave secreta para produzir e verificar uma assinatura.
//SHA-256: uma função criptográfica de hash utilizada nesse mecanismo.
//nesse esquema a chave é usada tanto para assinar quanto para verificar a assinatura
const ALGORITHM = "HS256";

// ---------------------------------------------------------------------------
// ACCESS TOKEN (curta duração, enviado no header Authorization)
// ---------------------------------------------------------------------------
// O payload fica VAZIO de propósito: só vão as claims padrão
//   sub (subject = id do usuário), iat (emitido em) e exp (expira em).
// Nada de e-mail, roles ou permissions: o payload é legível por qualquer um.

//primeiro, o que é payload: Payload: contém as informações, chamadas claims, associadas ao token.
//O payload é codificado em Base64URL, não criptografado. Portanto, alguém que obtenha o token pode normalmente
//decodificar e ler seu conteúdo.

//essa função vai ser reponsável por cadastrar o acess token, como ela faz isso? com sign, sign aceita
//3 coisas, payload, access token e options

//como dito acima, o primeiro objeto é vazio, porque é o paylaod, porém ele não ficará necessariamente sem
//informações, ele vai receber as informações de options, como: sub	Identificador do usuário vindo da opção
//subject, iat	Instante em que o token foi emitido, adicionado automaticamente pela biblioteca, exp instante
//em que o token expira	Calculado a partir de expiresIn

//segundo argumento é a chave de acesso, nosso access token que está no nosso env, que inclusive foi verificado

//como dito, o terceiro argumento vem as opções, que são elas
//algorithm: tipo de algoritmo usado para assinar o token, como foi criado uma variável para reutilizar
//qual o algoritmo passa apenas o ALGOTITHM passado acima
//subject: subject é para identificar o usuário desse token, como foi dito assima, ele é o sub, por isso recebe
//userId
//expiresIn: primeiro passa pela função de transformar em segundos que foi importada lá em cima, depois passa
//o tempo para expirar que também é tirado do env

export function signAccessToken(userId) {
  return jwt.sign({}, env.ACCESS_TOKEN_SECRET, {
    //algorithm aqui recebe o algoritmo comum sem chaves porque ele espera receber uma string
    algorithm: ALGORITHM,
    subject: userId,
    expiresIn: toSeconds(env.ACCESS_TOKEN_EXPIRES_IN),
  });
}

// Lança erro se a assinatura for inválida, o token estiver malformado ou expirado.

//essa parte faz a verificação se o token estiver certo, ele usa o verify que verifica dois tokens, o primeiro
//é o informado pelo cliente, o segundo é o token do env

//Se a assinatura for válida e as verificações aplicáveis forem aprovadas, a função devolve o payload
//decodificado, incluindo as claims registradas no token.
//Se alguma verificação falhar, a biblioteca lança um erro.

//algorithms: [ALGORITHM],
//O valor está entre colchetes porque a opção algorithms recebe uma lista de algoritmos permitidos.
//Mesmo que a lista contenha apenas um elemento, o formato continua sendo um array.

export function verifyAccessToken(token) {
  return jwt.verify(token, env.ACCESS_TOKEN_SECRET, {
    //essa opção espera uma lista de algoritmos permitidos, diferente de sign, lá espera apenas um para assinar
    //se tivesse no algorithm hs256 e hs384 daria certo nesse, porque é uma lista
    algorithms: [ALGORITHM],
  });
}
