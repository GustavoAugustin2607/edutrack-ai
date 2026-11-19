"""Hybrid search: subjects matching a name OR having overdue tasks.

Reads {"subjects": [...], "tasks": [...], "name": str, "overdue": bool} from
stdin. The same rule runs in the database as the RPC `search_subjects`.
"""
import json
import sys
from datetime import date


def is_overdue(task: dict, today: date) -> bool:
    """A task is overdue when it is not done and its due date has passed."""
    if task.get("status") == "done":
        return False
    due = task.get("due_date")
    return bool(due) and date.fromisoformat(due) < today


def search_subjects(subjects: list, tasks: list, name=None, overdue=False, today=None) -> list:
    today = today or date.today()
    overdue_ids = {t["subject_id"] for t in tasks if is_overdue(t, today)}
    result = []
    for subject in subjects:
        by_name = bool(name) and name.lower() in subject["name"].lower()
        by_overdue = overdue and subject["id"] in overdue_ids
        if by_name or by_overdue:
            result.append(subject)
    return result


def main() -> int:
    try:
        payload = json.load(sys.stdin)
        found = search_subjects(
            payload["subjects"], payload["tasks"], payload.get("name"), payload.get("overdue", False)
        )
    except (KeyError, ValueError, TypeError) as error:
        print(json.dumps({"error": str(error)}))
        return 1
    print(json.dumps({"results": found}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
