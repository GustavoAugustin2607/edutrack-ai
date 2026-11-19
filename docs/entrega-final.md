# Entrega final - EduTrack AI

Grupo: Gustavo Paulino Augustin e Enzo Cardoso Mariano
Disciplina: Innovation Lab: Advanced No/Low Code - Faculdade Impacta

## O que foi construído

- App de estudos em React + TypeScript, publicado em https://edutrack-ai-gugaa-2026.netlify.app
- Back-end no Supabase: tabela `study_workspaces` com RLS, views `subjects` e `academic_tasks`, RPC de gravação com revisão otimista e RPC `search_subjects` (busca híbrida)
- Scripts Python: progresso, busca híbrida e relatório em PDF, com testes
- Especificações no OpenSpec (17 capacidades) e propostas aplicadas e arquivadas em `openspec/changes/archive/`
- `AGENTS.md` com as regras para agentes de IA
- CI no GitHub Actions: typecheck, lint, build, OpenSpec, testes Python e 21 testes Playwright

## Como rodar

Veja a seção "Rodar localmente" do README.

## Checklist de auditoria

- [x] Nenhuma proposta pendente em `openspec/changes/` (todas em `archive/`)
- [x] `openspec validate --all --strict` sem erros
- [x] Scripts sem código de teste solto; testes em `scripts/test_scripts.py`
- [x] README com instruções para rodar o projeto
- [x] Fluxo testado de ponta a ponta pelos testes Playwright
