import sqlite3
old_db = r'C:\field-senses-app-main\backend\db.sqlite3'
conn = sqlite3.connect(old_db)
c = conn.cursor()
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = c.fetchall()
if ('core_employee',) in tables:
    c.execute("SELECT id, email, employeeId, departmentId_id, roleId_id FROM core_employee WHERE email='abc@gmail.com' OR email='Admin Logicon' OR id=14")
    print("Employee 14:", c.fetchone())
    c.execute("SELECT id, email, username FROM auth_user WHERE id=14")
    print("Auth user 14:", c.fetchone())
    c.execute("PRAGMA table_info(core_department)")
    print("Dept cols:", [col[1] for col in c.fetchall()])
    c.execute("SELECT * FROM core_department WHERE id='1b479ef6-4e1c-4498-9edf-ccbeae3b3a49'")
    print("Dept:", c.fetchone())

