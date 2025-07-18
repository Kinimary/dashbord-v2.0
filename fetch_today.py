import cx_Oracle
from datetime import date

# -------------------------------------------------
# Заполни эти значения из SQL Developer
HOST      = "oracle.vit.belwest.com"      # Hostname
PORT      = 1521             # Port (обычно 1521)
SID       = "orcl"       # SID или SERVICE_NAME
USER      = "Hotline"      # Username
PASSWORD  = "V8ryH0t"  # Password
# -------------------------------------------------

today = date.today()

# Собираем DSN
dsn = cx_Oracle.makedsn(HOST, PORT, sid=SID)
# Если у вас SERVICE_NAME, используйте:
# dsn = cx_Oracle.makedsn(HOST, PORT, service_name=SID)

try:
    conn = cx_Oracle.connect(user=USER, password=PASSWORD, dsn=dsn)
    cursor = conn.cursor()

    # Запрос за сегодня
    sql = """
        SELECT *
        FROM TEM_GET_DAY_STAT
        WHERE TRUNC(DAY) = TRUNC(:today)
    """

    cursor.execute(sql, {"today": today})
    rows = cursor.fetchall()

    if not rows:
        print(f"За {today} данных нет.")
    else:
        print(f"Данные за {today}:")
        # Вывод шапки
        columns = [col[0] for col in cursor.description]
        print("|".join(columns))
        print("-" * 80)
        for row in rows:
            print("|".join(str(v) for v in row))

except cx_Oracle.Error as e:
    print("Ошибка Oracle:", e)
finally:
    if 'cursor' in locals():
        cursor.close()
    if 'conn' in locals():
        conn.close()