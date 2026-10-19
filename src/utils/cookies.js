import { env } from "../config/env.js";
//como cookie funciona com milissegundos deve importar a função que faz isso em duration
import { toMilliseconds } from "./duration.js";

//esse arquivo é responsável por: configurar o cookie que transporta o Refresh Token entre o navegador e a API.
//na função issueRefreshToken criavamos o token e retornava-mos ele aqui, esse arquivo é responsável por
//controlar como ele vai pro navegador e retirá-lo no logout

export const REFRESH_COOKIE = "refreshToken";

// Atributos do cookie do refresh token:
//  httpOnly -> JavaScript do navegador NÃO consegue ler (protege contra XSS)
//  secure   -> só trafega por HTTPS (ligado em produção; em dev usamos http)
//  sameSite -> "strict": o navegador só envia o cookie em requisições originadas
//              do próprio site (mitiga CSRF)
//  path     -> o navegador só envia o cookie para URLs que começam com /auth

//baseOptions define a regra do cookie
const baseOptions = {
  //Essa opção instrui o navegador a impedir que o JavaScript executado na página leia o valor do cookie por
  //meio de APIs como document.cookie.
  httpOnly: true,
  //secure verifica se está em produção, como padrão pelo env está
  secure: env.isProduction,
  //essa informação determina em qual contexto o site pode enviar o cookie, o valor strict é restritivo no
  //geral, ele não vai enviar o cookie em requisições iniciadas em outros sites, por exemplo
  //quando um usuário está logado um site malicioso tenta forçar uma requisição como os cookies são enviados
  //automaticamente quando todas as requisições estão corretas ele poderia ver o cookie, por isso stric reduz
  //o envio de cookies no contexto entre sites
  sameSite: "strict",
  //o navegador poderá enviar os cookies para os sites que tenham esse prefixo no path
  path: "/auth",
};

//cria o cookie na requisição http
//vai receber o res do padrão req, res, e o token de acesso
export function setRefreshCookie(res, token) {
  //res.cookie é um método disponibilizado pelo express para configurar um cookie na resposta http
  //ele recebe 3 argumentos, o nome do cookie, que nesse caso é refreshToken, o token propriamente dito e
  //options, esse objeto vai carregar as seguintes definições, uma cópia de baseoptions, então ele vai receber
  //todos os dados dela, além deles ele vai receber a idade máxima desse refreshToken, que vai ser em
  //milissegundos, pegando do env o tempo do refreshtoken expirar
  res.cookie(REFRESH_COOKIE, token, {
    ...baseOptions,
    maxAge: toMilliseconds(env.REFRESH_TOKEN_EXPIRES_IN), // duração em ms
  });
}

// Para apagar, os atributos (path, etc.) precisam ser os mesmos da criação.
//solicita a remoção do cookie com clearCookie (limpa cookie)
export function clearRefreshCookie(res) {
  //para apagar deve apssar os mesmos dados para criar como dito acima, então deve passar o nome dele e suas
  //opções, não precisa passar o cookie novamente
  res.clearCookie(REFRESH_COOKIE, baseOptions);
}
