require("dotenv").config();

const clearCollection = async (db) => {
  const COLLECTION_NAME = "auth_token"; 
    try {
      const collectionRef = db.collection(COLLECTION_NAME);
      const snapshot = await collectionRef.get();
  
      if (snapshot.empty) {
        console.log(`✅ Nenhum documento encontrado na coleção "${COLLECTION_NAME}".`);
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
  
  module.exports = clearCollection;