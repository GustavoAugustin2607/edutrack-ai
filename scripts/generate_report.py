"""Generate a PDF report with each subject's progress.

Reads {"student": str, "subjects": [{"name", "completed", "total"}], "output": str}
from stdin and prints {"file": path}.
"""
import json
import sys
from datetime import date

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from calculate_progress import calculate_progress


def build_report(student: str, subjects: list, output_path: str) -> str:
    styles = getSampleStyleSheet()
    doc = SimpleDocTemplate(output_path, pagesize=A4, title="EduTrack AI - Relatório de desempenho")
    story = [
        Paragraph("EduTrack AI - Relatório de desempenho", styles["Title"]),
        Paragraph(f"Aluno: {student}", styles["Normal"]),
        Paragraph(f"Data: {date.today().strftime('%d/%m/%Y')}", styles["Normal"]),
        Spacer(1, 18),
    ]
    rows = [["Disciplina", "Concluídas", "Total", "Progresso"]]
    for subject in subjects:
        progress = calculate_progress(subject.get("completed", 0), subject.get("total", 0))
        rows.append([subject["name"], str(progress["completed"]), str(progress["total"]), f"{progress['percentage']}%"])
    table = Table(rows, colWidths=[230, 80, 60, 80])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#3450D6")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("ALIGN", (1, 0), (-1, -1), "CENTER"),
            ]
        )
    )
    story.append(table)
    doc.build(story)
    return output_path


def main() -> int:
    try:
        data = json.load(sys.stdin)
        path = build_report(data["student"], data["subjects"], data.get("output", "report.pdf"))
    except (KeyError, ValueError, TypeError, OSError) as error:
        print(json.dumps({"error": str(error)}))
        return 1
    print(json.dumps({"file": path}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
