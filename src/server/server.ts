import http from 'http';
import { getRepoStatsInD3CompatibleFormat } from './readGitFiles/readGitFiles';
import { analyzerConfig } from './analyzerConfig';

export const SERVER_PORT = 3000;

const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');

    if (!req.url || !req.headers.host) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Invalid request: missing URL or Host header' }));
        return;
    }

    const reqUrl = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'GET' && reqUrl.pathname === '/api/get-repo-stats') {
        try {
            res.statusCode = 200;
            res.end(JSON.stringify(await getRepoStatsInD3CompatibleFormat(analyzerConfig)));
        } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Failed to get git-tracked files:', err }));
        }
    } else {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Not Found' }));
    }
});

server.listen(SERVER_PORT, () => {
    console.log(`Server is running on http://localhost:${SERVER_PORT}`);
});
