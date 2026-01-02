#!/usr/bin/env python3
"""
Add estimated capacity to Minnesota facility data based on facility type.

This is a temporary solution until we can scrape real capacity data from MN DHS
or receive bulk data via MGDPA request.

Usage:
    python add_capacity_estimates.py --data-dir ../../data/minnesota
    python add_capacity_estimates.py --data-dir ../../public/data/minnesota
"""

import argparse
import json
import os
from datetime import datetime
from pathlib import Path

# Typical licensed capacity by facility type in Minnesota
# Based on MN DHS licensing rules and averages
CAPACITY_ESTIMATES = {
    # Child Care Centers - varies widely, using median
    "Child Care Center": 75,
    "child care center": 75,

    # Family Child Care - MN allows up to 10 children (14 with conditions)
    "Family Child Care": 12,
    "family child care": 12,
    "Family Day Care": 12,

    # Group Family Day Care - up to 14 children
    "Group Family Child Care": 14,
    "Group Family Day Care": 14,

    # School-age programs - typically larger
    "School Age Child Care": 50,
    "School-Age": 50,

    # Head Start / Early Head Start
    "Head Start": 60,
    "Early Head Start": 20,

    # Default for unknown types
    "default": 25,
}


def get_estimated_capacity(facility_type: str) -> int:
    """Get estimated capacity based on facility type."""
    if not facility_type:
        return CAPACITY_ESTIMATES["default"]

    # Check for exact match first
    if facility_type in CAPACITY_ESTIMATES:
        return CAPACITY_ESTIMATES[facility_type]

    # Check for partial matches (case-insensitive)
    facility_type_lower = facility_type.lower()

    if "center" in facility_type_lower:
        return CAPACITY_ESTIMATES["Child Care Center"]
    elif "family" in facility_type_lower and "group" in facility_type_lower:
        return CAPACITY_ESTIMATES["Group Family Child Care"]
    elif "family" in facility_type_lower:
        return CAPACITY_ESTIMATES["Family Child Care"]
    elif "school" in facility_type_lower or "age" in facility_type_lower:
        return CAPACITY_ESTIMATES["School Age Child Care"]
    elif "head start" in facility_type_lower:
        if "early" in facility_type_lower:
            return CAPACITY_ESTIMATES["Early Head Start"]
        return CAPACITY_ESTIMATES["Head Start"]

    return CAPACITY_ESTIMATES["default"]


def process_county_file(filepath: Path, dry_run: bool = False) -> dict:
    """Process a single county file and add capacity estimates."""
    stats = {
        "total": 0,
        "updated": 0,
        "already_has_capacity": 0,
        "by_type": {}
    }

    with open(filepath, 'r', encoding='utf-8') as f:
        facilities = json.load(f)

    if not isinstance(facilities, list):
        print(f"  Skipping {filepath.name} - not a facility list")
        return stats

    for facility in facilities:
        stats["total"] += 1
        facility_type = facility.get("facility_type", "Unknown")

        # Track by type
        if facility_type not in stats["by_type"]:
            stats["by_type"][facility_type] = {"count": 0, "estimated_capacity": 0}
        stats["by_type"][facility_type]["count"] += 1

        # Check if already has real capacity
        current_capacity = facility.get("capacity")
        if current_capacity is not None and current_capacity > 0:
            stats["already_has_capacity"] += 1
            continue

        # Add estimated capacity
        estimated = get_estimated_capacity(facility_type)
        facility["capacity"] = estimated
        facility["capacity_estimated"] = True
        stats["updated"] += 1
        stats["by_type"][facility_type]["estimated_capacity"] = estimated

    if not dry_run:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(facilities, f, indent=2)

    return stats


def process_directory(data_dir: Path, dry_run: bool = False) -> dict:
    """Process all county files in a directory."""
    total_stats = {
        "files_processed": 0,
        "total_facilities": 0,
        "facilities_updated": 0,
        "already_has_capacity": 0,
        "by_type": {}
    }

    # Find all county facility files
    facility_files = sorted(data_dir.glob("*_facilities.json"))

    if not facility_files:
        print(f"No facility files found in {data_dir}")
        return total_stats

    print(f"\nProcessing {len(facility_files)} county files in {data_dir}")
    print("=" * 60)

    for filepath in facility_files:
        county_name = filepath.stem.replace("_facilities", "").replace("_", " ").title()

        stats = process_county_file(filepath, dry_run)

        if stats["total"] > 0:
            print(f"  {county_name}: {stats['updated']}/{stats['total']} facilities updated")

            total_stats["files_processed"] += 1
            total_stats["total_facilities"] += stats["total"]
            total_stats["facilities_updated"] += stats["updated"]
            total_stats["already_has_capacity"] += stats["already_has_capacity"]

            # Merge type stats
            for ftype, type_stats in stats["by_type"].items():
                if ftype not in total_stats["by_type"]:
                    total_stats["by_type"][ftype] = {"count": 0, "estimated_capacity": 0}
                total_stats["by_type"][ftype]["count"] += type_stats["count"]
                if type_stats["estimated_capacity"] > 0:
                    total_stats["by_type"][ftype]["estimated_capacity"] = type_stats["estimated_capacity"]

    return total_stats


def update_summary(data_dir: Path, dry_run: bool = False):
    """Update the summary.json file with capacity information."""
    summary_path = data_dir / "summary.json"

    if not summary_path.exists():
        print(f"No summary.json found in {data_dir}")
        return

    with open(summary_path, 'r', encoding='utf-8') as f:
        summary = json.load(f)

    # Add note about capacity estimation
    summary["capacity_note"] = "Capacity values are estimates based on facility type. Real capacity data pending from MN DHS."
    summary["capacity_estimated_at"] = datetime.now().isoformat()

    if not dry_run:
        with open(summary_path, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2)
        print(f"\nUpdated {summary_path}")


def main():
    parser = argparse.ArgumentParser(
        description="Add estimated capacity to Minnesota facility data"
    )
    parser.add_argument(
        "--data-dir",
        type=str,
        default="../../data/minnesota",
        help="Directory containing facility JSON files"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without modifying files"
    )

    args = parser.parse_args()
    data_dir = Path(args.data_dir).resolve()

    if not data_dir.exists():
        print(f"Error: Directory not found: {data_dir}")
        return

    print("\nMinnesota Capacity Estimation Script")
    print("=" * 60)
    print(f"Data directory: {data_dir}")
    print(f"Dry run: {args.dry_run}")

    # Show capacity estimates being used
    print("\nCapacity estimates by facility type:")
    for ftype, capacity in sorted(CAPACITY_ESTIMATES.items()):
        if ftype != "default":
            print(f"  {ftype}: {capacity}")
    print(f"  (default): {CAPACITY_ESTIMATES['default']}")

    # Process all files
    stats = process_directory(data_dir, args.dry_run)

    # Update summary
    update_summary(data_dir, args.dry_run)

    # Print summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Files processed: {stats['files_processed']}")
    print(f"Total facilities: {stats['total_facilities']}")
    print(f"Facilities updated: {stats['facilities_updated']}")
    print(f"Already had capacity: {stats['already_has_capacity']}")

    print("\nFacilities by type:")
    for ftype, type_stats in sorted(stats["by_type"].items(), key=lambda x: -x[1]["count"]):
        est = type_stats.get("estimated_capacity", "N/A")
        print(f"  {ftype}: {type_stats['count']} (est. capacity: {est})")

    if args.dry_run:
        print("\n[DRY RUN] No files were modified. Run without --dry-run to apply changes.")


if __name__ == "__main__":
    main()
