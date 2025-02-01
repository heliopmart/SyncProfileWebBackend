async function loadRemarkModules() {
    const { remark } = await import("remark");
    const html = await import("remark-html").then(mod => mod.default);
    return { remark, html };
}

module.exports = class Render{
    async MdToHtml(markdownContent){
        try {        
            const { remark, html } = await loadRemarkModules();            
            const convert = await remark().use(html).process(markdownContent);
            const htmlContent = convert
    
            return {status: true, data: htmlContent.toString()}
        } catch (error) {
            console.error('Erro ao processar o conteúdo Markdown:', error);
            return {status: false, message: 'Failed to process Markdown content'}
        }
    }
}
