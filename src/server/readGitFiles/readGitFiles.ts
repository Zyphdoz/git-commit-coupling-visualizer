import { createReadStream, existsSync } from 'fs';
import { createInterface } from 'readline';
import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import { AnalyzerConfig } from '../analyzerConfig';

/**
 * Counts the number of lines in a file.
 * @param filePath - Path to the file.
 * @returns Promise<number> - Number of lines in the file.
 */
export const countLinesInFile = async (filePath: string): Promise<number> => {
    return new Promise((resolve, reject) => {
        let lineCount = 0;

        const fileStream = createReadStream(filePath);
        fileStream.on('error', reject);

        const rl = createInterface({
            input: fileStream,
            crlfDelay: Infinity,
        });

        rl.on('line', () => {
            lineCount++;
        });

        rl.on('close', () => {
            resolve(lineCount);
        });
    });
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
        return files.filter((filePath) => !excludeFilters.some((filter) => filePath.includes(filter)));
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

    // ISO 8601 dates are used in Git log output to ensure time zone consistency and reliable parsing into epoch timestamps.
    const gitLogFormat = '--COMMIT--%n%H|%an|%aI|%s';
    const gitCommand = `git log --name-status --pretty=format:"${gitLogFormat}"`;

    const rawOutput = execSync(gitCommand, { cwd: repoPath }).toString('utf-8');

    const commits: GitCommit[] = [];
    const entries = rawOutput.split('--COMMIT--').filter((entry) => entry.trim());

    // Convert to set for faster lookups
    const includedFileSet = new Set(includedFiles);

    for (const entry of entries) {
        const [headerLine, ...fileLines] = entry.trim().split('\n');
        const [commitHash, authorName, isoDate, commitMessage] = headerLine.split('|');
        const matchingFiles: string[] = [];

        for (const line of fileLines) {
            const [status, filePath] = line.split('\t');

            if (!filePath || status === 'D') continue;

            if (includedFileSet.has(filePath)) {
                matchingFiles.push(filePath);
            }
        }

        if (matchingFiles.length === 0) continue;

        commits.push({
            commitHash,
            authorName: authorName,
            date: new Date(isoDate).getTime(),
            changedFiles: matchingFiles,
            comment: commitMessage,
        });
    }

    // reverse because the git log command outputs the newest commits at the top
    return commits.reverse();
};

export type TechDebt = 'low' | 'medium' | 'high';

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
    techDebtLikelyhood: TechDebt; // Likelyhood of high interest technical debt in this file
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
 * @param config - Configuration object following the structure seen in `analyzerConfig.ts`.
 *
 * @returns A nested structure of files and directories, ready to be consumed by a D3 hierarchical circle diagram.
 */
export const getRepoStatsInD3CompatibleFormat = async (config: AnalyzerConfig): Promise<NestedCodeStructure> => {
    const {
        repoPath,
        filesToIgnore,
        recentCutoff,
        mediumCoChangesThreshold,
        highCoChangesThreshold,
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
                const isRecent = commit.date > recentCutoff;
                if (isRecent) {
                    if (!recentContributors.includes(commit.authorName)) {
                        recentContributors.push(commit.authorName);
                    }
                    commit.changedFiles.forEach((changedFile) => {
                        if (changedFile === file.path) {
                            // empty block because a file will always change together with itselft and
                            // we don't want to have an entry that shows how many times the file got changed with itself
                        } else if (recentlyChangedTogetherMap.has(changedFile)) {
                            recentlyChangedTogetherMap.set(
                                changedFile,
                                recentlyChangedTogetherMap.get(changedFile)! + 1,
                            );
                        } else {
                            recentlyChangedTogetherMap.set(changedFile, 1);
                        }
                    });
                }
            }
        });

        const recentlyChangedTogether = Array.from(recentlyChangedTogetherMap, ([filePath, count]) => ({
            filePath,
            count,
        }));

        let techDebtLikelyhood: 'low' | 'medium' | 'high' = 'low';
        const mostChanges =
            recentlyChangedTogether.length > 0
                ? Math.max(...recentlyChangedTogether.map((changes) => changes.count))
                : 0;
        if (mostChanges >= mediumCoChangesThreshold || recentContributors.length >= mediumContributorsThreshold) {
            techDebtLikelyhood = 'medium';
        }
        if (mostChanges >= highCoChangesThreshold || recentContributors.length >= highContributorsThreshold) {
            techDebtLikelyhood = 'high';
        }
        filesWithLineCountAndGitHistory.push({
            filePath: file.path,
            techDebtLikelyhood: techDebtLikelyhood,
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
        const fileParts = file.filePath.split('/');
        let currentLevel = nestedCodeStructure;

        fileParts.forEach((part, index) => {
            const isFile = index === fileParts.length - 1; // last part is the file itself
            let directory = currentLevel.find((item) => 'directoryPath' in item && item.directoryPath === part);

            if (!directory) {
                if (isFile) {
                    directory = {
                        filePath: file.filePath,
                        linesOfCode: file.linesOfCode,
                        techDebtLikelyhood: file.techDebtLikelyhood,
                        gitHistory: file.gitHistory,
                        contributors: file.contributors,
                        recentContributors: file.recentContributors,
                        recentlyChangedTogether: file.recentlyChangedTogether,
                    };
                } else {
                    const directoryPath = fileParts.slice(0, index + 1).join('/');
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
