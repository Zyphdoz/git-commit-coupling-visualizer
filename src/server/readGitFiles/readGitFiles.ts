import { createReadStream, existsSync } from 'fs';
import { createInterface } from 'readline';
import { exec, execSync } from 'child_process';
import { promisify } from 'util';

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
