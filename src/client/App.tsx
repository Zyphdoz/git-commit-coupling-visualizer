import { useEffect, useState, type JSX } from 'react';
import type { NestedCodeStructure } from '../server/readGitFiles/readGitFiles';
import CircleDiagram from './CircleDiagram';
import CommitHistoryCard from './CommitHistoryCard';
import { SERVER_PORT } from '../server/analyzerConfig';

function App() {
    const [nestedCodeStructure, setNestedCodeStructure] = useState<NestedCodeStructure | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeFiles, setActiveFiles] = useState<Set<string>>(new Set());
    const [repoUrl, setRepoUrl] = useState<string>('');

    useEffect(() => {
        fetch(`http://localhost:${SERVER_PORT}/api/get-repo-stats`)
            .then(async (res) => {
                if (!res.ok) {
                    const body = await res.json();
                    throw new Error(`fetch failed: ${res.status}. ${JSON.stringify(body)}`);
                }
                const json = await res.json();
                return json;
            })
            .then((json) => setNestedCodeStructure(json as NestedCodeStructure))
            .catch((err) =>
                setError(
                    String(
                        err +
                            '. (if you just started the app and immediately went to this page and this is the first thing you see, this error is likely due to the server not being ready yet when you opened the page. Try refreshing this page.)',
                    ),
                ),
            );

        fetch(`http://localhost:${SERVER_PORT}/api/get-repo-url`)
            .then(async (res) => {
                if (!res.ok) {
                    const body = await res.json();
                    throw new Error(`fetch failed: ${res.status}. ${JSON.stringify(body)}`);
                }
                const json = await res.json();
                return json;
            })
            .then((json) => setRepoUrl(json))
            .catch((err) =>
                setError(
                    String(
                        err +
                            '. (if you just started the app and immediately went to this page and this is the first thing you see, this error is likely due to the server not being ready yet when you opened the page. Try refreshing this page.)',
                    ),
                ),
            );
    }, []);

    /**
     * This function recursively traverses through the nested `NestedCodeStructure` object, checking each file's
     * `filePath` against the `activeFiles` set. If the file is active, a corresponding
     * `<CommitHistoryCard>` component is returned for that file, rendering its commit history.
     * @param structure - A `NestedCodeStructure` representing the codebase, which may include files and subdirectories.
     * @returns An array of `<CommitHistoryCard>` components for the active files or null if no active files match.
     */
    const commitHistoryForActiveFiles = (structure: NestedCodeStructure): JSX.Element[] | null => {
        return (
            structure
                .map((entry) => {
                    if ('filePath' in entry) {
                        if (activeFiles.has(entry.filePath)) {
                            return <CommitHistoryCard key={entry.filePath} pieceOfCode={entry} repoUrl={repoUrl} />;
                        }
                    } else if ('children' in entry) {
                        return commitHistoryForActiveFiles(entry.children);
                    }
                    return null;
                })
                // since not every entry in our nested object has a matching filepath, we are going to end up
                // with a mix of `<CommitHistoryCard>` and `null` values in our array so we need to filter out null values
                // .filter(Boolean) is a concise way of removing all falsy values from an array.
                .filter(Boolean) as JSX.Element[]
        );
    };

    if (error) return <div className="blue text-red-600">Error: {error}</div>;

    return (
        <div className="flex">
            <div className="h-screen w-84 overflow-y-auto border-r border-gray-600 bg-[#0f1624] px-6 py-6">
                {nestedCodeStructure && commitHistoryForActiveFiles(nestedCodeStructure)}
            </div>
            <CircleDiagram
                nestedCodeStructure={nestedCodeStructure}
                activeFiles={activeFiles}
                setActiveFiles={setActiveFiles}
                setError={setError}
            ></CircleDiagram>
        </div>
    );
}

export default App;
