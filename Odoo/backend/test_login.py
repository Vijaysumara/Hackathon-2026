import requests; r = requests.post('http://localhost:8000/auth/login/access-token', data={'username': 'admin@assetflow.com', 'password': 'admin123'}); print(r.status_code); print(r.text)
