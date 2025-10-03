import sqlite3

conn = sqlite3.connect('C:\\Users\\USER\\Desktop\\lokifi\\backend\\lokifi.sqlite')
cursor = conn.cursor()

cursor.execute('SELECT id, email, full_name, password_hash FROM users WHERE email = ?', ('hello@lokifi.com',))
result = cursor.fetchone()

if result:
    print('✅ User found!')
    print(f'ID: {result[0]}')
    print(f'Email: {result[1]}')
    print(f'Full Name: {result[2]}')
    print(f'Has Password Hash: {bool(result[3])}')
    print(f'Password Hash Length: {len(result[3]) if result[3] else 0}')
else:
    print('❌ User not found!')

conn.close()
