//o nome rbac vem de ROLE BASED ACCESS CONTROLL (papel base para controle de acesso)

//roles cria um objeto com os papéis existentes, só pode ter admin e user

export const ROLES = {
  ADMIN: "ADMIN",
  USER: "USER",
};

//aqui as permissões para cada requisição
export const PERMISSIONS = {
  //TASK_READ_ANY(ler tarefas de qualquer um): task:read:any o que é isso? vou dividir em 3 partes para
  //entender mas é uma coisa só:
  //task: o recurso que vai querer, ou seja, tarefas
  //read: a ação que vai fazer
  //any: sobre quem pode ver, nesse caso qualquer um

  TASKS_READ_ANY: "tasks:read:any",

  //mesmo raciocínio do anterior, só que dessa vez para escrever(criar) uma tarefa

  TASKS_WRITE_ANY: "tasks:write:any",

  //para deletar uma tarefa

  TASKS_DELETE_ANY: "tasks:delete:any",

  //listar e consultar usuários

  USERS_READ: "users:read",

  //listar e consultar papéis

  ROLES_READ: "roles:read",

  //atribuir ou retirar papéis de usuários

  ROLES_ASSIGN: "roles:assign",

  //listar e consultar permissões

  PERMISSIONS_READ: "permissions:read",

  //atribuir ou retirar permissões de usuários
  PERMISSIONS_ASSIGN: "permissions:assign",
};

//esse arquivo da exatamente as mesmas descrições que passei acima, porém para o cliente
export const PERMISSION_DESCRIPTIONS = {
  [PERMISSIONS.TASKS_READ_ANY]: "Ver tarefas de qualquer usuário",
  [PERMISSIONS.TASKS_WRITE_ANY]: "Criar/editar tarefas de qualquer usuário",
  [PERMISSIONS.TASKS_DELETE_ANY]: "Excluir tarefas de qualquer usuário",
  [PERMISSIONS.USERS_READ]: "Listar e consultar usuários",
  [PERMISSIONS.ROLES_READ]: "Listar roles",
  [PERMISSIONS.ROLES_ASSIGN]: "Atribuir/remover roles de usuários",
  [PERMISSIONS.PERMISSIONS_READ]: "Listar permissions",
  [PERMISSIONS.PERMISSIONS_ASSIGN]:
    "Conceder/remover permissions diretas de usuários",
};

// Quais permissions cada role recebe. USER não tem nenhuma permission especial:
// a regra "usuário comum mexe nas PRÓPRIAS tarefas" é de PROPRIEDADE (ownership),
// não de permission (veja tasks.service.js).

//o que essa const faz, quais permissões cada papel recebe
export const ROLE_PERMISSIONS = {
  //o papel de amin recebe todos os valores de permission_description, mas como faz isso?
  //Object.values() -> cria um array com todos os resultados do objeto, então é como se fosse assim
  /**
   * [
   * "tasks:read:any",
   * "tasks:write:any",
   * ]
   *
   * somente os valores das chaves, sem os seus nomes, isso é bom para se caso for adicionada mais uma
   * permissão ela já vem direto para o admin, sem precisar adicionar também na lista de admin
   */
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
  //já o papel user não tem nenhuma permissão? tem sim! porém ele tem somente as permissões das tarefas que ele
  //é dono, então não vai ficar aqui o que ele pode fazer e sim em ownership
  [ROLES.USER]: [],
};

//vai ser reponsável por dar a descrição de cada papel
export const ROLE_DESCRIPTIONS = {
  [ROLES.ADMIN]: "Administrador do sistema",
  [ROLES.USER]: "Usuário comum",
};
