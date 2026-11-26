# NORDEN — Salão Inteligente Masculino

Plataforma local com agendamento, área profissional, histórico Journey, manuais Care e loja. Interface em português, Node.js e SQLite, sem dependências externas de execução.

## GitHub Pages

[Abrir a demonstração online](https://da0602766-byte.github.io/NORDEN/). A pasta `docs/` contém uma prévia estática com dados fictícios e seleção de perfil no topo. Agendamentos, pedidos, cadastros e outras gravações precisam do servidor e ficam indisponíveis nessa prévia. Nenhum dado do banco local é exportado.

Em **Settings → Pages**, mantenha **Deploy from a branch → main → /docs**. Para atualizar a prévia após alterar a interface, execute `cd norden` e `npm run build:pages`, depois envie `docs/` junto com o código. As rotas da prévia usam `#/` para funcionar em subpastas e após atualizar a página.

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
