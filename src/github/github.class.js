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
}