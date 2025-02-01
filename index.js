require("dotenv").config();
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const Token = require("./src/token/token.class")
const Github = require("./src/github/github.class")
const Azure = require("./src/azure/azure.class")
const Render = require("./src/render/render.class")

const app = express();
const PORT = process.env.PORT || 5000;


const serviceAccount = require("./src/private/serviceAccountKey.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

app.use(cors());
app.use(express.json());

app.post("/token/auth", async (req, res) => {
    const { key, secret, _TCD } = req.body;
    if (!key || !secret || !_TCD) {
        return res.status(400).json({ error: "Params don't exist!" })
    }

    try {
        const tokenService = new Token(db);
        const response = await tokenService.auth(req.body);

        if (!response.status) {
            return res.status(401).json({ error: response.message });
        }

        return res.status(200).json(response);
    } catch (error) {
        console.error("Erro ao autenticar:", error);
        return res.status(500).json({ error: "Erro interno no servidor." });
    }
});

app.post("/azure/translate", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    const {text, from, to} = req.body;
    if(!text || !from || !to && !Array.isArray(to)){
        return res.status(400).json({ error: "text or from or to don't exist!" })
    }

    if(!token){
        return res.status(400).json({ error: "token don't exist!" })
    }

    try {
        const authorization = await new Token(db).validade(token)
        
        if(!authorization.status){
            return res.status(400).json({ error: authorization.message })
        }

        if(!authorization.auth){
            return res.status(401).json({ error: "Unauthorized token"}) 
        }

        const response = await new Azure().translate(req.body)
        
        if(!response.status){
            return res.status(500).json({ error: response.message}) 
        }
        
        return res.status(200).json({status: true, data: response.data, token: authorization.token, refreshed: authorization.refreshed})
    } catch (err) {
        console.error("/azure/translate: ", err);
        return res.status(500).json({status: false, error: "Erro interno no servidor." });
    }
});

app.post("/azure/md", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    const {fileName} = req.body;
    if(!fileName){
        return res.status(400).json({ error: "fileName don't exist!" })
    }

    if(!token){
        return res.status(400).json({ error: "token don't exist!" })
    }

    try {
        const authorization = await new Token(db).validade(token)
        
        if(!authorization.status){
            return res.status(400).json({ error: authorization.message })
        }

        if(!authorization.auth){
            return res.status(401).json({ error: "Unauthorized token"}) 
        }

        const response = await new Azure().getMdFile(req.body.fileName)
        
        if(!response.status){
            return res.status(500).json({ error: response.message}) 
        }
        
        return res.status(200).json({status: true, data: response.data, token: authorization.token, refreshed: authorization.refreshed})
    } catch (err) {
        console.error("azure/md: ", err)
        return res.status(500).json({status: false, error: "Erro interno no servidor." });
    }
});

app.post("/github/md", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    const {repoName} = req.body;
    if(!repoName){
        return res.status(400).json({ error: "repo name don't exist!" })
    }

    if(!token){
        return res.status(400).json({ error: "token don't exist!" })
    }

    try {
        const authorization = await new Token(db).validade(token)
        
        if(!authorization.status){
            return res.status(400).json({ error: authorization.message })
        }

        if(!authorization.auth){
            return res.status(401).json({ error: "Unauthorized token"}) 
        }

        const GithubService = new Github()
        const response = await GithubService.get_md(repoName)

        if(!response.status){
            return res.status(500).json({ error: response.message });
        }

        return res.status(200).json({status:true, data: response.data, token: authorization.token, refreshed: authorization.refreshed});
    } catch (err) {
        console.error("github/md: ", err)
        return res.status(500).json({status: false, error: "Erro interno no servidor." });
    }
})

app.get("/github/repo", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];

    if(!token){
        return res.status(400).json({ error: "token don't exist!" })
    }

    try {
        const authorization = await new Token(db).validade(token)
        
        if(!authorization.status){
            return res.status(400).json({ error: authorization.message })
        }

        if(!authorization.auth){
            return res.status(401).json({ error: "Unauthorized token"}) 
        }

        const GithubService = new Github()
        const response = await GithubService.get_repos()

        if(!response.status){
            return res.status(500).json({ error: response.message });
        }

        return res.status(200).json({status: true, data: response.data, token: authorization.token, refreshed: authorization.refreshed});
    } catch (err) {
        console.error("github/repo: ", err)
        return res.status(500).json({status: false, error: "Erro interno no servidor." });
    }
})

app.post("/github/repo/languages", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    const {url} = req.body;
    if(!url){
        return res.status(400).json({ error: "url don't exist!" })
    }

    if(!token){
        return res.status(400).json({ error: "token don't exist!" })
    }

    try {
        const authorization = await new Token(db).validade(token)
        
        if(!authorization.status){
            return res.status(400).json({ error: authorization.message })
        }

        if(!authorization.auth){
            return res.status(401).json({ error: "Unauthorized token"}) 
        }

        const GithubService = new Github()
        const response = await GithubService.getLanguagesRepo(url)

        if(!response.status){
            return res.status(500).json({ error: response.message });
        }

        return res.status(200).json({status:true, data: response.data, token: authorization.token, refreshed: authorization.refreshed});
    } catch (err) {
        console.error("github/languages: ", err)
        return res.status(500).json({status: false, error: "Erro interno no servidor." });
    }
})

app.post("/github/repo/id", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    const {repoId} = req.body;
    if(!repoId){
        return res.status(400).json({ error: "repoId don't exist!" })
    }

    if(!token){
        return res.status(400).json({ error: "token don't exist!" })
    }

    try {
        const authorization = await new Token(db).validade(token)
        
        if(!authorization.status){
            return res.status(400).json({ error: authorization.message })
        }

        if(!authorization.auth){
            return res.status(401).json({ error: "Unauthorized token"}) 
        }

        const GithubService = new Github()
        const response = await GithubService.getLanguagesRepo(repoId)

        if(!response.status){
            return res.status(500).json({ error: response.message });
        }

        return res.status(200).json({status:true, data: response.data, token: authorization.token, refreshed: authorization.refreshed});
    } catch (err) {
        console.error("github/languages: ", err)
        return res.status(500).json({status: false, error: "Erro interno no servidor." });
    }
})

app.post("/render/md", async(req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    const {markdownContent} = req.body;
    if(!markdownContent){
        return res.status(400).json({ error: "markdownContent don't exist!" })
    }

    if(!token){
        return res.status(400).json({ error: "token don't exist!" })
    }

    try {
        const authorization = await new Token(db).validade(token)
        
        if(!authorization.status){
            return res.status(400).json({ error: authorization.message })
        }

        if(!authorization.auth){
            return res.status(401).json({ error: "Unauthorized token"}) 
        }

        const RenderService = new Render()
        const response = await RenderService.MdToHtml(markdownContent)

        if(!response.status){
            return res.status(500).json({ error: response.message });
        }

        return res.status(200).json({status:true, data: response.data, token: authorization.token, refreshed: authorization.refreshed});
    } catch (err) {
        console.error("render/md: ", err)
        return res.status(500).json({status: false, error: "Erro interno no servidor." });
    }
})

app.listen(PORT);
