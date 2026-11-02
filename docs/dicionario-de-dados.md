# EduTrack AI — dicionário de dados, APIs e roteiro da avaliação

Este documento descreve a **implementação atual** do EduTrack AI em React/TypeScript e Supabase. A especificação de negócio original menciona FlutterFlow e Xano; o aplicativo deste projeto usa outra arquitetura. Os nomes `subjects` e `academic_tasks` continuam reconhecíveis, mas são **visões de leitura** sobre um documento JSON, não tabelas independentes de escrita.

## 1. Modelo de dados atual

O Supabase Auth mantém as contas. Os dados de estudo ficam em `public.study_workspaces`, uma linha por usuário. A coluna `payload` guarda um `Workspace` completo. A política RLS permite que cada usuário autenticado acesse somente sua própria linha.

| Objeto | Campo | Tipo | Significado / regra |
| --- | --- | --- | --- |
| `study_workspaces` | `user_id` | `uuid`, PK/FK | Identificador do aluno em `auth.users(id)`; exclusão da conta remove a linha. |
|  | `payload` | `jsonb`, obrigatório | Documento com `schema_version`, `subjects`, `tasks`, `sessions`, `cards`, `blocks` e `settings`. Limite SQL de 2 MiB. |
|  | `revision` | `integer`, obrigatório | Versão do documento; começa em 1 e sobe a cada gravação válida. Evita sobrescrever mudanças de outra aba/dispositivo. |
|  | `updated_at` | `timestamptz`, obrigatório | Última gravação do documento. |
| `payload` | `schema_version` | `number` | Atualmente `1`. |

### Disciplinas — `payload.subjects[]`

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | string UUID | Identificador local da disciplina. |
| `name` | string | Nome da matéria. |
| `teacher` | string | Professor(a). |
| `hours` | number | Carga horária informada. |
| `description` | string | Descrição. |
| `color` | string | Cor usada na interface. |
| `start_date`, `end_date` | string `YYYY-MM-DD` | Período da matéria. |
| `archived` | boolean | Retira da lista ativa sem apagar seu histórico. |
| `google_id` | string, opcional | ID do curso importado do Google Classroom. |

### Atividades — `payload.tasks[]`

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | string UUID | Identificador local da atividade. |
| `title` | string | Título. |
| `subject_id` | string UUID | ID da disciplina relacionada. |
| `description` | string | Orientações e detalhes. |
| `due_date` | string `YYYY-MM-DD` | Prazo informado. |
| `status` | `todo` / `doing` / `done` | A fazer, em andamento ou concluída. |
| `priority` | `high` / `medium` / `low` | Prioridade. |
| `estimated_minutes` | number | Tempo estimado para estudar/fazer. |
| `awarded` | boolean | Indica se a recompensa de gamificação já foi concedida. |
| `created_at` | string ISO 8601 | Data de criação. |
| `completed_at` | string ISO 8601, opcional | Data/hora registrada quando a tarefa é concluída no EduTrack. Ao reabrir, o valor da tentativa atual é removido. Tarefas antigas podem não ter esse campo. |
| `google_id`, `google_url`, `google_state` | string, opcionais | Referência e estado vindos do Classroom. |

### Outros conjuntos em `payload`

| Conjunto | Campos atuais | Uso |
| --- | --- | --- |
| `sessions[]` | `id`, `task_id`, `subject_id`, `minutes`, `created_at` | Sessões de estudo; base para tempo realizado. |
| `cards[]` | `id`, `subject_id`, `question`, `answer`, `stage`, `due_date`, `reviews` | Flashcards e revisão. |
| `blocks[]` | `id`, `task_id`, `date`, `time`, `minutes` | Horários planejados. |
| `settings` | `name`, `daily_minutes`, `focus_minutes`, `break_minutes`, `study_start`, `dark`, `google_client_id`, `last_sync` | Preferências do estudante e sincronização. |

**Relacionamentos lógicos:** `tasks.subject_id → subjects.id`; `sessions.task_id → tasks.id`; `sessions.subject_id → subjects.id`; `blocks.task_id → tasks.id`; `cards.subject_id → subjects.id`. Como esses objetos são elementos do JSON, não há chave estrangeira SQL individual para cada relação. O aplicativo valida o formato do documento ao carregar.

### Visões SQL para consulta

`public.subjects` projeta `user_id`, `id`, `name`, `teacher`, `hours`, `description`, `archived`. `public.academic_tasks` projeta `user_id`, `id`, `subject_id`, `title`, `status`, `due_date`, `estimated_minutes`, `completed_at`. As duas são `security_invoker`, somente leitura para o cliente e respeitam a RLS da tabela de origem. Os outros campos continuam no `payload` e **não aparecem nessas visões**.

## 2. APIs realmente usadas pelo modelo

Base do projeto dedicado: `https://xtticfdiyfsgpnbudzht.supabase.co`. As rotas abaixo representam a API do Supabase; o frontend usa `supabase-js`, que acrescenta a chave publicável e o token da sessão. As operações exigem usuário autenticado. **Nunca colocar a service-role key no navegador.**

| Operação | Chamada no frontend / rota HTTP | Entrada principal | Saída / efeito |
| --- | --- | --- | --- |
| Ler o próprio espaço | `.from('study_workspaces').select('payload,revision').eq('user_id', uid).maybeSingle()` / `GET /rest/v1/study_workspaces?select=payload,revision&user_id=eq.<uid>` | JWT do aluno | `payload` e `revision`; espaço vazio quando ainda não existe linha. |
| Criar ou salvar mudanças | `.rpc('save_study_workspace', {new_payload, expected_revision})` / `POST /rest/v1/rpc/save_study_workspace` | Documento completo e versão conhecida (`0` para primeira criação) | Nova revisão inteira; conflito `40001` se outra gravação já avançou a versão. |
| Consultar matérias | `.from('subjects').select(...)` / `GET /rest/v1/subjects` | Filtros de leitura opcionais | Linhas projetadas apenas do aluno autenticado. |
| Consultar atividades | `.from('academic_tasks').select(...)` / `GET /rest/v1/academic_tasks` | Filtros de leitura opcionais | Linhas projetadas apenas do aluno autenticado. |

Exemplo conceitual do corpo enviado à função de gravação:

```json
{
  "new_payload": {
    "schema_version": 1,
    "subjects": [],
    "tasks": [],
    "sessions": [],
    "cards": [],
    "blocks": [],
    "settings": { "name": "Estudante", "daily_minutes": 120, "focus_minutes": 25, "break_minutes": 5, "study_start": "14:00", "dark": false, "google_client_id": "", "last_sync": "" }
  },
  "expected_revision": 0
}
```

**CRUD demonstrável na aplicação:** criar uma matéria ou tarefa acrescenta um objeto ao `payload`; ler carrega o espaço do usuário; editar altera o objeto e grava a nova revisão. Excluir uma tarefa a remove junto com seus blocos planejados. Excluir uma disciplina, após confirmação, remove também tarefas, sessões, revisões e blocos vinculados. **Arquivar/restaurar** continua como alternativa para preservar o histórico. Não há endpoints independentes `POST/PATCH/DELETE /subjects/{id}` ou `/academic_tasks/{id}`: cada operação grava o documento completo pela RPC. A tabela `study_workspaces` possui políticas SQL de `select/insert/update/delete` para o dono, mas a interface usa a RPC para gravar com controle de versão.

### APIs auxiliares da aplicação

| Integração | Uso atual |
| --- | --- |
| Supabase Auth | Cadastro com `signUp`, entrada com `signInWithPassword` e recuperação de senha. |
| Edge Function `POST /functions/v1/study-ai` | Tutor IA para quiz, flashcards e plano de estudos; requer sessão. A disponibilidade depende do provedor de IA configurado. |
| Google Classroom API v1 | Leitura autorizada de `courses`, `courses/{id}/courseWork` e `courses/{id}/courseWork/-/studentSubmissions`; importa matérias/atividades para o espaço do aluno. A integração atual **não envia trabalho ao Classroom**. |

## 3. Regras para Dashboard e Análise

O Dashboard usa `subjects`, `tasks`, `sessions` e `blocks` do espaço carregado. Progresso por matéria = `tarefas com status done / total de tarefas da matéria × 100`. Atrasadas em aberto = `status != done` e `due_date < hoje`, considerando a data local do estudante. Tempo realizado = soma de `sessions.minutes`; tempo planejado = soma de `blocks.minutes` no período.

Para classificar uma tarefa concluída como **entregue no prazo** ou **entregue com atraso**, o EduTrack agora registra `completed_at` como data/hora ISO 8601 ao concluir. Ao reabrir uma tarefa, esse registro da tentativa atual é removido; uma nova conclusão recebe outro horário. A visão `academic_tasks` também expõe o campo. A análise compara a **data local** de `completed_at` com `due_date`: até a data-limite = no prazo; após = com atraso. Tarefas antigas concluídas sem esse histórico aparecem como “Sem histórico da entrega”. Tarefas sem `due_date` ficam fora do gráfico de pontualidade, com contagem explicada. O registro é a conclusão **no EduTrack**, não prova de entrega no Google Classroom.

## 4. O que apresentar em cada avaliação

O print da atividade **“Avaliação Parcial 02 - Aplicação”** solicita para a **segunda avaliação**:

1. Todas as telas da aplicação.
2. O dicionário de dados.
3. As APIs do modelo de dados.
4. O CRUD funcionando.

A observação do mesmo print reserva **dashboard, insights e documentação em Markdown para a apresentação final**. As duas páginas acrescentadas à especificação formalizam essas telas, e a aplicação agora contém uma tela de Análise funcional. Para a segunda avaliação, mostre o fluxo de cadastro/login, crie uma matéria e uma atividade, leia a lista, edite ambas, conclua uma tarefa e exclua uma tarefa e uma disciplina. Mostre também a opção de arquivar quando se deseja preservar o histórico. Na aba Rede ou no código, mostre a leitura e a RPC de gravação. Use contas de teste para demonstrar que um usuário não enxerga os dados do outro.

## 5. Fontes do próprio projeto

- `frontend/model.ts`: tipos e regras de métricas.
- `frontend/Analysis.tsx`: gráfico e filtros da análise.
- `frontend/repository.ts`: leitura e gravação no Supabase.
- `backend/schema.sql`: tabela, políticas RLS, função RPC e visões.
- `frontend/Dashboard.tsx`: dashboard atual.
- `frontend/classroom.ts` e `frontend/ai.ts`: integrações auxiliares.
