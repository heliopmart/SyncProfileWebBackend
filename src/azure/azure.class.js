const {BlobServiceClient} = require("@azure/storage-blob")
const axios = require("axios")
const { v4: uuidv4 } = require("uuid");

module.exports = class Azure{
    /*
        @params body => {text: string, from: string, to: string[]}
        @return {status: boolean, data: string}
    */
    async translate(body){
        return await __Translate(body.text, body.from, body.to)
    }

    /*
        @params {auth: string, fileName: string}
        @return {status: boolean, data: string}
    */
    async getMdFile(fileName){
        const authAzure = this.AuthStorage()
        return await __getMdFile(authAzure, fileName)
    }

    /*
        @return token azure
    */
    AuthStorage() {
        const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
    
        if (!AZURE_STORAGE_CONNECTION_STRING) {
            return false;
        }
    
        try {
            const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
            const containerClient = blobServiceClient.getContainerClient("mdfilesproject");
            return containerClient;
        } catch (ex) {
            console.error(`Authenticação Azure Storage Fail: (${ex})`);
        }
    }
    
}

async function __getMdFile(auth, fileName){
    const data = await getMarkdownFile(auth, fileName);
    if (data) {
        return {status: true, data: data}
    } else {
        return {status: false, message: "Failed to fetch the Markdown file"}
    }

    async function getMarkdownFile(auth, fileName) {
        if (!auth) {
            return;
        }
    
        const blobClient = auth.getBlockBlobClient(`${fileName}.md`);
    
        try {
            const downloadBlockBlobResponse = await blobClient.download(0);
            const downloadedData = await streamToText(downloadBlockBlobResponse.readableStreamBody);
            return downloadedData;
        } catch (error) {
            console.error("Erro ao baixar o arquivo", error);
            return null;
        }
    }
    
    async function streamToText(stream){
        if (!stream) {
            return
        }
    
        return new Promise((resolve, reject) => {
            let result = "";
    
            stream.on("data", (chunk) => {
                result += chunk;
            });
    
            stream.on("end", () => {
                resolve(result);
            });
    
            stream.on("error", (err) => {
                console.error("Erro no stream de dados:", err);
                reject(err);
            });
        });
    }
}

async function __Translate(text, from, to){
    const AZURE_TRANSLATOR_KEY = process.env.AZURE_API_KEY;
    const AZURE_REGION = process.env.AZURE_REGION; 
    const AZURE_TRANSLATOR_URL = 'https://api.cognitive.microsofttranslator.com/translate?api-version=3.0';

    try {
        const response = await axios.post(
            AZURE_TRANSLATOR_URL,
            [{ text: text }], 
            {
                headers: {
                    'Ocp-Apim-Subscription-Key': AZURE_TRANSLATOR_KEY,
                    'Ocp-Apim-Subscription-Region': AZURE_REGION,
                    'Content-Type': 'application/json',
                    'X-ClientTraceId': uuidv4(),
                },
                params: {
                    from: from,
                    to: to.join(','),
                },
            }
        );

        return {status: true, data: response.data}
    } catch (error) {
        console.error('Erro na tradução:', error);
        return {status: false, message: "Erro ao traduzir o texto."}
    }
}