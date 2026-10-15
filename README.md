os primeiros comandos relacionados a criação do banco, quando usamos o usuário postgre ele da muitas permissões
que não queremos que os atacantes tenham, por isso, deve criar um novo usuário, por isso deve usar o comando
CREATE USER app (nome do usuário) PASSWORD 'app123' (nome genérico apenas para o exercício) CREATEDB (para
sinalizar que esse usuário pode criar um banco de dados, porque o prisma usa shadow database, sombra do banco
para poder usar o migrate)

depois de criar o usuário é hora de criar os bancos de dados
CREATE DATABASE taskdb (cria banco de dados com o nome taskdb) OWNER app (owner app significa que quem é o
dono desse banco de dados é o usuário app que foi craido acima) o banco de teste foi criado da mesma forma

próximo passo para a criação do usuário é que depois disso tudo vem uma url para o banco de dados

postgresql://app:app123@localhost:5432/tasksdb

postgresql:// -> significa que vai entrar no postgre parecido com o https

app -> qual usuário ele vai usar

app123 -> senha do usuário que ele vai entrar

@localhost:5432 -> local que vai rodar, esse já é mais padrão

/taskdb -> banco de dados que vai ser acessado

npx prisma validate -> confere se o schema é válido => "The schema ... is valid"
npx prisma format -> formata/alinha o schema => "Formatted prisma/schema.prisma"
npx prisma migrate dev --name init -> gera o SQL da diferença entre o schema e o banco, aplica e registra cria prisma/migrations/<data>\_init/migration.sql e a tabela \_prisma_migrations
npx prisma generate -> gera o Prisma Client a partir do schema => "Generated Prisma Client"

se quiser ver os dados e edita-los da para fazer isso rondando
npx prisma studio
vai abrir uma aba no navegador que vai mostrar todas as tabelas

Regras de ouro das migrations 1. Mudou o schema? Rode npx prisma migrate dev --name descricao_curta → nasce uma nova migration (nunca edite uma migration já aplicada). 2. Versione a pasta prisma/migrations/. 3. Em produção/CI use npx prisma migrate deploy (só aplica as pendentes, não cria nada novo). 4. npx prisma migrate reset apaga o banco e recria: só em desenvolvimento.

foi usado esse comando no terminal para criar os tokens
node
require('crypto').randomBytes(64).toString('hex')

node-> vai abrir o terminal de comando do node
require('crypto').randomBytes(64).toString('hex') -> vai criar um hash

esse comenado vai ser responsável por rodar a seed: npx prisma db seed
mas como ele sabe qual seed, como rodar, isso tudo é passado dentro de prisma.config.js
lá tem isso:
migrations: {
path: "prisma/migrations",
// Comando executado por "npx prisma db seed"
seed: "node prisma/seed.js",
},
o que isso quer dizer, para criar as migrations vai rodar o path para migrations que é prisma/migrations e
para seed vai rodar o caminho de node prisma/seed.js, mas porque node: é o comando que inicia o Node.js para
executar um arquivo JavaScript.

mas o fluxo é o seguinte, rbac passa os dados, seed-rbac faz o tratamento e seed envia para o banco
