// Converte textos como "15m" ou "7d" em segundos/milissegundos.
// Precisamos disso porque o mesmo valor (ex.: REFRESH_TOKEN_EXPIRES_IN) é usado
// no JWT (segundos), no cookie (milissegundos) e no banco (data de expiração).

//qual a motivação desse arquivo, os dados recebem diferentes tipos de dados para tempo, por exemplo
//para o jwt os 7d do refresh token são 604800, porém para o cookie ele é em milissegundos então seria 604800000
//já para o banco são datas, esse arquivo não configura sozinho para os dados acima, mas os converte e quando
//for chamado no arquivo ele troca

//aqui uma const para trocar a unidade de tempo em segundos, s: 1 (porque é em segundos mesmo) m: 60 (1 minuto
// === 60 segundos) assim por diante

const UNIT_IN_SECONDS = { s: 1, m: 60, h: 3600, d: 86400 };

//essa função vai receber o texto que vai ser convertido
export function toSeconds(text) {
  //match verifica se o texto bate com o exigido
  //^ deve começar com
  //() separa em um grupoe
  //\d deve ter um número de 0 a 9
  //+ pode ter 1 ou mais número
  //() próximo grupo
  //[smhd] devem conter um desses argumentos
  //$ final da expressão
  //.exec() tenta encontrar uma correspondência entre o que foi passado dentro dele e a expressão regular ao
  //lado, se encontrar manda o resultado que foi encontrado, caso não encontrar retorna null
  const match = /^(\d+)([smhd])$/.exec(text);
  //se o resultado de match for null lança um novo erro
  if (!match) throw new Error(`Duração inválida: "${text}" (use ex.: 15m, 7d)`);
  //se caso tiver uma correspondência ele vai fazer o seguinte
  ///transforma o primeiro em número pois vai receber a string que vão os números para fazer a conta
  //como o regex foi dividido em grupo mesmo que a string fosse '15' ele iria pegar o 15 e não só o 1 quando
  //fosse pegar o 1 (lembrando que no regex o [0] é o ^ então por isso deve ser pego o [1])

  //já o segundo argumento vai ser a unidade de tempo do regex que vai ser smhd, só que ele vai pegar o valor
  //do const unit_in_seconds que foi criado lá em cima, que vai converter cada unidade em sua equivalente em s

  //terminando a expressão ele vai pegar o número do tempo ex: 15 e a unidade de medida ex: m (que equivale a
  // 60) e multiplicar ficando 15 * 60 que resulta em 900 segundos
  return Number(match[1]) * UNIT_IN_SECONDS[match[2]];
}

//para milissegundos ele que vai ser necessário para o cookie ele vai pegar o texto enviado, transformar em
//segundos usando a função acima que converte em segundos * 1000 porque um segundo equivale a 1000 milissegundos
export const toMilliseconds = (text) => toSeconds(text) * 1000;
