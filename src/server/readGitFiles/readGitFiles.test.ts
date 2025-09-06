import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import path from 'path';
import { countLinesInFile, getGitHistory, getGitTrackedFiles, type GitCommit } from './readGitFiles';
import fs, { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { execSync } from 'child_process';

describe('countLinesInFile', () => {
    it('should count 5 lines in testFileForCountingLines.ts', async () => {
        const filePath = path.resolve(__dirname, 'testFileForCountingLines.ts');
        const lineCount = await countLinesInFile(filePath);
        expect(lineCount).toBe(5);
    });
});

describe('getGitTrackedFiles', () => {
    it('returns correct files with and without filters', async () => {
        const tempDir = fs.mkdtempSync(join(tmpdir(), 'git-tracked-test-'));
        try {
            /**
             * Create a temporary git directory, add some files to it and commit,
             * then verify that getGitTrackedFiles gets the right files,
             * then remove the temporary directory
             */
            execSync('git init --initial-branch=main', { cwd: tempDir });
            const filesToCreate = ['a.js', 'b.txt', 'subdir/c.ts', 'exclude-me.log', 'secrets/hidden.txt'];
            for (const relativeFilePath of filesToCreate) {
                const fullPath = join(tempDir, relativeFilePath);
                fs.mkdirSync(path.dirname(fullPath), { recursive: true });
                fs.writeFileSync(fullPath, `// contents of ${relativeFilePath}`);
                execSync(`git add "${relativeFilePath}"`, { cwd: tempDir });
            }
            execSync('git commit -m "Add test files"', { cwd: tempDir });

            // Run test: no filters
            const allFiles = await getGitTrackedFiles(tempDir);
            expect(allFiles.sort()).toEqual(
                ['a.js', 'b.txt', 'exclude-me.log', 'secrets/hidden.txt', 'subdir/c.ts'].sort(),
            );

            // Run test: with filters
            const filteredFiles = await getGitTrackedFiles(tempDir, ['exclude', 'secrets']);
            expect(filteredFiles.sort()).toEqual(['a.js', 'b.txt', 'subdir/c.ts'].sort());
        } finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });
});

describe('getGitHistory', () => {
    const filesToCreate = ['file1.js', 'file2.txt', 'subdir/file3.ts', 'subdir/file4.md'];
    const includedFiles = ['file1.js', 'subdir/file3.ts'];
    let tempDir: string;
    let commits: GitCommit[];

    beforeAll(() => {
        tempDir = mkdtempSync(join(tmpdir(), 'git-history-test-'));

        execSync('git init --initial-branch=main', { cwd: tempDir });

        for (const relativeFilePath of filesToCreate) {
            const fullPath = join(tempDir, relativeFilePath);
            fs.mkdirSync(path.dirname(fullPath), { recursive: true });
            fs.writeFileSync(fullPath, `// contents of ${relativeFilePath}`);
            execSync(`git add "${relativeFilePath}"`, { cwd: tempDir });
        }
        execSync('git commit -m "First commit"', { cwd: tempDir });

        fs.writeFileSync(join(tempDir, 'file1.js'), '// updated contents of file1.js');
        fs.writeFileSync(join(tempDir, 'subdir/file3.ts'), '// updated contents of file3.ts');
        execSync('git commit -am "Second commit"', { cwd: tempDir });

        fs.writeFileSync(join(tempDir, 'subdir/file3.ts'), '// updated contents of file3.ts again');
        execSync('git commit -am "Third commit"', { cwd: tempDir });

        fs.writeFileSync(join(tempDir, 'file2.txt'), '// updated contents of file2');
        execSync('git commit -am "4th commit"', { cwd: tempDir });

        // Get Git history for selected files
        commits = getGitHistory(tempDir, includedFiles);
    });

    afterAll(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('returns 3 commits even though there were 4 because the 4th commit does not contain any includedFiles', () => {
        expect(commits.length).toBe(3);
    });

    it('includes both file1.js and subdir/file3.ts in the first commit', () => {
        const first = commits[0];
        expect(first.changedFiles.sort()).toEqual(['file1.js', 'subdir/file3.ts'].sort());
        expect(first.comment).toBe('First commit');
    });

    it('includes both file1.js and subdir/file3.ts in the second commit', () => {
        const second = commits[1];
        expect(second.changedFiles.sort()).toEqual(['file1.js', 'subdir/file3.ts'].sort());
        expect(second.comment).toBe('Second commit');
    });

    it('includes only subdir/file3.ts in the third commit', () => {
        const third = commits[2];
        expect(third.changedFiles).toEqual(['subdir/file3.ts']);
        expect(third.comment).toBe('Third commit');
    });
});
