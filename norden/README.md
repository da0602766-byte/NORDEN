# NORDEN — Salão Inteligente Masculino

Aplicação independente com interface web em português, API e banco SQLite. O pacote inclui a especificação, a paleta Grafite Premium e o logotipo PNG original. As fotografias editoriais, os preços, os serviços, os profissionais e os produtos da carga fictícia são ilustrativos.

## Executar

### Abrir no VS Code

Abra `../NORDEN.code-workspace` ou a pasta `norden` no VS Code. Pressione **F5** e selecione **NORDEN: iniciar e depurar**. A tarefa prepara a base fictícia e inicia o servidor em **http://127.0.0.1:4173**. Na primeira execução, a senha das contas de demonstração aparece no terminal da tarefa de preparação; guarde-a para os próximos acessos. Encerre o servidor com **Shift+F5**.

O menu **Terminal → Executar Tarefa** também oferece **NORDEN: iniciar**, **NORDEN: testar** e **NORDEN: build**. Inicie apenas uma instância por porta. O atalho **Ctrl+Shift+B** executa o build. Não é necessário instalar extensões nem executar `npm install`.

### Pelo terminal

Requer Node.js 24 ou superior. O projeto usa os módulos nativos do Node e dispensa instalação de dependências.

No Windows, extraia o ZIP e abra **Iniciar_NORDEN_Windows.cmd** dentro da pasta `norden`. Abra **http://127.0.0.1:4173** no navegador e mantenha o terminal aberto.

Em Windows, macOS ou Linux, os comandos equivalentes dentro da pasta são:

```sh
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

## Percursos de demonstração

1. **Atendimento e compra.** Entre como cliente e agende um serviço. Na conta profissional correspondente ou como gestor, abra a reserva, inicie o atendimento, registre o procedimento e os produtos, revise o manual e conclua. Volte ao cliente, abra o Journey e o Care, siga um link de produto, adicione ao carrinho, revise a retirada ou a entrega e confirme. Na gestão, percorra a fila de pedidos e confira as movimentações do estoque.
2. **Flow.** No painel de gestão, abra a agenda do próximo dia útil de André e cancele o atendimento de **Corte & barba** das 10h em nome de Mateus. Abra o Flow e ofereça o horário ao cliente Lucas. A vaga de 60 minutos comporta o corte de 45 minutos de Lucas. O tratamento de 90 minutos fica de fora. Entre como Lucas para aceitar ou recusar.
3. **Entrega.** No checkout, informe um endereço fictício completo e 4 km. A carga inicial aplica R$ 2,50 por km, totalizando R$ 10,00 de taxa. Endereços podem ser cadastrados no perfil. As regras podem ser alteradas em Gestão → Configurações.
4. **Privacidade.** Ao entrar como cliente, ative ou retire o consentimento no perfil. Os alertas ficam cifrados no banco. A equipe autorizada consulta o dado no detalhe do atendimento. Cada acesso é auditado. Use apenas exemplos fictícios.

## Arquitetura e manutenção

A interface atual adapta o HTML de referência preservado em `referencia/interface-original.html`. O tema escuro e as animações estão em `public/norden.css`; a navegação e os formulários continuam conectados à API. O Journey mostra as fichas concluídas com cartões de produtos usados e recomendados, sem incluir notas internas. Fotos de catálogo e emblema são arquivos locais, dispensando CDN de estilos e scripts. Animações respeitam a preferência de movimento reduzido do sistema.

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

## Limites desta entrega

O projeto foi testado para avaliação com dados fictícios. O checkout registra pagamento simulado ou presencial pendente. A distância de entrega é informada e a taxa é calculada pelo sistema. Gateway, mapas e envio externo são integrações futuras. As áreas de privacidade registram e acompanham solicitações, cuja execução depende da política do salão. Antes de uso comercial, a equipe deve definir a base legal e a retenção, aprovar o conteúdo comercial, configurar recuperação real e infraestrutura segura, e validar a operação em homologação com usuários. O pacote inclui servidor e banco locais, sem serviço de produção configurado.
