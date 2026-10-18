import { z } from "zod";

//esse arquivo define as regras para os dados enviados pelo usuário no login e no register

// Normaliza (trim + minúsculas) ANTES de validar o formato do e-mail.
//email reutilizável para os próximos passos

//definição da forma que o email deve ser:
//string() deve ser em forma de string
//trim() tira os espaços para não ocorrer erro na validação
//toLowerCase() mesmo princípio de trim, deixa tudo minúsculo
//max(255) máximo de 255 caracteres no email
//pipe() ele vai pegar tudo que ocorre na esquerda dele e adicionar a validação da direita, ou seja
//ele vai pegar toda a validação e adicionar ela a validação nativa que o zod já faz com email
//z.email() verifica se está no formato de email aceito, algo como usuario@email.com
const email = z.string().trim().toLowerCase().max(255).pipe(z.email());

// bcrypt só considera os primeiros 72 BYTES da senha; por isso limitamos.

//definição de como password deve ser
//string() deve ser em forma de string
//min(8, A senha...) deve ser no mínimo de 8 caracteres, caso não for manda a mensagem de erro ao lado
//refine() cria uma regra personalizada do zod, ou seja, essa regra não está presente na validação normal do zod
//destrinchando essa função:

//(v) => Buffer.byteLength(v, "utf8") <= 72,
//v é o valor que vai ser avaliado, nesse caso a senha
//Buffer é uma API nativa do node usada para trabalhar com dados binários
//byteLenght é o tamnho em bites, ele recebe dois argumentos: a string que vai ser avaliada, nesse caso o hash
//de senha, o segundo argumento é o formato de texto, usado o formato utf8, <= 72 diz que a quantidade de
//bytes deve ser menor que 72
//porque verificar em bytes já que verifica caracteres, por exemplo, caracteres simples como a ocupam um byte
//em UTF-8. Já muitos caracteres acentuados e emojis ocupam mais de um byte.
//Assim, duas senhas com a mesma quantidade de caracteres podem ter quantidades diferentes de bytes

//regex vai ser o regex criado para a atapa, o primeiro vai ser para verificar se a senha tem pelo menos uma
//letra, pode ser maiúscula ou minúscula

//segundo regex verifica se a senha tem pelo menos um número de 0 a 9
const password = z
  .string()
  .min(8, "A senha deve ter pelo menos 8 caracteres")
  .refine(
    (v) => Buffer.byteLength(v, "utf8") <= 72,
    "A senha deve ter no máximo 72 bytes",
  )
  .regex(/[A-Za-z]/, "A senha deve ter pelo menos uma letra")
  .regex(/\d/, "A senha deve ter pelo menos um número");

//register vai reutilizar email e senha, vai validar em código apenas o name
//name deve ser em string, sem espaços, com no mínimo 2 caracteres e no máximo 100, email e password mantém
//a mesma configuração usada nos modelos
export const registerBody = z.object({
  name: z
    .string()
    .trim()
    .min(2, "O nome deve ter pelo menos 2 caracteres")
    .max(100),
  email,
  password,
});

// No login NÃO aplicamos as regras de força da senha: só exigimos que exista.
//O login reutiliza o schema de e-mail, mas não reutiliza o schema de força da senha.
// Por que essa diferença existe?
// No cadastro, o sistema está criando uma credencial nova. Portanto, é o momento de exigir que a senha cumpra
// as regras mínimas escolhidas pela aplicação.
// No login, a senha já deveria existir no sistema. O objetivo é verificar se a senha informada corresponde à
// credencial cadastrada.
// Imagine que uma conta antiga tenha uma senha que não cumpra uma nova regra de cadastro. Se você aplicasse
// todas as regras atuais de força da senha no login, poderia impedir que o usuário entrasse na própria conta,
// mesmo informando a senha correta.
// Por isso, no login, o schema exige apenas uma senha não vazia:
export const loginBody = z.object({
  email,
  password: z.string().min(1, "Informe a senha"),
});
