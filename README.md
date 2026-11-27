# NORDEN — Salão Inteligente Masculino

Plataforma em português para agendamento, atendimento, histórico Journey, manuais Care, realocação Flow e loja com gestão de catálogo, preços, estoque e pedidos.

Criado por **Douglas Anderson, Davi Alexandre, Waldemar Roberto e Cristian Pereira**.

## Produção

| Acesso | Endereço |
| --- | --- |
| Página inicial | [norden-steel.vercel.app](https://norden-steel.vercel.app/) |
| Loja | [NORDEN Store](https://norden-steel.vercel.app/loja) |
| Cliente | [Área do cliente](https://norden-steel.vercel.app/usuario) · [Criar conta](https://norden-steel.vercel.app/usuario/cadastro) |
| Equipe | [Gerência](https://norden-steel.vercel.app/gerencia) |

A Vercel hospeda o site e a API. O Supabase mantém o PostgreSQL. A conta de cliente é criada pelo cadastro público. O acesso profissional ou de gestão depende de convite. Na gerência, **Produtos** cadastra e edita produtos. Em **Estoque → Alterar preço**, a equipe define o valor normal e o promocional. Desative um produto para retirá-lo da loja e preservar o histórico.

O checkout registra pedidos com pagamento presencial, retirada no salão ou entrega com taxa estimada pela distância informada. As rotinas de publicação, configuração, acesso e diagnóstico estão no [guia técnico e operacional](norden/README.md). Consulte também as [medições em produção e os testes](norden/QA.md).

## Demonstração no GitHub Pages

A [demonstração pública](https://da0602766-byte.github.io/NORDEN/) usa perfis e dados fictícios. As reservas e os pedidos simulados ficam no navegador. [Lucas Martins, cliente](https://da0602766-byte.github.io/NORDEN/?perfil=cliente#/app) e [Rafael Almeida, gestor](https://da0602766-byte.github.io/NORDEN/?perfil=gestor#/gestao) apresentam as duas áreas.

O GitHub Pages publica `main` a partir de `/docs`. Para atualizar a demonstração, gere a saída com os comandos abaixo e envie o código de `preview/` e os artefatos de `docs/` no mesmo commit.

```sh
cd preview
npm ci
npm run typecheck
npm run build:pages
```

## Estrutura do repositório

| Caminho | Conteúdo |
| --- | --- |
| [`preview/`](preview/) | Interface React/Vite da demonstração e da página inicial e loja de produção |
| [`norden/`](norden/) | API Node.js, portais, checkout, configuração da Vercel e testes |
| [`supabase/migrations/`](supabase/migrations/) | Esquema PostgreSQL de produção e migrações de índices |
| [`docs/`](docs/) | Build estático da demonstração no GitHub Pages |

## Desenvolvimento local

Use Node.js 24 ou superior. A aplicação local usa SQLite e uma carga fictícia.

```sh
cd norden
npm ci
npm run seed
npm start
```

Abra [a instância local](http://127.0.0.1:4173). A senha da primeira carga aparece no terminal. No VS Code, abra `NORDEN.code-workspace` e pressione **F5**. Para trabalhar na interface React da demonstração, execute `npm ci` e `npm run dev` em `preview/`.
