const fetch = require('node-fetch');

module.exports = async (req, res) => {
    const url = req.query.url;
    if (!url) {
        return res.status(400).json({ error: 'URL parameter is required' });
    }

    try {
        const decodedUrl = decodeURIComponent(url);

        const response = await fetch(decodedUrl, {
            headers: {
                'Referer': 'https://y.qq.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36'
            }
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: `API responded with status: ${response.status}` });
        }

        res.setHeader('Content-Type', response.headers.get('content-type'));
        response.body.pipe(res);

    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: 'Failed to proxy request' });
    }
};
