const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

module.exports = class Token{
    constructor(db){
        this._db = db
    }

    /*
        @params auth: {key: string, secret: string, _TCD: 'profileWeb' | 'aplication'}
        @return auth: {token: string, expire: string, status: bool}
    */
    async auth(auth){
        if(!auth.key || !auth.secret)
            return {status: false, mensage: "API or Secret not exist, Invalid credentials"}

        const Keydecoded = jwt.verify(auth.key, process.env.JWT_KEYS, { ignoreExpiration: true });
        const Secretdecoded = jwt.verify(auth.secret, process.env.JWT_SECRET_KEYS, { ignoreExpiration: true });

        try {
            const clientsRef = this._db.collection("auth_backend");
            const querySnapshot = await clientsRef
                .where("api_key", "==", Keydecoded)
                .where("secret_key", "==", Secretdecoded)
                .limit(1)
                .get();

            if (querySnapshot.empty) {
                return { status: false, message: "Invalid credentials" };
            }

            
            const clientData = querySnapshot.docs[0].data();
            const clientId = querySnapshot.docs[0].id;

            const payload = {
                clientId,
                permissions: clientData.permissions || [],
                _TCD: auth._TCD,
            };

            const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });

            const tokenData = {
                activate: true,
                create_at: new Date().toISOString(),
                usage_at: null,
                refresh_at: null,
                creator_api_key: auth.key,
                token: token,
            };

            const tokenRef = this._db.collection("auth_token").doc(uuidv4());
            await tokenRef.set(tokenData);

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
        @params: token => string
        @return: token => {status: boolean, token: string, auth: boolean}
    */
    async validade(token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
    
            const tokenRef = this._db.collection("auth_token");
            const querySnapshot = await tokenRef.where("token", "==", token).limit(1).get();
    
            if (querySnapshot.empty) {
                return { status: false, message: "Token não encontrado" };
            }
    
            const tokenDoc = querySnapshot.docs[0];
            const tokenData = tokenDoc.data();
    
            const now = new Date();
            const createdAt = new Date(tokenData.create_at);
            const usageAt = tokenData.usage_at ? new Date(tokenData.usage_at) : null;
    
            // 1️⃣ Se o token já expirou (mais de 1h desde `create_at`), desativa
            const diffInHours = (now - createdAt) / (1000 * 60 * 60);
            if (diffInHours > 1) {
                await tokenDoc.ref.update({ activate: false, usage_at: now.toISOString() });
            }
    
            // 2️⃣ Se o token está desativado, verifica se está dentro do período de 30 min
            if (!tokenData.activate) {
                const diffInMinutes = usageAt ? (now - usageAt) / (1000 * 60) : null;
    
                if (diffInMinutes !== null && diffInMinutes <= 30) {
                    // 3️⃣ Se está dentro da janela de 30 minutos, gera um novo token e reativa
                    const newToken = jwt.sign(
                        { clientId: decoded.clientId, permissions: decoded.permissions },
                        process.env.JWT_SECRET,
                        { expiresIn: "1h" }
                    );
    
                    await tokenDoc.ref.update({
                        token: newToken,
                        activate: true,
                        refresh_at: now.toISOString(),
                        usage_at: now.toISOString()
                    });
    
                    return { status: true, token: newToken, auth: true , refreshed: true };
                } else {
                    // 4️⃣ Se passou dos 30 min, exige reautenticação e remove o token antigo
                    await tokenDoc.ref.delete();
                    return { status: false, message: "Token expirado. Faça login novamente." };
                }
            }
    
            // 5️⃣ Se o token ainda é válido, apenas atualiza `usage_at`
            await tokenDoc.ref.update({ usage_at: now.toISOString() });
    
            return { status: true, token, auth: true, refreshed: false };
    
        } catch (error) {
            return { status: false, message: "Token inválido" };
        }
    }
    /*
        @params: token => string
        @return: newToken => {status: boolena, token: string, expire: string}
    */
    async refresh(token){
        try {
            const tokenRef = this._db.collection("auth_token");
            const querySnapshot = await tokenRef.where("token", "==", token).limit(1).get();

            if (querySnapshot.empty) {
                return { status: false, message: "Token não encontrado" };
            }

            const tokenDoc = querySnapshot.docs[0];
            const tokenData = tokenDoc.data();

            if (!tokenData.activate) {
                return { status: false, message: "Token desativado" };
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });

            const newToken = jwt.sign(
                { clientId: decoded.clientId, permissions: decoded.permissions, _TCD: decoded._TCD },
                process.env.JWT_SECRET,
                { expiresIn: "1h" }
            );

            const newTokenData = {
                activate: true,
                create_at: new Date().toISOString(),
                usage_at: null,
                refresh_at: new Date().toISOString(),
                creator_api_key: tokenData.creator_api_key,
                token: newToken,
            };

            const newTokenRef = this._db.collection("auth_token").doc(uuidv4());
            await newTokenRef.set(newTokenData);

            return { status: true, token: newToken, expire: new Date().toISOString() };

        } catch (error) {
            return { status: false, message: "Erro ao renovar token" };
        }
    }
}