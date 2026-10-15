import bcrypt from "bcrypt";
import { prisma } from "../src/lib/prisma.js";
import { env } from "../src/config/env.js";
import { ROLES } from "../src/config/rbac.js";
import { seedRbac } from "./seed-rbac.js";

// bcrypt: biblioteca utilizada para gerar o hash da senha do administrador,
// evitando armazenar a senha original em texto puro no banco de dados.

// prisma: instância do Prisma Client utilizada para consultar e modificar
// os registros do banco de dados por meio dos modelos definidos no schema.prisma.

// env: objeto com as configurações de ambiente carregadas e validadas
// pelo módulo de configuração. Neste arquivo, ele fornece BCRYPT_ROUNDS.

// ROLES: constantes que centralizam os nomes dos papéis existentes
// no sistema, como ADMIN e USER.

// seedRbac: função responsável por criar ou atualizar as permissions,
// as roles e as associações entre roles e permissions no banco de dados.

async function main() {
  // Executa o seed do RBAC passando a instância do Prisma Client.
  // O Prisma é necessário porque a função seedRbac precisa consultar e modificar
  // os registros do banco de dados.
  //
  // Se uma permission ou role não existir, ela será criada.
  // Se já existir, os campos definidos no update serão atualizados.
  // As associações ausentes serão criadas, sem duplicar as que já existem.
  //
  // O await garante que essa etapa termine antes de continuar, pois as roles
  // serão consultadas posteriormente para associá-las ao administrador.
  await seedRbac(prisma);

  console.log("Roles e permissions criadas/atualizadas.");

  // O administrador inicial é opcional e depende das variáveis de ambiente.
  // O e-mail e a senha são lidos de process.env, que contém as variáveis
  // disponibilizadas ao processo Node.js.
  //
  // O ?. é o encadeamento opcional: se SEED_ADMIN_EMAIL estiver ausente,
  // toLowerCase() não será chamado e o resultado será undefined.
  //
  // O toLowerCase() transforma as letras do e-mail em minúsculas,
  // padronizando o valor utilizado para procurar ou criar o usuário.
  //
  // A senha NÃO deve ser transformada em letras minúsculas, pois isso
  // modificaria seu valor. Senhas diferenciam letras maiúsculas e minúsculas.
  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;

  // Verifica se o e-mail e a senha foram fornecidos.
  // O operador || significa "ou": se qualquer um dos dois valores estiver
  // ausente ou for uma string vazia, a condição será verdadeira.
  //
  // Se faltar algum desses dados, o script informa que não criará o admin
  // e encerra a função main com return.
  //
  // O seed do RBAC já foi executado antes desta verificação e não é desfeito.
  if (!email || !password) {
    console.log(
      "SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD não definidos: nenhum admin criado.",
    );
    return;
  }

  // Procura um usuário pelo e-mail usando upsert.
  //
  // where: identifica o usuário pelo e-mail. Para essa consulta funcionar
  // como uma busca única, o campo email deve ser único no schema.prisma.
  //
  // update: {} significa que, se o usuário já existir, esta operação
  // não modificará seus campos.
  //
  // create: define os dados do usuário caso nenhum registro com esse e-mail
  // seja encontrado. Nesse caso, o usuário será criado com nome, e-mail
  // e hash da senha.
  //
  // O resultado retornado pelo Prisma é armazenado em admin. Esse objeto
  // contém os dados do usuário encontrado ou criado, incluindo seu ID.
  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      // O operador ?? é chamado de coalescência nula.
      // Se SEED_ADMIN_NAME for null ou undefined, utiliza "Administrador".
      // Caso contrário, utiliza o valor fornecido no ambiente.
      name: process.env.SEED_ADMIN_NAME ?? "Administrador",
      email,

      // Gera o hash da senha antes de armazená-la no campo passwordHash.
      //
      // O primeiro argumento é a senha original.
      // O segundo argumento, BCRYPT_ROUNDS, define o custo de processamento
      // utilizado pelo bcrypt para gerar o hash.
      //
      // O bcrypt administra o salt utilizado no processo de hashing.
      // O salt não precisa ser criado ou armazenado separadamente por este
      // código: ele faz parte do resultado produzido pelo bcrypt.
      //
      // O hash não permite recuperar diretamente a senha original.
      //
      // Atenção: como bcrypt.hash() está dentro do objeto de argumentos,
      // ele é executado antes da chamada upsert, mesmo se o usuário já existir.
      passwordHash: await bcrypt.hash(password, env.BCRYPT_ROUNDS),
    },
  });

  // Percorre o array com os nomes das roles que serão associadas ao admin.
  //
  // ROLES.ADMIN corresponde à string "ADMIN".
  // ROLES.USER corresponde à string "USER".
  //
  // O for...of percorre o array uma role por vez. Portanto, este código
  // tentará associar AMBAS as roles ao usuário administrador.
  //
  // Isso é uma decisão da implementação: a role USER não é adicionada
  // automaticamente pelo RBAC. Ela está sendo atribuída explicitamente aqui.
  for (const roleName of [ROLES.ADMIN, ROLES.USER]) {
    // Procura uma role pelo nome no banco de dados.
    //
    // findUniqueOrThrow retorna o registro encontrado.
    // Se a role não existir, lança um erro em vez de retornar null.
    //
    // Como seedRbac foi executado anteriormente, espera-se que as roles
    // definidas na configuração já estejam cadastradas.
    const role = await prisma.role.findUniqueOrThrow({
      // Busca a role cujo campo name seja igual ao valor de roleName.
      // Na primeira repetição, procura ADMIN; na segunda, procura USER.
      where: { name: roleName },
    });

    // Cria ou mantém a associação entre o usuário e a role na tabela
    // intermediária UserRole.
    //
    // where: utiliza a chave composta userId_roleId para identificar
    // a associação específica entre este usuário e esta role.
    //
    // userId: admin.id é o ID do usuário encontrado ou criado anteriormente.
    // roleId: role.id é o ID da role encontrada na consulta acima.
    //
    // update: {} significa que, se essa associação já existir,
    // ela será mantida sem alterações.
    //
    // create: cria a associação caso ela ainda não exista.
    //
    // A chave composta deve estar definida no schema.prisma para que
    // o Prisma disponibilize userId_roleId como identificador único.
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: admin.id,
          roleId: role.id,
        },
      },
      update: {},
      create: {
        userId: admin.id,
        roleId: role.id,
      },
    });
  }

  // Informa que o usuário foi encontrado ou criado e que as associações
  // com as roles previstas neste script foram processadas sem erro.
  // A mensagem, por si só, não significa necessariamente que um usuário
  // novo tenha sido criado: ele pode já existir no banco.
  console.log(`Admin pronto: ${email}`);
}

// Chama a função main para iniciar a execução do seed.
//
// Como main é uma função async, ela retorna uma Promise.
// A Promise permite acompanhar a conclusão das operações assíncronas
// e tratar eventuais falhas durante a execução.

main()
  // Se uma operação rejeitar sua Promise e o erro não for tratado dentro
  // de main, o catch receberá o erro na variável err.
  .catch((err) => {
    // Exibe os detalhes do erro no terminal para ajudar a identificar
    // o que falhou durante a execução do seed.
    console.error(err);

    // Define o código de saída do processo como 1, indicando falha.
    //
    // Diferentemente de process.exit(1), definir process.exitCode permite
    // que o Node.js finalize normalmente as operações pendentes.
    // Isso dá oportunidade para a etapa de encerramento da conexão terminar.
    process.exitCode = 1;
  })

  // O finally é executado quando a cadeia da Promise termina,
  // seja após sucesso, seja após erro.
  //
  // prisma.$disconnect() encerra a conexão do Prisma Client com o banco,
  // liberando os recursos utilizados por este script.
  //
  // Como este é um script de execução pontual, e não um servidor Express
  // que precisa permanecer ativo, a conexão deve ser encerrada ao terminar.
  .finally(() => prisma.$disconnect());
