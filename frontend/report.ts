import {
  day,
  addDays,
  metrics,
  prioritized,
  prettyDate,
  minutesLabel,
  type Workspace,
} from './model';
export async function exportWeeklyReport(state: Workspace) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const m = metrics(state);
  let y = 24;
  const line = (
    text: string,
    size = 11,
    color: [number, number, number] = [45, 55, 75],
  ) => {
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const rows = doc.splitTextToSize(text, 170) as string[];
    for (const row of rows) {
      if (y > 274) {
        doc.addPage();
        y = 25;
      }
      doc.text(row, 20, y);
      y += size * 0.5 + 2;
    }
    y += 3;
  };
  doc.setFillColor(35, 45, 75);
  doc.rect(0, 0, 210, 56, 'F');
  line('EDUTRACK', 12, [180, 199, 245]);
  line('Seu resumo da semana', 24, [255, 255, 255]);
  y = 69;
  line(
    `${state.settings.name} | ${prettyDate(addDays(day(), -6))} a ${prettyDate(day())}`,
    11,
    [110, 120, 145],
  );
  y += 8;
  line(
    `${minutesLabel(m.minutes)} de foco   |   ${m.days} dias ativos   |   ${m.done} de ${m.total} tarefas concluídas`,
    12,
  );
  line(`${m.points} XP acumulados - Nível ${m.level}`, 11);
  y += 7;
  line('Progresso por disciplina', 16, [54, 86, 212]);
  for (const subject of state.subjects.filter((s) => !s.archived)) {
    const tasks = state.tasks.filter((t) => t.subject_id === subject.id),
      done = tasks.filter((t) => t.status === 'done').length;
    const minutes = state.sessions
      .filter(
        (s) =>
          s.subject_id === subject.id &&
          day(new Date(s.created_at)) >= addDays(day(), -6),
      )
      .reduce((n, s) => n + s.minutes, 0);
    line(
      `${subject.name} - ${done}/${tasks.length} tarefas - ${minutesLabel(minutes)} nesta semana`,
    );
  }
  y += 7;
  line('Próximas prioridades', 16, [54, 86, 212]);
  const tasks = prioritized(state).slice(0, 10);
  for (const task of tasks)
    line(
      `${prettyDate(task.due_date)} - ${task.title} (${minutesLabel(task.estimated_minutes)})`,
    );
  if (!tasks.length) line('Nenhuma tarefa pendente.');
  y += 6;
  line(
    'O progresso de tarefas indica organização do trabalho, não domínio do conteúdo.',
    9,
    [120, 130, 150],
  );
  for (let i = 1; i <= doc.getNumberOfPages(); i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(145, 151, 170);
    doc.text(
      `EduTrack AI | Gerado em ${new Date().toLocaleString('pt-BR')} | ${i}/${doc.getNumberOfPages()}`,
      20,
      288,
    );
  }
  doc.save(`EduTrack-semana-${day()}.pdf`);
}
