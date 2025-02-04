const admin = require("firebase-admin");
require("dotenv").config();

// Inicializar Firebase Admin SDK
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

// Nome da coleção a ser excluída
const COLLECTION_NAME = "auth_token"; // Altere para sua coleção

// Função para excluir todos os documentos de uma coleção
const clearCollection = async (collectionPath) => {
    try {
      const collectionRef = db.collection(collectionPath);
      const snapshot = await collectionRef.get();
  
      if (snapshot.empty) {
        console.log(`✅ Nenhum documento encontrado na coleção "${collectionPath}".`);
        return;
      }
  
      let count = 0;
      const batch = db.batch();
  
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
        count++;
      });
  
      await batch.commit();
      console.log(`🗑️ ${count} documentos excluídos da coleção "${collectionPath}".`);
    } catch (error) {
      console.error("❌ Erro ao limpar coleção:", error);
    }
  };
  
  // Executa a função para deletar todos os documentos da coleção especificada
  clearCollection(COLLECTION_NAME);