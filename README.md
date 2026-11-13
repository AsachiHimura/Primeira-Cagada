# Projeto SIG-MAMO PET-SAÚDE DIGITAL
O objetivo deste projeto, é oferecer um protótipo base para o gerenciamento e monitoramento geral de filas de mamografia.

### Pré-Requisitos:
- Node.js 24.18.0
- Python 3.11.9
  
Framework utilizado para criação da API: [FastAPI](https://fastapi.tiangolo.com) 

Abaixo, seguem as instruções para execução local do projeto

## Rodando o projeto localmente:

Na raiz do projeto, crie um arquivo `.env` com `DATABASE_URL` (conexão PostgreSQL/Supabase), `SECRET_KEY` (chave aleatória longa) e, para criar o primeiro administrador com `python seed.py`, `ADMIN_SENHA`. Configure também `ADMIN_MATRICULA` e `ADMIN_NOME` se quiser personalizar esses dados. Não compartilhe nem envie esse arquivo ao Git.

No frontend, crie `sig-mamo-front/.env.local` com `VITE_API_URL=http://127.0.0.1:8000`. Em produção, defina `VITE_API_URL` para a URL da API e `CORS_ORIGINS` no backend para a origem exata do frontend, separando várias origens por vírgula.

Primeiro, abra um terminal a partir de **main.py**:
```
python -m uvicorn main:app --reload
```
Após isso, abra o arquivo no navegador localmente utilizando:

http://127.0.0.1:8000/docs

Em um novo terminal a partir da pasta **sig-mamo-front** entre com:
```
npm run dev
```

Seguindo os passos, o sistema deverá abrir com a tela de login no navegador.

