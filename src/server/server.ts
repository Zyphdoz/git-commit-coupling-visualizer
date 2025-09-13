import http from 'http';
import { getGitRepoUrl, getRepoStatsInD3CompatibleFormat } from './readGitFiles/readGitFiles';
import { analyzerConfig, SERVER_PORT } from './analyzerConfig';
import { openInCodeEditor } from './openInCodeEditor/openInCodeEditor';

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); // changed from http://localhost:5173/ to * because there may be more vite applications running on the same machine so 5173 may already be in use and vite will take the next available port
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
    } else if (req.method === 'GET' && reqUrl.pathname === '/api/get-repo-url') {
        try {
            res.statusCode = 200;
            res.end(JSON.stringify(await getGitRepoUrl(analyzerConfig.repoPath)));
        } catch (err) {
            res.statusCode = 500;
            res.end(
                JSON.stringify({
                    error: 'Failed to get repo url. Linking from the sidebar to the commits on github will be disabled.',
                    err,
                }),
            );
        }
    } else if (req.method === 'GET' && reqUrl.pathname === '/api/open-in-code-editor') {
        const path = reqUrl.searchParams.get('path');

        if (!path) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Missing path parameter' }));
            return;
        }

        try {
            await openInCodeEditor(path);
            res.statusCode = 200;
            res.end(JSON.stringify({ message: `${path} opened in VS Code` }));
        } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Failed to open in VS Code', err }));
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
