import { analyzerConfig } from '../server/analyzerConfig';
import type { PieceOfCode } from '../server/readGitFiles/readGitFiles';
import FileIcon from './svgIcons/fileIcon';

export interface CommitHistoryCardProps {
    pieceOfCode: PieceOfCode;
}

const recencyCutoff = new Date().getTime() - analyzerConfig.recentThreshold;

export default function CommitHistoryCard({ pieceOfCode }: CommitHistoryCardProps) {
    return (
        <div className="my-2 rounded-xl border border-[#311f57] px-3 py-2">
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
            <h2 className="text-l mt-1 -mb-2">Recent commits:</h2>
            <ul className="">
                {pieceOfCode.gitHistory
                    .filter((commit) => commit.date > recencyCutoff)
                    .map((commit, index) => (
                        <li key={index} className="my-5 text-sm break-words">
                            <span className="px-2 text-xs">{new Date(commit.date).toLocaleString()}</span>
                            <br />
                            <span className="px-2 text-sm">{commit.authorName}</span>
                            <br />
                            <div className="rounded-md bg-[#111c31] px-2 py-1 text-sm" title={commit.comment}>
                                {commit.comment.slice(0, 100)}
                                {commit.comment.length > 100 ? ' ...' : ''}
                            </div>

                            <ul className="mt-1 px-2">
                                {commit.changedFiles.map((filePath) => (
                                    <li className="flex">
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
