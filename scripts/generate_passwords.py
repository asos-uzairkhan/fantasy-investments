#!/usr/bin/env python3
"""
Generate initial hashed passwords for all Fantasy Investments participants.
Creates data/passwords.json with SHA-256 hashed passwords.

Default password for each participant: their username in lowercase
Admin default password: admin123

Run this script whenever new participants are added to data/investments/.
Existing custom passwords in passwords.json are preserved.
"""

import hashlib
import json
import os


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    investments_dir = os.path.join(base_dir, "data", "investments")
    output_path = os.path.join(base_dir, "data", "passwords.json")

    # Auto-discover participants from CSV files in data/investments/
    participants = []
    for filename in sorted(os.listdir(investments_dir)):
        if filename.endswith(".csv"):
            name = os.path.splitext(filename)[0]
            participants.append(name)

    admin_default_password = "admin123"

    # Load existing passwords to preserve any custom ones
    existing = {}
    if os.path.exists(output_path):
        with open(output_path, "r") as f:
            existing = json.load(f)
        print("Found existing passwords.json — preserving custom passwords.")

    # Build new passwords: preserve existing hash if present, else default to lowercase name
    users = {}
    for name in participants:
        users[name] = existing.get("users", {}).get(name, hash_password(name.lower()))

    data = {
        "users": users,
        "admin": existing.get("admin", hash_password(admin_default_password)),
    }

    with open(output_path, "w") as f:
        json.dump(data, f, indent=2)

    print(f"\n✅ Generated passwords.json with {len(data['users'])} users")
    print(f"   Default password for each user: their username in lowercase")
    if not existing:
        print(f"   Admin default password: {admin_default_password}")
    print(f"\nParticipants:")
    for name in participants:
        was_existing = name in existing.get("users", {})
        print(f"  {name}: {'(existing custom password preserved)' if was_existing else name.lower()}")


if __name__ == "__main__":
    main()
