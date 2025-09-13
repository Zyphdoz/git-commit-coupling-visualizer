import { analyzerConfig } from '../server/analyzerConfig';
import type { PieceOfCode } from '../server/readGitFiles/readGitFiles';
import FileIcon from './svgIcons/fileIcon';

export interface CommitHistoryCardProps {
    pieceOfCode: PieceOfCode;
    repoUrl: string;
}

const recencyCutoff = new Date().getTime() - analyzerConfig.recentThreshold;

/**
 * Displays the commit history for a specific file.
 *
 * This component renders a list of recent contributors and commits for a given file (`pieceOfCode`).
 * It filters the commit history to only show commits that occurred within the defined recency threshold.
 *
 * Each commit includes:
 * - The commit's author name
 * - A brief snippet of the commit comment (truncated to 200 characters)
 * - A link to the commit on GitHub
 *
 * The component provides a clear overview of recent changes to the file and offers links to view
 * the commits directly on GitHub.
 *
 * @param pieceOfCode - A `PieceOfCode` object containing details about the file, including recent contributors and commit history.
 * @param repoUrl - The base URL of the repository used to construct links to view individual commits on GitHub.
 */
export default function CommitHistoryCard({ pieceOfCode, repoUrl }: CommitHistoryCardProps) {
    return (
        <div className="my-2 rounded-xl border border-[#311f57] px-3 py-2 pb-5">
            <h2 className="text-l flex">
                <FileIcon />
                {pieceOfCode.filePath.split('/')[pieceOfCode.filePath.split('/').length - 1]}
            </h2>
            <h2 className="text-l my-1">Recent contributors:</h2>
            <ul className="ml-5 list-disc">
                {pieceOfCode.recentContributors.map((contributor, index) => (
                    <li key={index}>{contributor}</li>
                ))}
            </ul>
            <h2 className="text-l mt-1 -mb-4">Recent commits:</h2>
            <ul className="">
                {pieceOfCode.gitHistory
                    .filter((commit) => commit.date > recencyCutoff)
                    .map((commit, index) => (
                        <li
                            key={index}
                            className="relative my-5 rounded-md py-2 text-sm break-words transition-all hover:bg-[#19182e]"
                        >
                            <span className="-mb-3 block px-2 text-xs">{new Date(commit.date).toLocaleString()}</span>
                            <br />
                            <span className="mx-1 rounded-t-md bg-[#242242] px-2 py-1 text-sm">
                                {commit.authorName}
                            </span>
                            <br />
                            <div
                                className="mx-1 rounded-md rounded-tl-none bg-[#242242] px-2 py-1 text-sm"
                                title={commit.comment}
                            >
                                {commit.comment.slice(0, 200)}
                                {commit.comment.length > 200 ? ' ...' : ''}
                            </div>
                            <a href={`${repoUrl}/commit/${commit.commitHash}`} title="View on github">
                                {/**
                                 * `absolute inset-0 h-auto w-auto` causes this span to expand and fill the entire relative container
                                 * which has the side effect of making the link apply to the entire area.
                                 * This approach is better than wrapping the whole list in an <a> tag because
                                 * that would cause screenreaders to say link and then read out the entire content of the list.
                                 * With this approch the screenreader will say link and read out only the aria-label "View this commit on github".
                                 * (good screenreader support aint really that important in the context of this application but I
                                 * just learned this trick and wanted to use it somewhere so I can refer other people to it when needed)
                                 */}
                                <span
                                    className="absolute inset-0 h-auto w-auto"
                                    aria-label="View this commit on github"
                                ></span>
                            </a>
                            <ul className="mt-1 px-2">
                                {commit.changedFiles.map((filePath, index) => (
                                    <li key={index} className="flex break-all" title={filePath}>
                                        <FileIcon />
                                        {filePath.split('/')[filePath.split('/').length - 1]}
                                    </li>
                                ))}
                            </ul>
                        </li>
                    ))
                    // the commit history array has oldest commit first
                    // so we reverse because we want newest commit on top of the list
                    .reverse()}
            </ul>
        </div>
    );
}
