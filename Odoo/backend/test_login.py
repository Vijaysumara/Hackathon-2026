import requests; r = requests.post('http://localhost:8000/auth/login/access-token', data={'username': 'admin@fleetflow.com', 'password': 'admin123'}); print(r.status_code); print(r.text)
