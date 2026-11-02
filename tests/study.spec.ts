import { expect, test, type Page } from '@playwright/test';

type SavedWorkspace = {
  subjects: Array<{ id: string; name: string }>;
  tasks: Array<{ id: string; title: string; subject_id: string; awarded: boolean; status: string; estimated_minutes: number; completed_at?: string }>;
  blocks: Array<{ id: string; task_id: string; date: string; minutes: number }>;
  cards: Array<{ subject_id: string; reviews: number; stage: number }>;
  sessions: Array<{ task_id: string; subject_id: string; minutes: number; created_at: string }>;
  settings: { focus_minutes: number; break_minutes: number; daily_minutes: number };
};

async function enterDemo(page: Page) {
  await page.getByRole('button', { name: 'Explorar demonstração' }).click();
  await expect(page.locator('.desk-app')).toBeVisible();
}

async function savedWorkspace(page: Page): Promise<SavedWorkspace> {
  return page.evaluate(() => {
    const raw = localStorage.getItem('edutrack.demo.v1');
    if (!raw) throw new Error('A demonstração não foi salva.');
    return JSON.parse(raw) as SavedWorkspace;
  });
}

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-08T10:00:00') });
  await page.goto('/');
  await enterDemo(page);
});

test('cadastro é a primeira experiência e a demonstração é opcional', async ({
  page,
}) => {
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Crie sua conta', exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('Como você quer ser chamado?')).toBeVisible();
  await expect(page.getByLabel('Confirmar senha')).toBeVisible();
  await page.getByLabel('Como você quer ser chamado?').fill('Gustavo');
  await page.getByLabel('E-mail').fill('gustavo@example.com');
  await page.getByLabel('Senha', { exact: true }).fill('senha-segura');
  await page.getByLabel('Confirmar senha').fill('senha-outra');
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('senhas não são iguais');
  await expect(
    page.getByRole('button', { name: 'Explorar demonstração' }),
  ).toBeVisible();
});

test('dashboard usa dados reais e leva ao próximo passo', async ({ page }) => {
  await expect(
    page.getByRole('heading', { name: 'Bom dia, Estudante', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Ritmo de estudo', { exact: true })).toBeVisible();
  await expect(page.getByText('Agora', { exact: true })).toBeVisible();
  await expect(page.locator('.chart-day')).toHaveCount(7);
  await page.getByRole('button', { name: 'Iniciar foco', exact: true }).click();
  await expect(
    page.getByRole('combobox', { name: 'Tarefa da sessão' }),
  ).toBeVisible();
});

test('task lifecycle, persistence and XP are consistent', async ({ page }) => {
  await page.getByRole('button', { name: 'Tarefas', exact: true }).click();
  await page.getByRole('button', { name: 'Nova tarefa', exact: true }).click();
  await page.getByLabel('O que você precisa fazer?').fill(
    'Revisar redes para a prova',
  );
  await page.getByRole('button', { name: 'Criar tarefa', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Revisar redes para a prova' }),
  ).toBeVisible();
  await page
    .getByRole('checkbox', {
      name: 'Concluir Revisar redes para a prova',
      exact: true,
    })
    .click();
  const firstSave = await savedWorkspace(page);
  expect(
    firstSave.tasks.find(task => task.title === 'Revisar redes para a prova')
      ?.awarded,
  ).toBe(true);
  expect(firstSave.tasks.find(task => task.title === 'Revisar redes para a prova')?.completed_at)
    .toMatch(/^2026-09-08T/);
  await page.reload();
  await enterDemo(page);
  await page.getByRole('button', { name: 'Tarefas', exact: true }).click();
  await page.getByRole('tab', { name: 'Concluídas', exact: true }).click();
  await page
    .getByRole('checkbox', {
      name: 'Reabrir Revisar redes para a prova',
      exact: true,
    })
    .click();
  expect((await savedWorkspace(page)).tasks.find(task => task.title === 'Revisar redes para a prova')?.completed_at)
    .toBeUndefined();
  await page.getByRole('tab', { name: 'Todas', exact: true }).click();
  await page
    .getByRole('checkbox', {
      name: 'Concluir Revisar redes para a prova',
      exact: true,
    })
    .click();
  const state = await savedWorkspace(page);
  expect(
    state.tasks.filter(task => task.title === 'Revisar redes para a prova'),
  ).toHaveLength(1);
  expect(state.tasks.filter(task => task.awarded)).toHaveLength(4);
  expect(state.tasks.find(task => task.title === 'Revisar redes para a prova')?.completed_at)
    .toMatch(/^2026-09-08T/);
});

test('análise separa entregas atrasadas, pendências e histórico desconhecido', async ({ page }) => {
  await page.getByRole('button', { name: 'Tarefas', exact: true }).click();
  await page.getByRole('button', { name: 'Nova tarefa', exact: true }).click();
  await page.getByLabel('O que você precisa fazer?').fill('Entrega fora do prazo');
  await page.getByLabel('Prazo (opcional)').fill('2026-09-07');
  await page.getByRole('button', { name: 'Criar tarefa', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Concluir Entrega fora do prazo' }).click();
  await page.getByRole('button', { name: 'Análise', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Análise', exact: true })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Entregas de Matemática' }))
    .toContainText('1');
  await page.getByRole('button', { name: 'Matemática: 1 entregues após o prazo' }).click();
  await expect(page.getByRole('heading', { name: 'Atividades por trás dos números' }))
    .toBeVisible();
  await expect(page.locator('.analysis-task-list')).toContainText('Entrega fora do prazo');
  await expect(page.locator('.analysis-task-list')).not.toContainText('Lista de exercícios');
  await page.getByLabel('Período da análise').selectOption('month');
  await expect(page.locator('.analysis-chart-section')).toContainText('Andamento por matéria');
});

test('análise não inventa data de entrega para tarefa antiga', async ({ page }) => {
  await page.evaluate(() => {
    const raw = localStorage.getItem('edutrack.demo.v1');
    if (!raw) throw new Error('Demonstração ausente.');
    const workspace = JSON.parse(raw);
    delete workspace.tasks.find((task: { status: string }) => task.status === 'done').completed_at;
    localStorage.setItem('edutrack.demo.v1', JSON.stringify(workspace));
  });
  await page.reload();
  await enterDemo(page);
  await page.getByRole('button', { name: 'Análise', exact: true }).click();
  await expect(page.locator('.analysis-data-note')).toContainText('sem histórico');
  await page.getByRole('button', { name: 'Matemática: 1 sem histórico da entrega' }).click();
  await expect(page.locator('.analysis-task-list')).toContainText('Resumir aula de funções');
});

test('excluir disciplina remove seus dados vinculados após confirmação', async ({ page }) => {
  const before = await savedWorkspace(page);
  const subject = before.subjects.find(item => item.name === 'Matemática');
  expect(subject).toBeDefined();
  const taskIds = new Set(before.tasks.filter(task => task.subject_id === subject!.id).map(task => task.id));
  await page.getByRole('button', { name: 'Disciplinas', exact: true }).click();
  await page.getByRole('button', { name: 'Excluir disciplina Matemática' }).click();
  await expect(page.getByRole('dialog')).toContainText('Esta ação remove permanentemente');
  await page.getByRole('button', { name: 'Cancelar' }).click();
  expect((await savedWorkspace(page)).subjects.some(item => item.id === subject!.id)).toBe(true);
  await page.getByRole('button', { name: 'Excluir disciplina Matemática' }).click();
  await page.getByRole('button', { name: 'Excluir disciplina', exact: true }).click();
  const after = await savedWorkspace(page);
  expect(after.subjects.some(item => item.id === subject!.id)).toBe(false);
  expect(after.tasks.some(task => task.subject_id === subject!.id)).toBe(false);
  expect(after.sessions.some(session => session.subject_id === subject!.id || taskIds.has(session.task_id))).toBe(false);
  expect(after.blocks.some(block => taskIds.has(block.task_id))).toBe(false);
  expect(after.cards.some(card => card.subject_id === subject!.id)).toBe(false);
});

test('subject creation, edit and archive preserve work', async ({ page }) => {
  await page.getByRole('button', { name: 'Disciplinas', exact: true }).click();
  await page
    .getByRole('button', { name: 'Nova disciplina', exact: true })
    .click();
  await page.getByLabel('Nome da disciplina').fill('Biologia');
  await page.getByLabel('Professor(a)').fill('Prof. Júlia');
  await page
    .getByRole('button', { name: 'Criar disciplina', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Biologia', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Arquivar Biologia', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Biologia', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Ver arquivadas' }).click();
  await expect(page.getByRole('heading', { name: 'Biologia', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Restaurar Biologia', exact: true }).click();
});

test('planner reserves capacity, preserves manual work and reschedules', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Planejamento', exact: true }).click();
  await page
    .getByRole('button', {
      name: 'Agendar Ler capítulo 4 e fazer resumo',
      exact: true,
    })
    .click();
  await page.getByLabel('Dia do estudo').fill('2026-09-09');
  await page.getByLabel('Horário', { exact: true }).fill('18:00');
  await page.getByRole('button', { name: 'Salvar horário', exact: true }).click();
  const manual = (await savedWorkspace(page)).blocks[0];
  await page.getByRole('button', { name: 'Organizar por prazo', exact: true }).click();
  const state = await savedWorkspace(page);
  expect(state.blocks.find(block => block.id === manual.id)).toEqual(manual);
  const usedByDay = new Map<string, number>();
  for (const block of state.blocks) {
    expect(block.minutes).toBeLessThanOrEqual(state.settings.focus_minutes);
    usedByDay.set(
      block.date,
      (usedByDay.get(block.date) ?? 0) +
        block.minutes +
        state.settings.break_minutes,
    );
  }
  for (const [date, used] of usedByDay) {
    const studied = state.sessions
      .filter(session => session.created_at.slice(0, 10) === date)
      .reduce((sum, session) => sum + session.minutes, 0);
    expect(used + studied).toBeLessThanOrEqual(
      Math.floor(state.settings.daily_minutes * 0.8),
    );
  }
  await page
    .getByRole('button', {
      name: 'Reagendar Ler capítulo 4 e fazer resumo',
      exact: true,
    })
    .first()
    .click();
  await page.getByLabel('Horário', { exact: true }).fill('19:00');
  await page.getByRole('button', { name: 'Salvar horário' }).click();
  await expect(page.locator('.desk-block').filter({ hasText: '19:00' })).toHaveCount(1);
});

test('drag schedules real work and undo restores it', async ({ page }) => {
  await page.getByRole('button', { name: 'Planejamento', exact: true }).click();
  const task = page.locator('.task-slip').filter({
    hasText: 'Revisar estruturas de dados',
  });
  await task.dragTo(
    page.getByRole('button', {
      name: 'Selecionar dia 2026-09-08',
      exact: true,
    }),
  );
  await expect(page.locator('.desk-block')).toHaveCount(1);
  await expect(task).toContainText('Estimativa distribuída');
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  await expect(page.locator('.desk-block')).toHaveCount(0);
  await expect(task).toContainText('25 min sem horário');
});

test('manual scheduling rejects overlap, past time and excess capacity', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Planejamento', exact: true }).click();
  await page
    .getByRole('button', {
      name: 'Agendar Revisar estruturas de dados',
      exact: true,
    })
    .click();
  await page.getByRole('button', { name: 'Salvar horário', exact: true }).click();
  await page
    .getByRole('button', {
      name: 'Agendar Projeto: lista de tarefas em Python',
      exact: true,
    })
    .click();
  await page.getByLabel('Horário', { exact: true }).fill('14:00');
  await page.getByRole('button', { name: 'Salvar horário', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('sobrepõe');
  await page.getByLabel('Horário', { exact: true }).fill('08:00');
  await page.getByRole('button', { name: 'Salvar horário', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('já passou');
  await page.getByLabel('Horário', { exact: true }).fill('16:00');
  await page.getByLabel('Minutos de estudo').fill('90');
  await page.getByRole('button', { name: 'Salvar horário', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('cabem');
  expect((await savedWorkspace(page)).blocks).toHaveLength(1);
});

test('flashcard review reschedules and persists', async ({ page }) => {
  await page.getByRole('button', { name: /Revisões/ }).click();
  await page.getByRole('button', { name: 'Mostrar resposta' }).click();
  await expect(
    page.getByRole('heading', { name: /Uma função em que elementos/ }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Lembrei 3 dia(s)', exact: true })
    .click();
  const firstSave = await savedWorkspace(page);
  expect(firstSave.cards[0].reviews).toBe(1);
  expect(firstSave.cards[0].stage).toBe(1);
  await page.reload();
  await enterDemo(page);
  await page.getByRole('button', { name: /Revisões/ }).click();
  await expect(
    page.getByRole('heading', {
      name: 'Qual a diferença entre lista e tupla em Python?',
    }),
  ).toBeVisible();
});

test('focus records actual elapsed minutes once', async ({ page }) => {
  const before = (await savedWorkspace(page)).sessions.length;
  await page.getByRole('button', { name: 'Foco', exact: true }).click();
  await page.getByRole('button', { name: 'Começar foco', exact: true }).click();
  await page.clock.fastForward(61_000);
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  await page.getByRole('button', { name: 'Registrar sessão', exact: true }).click();
  await expect(page.locator('.toast')).toContainText('1 min de foco');
  const state = await savedWorkspace(page);
  expect(state.sessions.at(-1)?.minutes).toBe(1);
  expect(state.sessions).toHaveLength(before + 1);
});

test('Classroom missing configuration is honest and does not import', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Integrações', exact: true }).click();
  await page
    .getByRole('button', { name: 'Conectar Google Classroom', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText('Client ID OAuth');
  await expect(page.getByText('Não conectado', { exact: true })).toBeVisible();
});

test('tutor IA requires an account instead of inventing a result', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Tutor IA', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Entrar para gerar', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Entrar para gerar', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toContainText(
    'Seu espaço, em qualquer lugar',
  );
});

test('search keyboard shortcut and settings theme', async ({ page }) => {
  await page.keyboard.press('Control+k');
  await page
    .getByPlaceholder('Tarefas, disciplinas ou páginas…')
    .fill('Projeto:');
  await page
    .getByRole('option', { name: 'Projeto: lista de tarefas em Python' })
    .click();
  await expect(page.getByRole('dialog')).toContainText('Editar tarefa');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Configurações', exact: true }).click();
  await page.getByRole('switch', { name: 'Tema escuro' }).check();
  await expect(page.locator('html')).toHaveClass(/dark/);
});

test('mobile access and dashboard avoid horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Crie sua conta', exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await enterDemo(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Tarefas', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tarefas', exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test('timer continues across pages and keeps the selected task', async ({
  page,
}) => {
  const before = (await savedWorkspace(page)).sessions.length;
  await page.getByRole('button', { name: 'Planejamento', exact: true }).click();
  await page
    .getByRole('button', {
      name: 'Estudar Revisar estruturas de dados',
      exact: true,
    })
    .click();
  await expect(
    page.getByRole('combobox', { name: 'Tarefa da sessão' }),
  ).toContainText('Revisar estruturas de dados');
  await page.getByRole('button', { name: 'Começar foco', exact: true }).click();
  await page.getByRole('button', { name: 'Tarefas', exact: true }).click();
  await page.clock.fastForward(25 * 60 * 1000 + 1000);
  const state = await savedWorkspace(page);
  expect(state.sessions).toHaveLength(before + 1);
  expect(state.sessions.at(-1)?.minutes).toBe(25);
  expect(
    state.tasks.find(task => task.id === state.sessions.at(-1)?.task_id)?.title,
  ).toBe('Revisar estruturas de dados');
});

test('weekly report downloads a PDF', async ({ page }) => {
  await page.getByRole('button', { name: 'Configurações', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar PDF', exact: true }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/EduTrack-semana-.*\.pdf/);
  await file.saveAs('../weekly-report-test.pdf');
});

test('gamificação: missão diária, XP flutuante e baú', async ({ page }) => {
  await page.getByRole('button', { name: 'Tarefas', exact: true }).click();
  await page.getByRole('tab', { name: 'Todas', exact: true }).click();
  await page
    .getByRole('checkbox', { name: 'Concluir Revisar estruturas de dados', exact: true })
    .click();
  await expect(page.locator('.toast')).toContainText('+55 XP');
  await expect(page.locator('.g-float')).toContainText('+55 XP');
  // A 60-minute session today completes the daily minutes mission, always on the board.
  await page.evaluate(() => {
    const workspace = JSON.parse(localStorage.getItem('edutrack.demo.v1') ?? '{}');
    workspace.sessions.push({ id: 'extra', task_id: '', subject_id: '', minutes: 60, created_at: '2026-09-08T09:00:00' });
    localStorage.setItem('edutrack.demo.v1', JSON.stringify(workspace));
  });
  await page.reload();
  await enterDemo(page);
  await page.getByRole('button', { name: 'Visão geral', exact: true }).click();
  const quest = page.locator('.g-quest').first();
  await expect(quest).toHaveClass(/done/);
  await quest.getByRole('button', { name: 'Resgatar' }).click();
  await expect(quest).toHaveClass(/claimed/);
  await expect(page.locator('.toast')).toContainText('Missão resgatada');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('edutrack.demo.v1') ?? '{}'));
  expect(saved.game.claims.some((c: { key: string }) => c.key === 'd:2026-09-08:minutes')).toBe(true);
  await expect(page.getByRole('button', { name: /Baú diário/ })).toBeDisabled();
});

test('gamificação: jornada mostra conquistas, loja e ranking protegido', async ({ page }) => {
  await page.getByRole('button', { name: 'Jornada', exact: true }).click();
  await expect(page.locator('.g-hero')).toContainText('Estudante');
  await expect(page.getByText('dias seguidos')).toBeVisible();
  const tabs = page.getByRole('navigation', { name: 'Seções da jornada' });
  await tabs.getByRole('button', { name: 'Conquistas' }).click();
  await expect(page.locator('.g-badge.got').first()).toBeVisible();
  await expect(page.getByText('Conquista secreta').first()).toBeVisible();
  await tabs.getByRole('button', { name: 'Loja' }).click();
  const theme = page.locator('.g-item', { hasText: 'Esmeralda' });
  await theme.locator('.g-buy').click();
  await expect(page.locator('.desk-app')).toHaveAttribute('data-theme', 'theme-emerald');
  await expect(theme.locator('.g-buy')).toContainText('Equipado');
  await tabs.getByRole('button', { name: 'Ranking' }).click();
  await expect(page.getByText('Compare seu ritmo com outros estudantes')).toBeVisible();
});

test('chapéu seletor escolhe uma casa e a arena registra partidas', async ({ page }) => {
  await page.getByRole('button', { name: 'Arena', exact: true }).click();
  await page.getByRole('button', { name: /Descubra sua casa/ }).click();
  await page.getByRole('button', { name: /Colocar o chapéu/ }).click();
  const forja = [
    'Vou direto para os exercícios',
    'Do exercício parecido',
    'Rabiscado de contas',
    'Tento outro caminho',
    'A parte prática',
    'Laboratório',
    'Uso ela em vários exercícios',
    'Aprender qualquer habilidade',
  ];
  for (const text of forja) await page.getByRole('button', { name: new RegExp(text) }).click();
  await page.clock.runFor(8000);
  await expect(page.getByRole('heading', { name: 'Forja', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Entrar na casa Forja/ }).click();
  await expect(page.locator('.arena-house')).toContainText('Forja');
  const saved = await savedWorkspace(page) as unknown as { game: { house: { id: string } } };
  expect(saved.game.house.id).toBe('forja');

  await page.locator('.arena-game', { hasText: 'Verdadeiro ou Falso' }).getByRole('button', { name: 'Jogar' }).click();
  for (let round = 0; round < 12; round++) {
    await page.getByRole('button', { name: /Verdadeiro/ }).click();
    await page.clock.fastForward(1000);
  }
  await expect(page.locator('.arena-result')).toContainText('Verdadeiro ou Falso');
  const after = await savedWorkspace(page) as unknown as { game: { arcade: Array<{ game: string }> } };
  expect(after.game.arcade.at(-1)?.game).toBe('truefalse');
});
