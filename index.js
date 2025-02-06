require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cron = require('node-cron');
const admin = require("firebase-admin");
const Token = require("./src/token/token.class")
const Github = require("./src/github/github.class")
const Azure = require("./src/azure/azure.class")
const Render = require("./src/render/render.class")
const clearCollection = require("./clearTokens")

const app = express();
const PORT = process.env.PORT || 5000;

const serviceAccount = {
    type: process.env.FIREBASE_TYPE,
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
    universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN,
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const allowedOrigins = [
'https://profile-web-git-main-heliopmarts-projects.vercel.app',
'http://localhost:3000', 
];
  
app.use(cors({
    origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {  // !origin permite requisições de ferramentas como Postman
        callback(null, true);
    } else {
        callback(new Error('Not allowed by CORS'));
    }
    }
}));
app.use(express.json());

app.post("/token/auth", async (req, res) => {
    const {device } = req.body;
    const forwarded = req.headers["x-forwarded-for"];
    const ip = forwarded ? forwarded.split(",")[0] : req.ip;
    const nonce = req.headers["nonce"];
    
    if (!ip || !device || !nonce) {
        return res.status(400).json({ error: "Params don't exist!" })
    }

    try {
        const tokenService = new Token(db);
        const response = await tokenService.auth({device, ip}, nonce);

        if (!response.status) {
            return res.status(401).json({ error: response.message });
        }

        return res.status(200).json(response);
    } catch (error) {
        console.error("Erro ao autenticar:", error);
        return res.status(500).json({ error: `Erro interno no servidor. ${error}` });
    }
});

app.post("/token/validate", async (req, res) => {
    const {device } = req.body;
    const forwarded = req.headers["x-forwarded-for"];
    const ip = forwarded ? forwarded.split(",")[0] : req.ip;
    const nonce = req.headers["nonce"];
    const token = req.headers["authorization"]?.split(" ")[1];

    if(!token || !ip || !device || !nonce){
        return res.status(400).json({ error: "token don't exist!" })
    }

    try {
        const authorization = await new Token(db).validade({ip, device}, token, nonce)
        
        if(!authorization.status){
            return res.status(400).json({ error: authorization.message })
        }

        if(!authorization.auth){
            return res.status(401).json({ error: "Unauthorized token"}) 
        }
        
        return res.status(200).json({status: true, auth: authorization.auth, token: authorization.token, refreshed: authorization.refreshed})
    } catch (err) {
        console.error("/token/validate: ", err);
        return res.status(500).json({status: false, error: "Erro interno no servidor." });
    }
});

app.post("/azure/translate", async (req, res) => {
    const forwarded = req.headers["x-forwarded-for"];
    const ip = forwarded ? forwarded.split(",")[0] : req.ip;
    const nonce = req.headers["nonce"];
    const token = req.headers["authorization"]?.split(" ")[1];

    const {text, from, to, device} = req.body;
    if(!text || !from || !to && !Array.isArray(to) || !ip || !nonce || device ){
        return res.status(400).json({ error: "text or from or to don't exist!" })
    }

    if(!token){
        return res.status(400).json({ error: "token don't exist!" })
    }

    const authorization = await new Token(db).validade({ip, device}, token, nonce)
    
    if(!authorization.status){
        return res.status(400).json({ error: authorization.message })
    }

    if(!authorization.auth){
        return res.status(401).json({ error: "Unauthorized token"}) 
    }

    try {
        const response = await new Azure().translate(req.body)
        
        if(!response.status){
            const restartToken = await new Token(db).RestartTokenByError({ip, device}, token, nonce);
            return res.status(201).json({...restartToken, data: null});
        }
        
        return res.status(200).json({status: true, data: response.data, token: authorization.token, refreshed: authorization.refreshed})
    } catch (err) {
        console.error("/azure/translate: ", err);
        if(authorization.auth === true){
            const restartToken = await new Token(db).RestartTokenByError({ip, device}, token, nonce);
            return res.status(201).json({...restartToken, data: null});
        }else{
            return res.status(500).json({status: false, error: "Erro interno no servidor e token não autorizado" });
        }
    }
});

app.post("/azure/md", async (req, res) => {
    const forwarded = req.headers["x-forwarded-for"];
    const ip = forwarded ? forwarded.split(",")[0] : req.ip;
    const nonce = req.headers["nonce"];
    const token = req.headers["authorization"]?.split(" ")[1];

    const {repoName, device} = req.body;
    if(!repoName || !device || !nonce || !ip){
        return res.status(400).json({ error: "fileName don't exist!" })
    }

    if(!token){
        return res.status(400).json({ error: "token don't exist!" })
    }

    const authorization = await new Token(db).validade({ip, device}, token, nonce)
    
    if(!authorization.status){
        return res.status(400).json({ error: authorization.message })
    }

    if(!authorization.auth){
        return res.status(401).json({ error: "Unauthorized token"}) 
    }
    try {
        const response = await new Azure().getMdFile(req.body.repoName)
        
        if(!response.status){
            const restartToken = await new Token(db).RestartTokenByError({ip, device}, token, nonce);
            return res.status(201).json({...restartToken, data: null});
        }
        
        return res.status(200).json({status: true, data: response.data, token: authorization.token, refreshed: authorization.refreshed})
    } catch (err) {
        console.error("azure/md: ", err)
        if(authorization.auth === true){
            const restartToken = await new Token(db).RestartTokenByError({ip, device}, token, nonce);
            return res.status(201).json({...restartToken, data: null});
        }else{
            return res.status(500).json({status: false, error: "Erro interno no servidor e token não autorizado" });
        }
    }
});

app.post("/github/md", async (req, res) => {
    const forwarded = req.headers["x-forwarded-for"];
    const ip = forwarded ? forwarded.split(",")[0] : req.ip;
    const nonce = req.headers["nonce"];
    const token = req.headers["authorization"]?.split(" ")[1];

    const {repoName, device} = req.body;
    if(!repoName || !nonce || !ip || !device){
        return res.status(400).json({ error: "repo name don't exist!" })
    }

    if(!token){
        return res.status(400).json({ error: "token don't exist!" })
    }

    const authorization = await new Token(db).validade({ip, device}, token, nonce)
    
    if(!authorization.status){
        return res.status(400).json({ error: authorization.message })
    }

    if(!authorization.auth){
        return res.status(401).json({ error: "Unauthorized token"}) 
    }

    try {
        const GithubService = new Github()
        const response = await GithubService.get_md(repoName)

        if(!response.status){
            const restartToken = await new Token(db).RestartTokenByError({ip, device}, token, nonce);
            return res.status(201).json({...restartToken, data: null});
        }

        return res.status(200).json({status:true, data: response.data, token: authorization.token, refreshed: authorization.refreshed});
    } catch (err) {
        console.error("github/md: ", err)
        if(authorization.auth === true){
            const restartToken = await new Token(db).RestartTokenByError({ip, device}, token, nonce);
            return res.status(201).json({...restartToken, data: null});
        }else{
            return res.status(500).json({status: false, error: "Erro interno no servidor e token não autorizado" });
        }
    }
})

app.post("/github/repo", async (req, res) => {
    const forwarded = req.headers["x-forwarded-for"];
    const ip = forwarded ? forwarded.split(",")[0] : req.ip;
    const nonce = req.headers["nonce"];
    const token = req.headers["authorization"]?.split(" ")[1];
    const {device} = req.body;

    if(!device || !ip || !nonce){
        return res.status(400).json({ error: "Invalid Arguments" })
    }

    if(!token){
        return res.status(400).json({ error: "token don't exist!" })
    }

    const authorization = await new Token(db).validade({ip, device}, token, nonce)
    
    if(!authorization.status){
        return res.status(400).json({ error: authorization.message })
    }

    if(!authorization.auth){
        return res.status(401).json({ error: "Unauthorized token"}) 
    }
    try {
        const GithubService = new Github()
        const response = await GithubService.get_repos()

        if(!response.status){
            const restartToken = await new Token(db).RestartTokenByError({ip, device}, token, nonce);
            return res.status(201).json({...restartToken, data: null});
        }

        return res.status(200).json({status: true, data: response.data, token: authorization.token, refreshed: authorization.refreshed});
    } catch (err) {
        console.error("github/repo: ", err)
        if(authorization.auth === true){
            const restartToken = await new Token(db).RestartTokenByError({ip, device}, token, nonce);
            return res.status(201).json({...restartToken, data: null});
        }else{
            return res.status(500).json({status: false, error: "Erro interno no servidor e token não autorizado" });
        }
    }
})

app.post("/github/repo/languages", async (req, res) => {
    const forwarded = req.headers["x-forwarded-for"];
    const ip = forwarded ? forwarded.split(",")[0] : req.ip;
    const nonce = req.headers["nonce"];
    const token = req.headers["authorization"]?.split(" ")[1];

    const {url, device} = req.body;
    if(!url || !nonce || !ip || !device){
        return res.status(400).json({ error: "url don't exist!" })
    }

    if(!token){
        return res.status(400).json({ error: "token don't exist!" })
    }

    const authorization = await new Token(db).validade({ip, device}, token, nonce)
    
    if(!authorization.status){
        return res.status(400).json({ error: authorization.message })
    }

    if(!authorization.auth){
        return res.status(401).json({ error: "Unauthorized token"}) 
    }

    try {
        const GithubService = new Github()
        const response = await GithubService.getLanguagesRepo(url)

        if(!response.status){
            const restartToken = await new Token(db).RestartTokenByError({ip, device}, token, nonce);
            return res.status(201).json({...restartToken, data: null});
        }

        return res.status(200).json({status:true, data: response.data, token: authorization.token, refreshed: authorization.refreshed});
    } catch (err) {
        console.error("github/languages: ", err)
        if(authorization.auth === true){
            const restartToken = await new Token(db).RestartTokenByError({ip, device}, token, nonce);
            return res.status(201).json({...restartToken, data: null});
        }else{
            return res.status(500).json({status: false, error: "Erro interno no servidor e token não autorizado" });
        }
    }
})

app.post("/github/repo/id", async (req, res) => {
    const forwarded = req.headers["x-forwarded-for"];
    const ip = forwarded ? forwarded.split(",")[0] : req.ip;
    const nonce = req.headers["nonce"];
    const token = req.headers["authorization"]?.split(" ")[1];

    const {repoId, device} = req.body;
    if(!repoId || !device || !nonce || !ip){
        return res.status(400).json({ error: "repoId don't exist!" })
    }

    if(!token){
        return res.status(400).json({ error: "token don't exist!" })
    }

    const authorization = await new Token(db).validade({ip, device}, token, nonce)
    
    if(!authorization.status){
        return res.status(400).json({ error: authorization.message })
    }

    if(!authorization.auth){
        return res.status(401).json({ error: "Unauthorized token"}) 
    }

    try {
        const GithubService = new Github()
        const response = await GithubService.getRepoById(repoId)

        if(!response.status){
            console.log("ERROR 500, " + response.message)
            const restartToken = await new Token(db).RestartTokenByError({ip, device}, token, nonce);
            return res.status(201).json({...restartToken, data: null});
        }

        return res.status(200).json({status:true, data: response.data, token: authorization.token, refreshed: authorization.refreshed});
    } catch (err) {
        console.error("github/languages: ", err)
        if(authorization.auth === true){
            const restartToken = await new Token(db).RestartTokenByError({ip, device}, token, nonce);
            return res.status(201).json({...restartToken, data: null});
        }else{
            return res.status(500).json({status: false, error: "Erro interno no servidor e token não autorizado" });
        }
    }
})

app.post("/render/md", async(req, res) => {
    const forwarded = req.headers["x-forwarded-for"];
    const ip = forwarded ? forwarded.split(",")[0] : req.ip;
    const nonce = req.headers["nonce"];
    const token = req.headers["authorization"]?.split(" ")[1];
    
    const {markdownContent, device} = req.body;
    if(!markdownContent || !nonce || !ip || !device){
        return res.status(400).json({ error: "markdownContent don't exist!" })
    }

    if(!token){
        return res.status(400).json({ error: "token don't exist!" })
    }

    const authorization = await new Token(db).validade({ip, device}, token, nonce)
    
    if(!authorization.status){
        return res.status(400).json({ error: authorization.message })
    }

    if(!authorization.auth){
        return res.status(401).json({ error: "Unauthorized token"}) 
    }
    try {

        const RenderService = new Render()
        const response = await RenderService.MdToHtml(markdownContent)

        if(!response.status){
            console.log("ERROR 500, " + response.message)
            const restartToken = await new Token(db).RestartTokenByError({ip, device}, authorization.token ,token, nonce);
            return res.status(201).json({...restartToken, data: null});
        }

        return res.status(200).json({status:true, data: response.data, token: authorization.token, refreshed: authorization.refreshed});
    } catch (err) {
        console.error("render/md: ", err)
        if(authorization.auth === true){
            const restartToken = await new Token(db).RestartTokenByError({ip, device}, token, nonce);
            return res.status(201).json({...restartToken, data: null});
        }else{
            return res.status(500).json({status: false, error: "Erro interno no servidor e token não autorizado" });
        }
    }
})

cron.schedule('0 3 * * *', () => {
    try{
        clearCollection(db);
        console.log("Tokens Removed");
    }catch(error){
        console.log("Remove tokens error: " + error);
    }
});

app.listen(PORT);
