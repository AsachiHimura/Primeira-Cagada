# Projeto SIG-MAMO PET-SAÚDE DIGITAL
O objetivo deste projeto, é oferecer um protótipo base para o gerenciamento e monitoramento geral de filas de mamografia.

### Pré-Requisitos:
- Node.js 24.18.0
- Python 3.11.9
  
Framework utilizado para criação da API: [FastAPI](https://fastapi.tiangolo.com) 

Abaixo, seguem as instruções para execução local do projeto

## Rodando o projeto localmente:

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

