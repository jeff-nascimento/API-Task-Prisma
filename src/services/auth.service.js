import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";
import { ROLES } from "../config/rbac.js";

//aqui é aquela verificação de antes, para ver se o erro pertence a um erro conhecido do prisma, isprismaerror
//pega err e code, erro é o erro que aconteceu e code é o código do erro no prisma, como o p2002, etc
//a função foi escrita com arrow function porque não precisa colocar retorno, toda a expressão já é o retorno
const isPrismaError = (err, code) =>
  //verifica se o erro é uma instancia do erro do prisma, ou seja, se tem um erro do prisma que é desse tipo
  //e se o código do erro do prisma é igual ao código do parametro
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === code;

// ---------------------------------------------------------------------------
// CADASTRO
// ---------------------------------------------------------------------------

//função responsável por registrar um usuário
export async function register({ name, email, password }) {
  // bcrypt.hash gera um salt aleatório e embute salt + custo dentro do hash.
  //chama o bcrypt.hash colocando a senha e o salt que vai ser usado que está lá em env
  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

  try {
    // "Nested write": cria o usuário E a ligação em users_roles na mesma
    // operação (o Prisma executa tudo dentro de uma transação).

    //chama o user do prisma e usa a função create do prisma, na propriedade data são os dados que vão ser
    //criados com o create, como name, email, passwordHash(nunca a senha que vem de req) e o papel desse usuário
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        /**
         * essa parte será muito confusa para quem veio do sequelize, então vou explicar direito
         *
         * o prisma faz a relação implícita para "facilitar" sua vida, a relação que a gente definiu no banco
         * de dados é explícita, criamos a tabela usersRoles para a relação dos dois, porém se não quisesse
         * criar essa tabela o prisma teria criado ela debaixo dos panos porque ele entende que estamos fazendo
         * a interação das duas, mas por mais que fizemos a interação manual, na hora de aplicar o código o
         * prisma continua com a facilidade da interação, essa parte de roles vai ser responsável por criar um
         * registro em usersroles, porém é passado roles em vez da tabela intermediária, então agora que foi
         * entendido vem a parte do código
         *
         * na tabela roles (usersRoles) ele utiliza create para criar um registro na tabela de relação dos dois
         * role é o que vai pegar da tabela de relação UsersRoles, connect é para dizer que não quer que cria
         * uma nova role, que é para pegar a role já existente, porém que role é essa? a role com name:
         * ROLES.USER, lembra que em rbac foi criado um objeto que contém as roles, uma chave com admin e outra
         * com user, então, vai colocar o papel de user para esse usuário
         */
        roles: { create: { role: { connect: { name: ROLES.USER } } } },
      },
      /**
       * agora sobre o select, para que ele serve? é nele que definimos o que pode ser visto fora do banco
       * ou seja, se dermos um log em user só poderiámos ver as informações que estão no select, repare
       * que passwordhash não entrou no select, porque? porque queremos que fique salvo no banco mas que
       * não tenha acesso fora dele, não é que não existe no banco porque não foi passado no select, mas vai
       * ficar apenas salvo nele, sem conseguir ver de fora
       *
       * porque o select de roles é diferente, lembra que para criar na tabela de relação tem que passar
       * o caminho até chegar nessa tabela? passa pela tabela de relações, criou um registro nela, seleciona
       * o que vai buscar (role) connecta para pegar a role com nome user, então para pegar o valor no select
       * tem que passar por um caminho parecido, porém agora sem criar o dado, precisa seleciona-lo, em roles
       * (tabela intermediária) seleciona role que é o dado que precisa, seleciona o dado do user
       */
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        roles: { select: { role: { select: { name: true } } } },
      },
    });

    /**
     * o que esse return faz, cria uma cópia de user, porém é passado roles novamente, por que? para que
     * isso simplifique para o controller, ele vai receber um objeto mais símples de trabalhar sem precisar
     * conhecer toda a estrutura interna do prisma
     *
     * mas o que esse roles faz, ele cria uma chave que contém um map feito nas roles desse usuário, esse
     * usuário tem apenas uma role que é user, daria para fazer assim roles: user.roles[0].role.name, porém além
     * de ficar feio caso não fosse passado nenhuma role ia quebrar o código, porque como não tem nada o índice
     * 0 daria undefined, então porque usar o map é mais seguro porque se não tiver nenhum registro o map
     * retorna apenas [], isso não vai quebrar o código
     */

    return { ...user, roles: user.roles.map((r) => r.role.name) };
  } catch (err) {
    //caso algo na requisição falhar entra nesse catch que verifica se o erro é compatível com um dos códigos
    //do prisma, o err é o mesmo do catch
    // P2002 = violação de unique constraint (e-mail já existe).
    // Tratar o erro do banco (em vez de "consultar antes") evita a condição de
    // corrida de dois cadastros simultâneos com o mesmo e-mail.
    if (isPrismaError(err, "P2002"))
      throw AppError.conflict("E-mail já cadastrado");
    // P2025 aqui = a role USER não existe: o seed não foi executado.
    if (isPrismaError(err, "P2025")) {
      throw new Error(
        'Role "USER" não encontrada. Execute o seed: npx prisma db seed',
      );
    }
    //caso não for nenhum dos dois erros mostra qual erro é sem o tratamento do prisma
    throw err;
  }
}
