# EduTrack AI

Aplicativo de organização de estudos em português. O projeto foi desenhado como
uma mesa de estudos: claro, editorial e direto, com cobalto, grafite e laranja.
O front-end fica separado em `frontend/` para poder ser entregue ao grupo.

## O que já está pronto

- Cadastro é a primeira tela: nome, e-mail, senha, confirmação e aviso de
  confirmação por e-mail. Entrar, recuperar senha e explorar a demonstração
  continuam disponíveis.
- Visão geral com métricas reais, ritmo dos últimos sete dias, próximo passo,
  prazos, progresso por disciplina e atalho para o Tutor IA.
- Análise por disciplina com barras de entregas no prazo, entregas após o prazo,
  pendências vencidas e histórico desconhecido; filtros de período e lista de
  atividades ligada ao gráfico.
- Planejamento semanal separado da visão geral, com agenda, capacidade que
  reserva 20% do dia, drag and drop, alternativa por botão, validação de
  sobreposição e desfazer.
- Tarefas, disciplinas, foco, flashcards com repetição espaçada, conquistas,
  exportação PDF/JSON/ICS e Google Classroom.
- CRUD de tarefas e disciplinas, incluindo exclusão confirmada de disciplina
  com remoção dos dados vinculados; a alternativa de arquivar preserva o histórico.
- Tutor IA com quiz interativo, flashcards editáveis que só são salvos após
  revisão, explicação de conceitos e plano que o aluno aplica conscientemente
  à agenda.
- Movimento curto com GSAP para transições e revelação do dashboard; o sistema
  respeita `prefers-reduced-motion`.

## Gamificação

A Jornada (aba antes chamada Conquistas) transforma o progresso real em jogo.
Todo XP é derivado do que o aluno fez; nada pode ser "inventado" pela interface.

- **XP com bônus**: tarefa +30 (+15 prioridade alta, +5 média, +10 no prazo),
  foco +2/min (+15 em sessões de 25 min ou mais), revisão +5, quiz do Tutor IA
  +10 por acerto (+25 gabarito), missões e baú diário.
- **Níveis e patentes**: cada nível custa 50 XP a mais que o anterior. Patentes
  Calouro → Aprendiz → Dedicado → Erudito → Mestre → Sábio → Lenda mudam a cor
  do perfil. Subir de nível abre uma celebração com confete e dá 20 moedas.
- **Sequência (streak)**: dias seguidos com qualquer atividade. Protetores
  comprados na loja cobrem automaticamente um dia perdido.
- **Missões diárias** (3 por dia, estáveis durante o dia) com **baú diário** ao
  completar todas, e **desafios semanais** com recompensas maiores.
- **33 conquistas** em 6 grupos, com raridade (comum, rara, épica, lendária) e
  conquistas secretas. Desbloqueios aparecem na hora com aviso e confete.
- **Moedas e loja**: temas de cor para o app inteiro, molduras animadas de
  avatar, títulos e protetores de sequência. Alguns itens exigem nível mínimo.
- **Ranking** semanal e geral no Supabase, opcional (o aluno escolhe aparecer).
  Só nome de exibição, título, moldura, nível, sequência e XP são publicados.
- **Mapa de constância** das últimas 18 semanas e histórico de XP.

Arquivos: `frontend/game.ts` (motor), `frontend/GameUI.tsx` (HUD, missões,
celebrações), `frontend/Journey.tsx` (página), `frontend/game.css`,
`backend/gamification.sql` (tabela `leaderboard` com RLS, já aplicada).

Os dados de jogo ficam no campo opcional `game` do documento do aluno, então
contas antigas continuam válidas e são migradas automaticamente.

## Chapéu Seletor e Casas

Logo após o cadastro (no primeiro login), o **Chapéu Seletor** abre uma
cerimônia animada: 8 perguntas sobre como o aluno aprende e um chapéu que
"pensa" antes de anunciar a casa. São quatro casas de ensinamento, cada uma um
perfil de aprendizagem:

| Casa | Perfil | Lema |
|---|---|---|
| Lumina | Visual | Ver para compreender. |
| Eco | Auditivo e social | Quem explica, aprende duas vezes. |
| Forja | Prático | Aprender fazendo. |
| Raiz | Reflexivo (leitura e escrita) | Profundidade antes de velocidade. |

A aba **Jornada → Casa** mostra o perfil completo (percentual por casa),
pontos fortes, dicas de estudo e a **Taça das Casas**: o XP semanal de quem
participa do ranking, somado por casa. Refazer a cerimônia é grátis se a casa
continuar a mesma, e custa 150 moedas se mudar.

## Arena

Aba de minijogos que usam os flashcards do aluno (ou um baralho de exemplo
enquanto ele tiver menos de 4 cartões):

- **Quiz Relâmpago**: 60 s, 4 alternativas, combo até ×5, erro custa 3 s.
- **Jogo da Memória**: pares pergunta ↔ resposta, 100 pontos no perfeito.
- **Verdadeiro ou Falso**: 12 rodadas, bônus para respostas em menos de 3 s.

Partidas viram XP (até 150 XP por dia), contam para missões, conquistas,
sequência e para a Taça das Casas. Há efeitos sonoros opcionais.

## Tutor IA com pesquisa na web

Antes de gerar, a função `study-ai` pesquisa o tema na Wikipédia (português,
com inglês como alternativa) e envia até 3 trechos como fonte. As instruções
pedem que o modelo use as fontes como base e nunca as contradiga. As fontes
aparecem no site, abaixo do resultado.

No PC, `local-ai/worker.mjs` coloca as fontes antes do pedido e **verifica o
quiz**: gera 2 perguntas extras, responde cada uma "às cegas" e prioriza as
que batem com o gabarito. O worker antigo ficou em
`D:EduTrack-AIworker.mjs.backup`.

## Design

O app usa um layout de aplicativo: barra lateral com o perfil gamificado
(nível, sequência, moedas, XP do dia) e navegação em dois grupos (Estudar e
Progresso), barra superior com busca (Ctrl K) e, no celular, abas inferiores
com um menu "Mais". O sistema visual fica em `frontend/theme.css`, carregado
por último: papel quente, grafite, cobalto e laranja, títulos em Bricolage
Grotesque e corpo em DM Sans, cores chapadas e bordas no lugar de sombras.
Animações: cartões entram em cascata, números contam até o valor, barras de
progresso se preenchem, o destaque do menu desliza e concluir tarefa tem
retorno visual. Tudo respeita `prefers-reduced-motion`.

## Cadastro sem e-mail

O cadastro usa a Edge Function `signup`, que cria a conta já confirmada
(`admin.createUser` com `email_confirm: true`) e o site entra em seguida.
Assim ninguém depende do serviço de e-mail padrão do Supabase, limitado a
cerca de 2 envios por hora. A recuperação de senha continua por e-mail; para
o link não cair em `localhost`, a Site URL em Authentication → URL
Configuration deve ser `https://edutrack-ai-gugaa-2026.netlify.app`.

## Velocidade da IA local

- O PC e o site usam espera na linha (long-poll) nas funções `local-ai-worker`
  e `study-ai`: pedidos são pegos em ~0,5 s e o resultado chega assim que fica
  pronto, com menos chamadas ao Supabase.
- O worker esquenta o modelo ao ligar e o mantém carregado por 15 min.
- Fontes da web limitadas a ~1.800 caracteres cada.
- O `qwen3:8b` está baixado em D:, mas o modelo ativo continua `qwen3.5:4b`:
  na RX 6600 (Vulkan) o 8B gerou 4,4 tokens/s contra 18 do 4B. Para trocar,
  mude `model` em `D:\EduTrack-AI\config.json` e reinicie a IA.
- **Desafio da IA** (Arena): a IA monta uma partida de Quiz Relâmpago sobre
  qualquer tema; no fim, as perguntas podem virar flashcards.

## Arquitetura

```
frontend/                     React + TypeScript
frontend/Dashboard.tsx        Visão geral
frontend/Analysis.tsx         Análise de progresso e pontualidade
frontend/StudyDesk.tsx        Planejamento semanal
frontend/AIStudio.tsx         Experiência de IA no navegador
frontend/AuthGate.tsx         Entrada, cadastro e login
supabase/functions/study-ai/  Edge Function privada para a IA
backend/schema.sql            Espaço de estudos e RLS
docs/Dicionario_de_Dados_e_APIs_EduTrack.md   Modelo, APIs e roteiro da avaliação
backend/ai_schema.sql         Ledger, idempotência e limites da IA
```

O navegador usa somente a chave publishable do Supabase. Dados do estudante
ficam em um documento por conta, protegido por RLS e revisão otimista. O front
não recebe chave service-role nem chave de modelo.

## Supabase

Foi usado somente o projeto novo **EduTrack AI** em São Paulo:
`xtticfdiyfsgpnbudzht`. O projeto Supabase anterior não foi alterado.

O schema principal e o ledger da IA foram aplicados. A Edge Function
`study-ai` está ativa e exige JWT. Ela valida o pedido, confere se tarefas e
disciplinas pertencem à conta, limita cada conta a 5 gerações por minuto e 20
por dia, e torna novas tentativas idempotentes.

### IA hospedada no computador (modo ativo)

O site publicado usa uma fila privada no Supabase. O atendente em
`D:\EduTrack-AI` busca pedidos por HTTPS e gera respostas com Qwen 3.5 4B no
Ollama, usando a Radeon RX 6600 via Vulkan. Nenhuma porta de entrada ou túnel
é necessário. Modelos, executáveis, arquivos temporários e logs ficam no HD D:.

Use os atalhos **Ligar IA - EduTrack** e **Desligar IA - EduTrack** na Área de
Trabalho. Não há inicialização automática. O modelo é descarregado após 60
segundos sem uso; o atalho de desligar encerra os processos desta instalação
e libera os recursos para jogos. O computador deve estar ligado, com internet
e sem suspensão para processar pedidos. A agenda continua acessível quando a IA
está desligada.

Uma geração é processada por vez, com até três pedidos na fila e um por conta.
Não há cota diária de gerações neste modo. Os limites de hospedagem do Supabase
e Netlify continuam aplicáveis. Pedidos expiram em seis minutos; o próximo
ciclo do atendente remove pedidos expirados. Os logs locais não incluem conteúdo
dos estudantes. `config.json` contém uma credencial restrita do atendente,
protegida por permissões do Windows, e não deve ser compartilhado.

O endpoint `local-ai-worker` usa autenticação própria com token aleatório de
256 bits; somente seu hash fica no banco. O endpoint não aceita contas de
estudantes como credenciais de atendente. Tabelas da fila têm RLS e nenhum
acesso direto de navegadores; RPCs só são executáveis por service_role. O PC
não recebe a chave service_role. A função `study-ai` exige login, confere a
propriedade do pedido e valida o JSON gerado antes de entregá-lo ao aluno.

### OpenAI (alternativa, não usada no modo local)

No painel desse projeto novo, abra **Edge Functions → Secrets** e crie:

```
OPENAI_API_KEY=sua_chave
OPENAI_MODEL=gpt-5-mini
```

`OPENAI_MODEL` é opcional. Sem `OPENAI_API_KEY`, o Tutor IA avisa
claramente que ainda não está configurado e não cria conteúdo fictício.

### Autenticação

Em **Authentication → URL Configuration**, defina a Site URL como
`https://edutrack-ai-gugaa-2026.netlify.app` e adicione:

```
https://edutrack-ai-gugaa-2026.netlify.app/**
http://localhost:3000/**
```

Isso permite que confirmação de e-mail e redefinição de senha retornem ao
EduTrack.

O Security Advisor aponta que `ai_generations` não tem policy. Isso é
intencional: a tabela está com RLS forçado, sem acesso para usuários
autenticados, e só a Edge Function com service role a acessa. O Advisor também
recomenda ativar **Leaked Password Protection** em Authentication → Password
Security.

## Google Classroom

1. Crie um Client ID Web no Google Cloud e habilite a Classroom API.
2. Cadastre a origem exata do site publicado e a origem local.
3. Cole o Client ID em **Integrações → Google Classroom**.
4. Conecte e sincronize.

A conexão é somente leitura: não entrega atividades nem altera notas. Os tokens
ficam apenas na memória da sessão.

## Rodar localmente

```sh
npm ci
npm run dev
```

Para o front separado:

```sh
npm run build:frontend
```

O arquivo único sai em `out/index.html`.

## Netlify

`netlify.toml` já configura o build:

```
Build command: npm run build:frontend
Publish directory: out
```

O EduTrack está publicado em
[edutrack-ai-gugaa-2026.netlify.app](https://edutrack-ai-gugaa-2026.netlify.app).

## Verificação

```sh
npm run build:frontend
npm test
```

Os 21 testes Playwright cobrem Chapéu Seletor, Arena, gamificação (missões, XP, loja, ranking protegido), cadastro inicial, demonstração, dashboard,
fluxos de tarefas e disciplinas, agenda, capacidade, foco, revisões,
Classroom sem configuração, proteção do Tutor IA, tema, mobile sem overflow,
continuidade do cronômetro, PDF, classificação na análise e exclusão de
disciplina com dados vinculados.

## Referências visuais

Foram usados React Bits, 21st.dev, Uiverse e Originkit como referências de
interação. A implementação visual e as animações são próprias. Veja
`REFERENCIAS.md`.
