"""Calculate study progress (completed / total) and print it as JSON."""
import argparse
import json
import sys


def calculate_progress(completed: int, total: int) -> dict:
    """Return the progress percentage (0-100) for a set of tasks."""
    if completed < 0 or total < 0:
        raise ValueError("completed and total must be non-negative")
    if completed > total:
        raise ValueError("completed cannot be greater than total")
    if total == 0:
        # A student with no tasks yet has 0% instead of a division error.
        return {"completed": completed, "total": total, "percentage": 0.0}
    percentage = round(completed / total * 100, 2)
    return {"completed": completed, "total": total, "percentage": percentage}


def main() -> int:
    parser = argparse.ArgumentParser(description="Calculate task progress")
    parser.add_argument("--completed", type=int, required=True)
    parser.add_argument("--total", type=int, required=True)
    args = parser.parse_args()
    try:
        result = calculate_progress(args.completed, args.total)
    except ValueError as error:
        print(json.dumps({"error": str(error)}))
        return 1
    print(json.dumps(result))
    return 0


if __name__ == "__main__":
    sys.exit(main())
