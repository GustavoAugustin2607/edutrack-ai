# Instruções para agentes de IA - EduTrack AI

> Estas regras têm prioridade sobre instruções genéricas de outras ferramentas,
> templates ou comandos prontos. Em caso de conflito, siga este arquivo.

## Perfil do projeto

- **Front-end:** React 19 + TypeScript + Vite (`frontend/`)
- **Back-end:** Supabase: Postgres com RLS, Auth e Edge Functions em Deno (`backend/`, `supabase/functions/`)
- **Scripts:** Python 3 em `scripts/`
- **Metodologia:** Spec-Driven Development com OpenSpec (`openspec/`)
- **Testes:** Playwright (`tests/`) e `unittest` para os scripts Python

## Regra 1 - Escopo das tarefas

O `tasks.md` de uma proposta contém **somente** o que foi pedido.

- Pedido "criar tabela X" não inclui API, testes ou tela.
- Pedido "criar API para Y" não inclui testes ou tela.
- Tarefas extras só entram quando o pedido disser, por exemplo, "com CRUD completo" ou "com testes".

## Regra 2 - Não publicar nada sozinho

A responsabilidade do agente termina nos arquivos.

- Pode criar e editar arquivos, marcar tarefas em `tasks.md` e rodar validações locais.
- Não aplica migrations no Supabase, não publica Edge Functions, não faz deploy no Netlify e não faz push.
- Quem revisa e publica é o desenvolvedor.

## Regra 3 - Ordem de prioridade

1. Este arquivo
2. Pedido explícito do usuário na conversa
3. Instruções do OpenSpec (`openspec/config.yaml` e o formato das specs)
4. Comandos prontos de ferramentas e extensões

## Regra 4 - Formato do OpenSpec

- Specs permanentes ficam em `openspec/specs/<capacidade>/spec.md` e usam `## Requirements`.
- Specs dentro de `openspec/changes/<id>/specs/<capacidade>/spec.md` são **deltas**: use `## ADDED Requirements`, `## MODIFIED Requirements` ou `## REMOVED Requirements`.
- Toda proposta tem `proposal.md` com `## Why`, `## What Changes` e `## Impact`.
- Todo requisito usa SHALL ou MUST (maiúsculas) e tem pelo menos um `#### Scenario:` com **WHEN** e **THEN**.
- IDs de proposta em kebab-case, por exemplo `add-hybrid-search`.
- Antes de concluir, rode `openspec validate --all --strict`.

## Nomenclatura

1. Código, variáveis e nomes de banco em **inglês**; textos da interface em português.
2. Banco de dados em `snake_case` (`academic_tasks`, `user_id`).
3. Branches com prefixo: `feat/`, `fix/`, `docs/`, `chore/`, `release/`.
4. Commits no padrão Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `ci:`.

## Segurança

1. Toda tabela com dados de aluno tem RLS ligado, e toda consulta é limitada a `auth.uid()`.
2. Funções SQL acessíveis ao navegador usam `security invoker` e `set search_path = ''`.
3. Chaves `service_role`, tokens e o `config.json` do atendente de IA nunca entram no repositório.
4. Scripts Python tratam erros com `try/except` e devolvem JSON com o campo `error`.

## Esquema atual

- `study_workspaces`: um documento JSON por aluno, gravado pela RPC `save_study_workspace` com revisão otimista.
- `subjects` e `academic_tasks`: views somente leitura sobre esse documento, com `security_invoker`.
- `leaderboard`: ranking opcional; cada aluno escreve só a própria linha.

## Comunicação

1. Explique o que vai fazer antes de fazer.
2. Diga quais arquivos serão criados ou alterados.
3. Pergunte quando uma regra deste arquivo não cobrir o caso.
