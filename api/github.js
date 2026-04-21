// api/github.js
export default async function handler(req, res) {
    try {
        const url = req.query.url;

        if (!url || !url.startsWith('https://api.github.com/')) {
            return res.status(400).json({
                error: 'URL inválida'
            });
        }

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
                Accept: 'application/vnd.github+json'
            }
        });

        const data = await response.json();

        res.status(response.status).json(data);
    } catch (error) {
        res.status(500).json({
            error: 'Erro ao consultar GitHub'
        });
    }
}