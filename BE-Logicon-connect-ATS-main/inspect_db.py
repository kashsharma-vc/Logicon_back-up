import sqlite3

def check_db(path):
    print(f"--- DB: {path} ---")
    c = sqlite3.connect(path)
    tables = [r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%attendance%'").fetchall()]
    print("Tables:", tables)
    for t in tables:
        schema = c.execute(f"SELECT sql FROM sqlite_master WHERE name='{t}'").fetchone()[0]
        print(f"Schema for {t}:\n{schema}\n")

check_db(r'C:\field-senses-app-main\backend\db.sqlite3')
check_db(r'C:\field-senses-app-main\Main Logicon\BE-Logicon-connect-ATS-main\db.sqlite3')
