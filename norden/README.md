# NORDEN — Salão Inteligente Masculino

API e portais do NORDEN. O ambiente local usa SQLite com dados fictícios. Em produção, a Vercel serve a API e os portais, e o Supabase armazena os dados em PostgreSQL. Veja os [links de produção e da demonstração](../README.md).

## Operar em produção

### Publicação na Vercel

O projeto `norden` acompanha a branch `main` do GitHub. Em **Settings → Build and Deployment**, a pasta raiz é `norden`, a versão do Node.js é 24.x e o build tem acesso a arquivos fora da raiz para compilar `../preview`. O [vercel.json](vercel.json) define a saída em `dist/public` e executa a função `api/norden.mjs` em Portland (`pdx1`), na mesma região AWS (`us-west-2`) do PostgreSQL atual.

O build entrega a página inicial e a loja em React. Os portais, o checkout e os detalhes de produto usam o HTML e os módulos de `public/`. As duas interfaces acessam a mesma API. O deploy da aplicação pelo Git e a aplicação das migrações do banco são etapas distintas. Depois de publicar, confirme que o domínio de produção está associado ao commit pretendido e execute as [verificações públicas](QA.md#verificação-de-produção).

Se uma publicação nova causar regressão, a opção **Instant Rollback** da Vercel pode voltar o domínio ao deploy anterior. A migração e os dados do Supabase têm recuperação própria. Confira a compatibilidade do código anterior com o esquema antes de reverter. [Fluxo de publicação da Vercel](https://vercel.com/docs/git) · [Rollback na Vercel](https://vercel.com/docs/instant-rollback).

### Configuração da Vercel e do Supabase

Configure os valores no ambiente apropriado da Vercel e no terminal administrativo quando necessário. Mantenha senhas, URLs com credenciais, chaves, tokens e links de convite fora do Git.

| Variável | Uso |
| --- | --- |
| `DATABASE_URL` | URI PostgreSQL do pooler Supabase para o login da aplicação, com TLS e associação ao papel restrito `norden_app` |
| `NORDEN_PG_CA` | Certificado CA em PEM codificado em Base64 para validar o TLS do pooler, conforme a configuração de produção |
| `NORDEN_SAFETY_KEY` | Chave estável de pelo menos 32 caracteres para dados sensíveis. Preserve a chave com o plano de recuperação |
| `NORDEN_SITE_URL` | Origem HTTPS para gerar links de convite, verificação e recuperação |
| `NORDEN_SMTP_URL` | Endereço SMTP ou SMTPS com as credenciais do remetente, usado para verificação e recuperação |
| `NORDEN_MAIL_FROM` | Remetente autorizado pelo provedor SMTP |

O navegador acessa o banco por meio da API. O esquema privado `norden` tem RLS e a API aplica as permissões por papel e por registro. A função usa um pool PostgreSQL e transações para manter consistência em alterações como reservas e pedidos. Para preparar outro ambiente, aplique as migrações em ordem, configure um login com o papel da aplicação e use as credenciais administrativas somente no fluxo de migração. [Conexões PostgreSQL no Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres).

- [Migração inicial](../supabase/migrations/20261126231645_norden_schema.sql). Cria esquema, tabelas, restrições, permissões e políticas.
- [Migração de desempenho](../supabase/migrations/20261127004533_norden_query_indexes.sql). Adiciona índices para janelas canceladas, vínculos do Flow, pedidos e listagens de movimentações e auditoria. Aplicada e conferida no Supabase de produção.

Para novas migrações, use `supabase migration new <nome>` na raiz do repositório. Vincule a CLI ao projeto de destino, confira o histórico e rode `supabase db push --remote --dry-run` antes de aplicar com `supabase db push --remote`. Esses comandos usam a sintaxe da CLI v3. A publicação pelo Git na Vercel não aplica SQL automaticamente. [Fluxo de migrações do Supabase](https://supabase.com/docs/guides/local-development/cli-workflows).

### Contas, catálogo e operação

Em uma instalação sem gestor ativo, execute o comando abaixo a partir de `norden/` após configurar o banco e a origem HTTPS. Entregue o link impresso somente ao destinatário. O convite é vinculado ao e-mail, expira em um dia e pode ser usado uma vez. Com a primeira conta ativa, gere os próximos convites em **Gerência → Configurações**.

```sh
node src/first-manager.mjs gestor@example.com
```

- **Agenda.** Cadastre profissionais no catálogo, vincule os serviços e configure o expediente. A API usa o fuso `America/Sao_Paulo` e revalida disponibilidade e preço ao confirmar a reserva.
- **Loja.** Cadastre produtos em **Gerência → Produtos**. Atualize preços em **Estoque → Alterar preço** e registre entradas ou ajustes de quantidade em **Movimentar estoque**. A loja usa o saldo físico menos o reservado. Desativar o produto retira sua oferta e preserva os pedidos e atendimentos que o referenciam.
- **Pedidos.** O checkout registra pagamento presencial pendente. Retirada tem taxa zero. Para entrega, o cliente informa a distância e o sistema calcula a taxa e verifica a cobertura configurada.
- **Atendimento.** A equipe registra o serviço e os produtos usados ou recomendados. O cliente consulta o histórico no Journey e as orientações no Care. Fotos privadas exigem autorização. O Flow permite aceitar ou recusar uma oferta de antecipação.
- **Backups.** Use o backup PostgreSQL disponível para o projeto Supabase. Preserve a configuração da aplicação e a chave de dados sensíveis em armazenamento protegido. Valide a restauração em um ambiente separado.

Na última verificação documentada, a loja tinha seis produtos ativos e o catálogo tinha quatro serviços. O agendamento ainda dependia de profissional ativo e expediente. A API informava que o e-mail de conta estava desativado. Configure o SMTP para oferecer recuperação de senha e verificação por e-mail.

## Executar localmente

### Abrir no VS Code

Abra `../NORDEN.code-workspace` ou a pasta `norden` no VS Code. Pressione **F5** e selecione **NORDEN: iniciar e depurar**. A tarefa prepara a base fictícia e inicia o servidor em **http://127.0.0.1:4173**. Na primeira execução, a senha das contas de demonstração aparece no terminal da tarefa de preparação; guarde-a para os próximos acessos. Encerre o servidor com **Shift+F5**.

O menu **Terminal → Executar Tarefa** também oferece **NORDEN: iniciar**, **NORDEN: testar** e **NORDEN: build**. Inicie apenas uma instância por porta. O atalho **Ctrl+Shift+B** executa o build. Prepare as dependências com `npm ci` para executar a suíte completa.

### Pelo terminal

Requer Node.js 24 ou superior. O servidor local usa o SQLite nativo. A suíte completa também usa PostgreSQL por meio do PGlite.

No Windows, extraia o ZIP e abra **Iniciar_NORDEN_Windows.cmd** dentro da pasta `norden`. Abra **http://127.0.0.1:4173** no navegador e mantenha o terminal aberto.

Em Windows, macOS ou Linux, os comandos equivalentes dentro da pasta são:

```sh
npm ci
npm run seed
npm start
```

A carga inicial gera uma senha aleatória da instância e informa os acessos fictícios no terminal. Guarde a senha enquanto estiver usando a base. A carga é idempotente. Use `NORDEN_DATA` com uma pasta nova se quiser reiniciar a avaliação, preservando a anterior.

| Papel | E-mail fictício | Área |
| --- | --- | --- |
| Cliente | `cliente@norden.example` | Próxima reserva, Journey e Care preenchidos |
| Profissional | `profissional@norden.example` | Agenda e atendimentos de André |
| Gestor | `gestor@norden.example` | Agenda geral, parâmetros, catálogo, estoque e pedidos |
| Segundo cliente | `cliente2@norden.example` | Testes de acesso entre contas e reserva que gera janela no Flow |

Cadastros pelo site geram apenas contas de cliente. O gestor pode criar convites temporários pela área de configuração. A recuperação e a validação de e-mail escrevem arquivos JSON na pasta `data/outbox/`, com links descartáveis para uso local pelo operador. A pasta fica fora do diretório público. A demonstração não envia e-mails.

### Configuração da instância

| Variável | Padrão | Efeito |
| --- | --- | --- |
| `PORT` | `4173` | Porta HTTP |
| `HOST` | `127.0.0.1` | Interface de escuta. O padrão limita a instância à máquina local |
| `NORDEN_DATA` | `data/` | Diretório do SQLite, chave local e caixa de saída |
| `NORDEN_SAFETY_KEY` | Chave aleatória em `data/safety.key` | Segredo usado para cifrar alertas de saúde. Preserve-o junto ao backup |
| `NORDEN_SECURE_COOKIE` | `0` | Configure `1` quando a instância for servida por HTTPS |
| `NORDEN_DEMO_PASSWORD` | Aleatória | Opcional, usada somente na primeira carga fictícia |

### Prévia local da vitrine React e dos portais

Na raiz do repositório, gere a mesma vitrine React usada no build hospedado e inicie a prévia em uma base SQLite nova. O comando vincula a escuta a `127.0.0.1` e usa a caixa de saída local. O pagamento aparece como presencial para representar o fluxo hospedado.

```sh
npm --prefix norden ci
npm --prefix preview ci
npm --prefix norden run build
npm --prefix preview run build:live
export NORDEN_DATA="$(mktemp -d)"
npm --prefix norden run seed
PORT=4173 npm --prefix norden start -- --live-preview
```

Abra [a página inicial](http://127.0.0.1:4173/), [a loja](http://127.0.0.1:4173/loja), [a área do cliente](http://127.0.0.1:4173/usuario) e [a gerência](http://127.0.0.1:4173/gerencia). Use os acessos fictícios que a carga exibiu. No PowerShell, separe a carga e a inicialização da mesma forma, definindo `$env:NORDEN_DATA` antes dos dois comandos. Para a demonstração independente, execute `npm --prefix preview run dev`. Para gerar a saída da demonstração em uma pasta à parte, execute `npm --prefix preview run build:pages -- --outDir ../norden/dist/pages-qa`.

### Preparação operacional após aprovação

- **Agenda.** Em **Gerência → Profissionais**, cadastre ou ative cada integrante real. Vincule os serviços no formulário do profissional e confira duração e intervalo em **Serviços**. Em **Profissionais**, salve os períodos de expediente por dia e divida os intervalos em dois períodos. Em **Agenda**, registre bloqueios pontuais e consulte uma data em que haja expediente no horário de Brasília.
- **E-mail de conta.** Prepare em homologação um remetente verificado e uma origem HTTPS. Configure `NORDEN_SMTP_URL`, `NORDEN_MAIL_FROM` e `NORDEN_SITE_URL` no ambiente aprovado. Confira cadastro, reenvio e recuperação com uma caixa controlada antes de habilitar o envio para clientes.
- **Entrega.** A cotação identifica a distância informada e o valor estimado. Confirme com o cliente a cobertura e a taxa antes do pagamento presencial. Quando o valor divergir, a equipe combina o ajuste com o cliente antes de seguir. O sistema mantém o total histórico do pedido original. Um cálculo geográfico exige origem do salão, um provedor de geocodificação e roteamento e aprovação dos custos e da política de cobrança.

## Percursos de demonstração

1. **Atendimento e compra.** Entre como cliente e agende um serviço. Na conta profissional correspondente ou como gestor, abra a reserva, inicie o atendimento, registre o procedimento e os produtos, revise o manual e conclua. Volte ao cliente, abra o Journey e o Care, siga um link de produto, adicione ao carrinho, revise a retirada ou a entrega e confirme. Na gestão, percorra a fila de pedidos e confira as movimentações do estoque.
2. **Flow.** No painel de gestão, abra a agenda do próximo dia útil de André e cancele o atendimento de **Corte & barba** das 10h em nome de Mateus. Abra o Flow e ofereça o horário ao cliente Lucas. A vaga de 60 minutos comporta o corte de 45 minutos de Lucas. O tratamento de 90 minutos fica de fora. Entre como Lucas para aceitar ou recusar.
3. **Entrega.** No checkout, informe um endereço fictício completo e 4 km. A carga inicial aplica R$ 2,50 por km, totalizando R$ 10,00 de taxa. Endereços podem ser cadastrados no perfil. As regras podem ser alteradas em Gestão → Configurações.
4. **Privacidade.** Ao entrar como cliente, ative ou retire o consentimento no perfil. Os alertas ficam cifrados no banco. A equipe autorizada consulta o dado no detalhe do atendimento. Cada acesso é auditado. Use apenas exemplos fictícios.

## Arquitetura e manutenção local

Os portais adaptam o HTML preservado em `referencia/interface-original.html`. Os estilos e animações estão em `public/norden.css`. A página inicial e a loja de produção usam `../preview/src/live.tsx` para ler catálogo e gravar carrinho pela API. As fichas do Journey exibem produtos usados e recomendados. As notas internas ficam restritas à equipe autorizada.

- `public/` contém telas, navegação, componentes, fotos e estilos. O servidor entrega os arquivos e controla a API. A interface reutiliza os dados persistidos nas áreas pública, cliente e gestão.
- `src/identity.mjs` trata contas, sessões, tokens e solicitações de privacidade. `src/agenda.mjs` trata disponibilidade e realocação. `src/care.mjs` trata atendimento, registros, mídia e manuais. `src/catalog.mjs` e `src/store.mjs` tratam catálogos, estoque e comércio.
- `migrations/001-inicial.sql` define o esquema relacional, os índices e as restrições. A abertura do banco aplica as migrations em ordem e registra as versões. Novas alterações de esquema devem usar um arquivo numerado adicional.
- O SQLite usa transações de escrita imediatas e restrições de integridade. Agenda e ofertas revalidam conflitos dentro da transação. O checkout confirma o preço, a disponibilidade e a cotação no servidor. O identificador do pedido protege a operação contra reenvio.
- A agenda exibe horários de Brasília e registra instantes de forma consistente. A confirmação é imediata. Alterações futuras no catálogo preservam os dados congelados de reservas, pedidos e manuais.
- O estoque desta versão representa unidades vendáveis. Produtos usados nos serviços ficam registrados no atendimento, com quantidade e unidade quando informadas. A baixa automática de consumo interno exige configuração de unidade e estoque próprios.
- Para backup de homologação, encerre o servidor e copie o diretório configurado em `NORDEN_DATA` para um local protegido, incluindo a chave de alertas quando gerada localmente. Para restaurar, valide a cópia em um diretório separado antes de reabrir a instância. Trate os tokens de `outbox/` como privados.
- Fotografias de sessão ficam em registros privados e exigem consentimento no perfil e confirmação específica pela equipe. O catálogo e a galeria usam imagens públicas próprias. O gestor ajusta categorias pelo cadastro, e desativa itens que tenham histórico.

```sh
npm test
npm run build
```

O build verifica a sintaxe e os imports locais e prepara `dist/`, sem copiar o banco nem as credenciais. Dentro de `dist/`, execute a carga fictícia e o servidor com os mesmos comandos. Os resultados e limites de verificação estão em [QA.md](QA.md).

## Limites operacionais

O fluxo atual recebe pagamento presencial em produção e simula pagamento quando configurado para demonstração. A entrega usa distância informada no checkout. As solicitações de privacidade ficam registradas para tratamento pela equipe. Os testes automatizados cobrem os fluxos com dados fictícios. Consulte [QA.md](QA.md) para saber quais fluxos foram confirmados no site publicado.
