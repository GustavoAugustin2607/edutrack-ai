"""Tests for the Python study scripts. Run with: python -m unittest discover scripts"""
import os
import tempfile
import unittest
from datetime import date

from calculate_progress import calculate_progress
from search_subjects import search_subjects


class ProgressTest(unittest.TestCase):
    def test_percentage(self):
        self.assertEqual(calculate_progress(3, 8)["percentage"], 37.5)

    def test_no_tasks_is_zero(self):
        self.assertEqual(calculate_progress(0, 0)["percentage"], 0.0)

    def test_rejects_more_completed_than_total(self):
        with self.assertRaises(ValueError):
            calculate_progress(5, 2)


class SearchTest(unittest.TestCase):
    subjects = [{"id": "1", "name": "Matemática"}, {"id": "2", "name": "História"}, {"id": "3", "name": "Física"}]
    tasks = [
        {"subject_id": "2", "status": "todo", "due_date": "2026-11-01"},
        {"subject_id": "3", "status": "todo", "due_date": "2026-12-01"},
        {"subject_id": "1", "status": "done", "due_date": "2026-10-01"},
    ]
    today = date(2026, 11, 19)

    def test_name_or_overdue(self):
        found = search_subjects(self.subjects, self.tasks, "mat", True, self.today)
        self.assertEqual([s["name"] for s in found], ["Matemática", "História"])

    def test_done_tasks_are_not_overdue(self):
        found = search_subjects(self.subjects, self.tasks, None, True, self.today)
        self.assertEqual([s["name"] for s in found], ["História"])


class ReportTest(unittest.TestCase):
    def test_creates_pdf(self):
        try:
            from generate_report import build_report
        except ImportError:
            self.skipTest("reportlab is not installed")
        path = os.path.join(tempfile.mkdtemp(), "report.pdf")
        build_report("Aluno Teste", [{"name": "Matemática", "completed": 3, "total": 8}], path)
        with open(path, "rb") as file:
            self.assertEqual(file.read(4), b"%PDF")


if __name__ == "__main__":
    unittest.main()
