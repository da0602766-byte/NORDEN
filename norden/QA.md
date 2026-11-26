# Verificação do NORDEN

## Interface substituída pelo visual do HTML enviado — 25/11/2026

O arquivo enviado foi preservado em `referencia/interface-original.html`. Seu visual Grafite Premium, emblema, composição editorial e organização Flow/Journey/Care/Store foram adaptados à aplicação com API e SQLite. A demonstração de perfis e a base em localStorage do HTML não substituem a autenticação nem a persistência do projeto.

- Landing reconstruída com tema escuro, fotografia de corte, imagem do salão e cartões dos quatro módulos. Emblema SVG extraído do HTML; o PNG anterior permanece preservado.
- Loja com imagens locais dos produtos, transição ao passar o mouse ou focar, detalhes e adição direta ao carrinho. O estado esgotado não oferece adição.
- Journey com próximo encontro, resumo, fichas por atendimento, produtos utilizados e recomendados em cartões pequenos, retorno sugerido e acesso ao Care. Os nomes registrados na sessão permanecem históricos; itens desativados deixam de oferecer compra. Notas internas não são incluídas na resposta da linha do tempo.
- Tesoura minimalista animada na inicialização e na abertura de fichas; sinalização de envio, confirmação, notificações e etapa atual. Preferência por movimento reduzido respeitada.
- Os 18 testes de integração passaram com `node --test --test-isolation=none tests/integration.test.mjs`. Build concluído. O teste adicional verifica os cartões, links, histórico após desativação de produto e isolamento entre contas.
- Inspeção visual no Edge: landing e fotografias dos produtos na loja em janela ampla; área Care vazia em janela estreita. A ficha preenchida do Journey foi validada por renderização autenticada automatizada, sem completar um atendimento real no navegador. O navegador integrado estava indisponível. Não houve auditoria integral de acessibilidade ou teste em dispositivo físico.


## Revisão local após importação para VS Code — 25/11/2026

- Projeto extraído em `Documents/NORDEN/norden`, com workspace `../NORDEN.code-workspace` e tarefas de preparação, execução, testes, build e depuração por F5.
- Corrigida a leitura do carrinho de visitante: valores inválidos no armazenamento local, como `null`, listas e quantidades inválidas, podiam interromper a renderização. Um teste adicional cobre a navegação pública e a tela de carrinho nessas condições, inclusive quando o armazenamento está bloqueado.
- Corrigido o empacotamento: `dist/` agora inclui os testes referenciados pelo `package.json`, as instruções de QA e o iniciador do Windows.
- Build concluído. Os 17 testes passaram no código-fonte e novamente dentro de `dist/`, usando `node --test --test-isolation=none tests/integration.test.mjs`. Essa opção contorna a restrição de criação de subprocessos do ambiente de revisão.
- O comando padrão `npm test` também passou com os 17 testes, executado fora dessa restrição de subprocessos.
- Os arquivos JSON de configuração do VS Code foram validados. O comando de abertura do workspace terminou sem erro fora do ambiente restrito. A ferramenta de inspeção da interface estava indisponível, portanto a janela do editor e as telas no navegador não foram confirmadas visualmente nesta revisão.
- A revisão incluiu leitura das rotas, autenticação, autorização, agenda, atendimento, catálogo, estoque, checkout e interface. A aprovação dos testes não substitui homologação operacional. Permanecem os limites já documentados: pagamento simulado ou presencial, envio de e-mail local e distância de entrega informada pelo usuário.

## Verificação que acompanhava o pacote original

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

## Execução e decisões

1. Fundação: criação e aplicação de migration, teste de abertura do SQLite e verificação do fuso.
2. Identidade e catálogo: acesso por papel, cadastro de cliente, convite administrativo e visibilidade do catálogo.
3. Agenda: disponibilidade, preço, duração, bloqueios e concorrência.
4. Atendimento: proteção de notas e fotos, produtos efetivamente usados, manual revisado e histórico.
5. Flow: validação das janelas, aceite, recusa, expiração e ocupação concorrente.
6. Store: preços em centavos, carrinho, retirada e entrega estimada, reservas e baixas de estoque.
7. Integração: verificação do site público em desktop, dos fluxos móveis e dos dados no servidor, incluindo notificações do atendimento.
8. Entrega: build, instruções de execução e pacote sem contas ou dados previamente gravados.

A especificação original está em `referencia/`. As decisões da marca anexada prevalecem sobre as sugestões provisórias daquele documento. A interface usa Grafite, Ônix Black, Steel Taupe, Brushed Bronze e Soft Stone. O arquivo do logotipo foi copiado sem alteração. As fotografias de referência foram geradas para a interface e otimizadas em WebP.
