const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");

module.exports = class Token{
    constructor(db){
        this._db = db
    }

    /*
        @params auth: {ip: string, device: string, nonce: string}
        @return auth: {token: string, expire: string, status: bool}
    */
    async auth(auth, nonce){
        if(!auth.ip || !auth.device || !nonce)
            return {status: false, mensage: "API ip, device or nonce not exist, Invalid credentials"}

        const ip = auth.ip;
        const device = auth.device

        // process.env.JWT_SECRET_KEYS
        // process.env.JWT_KEYS
        try {
            const timestamp = Date.now();
            const randomHash = crypto.randomBytes(16).toString("hex"); // Gera hash aleatória única

            const payload = {
                ip,
                device,
                nonce,
                timestamp,
                randomHash
            };

            const token = jwt.sign(payload, `${process.env.JWT_SECRET_KEYS}${process.env.JWT_KEYS}`, { expiresIn: "1h" });

            // Armazena no Firestore
            const tokenData = {
                token,
                ip,
                device,
                nonce,
                randomHash,
                activate: true,
                create_at: new Date().toISOString(),
                usage_at: null,
                refresh_at: null,
            };

            await this._db.collection("auth_token").doc(randomHash).set(tokenData);


            console.log("LOG Validate: ")
            console.log(`Nonce enviado pelo client: ${nonce}`)
            console.log(`token: ${token}`)
            console.log("________________________")

            return {
                status: true,
                token,
                expire: new Date().toISOString(),
            };

        } catch (error) {
            console.error("Erro ao autenticar:", error);
            return { status: false, message: `Erro no servidor: ${error}` };
        }
    }

    /*
        @params: datauser: {ip: string, device: string} token: string, newNonce: string
        @return: token => {status: boolean, token: string, auth: boolean}
    */
    async validade(dataUser, token, newNonce) {
        try {
            if (!token || !dataUser.ip || !dataUser.device || !newNonce) {
                return {status: false, mensage: "Parâmetros inválidos"}
            }

            const ip = dataUser.ip;
            const device = dataUser.device

            try {
                let decoded;
                decoded = jwt.verify(token, `${process.env.JWT_SECRET_KEYS}${process.env.JWT_KEYS}`);
                try {
                } catch (error) {
                    // Se o erro for de expiração, remover o token e criar um novo
                    if (error.name === "TokenExpiredError") {
                        console.log(`Token expirado: ${token}`);
                        
                        await this._db.collection("auth_token").doc(token).delete();
                        const newTokenResponse = await this.auth(dataUser);
                        return { auth: true, status: true, token: newTokenResponse.token, refreshed: true };
                    } else {
                        return { status: false, message: "Erro ao verificar validade do token" };
                    }
                }

                if(!decoded){
                    return { status: false, message: "Erro ao verificar validade do token 1/" };
                }

                // Buscar token no banco de dados
                const storedTokenSnapshot = await this._db.collection("auth_token").doc(decoded.randomHash).get();

                if (!storedTokenSnapshot.exists) {
                    console.log(`Error: Token in bd not exist: ${storedTokenSnapshot}`)
                    return {auth: false, status: true, token: null, refreshed: false }
                }

                const storedData = storedTokenSnapshot.data();

                // console.log("LOG Validate: ")
                // console.log(`decoded.nonce: ${decoded.nonce}`)
                // console.log(`storedData.nonce: ${storedData.nonce}`)
                // console.log(`newNonce: ${newNonce}`)
                // console.log(`token: ${token}`)
                // console.log("________________________")

                if (storedData.ip != ip || storedData.device != device || storedData.token != token || (decoded.nonce != storedData.nonce) || decoded.nonce == newNonce) {                                        
                    return {auth: false, status: true, token: null, refreshed: false }
                }

                const timestamp = decoded.timestamp;
                const refreshedPayload = {
                    ip,
                    device,
                    nonce: newNonce,
                    timestamp,
                    randomHash: decoded.randomHash
                };

                const refreshedToken = jwt.sign(refreshedPayload, `${process.env.JWT_SECRET_KEYS}${process.env.JWT_KEYS}`, { expiresIn: "1h" });

                await this._db.collection("auth_token").doc(decoded.randomHash).update({
                    token: refreshedToken,
                    nonce: newNonce,
                    usage_at: new Date().toISOString(),
                    refresh_at: new Date().toISOString()
                });

                return {auth: true, status: true, token: refreshedToken, refreshed: true }
            } catch (error) {
                console.log(error)
                return {status: false, message: "Erro interno ao verificar validade 2/"}   
            }
        } catch (error) {
            return {status: false, message: "Erro interno ao verificar validade"}
        }
    }

    async RestartTokenByError(dataUser, newToken, oldToken, oldNonce){
        try{
            if (!token || !dataUser.ip || !dataUser.device || !oldNonce) {
                return {status: false, mensage: "Parâmetros inválidos"}
            }

            const ip = dataUser.ip;
            const device = dataUser.device
            const decoded = jwt.verify(newToken, `${process.env.JWT_SECRET_KEYS}${process.env.JWT_KEYS}`);

            if(!decoded){
                return { status: false, message: "Erro ao Restart Token 1/" };
            }

            if(ip != decoded.ip && device != decoded.device){
                return { status: false, message: "Erro ao Restart Token 2/" };
            }


            if (!storedTokenSnapshot.exists) {
                console.log(`Error: Token in bd not exist: ${storedTokenSnapshot}`)
                return {auth: false, status: true, token: null, refreshed: false }
            }

            await this._db.collection("auth_token").doc(decoded.randomHash).update({
                token: oldToken,
                nonce: oldNonce,
                usage_at: new Date().toISOString(),
                refresh_at: new Date().toISOString()
            });

            return {auth: true, status: false, token: oldToken, refreshed: true }
            // {status: true, data: response.data, token: authorization.token, refreshed: authorization.refreshed}
        }catch(ex){
            console.log(ex)
            return {status: false, message: "Erro interno ao restartar o token 3/"}
        }
    }
}