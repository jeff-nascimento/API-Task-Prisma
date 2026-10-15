import {
  PERMISSIONS,
  PERMISSION_DESCRIPTIONS,
  ROLE_PERMISSIONS,
  ROLE_DESCRIPTIONS,
} from "../src/config/rbac.js";

//esse arquivo utiliza as definições do rbac para atualizar e cadastrar usuários no postgresql

// Cria (ou atualiza) permissions, roles e a ligação entre elas.
// É IDEMPOTENTE: pode rodar várias vezes sem duplicar nada (upsert =
// "atualiza se existir, cria se não existir").
// Recebe o client por parâmetro para servir ao seed E aos testes. Ela recebe o cliente que a chamou
export async function seedRbac(client) {
  //permissionId começa vazio porque vai ser adicionado no for em baixo, porque precisa ser o id
  //porque quando for associar uma permissão a uma role precisa do id da role para ser associada
  const permissionIds = {};
  //vai fazer um for of, o for of percorre cada item do array, já object.values(permissions) vai pegar apenas
  //os valores do objeto, não o nome da chave, então name aqui vai ter os valores de todos os objetos, um de
  //cada vez
  for (const name of Object.values(PERMISSIONS)) {
    //destrinchando:
    //await porque upsert precisa esperar a operação
    //client.permission: acessa permissions por meio do cliente que está chamando a requisição
    //upsert(): é uma função que faz a junção de update com insert, ela vai buscar o que precisa com base

    const permission = await client.permission.upsert({
      //no where, como o nosso name do for tem os valores de cada permissão, o where busca um name, o valor
      //dentro dela seria algo assim where: { name: "tasks:read:any" }, isso seria o valor de name
      where: { name },
      //update: se caso a permissão já existir apenas atualiza sua descrição, então imagine que no banco

      //name: tasks:read:any
      //description: Consultar tarefas
      //Mas no rbac.js a descrição atual seja "Ver tarefas de qualquer usuário".
      //Ao executar o seed, o campo description será atualizado para o valor definido na configuração.
      //Observe que o código não atualiza todos os campos da permissão. Ele atualiza somente a descrição
      //indicada em update.
      update: { description: PERMISSION_DESCRIPTIONS[name] },

      //se caso a permissão não existir ele cria uma nova com o nome e a descrição, name como lembrado
      //é a abreviação de name do for com o name que exige nela aqui
      create: { name, description: PERMISSION_DESCRIPTIONS[name] },
    });

    //o que isso faz, permissionIds[name]?
    //permissionIds é a variável que guarda os ids de permissões em um objeto que foi colocado lá em cima
    //name é o valor armazenado na variável que vai percorrer o array, onde tem todas as permissões
    //porque foi usado dessa forma e não permissionIds.name? porque se buscasse assim iria vir toda a chave
    //com nome e valor, colocando apenas permissionIds[name] pega apenas o valor
    //então na hora de salvar cada valor em vez de salvar o dado de name vai receber o valor de permission.id
    //que é tirado lá de permission, porque a requisição depois o resultado é algo como:
    //{
    //   id: "uuid-111",
    //   name: "tasks:read:any",
    //   description: "Ver tarefas de qualquer usuário"
    //}
    permissionIds[name] = permission.id;
  }

  //esse for vai pegar o roleName e permissionNames de role permissions, porém como isso funciona
  //role name é o admin, e permission name é as permissões que ele tem
  //o for of já é conhecido
  //o object.entries() funciona assim, ele vai pegar todos os dados colocando eles em chave e valor
  //algo parecido com:
  //[
  //   ["ADMIN", ["tasks:read:any", "tasks:write:any", "..."]],
  //   ["USER", []]
  //]

  for (const [roleName, permissionNames] of Object.entries(ROLE_PERMISSIONS)) {
    //upset é explicado acima, então não vou reesplicar
    const role = await client.role.upsert({
      where: { name: roleName },
      update: { description: ROLE_DESCRIPTIONS[roleName] },
      create: { name: roleName, description: ROLE_DESCRIPTIONS[roleName] },
    });

    //repare que esse for está dentro de outro, então ele vai fazer outro for dentro do que busca a role
    //então se role for admin ele vai percorrer as permissions de admin, caso for user ele vai percorrer
    //as de user

    //como para a tabela N para N tem uma chave primária composta pelo role id e pelo permission id
    //para o where passa essa mesma chave composta, pegando o role.id e o permissionIds.permissionName
    //que é o indice que está sendo trabalhado em questão
    for (const permissionName of permissionNames) {
      await client.rolePermission.upsert({
        // "roleId_permissionId" é o nome que o Prisma dá à chave composta
        //lembra que como é um N:N ele passa os valores para uma tabela intermediária?
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permissionIds[permissionName],
          },
        },
        //para update não precisa fazer nada, porque se a associação já estiver cadastrada ela pode permanecer
        //exatamente como está
        update: {},
        //para criar ele deve passar o role id e o permission id
        create: {
          roleId: role.id,
          permissionId: permissionIds[permissionName],
        },
      });
    }
  }
}
