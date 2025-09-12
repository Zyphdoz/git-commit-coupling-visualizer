import http from 'http';
import { getRepoStatsInD3CompatibleFormat } from './readGitFiles/readGitFiles';
import { analyzerConfig, SERVER_PORT } from './analyzerConfig';

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
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

const shutdownServer = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        server.close((err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
};

let shuttingDown = false;
async function shutdown() {
    if (shuttingDown) {
        console.error(
            'Error while trying to shutdown the server. We just attempted to call the shutdown function while we were already trying to shut down.',
        );
        process.exit(1);
    }
    shuttingDown = true;
    try {
        await Promise.all([shutdownServer()]);
        process.exit(0);
    } catch (error) {
        console.error(`Error while trying to gracefully shotdown: ${error}`);
        process.exit(1);
    }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
