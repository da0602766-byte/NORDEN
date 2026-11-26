# NORDEN — Salão Inteligente Masculino

Plataforma local com agendamento, área profissional, histórico Journey, manuais Care e loja. Interface em português, Node.js e SQLite, sem dependências externas de execução.

## GitHub Pages

[Abrir a demonstração online](https://da0602766-byte.github.io/NORDEN/). A interface React em `preview/` inclui landing page, loja, agenda, Journey, Care, Flow e painéis com perfis fictícios. Reservas e pedidos são simulações guardadas apenas no navegador. O servidor em `norden/` usa seu próprio banco SQLite e mantém os fluxos que exigem autenticação.

[Demonstração do cliente, Lucas Martins](https://da0602766-byte.github.io/NORDEN/?perfil=cliente#/app) · [Demonstração da gerência, Rafael Almeida](https://da0602766-byte.github.io/NORDEN/?perfil=gestor#/gestao).

Em **Settings → Pages**, mantenha **Deploy from a branch → main → /docs**. Para atualizar a demonstração pública:

```sh
cd preview
npm ci
npm run typecheck
npm run build:pages
```

Envie as mudanças em `preview/` e o conteúdo gerado em `docs/` no mesmo commit. Para desenvolvimento, use `npm run dev` em `preview/`. A exportação legada em `norden/` grava por padrão em `norden/dist/pages-legacy/`.

## Vercel e Supabase

O aplicativo autenticado fica em `norden/`. Na Vercel, selecione essa pasta como **Root Directory**, com Node.js 24. As rotas `/usuario` e `/gerencia` abrem os portais, e `/usuario/cadastro` cria uma conta de cliente. A equipe entra por convite. Na gerência, abra **Estoque → Alterar preço** para editar o valor em reais e atualizar a loja.

O [esquema PostgreSQL](supabase/migrations/20261126231645_norden_schema.sql) fica numa área privada do Supabase. A função na Vercel usa `DATABASE_URL` com a conexão TLS do pooler e um login membro de `norden_app`, sem privilégios de administração. Configure `NORDEN_SAFETY_KEY` como segredo estável de pelo menos 32 caracteres. `NORDEN_SITE_URL` é a origem HTTPS da aplicação. Quando houver SMTP, configure também `NORDEN_SMTP_URL` e `NORDEN_MAIL_FROM` para recuperação de senha e verificação de e-mail. O checkout inicia com pagamento presencial e permite retirada ou entrega estimada.

Após aplicar a migração, gere o primeiro convite no ambiente de administração com `node src/first-manager.mjs email-do-gestor`, em `norden/`, com as variáveis do banco e da origem configuradas. O link expira e é de uso único. Os perfis e a carga fictícia ficam restritos à demonstração e aos testes. Cadastre serviços, profissionais, expediente e produtos reais pela gerência antes de atender clientes.

## Executar localmente

Requer Node.js 24 ou superior.

```sh
cd norden
npm ci
npm run seed
npm start
```

Abra http://127.0.0.1:4173. A primeira carga informa no terminal a senha das contas fictícias. No Windows, também é possível abrir `norden/Iniciar_NORDEN_Windows.cmd`.

No VS Code, abra `NORDEN.code-workspace` e pressione F5.

## Verificar

```sh
cd norden
npm test
npm run build
```

Leia as [instruções completas](norden/README.md) e os [resultados de verificação](norden/QA.md). Esta versão usa dados fictícios, pagamento simulado ou presencial e caixa de saída de e-mail local.
