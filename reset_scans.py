import database
conn = database.get_db_connection()
cursor = conn.cursor()
cursor.execute('UPDATE devices SET scans_used = 0, total_scans = 9999')
conn.close()
print("Scans reset successfully.")
