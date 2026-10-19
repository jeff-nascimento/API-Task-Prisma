//essas importação tras dois métodos do crypto
//createHash: é responsável por criar um objeto capaz de calcular um hash
//timingSafeEqual: Um Buffer é um bloco de dados na memória. A função serve para comparar dois desses blocos de
//forma ultra-segura, impedindo que hackers descubram informações confidenciais (como tokens de acesso ou
//assinaturas digitais) cronometrando o tempo que o servidor leva para processá-los.

//colocar algo como node: isso é para especificar que esse método é direto do node, não de uma biblhoteca de
//fora

import { createHash, timingSafeEqual } from "node:crypto";

//esse arquivo é responsável por duas coisas
//Gerar o hash de um Refresh Token, para que você possa armazenar uma representação dele no PostgreSQL sem
//guardar o token original.
//Comparar valores de forma mais segura, evitando que o tempo de comparação revele em qual posição dois valores
//começam a ser diferentes.

// SHA-256 em hexadecimal (64 caracteres). Usado para guardar o refresh token
// no banco sem guardar o token em si. Diferente do bcrypt, é rápido e sempre
// dá o mesmo resultado para a mesma entrada; adequado porque o refresh token
// é uma string longa e aleatória (não é uma senha curta que alguém "adivinha").

//o que essa expressão faz?
//recebe o texto que vai ser o hash
//usa createHash() do crypto que vai criar um hash, sha256 é o tipo do hash que vai ser criado
//.update fornece os dados que serão processados pelo algoritmo, ou seja, createhash vai usar sha256 e update
//vai dar o dado que vai ser criado o hash, o text do parametro
//digest() finaliza o cálculo e deveolve o resultado, hex é o formato que esse dado vai ser disponibilizado
//então será no formato hexadecimal
export const sha256 = (text) => createHash("sha256").update(text).digest("hex");

// Comparação em tempo constante: não "vaza" por quanto tempo demorou
// onde as duas strings começam a diferir.

//antes de entender essa função deve enteder os seguintes conceitos
//Um Buffer é uma estrutura utilizada pelo Node.js para trabalhar com sequências de bytes.
//essa função vai comparar os valores dos dois buffers, então por isso ela recebe a e b
//bufA recebe Buffer.from(a) o que isso faz? ele transforma o primeiro valor em um buffer, ou seja, numa
//sequencia de bytes
//o bufB faz a mesma coisa que o a porém com os valores de B
//Porque o método timingSafeEqual() exige que os buffers tenham o mesmo tamanho. Se os tamanhos forem
//diferentes, ele lança um erro
//depois disso ele também deve verificar o timeSafeEqual com os dois buffers, mas o que isso faz?
//como o código vai fazer a leitura da esquerda para a direita imagine que tenha assim:
//no primeiro conjunto de byte ele nega no primeiro e mostra o erro com 1 milissegundo
//depois ele chega no penúltimo byte e mostra o erro com 4 milissegundos
//o hacker tem um programa muito sensível a isso e pode pensar "se demorou mais tempo então as os bytes o
//o primeiro já está correto" como o timingSafeEqual esse tempo vai ser sempre o mesmo, não deixando que
//o erro seja mostrado primeiro que o outro, evitando esse ataque na aplicação
export function safeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}
