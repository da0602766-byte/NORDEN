# NORDEN — Salão Inteligente Masculino

Plataforma local com agendamento, área profissional, histórico Journey, manuais Care e loja. Interface em português, Node.js e SQLite, sem dependências externas de execução.

## GitHub Pages

[Abrir a demonstração online](https://da0602766-byte.github.io/NORDEN/). A interface React em `preview/` inclui landing page, loja, agenda, Journey, Care, Flow e painéis com perfis fictícios. Reservas e pedidos são simulações guardadas apenas no navegador. O servidor em `norden/` usa seu próprio banco SQLite e mantém os fluxos que exigem autenticação.

Em **Settings → Pages**, mantenha **Deploy from a branch → main → /docs**. Para atualizar a demonstração pública:

```sh
cd preview
npm ci
npm run typecheck
npm run build:pages
```

Envie as mudanças em `preview/` e o conteúdo gerado em `docs/` no mesmo commit. Para desenvolvimento, use `npm run dev` em `preview/`. A exportação legada em `norden/` grava por padrão em `norden/dist/pages-legacy/`.

## Executar

Requer Node.js 24 ou superior.

```sh
cd norden
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
