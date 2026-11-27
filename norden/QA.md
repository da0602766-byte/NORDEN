# Verificação do NORDEN

## Verificação de produção

Em 26 de novembro de 2026, o domínio da Vercel serviu a interface do ZIP na página inicial e na loja, ligada ao catálogo Supabase. As telas de cliente e de gerência abriram em rotas separadas. No navegador, um produto foi adicionado à sacola com o mesmo preço da loja e removido ao concluir o teste. Após a otimização, a navegação da tela de login para Serviços e Loja exibiu os seis produtos, sem erros de console observados.

| Verificação | Resultado |
| --- | --- |
| Página inicial, loja, cliente e gerência | HTTP 200 no domínio de produção |
| Inicialização para visitantes em `/api/boot` | 5,04–6,06 s antes e 0,32–0,35 s depois, medidos até o primeiro byte |
| Inicialização leve do formulário de login | 0,31–0,46 s até o primeiro byte e 119 bytes de resposta em duas medições |
| Catálogo da vitrine | 0,37 s até o primeiro byte na medição após a publicação, com quatro serviços e seis produtos ativos |
| Login com e-mail fictício em produção | HTTP 401 em 0,49 s, conforme esperado |
| Imagem da tela de login | De 968.721 bytes para 138.308 bytes, redução de aproximadamente 86% |
| Supabase | Cinco índices da migração de desempenho presentes no esquema `norden` |
| Testes locais | 21 testes aprovados com `npm test` e 19 testes de integração aprovados ao rodar a suíte sobre PostgreSQL local |
| Compilação React | TypeScript e build de produção aprovados |

O ganho combina a mudança da função da Vercel de São Paulo (`gru1`) para Portland (`pdx1`), na região do banco, e a redução de consultas e do trabalho inicial. A agenda busca bloqueios e reservas do dia juntos. A loja busca o catálogo e o carrinho quando necessário. O portal de entrada mostra o formulário do visitante usando uma resposta mínima. A página inicial e a loja passaram a carregar módulos JavaScript por rota, e os arquivos versionados da vitrine recebem cache longo. A tabela registra amostras de rede a partir da máquina de teste.

O login válido, o agendamento, as permissões dos portais e a conclusão de pedido foram exercitados na suíte local com dados fictícios. Em produção, o e-mail de conta estava desativado e o catálogo ainda não tinha profissionais ativos. O teste público não criou contas, reservas ou pedidos.

### Repetir a verificação

Confira a [página inicial](https://norden-steel.vercel.app/), a [loja](https://norden-steel.vercel.app/loja), a [área do cliente](https://norden-steel.vercel.app/usuario) e a [gerência](https://norden-steel.vercel.app/gerencia). Use `curl.exe` no PowerShell, ou `curl` nos demais terminais, para comparar os tempos a partir da mesma rede.

```sh
curl -sS -D - -w "\nHTTP %{http_code} | TTFB %{time_starttransfer}s | total %{time_total}s\n" 'https://norden-steel.vercel.app/api/boot?view=entry'
curl -sS -w "\nHTTP %{http_code} | TTFB %{time_starttransfer}s | total %{time_total}s\n" 'https://norden-steel.vercel.app/api/boot?view=storefront'
```

A primeira rota deve retornar `production: true` e `entryOnly: true` quando consultada sem sessão. A segunda deve mostrar o catálogo público. O cabeçalho `X-Vercel-Id` indica `pdx1` como região da função em produção. Em caso de lentidão, compare o retorno inicial do HTML com o da API. Se a API falhar, consulte os logs da função na Vercel e o estado do PostgreSQL e das migrações no Supabase. Para conferir o catálogo, compare preços e disponibilidade com a gerência.

Na raiz do repositório, rode os comandos abaixo para verificar a aplicação e a interface. O PowerShell também pode executar a suíte sobre PostgreSQL local com `$env:NORDEN_TEST_POSTGRES='1'; node --test norden/tests/integration.test.mjs`, com as dependências já instaladas.

```sh
npm --prefix norden ci
npm --prefix preview ci
npm --prefix norden test
npm --prefix norden run build
npm --prefix preview run typecheck
npm --prefix preview run build:live
```

## Auditoria em branch local — 27/11/2026

O trabalho partiu de `979d592b09a662d0e3462402c52486fd28d521ee` e foi revisado em `auditoria/norden-2026-11-27`. Os testes usaram SQLite com carga fictícia e PostgreSQL descartável via PGlite. A consulta pública em produção encontrou quatro serviços, seis produtos, zero profissionais ativos e e-mail de conta desativado.

| Gate | Escopo validado |
| --- | --- |
| Preparação | Node 24, arquivos de lock, builds e suítes da linha de base |
| Funcional | Agenda, disponibilidade, conta, estoque, sacola, cotação e pedidos |
| CSS | Temas compartilhados, 13 larguras em retrato e cenário de paisagem |
| UX | Diálogos, foco, busca sem acentos, navegação e fluxos autenticados |
| Desempenho | Movimento governado pela preferência do usuário, carregamento, favicon e medições locais |
| Regressão | Autorização por papel e registro, sessões, concorrência, histórico e ambientes |

A suíte padrão passou com **28 testes** e a suíte de integração sobre PGlite com **26 testes**, aplicando as duas migrações PostgreSQL existentes no banco descartável. Chromium e Firefox foram usados para as telas públicas e os três papéis. Cada motor executou nove percursos de interação. TypeScript, build Node, build da vitrine e build da demonstração passaram. Consulte a [prévia local](README.md#prévia-local-da-vitrine-react-e-dos-portais) para revisar a integração visual.

A validação do e-mail externo, da agenda real, do frete geográfico e de dispositivos físicos ficou pendente. A execução se restringiu à branch local e às bases descartáveis. Dados e configurações de produção foram consultados apenas pelos endpoints públicos.

## Histórico de verificação local

### Interface substituída pelo visual do HTML enviado — 25/11/2026

O arquivo enviado foi preservado em `referencia/interface-original.html`. Seu visual Grafite Premium, emblema, composição editorial e organização Flow/Journey/Care/Store foram adaptados à aplicação com API e SQLite. A demonstração de perfis e a base em localStorage do HTML não substituem a autenticação nem a persistência do projeto.

- Landing reconstruída com tema escuro, fotografia de corte, imagem do salão e cartões dos quatro módulos. Emblema SVG extraído do HTML; o PNG anterior permanece preservado.
- Loja com imagens locais dos produtos, transição ao passar o mouse ou focar, detalhes e adição direta ao carrinho. O estado esgotado não oferece adição.
- Journey com próximo encontro, resumo, fichas por atendimento, produtos utilizados e recomendados em cartões pequenos, retorno sugerido e acesso ao Care. Os nomes registrados na sessão permanecem históricos; itens desativados deixam de oferecer compra. Notas internas não são incluídas na resposta da linha do tempo.
- Tesoura minimalista animada na inicialização e na abertura de fichas; sinalização de envio, confirmação, notificações e etapa atual. Preferência por movimento reduzido respeitada.
- Os 18 testes de integração passaram com `node --test --test-isolation=none tests/integration.test.mjs`. Build concluído. O teste adicional verifica os cartões, links, histórico após desativação de produto e isolamento entre contas.
- Inspeção visual no Edge: landing e fotografias dos produtos na loja em janela ampla; área Care vazia em janela estreita. A ficha preenchida do Journey foi validada por renderização autenticada automatizada, sem completar um atendimento real no navegador. O navegador integrado estava indisponível. Não houve auditoria integral de acessibilidade ou teste em dispositivo físico.


### Revisão local após importação para VS Code — 25/11/2026

- Projeto extraído em `Documents/NORDEN/norden`, com workspace `../NORDEN.code-workspace` e tarefas de preparação, execução, testes, build e depuração por F5.
- Corrigida a leitura do carrinho de visitante: valores inválidos no armazenamento local, como `null`, listas e quantidades inválidas, podiam interromper a renderização. Um teste adicional cobre a navegação pública e a tela de carrinho nessas condições, inclusive quando o armazenamento está bloqueado.
- Corrigido o empacotamento: `dist/` agora inclui os testes referenciados pelo `package.json`, as instruções de QA e o iniciador do Windows.
- Build concluído. Os 17 testes passaram no código-fonte e novamente dentro de `dist/`, usando `node --test --test-isolation=none tests/integration.test.mjs`. Essa opção contorna a restrição de criação de subprocessos do ambiente de revisão.
- O comando padrão `npm test` também passou com os 17 testes, executado fora dessa restrição de subprocessos.
- Os arquivos JSON de configuração do VS Code foram validados. O comando de abertura do workspace terminou sem erro fora do ambiente restrito. A ferramenta de inspeção da interface estava indisponível, portanto a janela do editor e as telas no navegador não foram confirmadas visualmente nesta revisão.
- A revisão incluiu leitura das rotas, autenticação, autorização, agenda, atendimento, catálogo, estoque, checkout e interface. A aprovação dos testes não substitui homologação operacional. Permanecem os limites já documentados: pagamento simulado ou presencial, envio de e-mail local e distância de entrega informada pelo usuário.

### Verificação que acompanhava o pacote original

25 de novembro de 2026. Instâncias locais com dados fictícios e banco SQLite isolado por teste. O navegador foi usado para verificar a experiência pública. A API autenticada foi verificada com clientes HTTP de teste. A suíte executou 16 testes e todos passaram. As telas privadas foram renderizadas com respostas autenticadas para os três papéis.

| Critério | Resultado e evidência |
| --- | --- |
| QA-01 · Landing e navegação | Aprovado no navegador. Agendamento, detalhe de produto e carrinho acessíveis. Landing, loja e agenda verificadas em quadros móveis de 390 px, sem rolagem horizontal no conteúdo. |
| QA-02 e QA-03 · Cadastro e papel | Aprovados pela API. Cadastro, login, verificação local, recuperação descartável e bloqueio de elevação de privilégio. |
| QA-04 · Isolamento entre contas | Aprovado pela API. Bloqueio de acesso a reserva, pedido, endereço e foto de outra conta. Profissional restrito a atendimentos atribuídos. |
| QA-05 a QA-09 · Agenda | Aprovados pela API. Serviço de 45 min com vínculo, intervalo técnico, fuso de Brasília, bloqueios, profissional inativo, preço revalidado e colisão de reservas. Preferência registrada sem pedido. |
| QA-10 a QA-13 · Flow | Aprovados pela API. Elegibilidade de 45 min em janela de 60 min, exclusão de 90 min, recusa, expiração, ocupação do horário e aceite com histórico. |
| QA-14 a QA-18 · Atendimento e Journey | QA-14 a QA-17 aprovados pela API. Produtos usados e recomendados separados, conclusão idempotente, manual histórico preservado e notas internas fora do acesso do cliente. QA-18 verificado pelo vínculo de produto no Journey e pelos fluxos separados de produto e carrinho. O clique autenticado do Journey até o checkout não foi executado no navegador. |
| QA-19 a QA-24 · Loja e checkout | Aprovados pela API. Entrada acima do estoque, produto esgotado, alteração de preço, retirada sem taxa, entrega de 4 km a R$ 2,50/km, cobertura e disputa pela última unidade. |
| QA-25 a QA-27 · Estados e estoque | Aprovados pela API. Cancelamento libera reserva, expedição consome estoque uma vez e retirada recusa estado de entrega. |
| QA-28 · Dashboard e simulação | Identificação de pagamento simulado verificada na API. Painel usa contagens derivadas do ambiente e indica que a simulação não é receita. |
| QA-29 · Falhas e sessão | Invalidação de sessões após redefinição verificada pela API. Falhas de rede física não foram reproduzidas. A interface tem tratamento de reconexão e de sessão expirada. |
| QA-30 · Acessibilidade e vazio | Layout móvel, árvore de acessibilidade, foco e navegação pública inspecionados. Sem auditoria WCAG integral ou verificação em dispositivo físico. |

### Execução e decisões

1. Fundação: criação e aplicação de migration, teste de abertura do SQLite e verificação do fuso.
2. Identidade e catálogo: acesso por papel, cadastro de cliente, convite administrativo e visibilidade do catálogo.
3. Agenda: disponibilidade, preço, duração, bloqueios e concorrência.
4. Atendimento: proteção de notas e fotos, produtos efetivamente usados, manual revisado e histórico.
5. Flow: validação das janelas, aceite, recusa, expiração e ocupação concorrente.
6. Store: preços em centavos, carrinho, retirada e entrega estimada, reservas e baixas de estoque.
7. Integração: verificação do site público em desktop, dos fluxos móveis e dos dados no servidor, incluindo notificações do atendimento.
8. Entrega: build, instruções de execução e pacote sem contas ou dados previamente gravados.

A especificação original está em `referencia/`. As decisões da marca anexada prevalecem sobre as sugestões provisórias daquele documento. A interface usa Grafite, Ônix Black, Steel Taupe, Brushed Bronze e Soft Stone. O arquivo do logotipo foi copiado sem alteração. As fotografias de referência foram geradas para a interface e otimizadas em WebP.
