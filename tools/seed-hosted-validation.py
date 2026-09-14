"""Create one synthetic acceptance-test account; never modifies existing users.

This fixture deliberately bypasses email verification and does NOT verify signup.
Run once against the approved hosted database with public signup still disabled.
"""
import argparse
import json
import secrets
import uuid
from pathlib import Path
from urllib.parse import urlparse

import psycopg
from argon2 import PasswordHasher

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / ".local/hosting-secrets.json"
values = json.loads(path.read_text(encoding="utf-8-sig"))
parser = argparse.ArgumentParser()
parser.add_argument("--second", action="store_true")
args = parser.parse_args()
prefix = "VALIDATION2_" if args.second else "VALIDATION_"
assert prefix + "PASSWORD" not in values, "Validation fixture already prepared"
assert urlparse(values["NEON_DATABASE_URL"]).hostname == "ep-calm-feather-b246y4yv-pooler.c-6.eu-central-1.aws.neon.tech"
values[prefix + "PASSWORD"] = secrets.token_urlsafe(32)
values[prefix + "EMAIL"] = "beta-validation-" + uuid.uuid4().hex[:10] + "@example.com"
values[prefix + "USER_ID"] = str(uuid.uuid4())
with psycopg.connect(values["NEON_DATABASE_URL"]) as db:
    db.execute("INSERT INTO users (id,email,name,password_hash,is_admin,email_verified,created_at) VALUES (%s,%s,%s,%s,false,true,now())",
               (values[prefix + "USER_ID"], values[prefix + "EMAIL"], "Synthetic beta validation",
                PasswordHasher().hash(values[prefix + "PASSWORD"])))
path.write_text(json.dumps(values, indent=2), encoding="utf-8")
print("Synthetic validation fixture created; this does not establish email/signup verification.")
