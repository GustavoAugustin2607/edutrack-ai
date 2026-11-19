# Referências de design e estrutura - EduTrack AI

## Figma Community

### Template 1: Educational Platform - Student Dashboard Light and Dark mode
- Link: https://www.figma.com/community/file/1038033084068266047/educational-platform-student-dashboard-light-and-dark-mode
- Por que é útil: mostra o mesmo painel do aluno nos temas claro e escuro com a mesma estrutura de cards. Foi a referência para o EduTrack ter tokens de cor e não telas separadas por tema.

### Template 2: Student Portal Dashboard
- Link: https://www.figma.com/community/file/1291025014193440697/student-portal-dashboard
- Por que é útil: a barra lateral com grupos de navegação e o resumo de progresso no topo são claros e consistentes. Inspirou a navegação em dois grupos (Estudar e Progresso) e as métricas clicáveis da visão geral.

## Protótipo próprio do EduTrack AI
- Link: https://www.figma.com/design/gcyuRLfqGOko7hw3hKKMOl
- Telas: Visão geral, Planejamento, Tarefas, Disciplinas, Foco, Arena, Jornada, Análise, Integrações e Configurações.

## Estrutura de back-end (Supabase, no lugar do Xano Marketplace)
- Autenticação: Supabase Auth com e-mail e senha.
- Perfil e dados do aluno: um documento por usuário com Row Level Security.
- Tarefas: views `subjects` e `academic_tasks` somente leitura, ligadas por `subject_id`.

## Bibliotecas de componentes consultadas
Veja também `docs/referencias.md` (React Bits, 21st.dev, Uiverse, Originkit e GSAP).
