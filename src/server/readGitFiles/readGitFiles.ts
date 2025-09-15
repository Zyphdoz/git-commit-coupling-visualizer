import { createReadStream, existsSync, promises } from 'fs';
import { createInterface } from 'readline';
import { exec, spawnSync } from 'child_process';
import { promisify } from 'util';
import { CIRCLE_COLOR, CircleColor, visualizerConfig, VisualizerConfig } from '../visualizerConfig';
import path from 'path';

/**
 * Counts the number of lines in a file.
 * @param filePath - Path to the file.
 * @returns Promise<number> - Number of lines in the file.
 */
export const countLinesInFile = async (filePath: string): Promise<number> => {
    try {
        await promises.access(filePath);

        let lineCount = 0;

        const fileStream = createReadStream(filePath);
        fileStream.on('error', (err) => {
            throw err;
        });

        const rl = createInterface({
            input: fileStream,
            crlfDelay: Infinity,
        });

        rl.on('line', () => {
            lineCount++;
        });

        return new Promise((resolve, reject) => {
            rl.on('close', () => {
                resolve(lineCount);
            });

            rl.on('error', reject);
        });
    } catch (error) {
        console.log(`File does not exist or cannot be accessed: ${filePath}`);
        throw error;
    }
};

/**
 * Retrieves the list of files tracked by Git in a directory,
 * excluding any files that contain any of the provided filter strings.
 *
 * This function uses `git ls-files`, as it directly interacts
 * with git index to fetch only the files under version control.
 *
 * @param {string} repoPath - The path to the directory where Git tracking should be checked.
 * @param {string[]} [excludeFilters] - Optional array of substrings. Files containing any of these
 *                                      substrings in their paths will be excluded.
 * @returns {Promise<string[]>} - A promise that resolves to an array of file paths, excluding
 *                                those that match any of the filter strings.
 */
export const getGitTrackedFiles = async (repoPath: string, excludeFilters: string[] = []): Promise<string[]> => {
    const execPromise = promisify(exec);
    const gitCommand = `git -C "${repoPath}" ls-files`;
    try {
        const { stdout } = await execPromise(gitCommand);
        const files = stdout.split('\n').filter(Boolean);

        if (excludeFilters.length === 0) {
            return files;
        }
        return files
            .filter((filePath) => !excludeFilters.some((filter) => filePath.includes(filter)))
            .map((file) => {
                const normalizedFile = path.normalize(file);
                // AI is capable of putting en dashes and other bs in file paths now...
                // I encountered two instances of that when I tested this tool on the react codebase.
                // en dash in filepaths becomes \342\200\223 when we list files using git ls-files
                // so we have to replace that with an actual en dash to get things working again...
                return normalizedFile.replace('\\342\\200\\223', '–').replace(/^\\?"|"\\?$/g, '');
            });
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Error in getGitTrackedFiles: ${error.message}`);
        } else {
            throw new Error(`Error of type unknown in getGitTrackedFiles: ${String(error)}`);
        }
    }
};

export default getGitTrackedFiles;

/**
 * Represents a single Git commit with relevant metadata and file changes.
 */
export interface GitCommit {
    commitHash: string;
    authorName: string;
    date: number; // Unix epoch time (milliseconds)
    changedFiles: string[]; // added or modified files
    comment: string;
}

/**
 * Extracts Git commit history from a repository.
 *
 * This function returns only those commits that contain added or modified files
 * exactly matching one or more provided file paths. Deleted files are always
 * ignored. A commit is excluded entirely if none of its changed files match.
 *
 *
 * @param repoPath Absolute or relative path to the root of the Git repository.
 * @param includedFiles Array of file paths to include. This function will only return
 * the commit history for the files that are specified here.
 * Each path must match exactly (no wildcards, substrings, or regex). If empty, the result is always empty.
 * The intention is to pass in the result of `getGitTrackedFiles()` here
 * so that the git history will include only the files that currently exist in the project.
 *
 * @returns An array of GitCommit objects representing the commit history for the files that are currently in the repo.
 *
 * @throws If the repository path does not exist or is not a Git repository.
 */
export const getGitHistory = (repoPath: string, includedFiles: string[] = []): GitCommit[] => {
    if (!existsSync(repoPath)) {
        throw new Error(`The path "${repoPath}" does not exist.`);
    }

    if (includedFiles.length === 0) {
        return [];
    }

    const gitLogFormat = '--COMMIT--%n%H|%an|%aI|%s';
    const args = [
        'log',
        '--name-status',
        `--pretty=format:${gitLogFormat}`,
        '--since',
        new Date(visualizerConfig.recentCutoff).toISOString().split('T').join(' ').split('Z')[0],
        '--',
        ...includedFiles,
    ];

    const result = spawnSync('git', args, {
        cwd: repoPath,
        encoding: 'utf-8',
        maxBuffer: Infinity,
    });

    if (result.error) {
        throw result.error;
    }
    if (result.status !== 0) {
        throw new Error(result.stderr);
    }

    const rawOutput = result.stdout;
    const commits: GitCommit[] = [];
    const entries = rawOutput.split('--COMMIT--').filter((e) => e.trim());

    for (const entry of entries) {
        const [headerLine, ...fileLines] = entry.trim().split('\n');
        const [commitHash, authorName, isoDate, commitMessage] = headerLine.split('|');

        const changedFiles: string[] = [];
        for (const line of fileLines) {
            const [status, filePath] = line.split('\t');
            if (!filePath || status === 'D') continue;
            changedFiles.push(filePath);
        }

        if (changedFiles.length === 0) continue;

        commits.push({
            commitHash,
            authorName,
            date: new Date(isoDate).getTime(),
            changedFiles,
            comment: commitMessage,
        });
    }

    return commits.reverse();
};

/**
 * Represents a source file that contains code. The name 'PieceOfCode' is used to avoid
 * ambiguity with 'File', which is often associated with physical file system files.
 */
export interface PieceOfCode {
    filePath: string;
    linesOfCode: number; // Size of the file in lines. Used to determine the radius for this piece of code in the circle diagram.
    gitHistory: GitCommit[]; // Every commit that includes this file
    contributors: string[]; // Names of all contributors to this file
    recentContributors: string[]; // Names of all contributors to this file in recent time
    recentlyChangedTogether: { filePath: string; count: number }[]; // Files that were recently changed together with this file
    circleColor: CircleColor;
}

/**
 * Represents a logical grouping of code. Such as a folder or directory
 * that contains a collection of other directories or code files.
 *
 * The name 'CollectionOfCode' is used instead of 'Directory' or 'Folder' to avoid ambiguity,
 * as those terms are often associated with file system structures and do not clearly communicate
 * the concept that we are modeling here: a container for pieces of code or other collections of code.
 */
export interface CollectionOfCode {
    directoryPath: string;
    children: NestedCodeStructure;
}

/**
 * Represents a source file that contains code or a directory that contains source files or more directories.
 */
export type NestedCodeStructure = (CollectionOfCode | PieceOfCode)[];

/**
 * Generates a hierarchical structure representing the source code files in a Git repository,
 * combined with metadata useful for visualizations like D3 diagrams.
 *
 * @param config - Configuration object following the structure seen in `visualizerConfig.ts`.
 *
 * @returns A nested structure of files and directories, ready to be consumed by a D3 hierarchical circle diagram.
 */
export const getRepoStatsInD3CompatibleFormat = async (config: VisualizerConfig): Promise<NestedCodeStructure> => {
    const {
        repoPath,
        filesToIgnore,
        mediumCouplingThreshold,
        highCouplingThreshold,
        mediumContributorsThreshold,
        highContributorsThreshold,
    } = config;
    const files = await getGitTrackedFiles(repoPath, filesToIgnore);

    // add line count to the files
    const filesWithLineCount = await Promise.all(
        files.map(async (file) => {
            const lineCount = await countLinesInFile(`${repoPath}/${file}`);
            return {
                path: file,
                lines: lineCount,
            };
        }),
    );

    // add git history and statistics to the files
    const filesWithLineCountAndGitHistory: PieceOfCode[] = [];
    const gitHistory = getGitHistory(repoPath, files);

    filesWithLineCount.forEach((file) => {
        const historyForThisFile: GitCommit[] = [];
        const uniqueContributors: string[] = [];
        const recentContributors: string[] = [];
        const recentlyChangedTogetherMap = new Map<string, number>();

        gitHistory.forEach((commit) => {
            if (commit.changedFiles.includes(file.path)) {
                historyForThisFile.push(commit);
                if (!uniqueContributors.includes(commit.authorName)) {
                    uniqueContributors.push(commit.authorName);
                }
                if (!recentContributors.includes(commit.authorName)) {
                    recentContributors.push(commit.authorName);
                }
                commit.changedFiles.forEach((changedFile) => {
                    if (changedFile === file.path) {
                        // empty block because a file will always change together with itselft and
                        // we don't want to have an entry that shows how many times the file got changed with itself
                    } else if (recentlyChangedTogetherMap.has(changedFile)) {
                        recentlyChangedTogetherMap.set(changedFile, recentlyChangedTogetherMap.get(changedFile)! + 1);
                    } else {
                        recentlyChangedTogetherMap.set(changedFile, 1);
                    }
                });
            }
        });

        const recentlyChangedTogether = Array.from(recentlyChangedTogetherMap, ([filePath, count]) => ({
            filePath,
            count,
        }));

        let circleColor: CircleColor = CIRCLE_COLOR.green;
        const mostChanges =
            recentlyChangedTogether.length > 0
                ? Math.max(...recentlyChangedTogether.map((changes) => changes.count))
                : 0;
        if (mostChanges >= mediumCouplingThreshold || recentContributors.length >= mediumContributorsThreshold) {
            circleColor = CIRCLE_COLOR.orange;
        }
        if (mostChanges >= highCouplingThreshold || recentContributors.length >= highContributorsThreshold) {
            circleColor = CIRCLE_COLOR.red;
        }
        filesWithLineCountAndGitHistory.push({
            filePath: file.path,
            circleColor: circleColor,
            linesOfCode: file.lines,
            gitHistory: historyForThisFile,
            contributors: uniqueContributors,
            recentContributors: recentContributors,
            recentlyChangedTogether: recentlyChangedTogether,
        });
    });

    // nest the files into directories based on their path
    const nestedCodeStructure: NestedCodeStructure = [];

    filesWithLineCountAndGitHistory.forEach((file) => {
        const fileParts = file.filePath.split(path.sep);
        let currentLevel = nestedCodeStructure;

        fileParts.forEach((part, index) => {
            const isFile = index === fileParts.length - 1; // last part is the file itself
            let directory = currentLevel.find((item) => 'directoryPath' in item && item.directoryPath === part);

            if (!directory) {
                if (isFile) {
                    directory = {
                        filePath: file.filePath,
                        linesOfCode: file.linesOfCode,
                        circleColor: file.circleColor,
                        gitHistory: file.gitHistory,
                        contributors: file.contributors,
                        recentContributors: file.recentContributors,
                        recentlyChangedTogether: file.recentlyChangedTogether,
                    };
                } else {
                    const directoryPath = fileParts.slice(0, index + 1).join(path.sep);
                    directory = { directoryPath: directoryPath, children: [] };
                }

                currentLevel.push(directory);
            }

            if ('children' in directory) {
                currentLevel = directory.children; // go deeper into the nested structure if this is a directory
            }
        });
    });
    return nestedCodeStructure;
};

/**
 * Retrieves the URL of the Git repository from the remote origin.
 * This function runs `git remote get-url origin` to fetch the URL directly from the repository configuration.
 *
 * @param {string} repoPath - The file path to the Git repository from which to fetch the remote URL.
 * @returns {Promise<string>} - A promise that resolves to the URL of the Git repository.
 * @throws {Error} - Throws an error if the Git command fails or the repository is not valid.
 */
export const getGitRepoUrl = async (repoPath: string): Promise<string> => {
    const execPromise = promisify(exec);
    const gitCommand = `git -C "${repoPath}" remote get-url origin`;

    try {
        const { stdout } = await execPromise(gitCommand);
        return stdout.split('.git')[0];
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Error in getGitRepoUrl: ${error.message}`);
        } else {
            throw new Error(`Error of type unknown in getGitRepoUrl: ${String(error)}`);
        }
    }
};
