# Modelo de dados - EduTrack AI

Banco: PostgreSQL no Supabase (projeto `xtticfdiyfsgpnbudzht`). Todas as tabelas com dados de aluno têm Row Level Security.

## Diagrama

```mermaid
erDiagram
  AUTH_USERS ||--|| STUDY_WORKSPACES : "tem um"
  AUTH_USERS ||--o| LEADERBOARD : "aparece no ranking (opcional)"
  AUTH_USERS ||--o{ AI_GENERATIONS : "pede gerações"
  AUTH_USERS ||--o{ LOCAL_AI_JOBS : "coloca na fila"
  STUDY_WORKSPACES ||--o{ SUBJECTS : "view"
  STUDY_WORKSPACES ||--o{ ACADEMIC_TASKS : "view"
  SUBJECTS ||--o{ ACADEMIC_TASKS : "subject_id"

  AUTH_USERS {
    uuid id PK
    text email
    jsonb user_metadata
  }
  STUDY_WORKSPACES {
    uuid user_id PK, FK
    jsonb payload "documento do aluno (até 2 MiB)"
    int revision "revisão otimista"
    timestamptz updated_at
  }
  SUBJECTS {
    uuid user_id FK
    text id
    text name
    text teacher
    numeric hours
    text description
    boolean archived
  }
  ACADEMIC_TASKS {
    uuid user_id FK
    text id
    text subject_id FK
    text title
    text status "todo, doing, done"
    text due_date
    numeric estimated_minutes
    text completed_at
  }
  LEADERBOARD {
    uuid user_id PK, FK
    text display_name
    int xp
    int level
    int streak
    date week_start
    int week_xp
    text house
  }
  AI_GENERATIONS {
    uuid user_id FK
    uuid request_id
    text kind "quiz, flashcards, plan, explain"
    text status
    jsonb result
    timestamptz created_at
  }
  LOCAL_AI_JOBS {
    uuid id PK
    uuid user_id FK
    jsonb payload
    text status "queued, running, done, failed"
    jsonb result
    timestamptz expires_at "6 minutos"
  }
  LOCAL_AI_HOST {
    boolean id PK
    text token_hash "só o hash do token"
    boolean online
    text model
  }
```

## Como o modelo funciona

- **`study_workspaces`** guarda um documento JSON por aluno com disciplinas, tarefas, sessões de foco, cartões de revisão, agenda, configurações e o campo `game`. Cada gravação passa pela RPC `save_study_workspace`, que só aceita a revisão atual e devolve erro `40001` se outra aba gravou antes.
- **`subjects`** e **`academic_tasks`** são views somente leitura sobre esse documento, com `security_invoker`, então respeitam a RLS da tabela de origem. `academic_tasks.subject_id` liga cada tarefa à disciplina.
- **`leaderboard`** é o ranking opcional: cada aluno grava só a própria linha, e o XP semanal soma a Taça das Casas.
- **`ai_generations`** registra as gerações do Tutor IA com limite por minuto e por dia, e torna repetições idempotentes.
- **`local_ai_jobs`** e **`local_ai_host`** formam a fila da IA que roda no PC: no máximo 3 pedidos ativos, 1 por aluno, com expiração em 6 minutos.

## Segurança

| Tabela | Quem lê | Quem grava |
|---|---|---|
| study_workspaces | o próprio aluno | o próprio aluno, pela RPC com revisão |
| subjects, academic_tasks | o próprio aluno | ninguém (views) |
| leaderboard | alunos logados | o próprio aluno |
| ai_generations, local_ai_jobs, local_ai_host | só o servidor (service_role) | só o servidor |

Funções: `save_study_workspace` (gravação), `search_subjects` (busca híbrida), `claim_ai_generation` (limites da IA), `enqueue_local_ai` e `local_ai_worker` (fila da IA local).

Detalhes de cada campo: [dicionario-de-dados.md](dicionario-de-dados.md). SQL: [`backend/`](../backend).
