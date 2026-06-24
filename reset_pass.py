import database as db
from argon2 import PasswordHasher

ph = PasswordHasher()
hashed_password = ph.hash("Bostontech@2026")

conn = db.get_db_connection()
try:
    with conn.cursor() as cursor:
        cursor.execute("UPDATE users SET password_hash = %s WHERE username = 'admin'", (hashed_password,))
    conn.commit()
    print("Password successfully updated to Bostontech@2026")
except Exception as e:
    print(f"Error updating password: {e}")
finally:
    conn.close()
