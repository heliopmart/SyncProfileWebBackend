# 🚀 SyncProfileProject Backend

Este é o backend do **SyncProfileProject**, um sistema que gerencia autenticação segura com JWT, integração com **Azure**, **GitHub** e **renderização de Markdown para HTML**.

## 📌 Tecnologias Utilizadas
- **Node.js** - Servidor backend assíncrono
- **Express.js** - Framework minimalista para roteamento
- **Firebase Firestore** - Banco de dados NoSQL para armazenar tokens e usuários
- **JWT (JSON Web Token)** - Autenticação segura com tokens de curta duração
- **Azure Cognitive Services** - Tradução de textos via API do Azure Translator
- **Azure Blob Storage** - Armazenamento de arquivos na nuvem
- **GitHub API** - Integração com repositórios do GitHub
- **remark + remark-html** - Conversão de Markdown para HTML
- **Axios** - Cliente HTTP para chamadas às APIs externas

---

## ⚙️ Instalação e Configuração

### 🔹 1️⃣ Clonar o Repositório
```sh
git clone https://github.com/heliopmart/SyncProfileProjectBackend.git
cd SyncProfileProjectBackend
```

### 🔹 2️⃣ Instalar Dependências
```sh
npm install
```

### 🔹 3️⃣ Configurar Variáveis de Ambiente
Crie um arquivo **`.env`** na raiz do projeto e adicione:

```env
# Porta do servidor
PORT=5000

# Firebase Admin SDK (Firestore)
FIREBASE_CREDENTIALS=./src/private/serviceAccountKey.json

# JWT para autenticação segura
JWT_SECRET=SUA_CHAVE_SECRETA_AQUI

# Azure API para tradução
AZURE_API_KEY=SUA_AZURE_API_KEY
AZURE_REGION=seu-azure-region

# Azure Blob Storage
AZURE_STORAGE_CONNECTION_STRING=SUA_CONEXAO_AZURE_STORAGE

# GitHub API Token (se necessário)
GITHUB_TOKEN=seu-github-token
```

---

## 🚀 Executando o Servidor

### 🔹 Modo Normal
```sh
node index.js
```

### 🔹 Modo de Desenvolvimento (com nodemon)
```sh
npm run dev
```

---

## 🔑 Autenticação e Segurança

O backend utiliza **JWT** para autenticação, seguindo esta lógica:

1. O usuário faz **login** usando uma **API Key** e **Secret Key**.
2. Um **token JWT** é gerado e armazenado no Firestore na coleção `auth_token`.
3. Para cada requisição, o token é enviado no **header**:
   ```
   Authorization: Bearer <TOKEN>
   ```
4. Se o token **expirar**:
   - Se for dentro de **30 minutos**, ele será **renovado automaticamente**.
   - Se passou de **30 minutos**, o usuário precisa fazer **login novamente**.
5. O Firestore gerencia tokens expirados e impede reutilização.

---

## 📌 Principais Endpoints

### 🛠 Autenticação
- **`POST /token/auth`** → Gera um novo token JWT a partir de API Key e Secret Key.
- **`POST /token/validade`** → Valida um token e renova automaticamente se necessário.

### 🌐 Azure Services
- **`POST /azure/translate`** → Traduz textos usando a API do Azure Translator.
- **`POST /azure/md`** → Converte Markdown para HTML.

### 🗃 GitHub API
- **`POST /github/md`** → Obtém arquivos Markdown de um repositório.
- **`POST /github/repo`** → Gerencia repositórios do GitHub.

### 🎨 Renderização de Markdown
- **`POST /render/md`** → Converte Markdown para HTML usando `remark`.

---

## 🚀 Melhorias Futuras
- [ ] Implementação de WebSockets para sincronização em tempo real.
- [ ] Logs mais detalhados para monitoramento e debugging.
- [ ] Suporte a mais serviços de armazenamento em nuvem.

---

## 🤝 Contribuições

Contribuições são bem-vindas! Para contribuir:

1. Faça um **fork** do repositório.
2. Crie uma **branch** (`git checkout -b feature-minha-funcionalidade`).
3. Faça commit das suas alterações (`git commit -m "Minha funcionalidade"`).
4. Envie para o repositório (`git push origin feature-minha-funcionalidade`).
5. Abra um **Pull Request**.

---

## 📜 Licença

Este projeto está sob a licença **MIT**. Consulte o arquivo `LICENSE` para mais detalhes.

---

🚀 **Agora seu README está pronto para o GitHub!**  
Caso precise de ajustes, só avisar! 🎯

