const git_api = require("../private/github.api.json")

module.exports = class Github {
    async get_repos() {
        const response = await fetch(`${git_api.defaultUrl}/${git_api.user}/${git_api.request}`);

        if (response.ok) {
            const projects = await response.json();
            return { status: true, data: projects }
        } else {
            return { status: false, message: "Erro ao buscar repositórios" }
        }
    }

    // @params auth = {token: string, user: string}
    async get_md(repoName) {
        try {
            const readmeResponse = await fetch(`https://api.github.com/repos/${git_api.user}/${repoName}/contents/README.md`);

            if (!readmeResponse.ok) {
                return {status: false, message: "Failed to fetch README.md."}
            }

            const readmeData = await readmeResponse.json();

            if (readmeData.content) {
                const decodedContent = Buffer.from(readmeData.content, 'base64').toString('utf-8');
                return {status: true, data: decodedContent}
            } else {
                return {status: false, message: "README.md not found."}
            }
        } catch (error) {
            console.error('Error fetching README.md:', error);
            return {status: false, message: "Internal server error"}
        }
    }

    /*
        *@params {url: string} => languages git url
        *@return {status: boolean, data: string[]}
    */
    async getLanguagesRepo(url){
        try {
            const repoResponse = await fetch(`${url}`);

            if (!repoResponse.ok) {
                return {status: false, message: "languages not found"}
            }

            const repoData = await repoResponse.json();

            if (repoData) {
                return {status: true, data: repoData}
            } else {
                return {status: false, message: "languages not exist"}
            }
        } catch (error) {
            console.error('getLanguagesRepo:', error);
            return {status: false, message: "Internal server error"}
        }
    }

    /*
        *@params {id: string} => languages git url
        *@return {status: boolean, data: object}
    */
    async getRepoById(id){
        try {
            const repoResponse = await fetch(`https://api.github.com/repositories/${id}`);

            if (!repoResponse.ok) {
                return {status: false, message: "Failed to fetch repository data."}
            }

            const repoData = await repoResponse.json();

            if (repoData) {
                return {status: true, data: repoData}
            } else {
                return {status: false, message: "languages not exist"}
            }
        } catch (error) {
            console.error('getRepoById:', error);
            return {status: false, message: "Internal server error"}
        }
    }
}
