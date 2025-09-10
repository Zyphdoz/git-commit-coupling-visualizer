export interface AnalyzerConfig {
    repoPath: string; // a path to the git repo that we want to analyze. this can be a relative or absolute path.
    filesToIgnore: string[]; // any files that contain these strings in their name or path will not be included in the analysis.
    recentThreshold: number; // a commit is considered recent when it is less than this number of days old.
    mediumCoChangesThreshold: number; // if a file has been modified together with the same file at least this many times in recent changes, it will be flagged as having a medium likelihood of tech debt.
    highCoChangesThreshold: number; // if a file has been modified together with the same file at least this many times in recent changes, it will be flagged as having a high likelihood of tech debt.
    // the idea behind the contributor thresholds is that many different people contributing to the same piece of code can make that code harder to understand,
    // but this depends a lot on the experience level of the developers and how well they communicate, in some cases more eyes leads to better code
    // so you should assess what this situation is like for your project and choose very high numbers if you think this is not a problem or low numbers if you think this might be a problem.
    mediumContributorsThreshold: number; // if the file has more or equal to this number of recent contributors, it will be marked as medium likelihood of tech debt.
    highContributorsThreshold: number; // if the file has more or equal to this number of recent contributors, it will be marked as high likelihood of tech debt.
}

export const analyzerConfig: AnalyzerConfig = {
    repoPath: '../../',
    recentThreshold: 182, // 6 months
    mediumCoChangesThreshold: 4,
    highCoChangesThreshold: 8,
    mediumContributorsThreshold: 3,
    highContributorsThreshold: 5,
    filesToIgnore: [
        '.eslintrc.cjs',
        '.gitignore',
        '.prettierignore',
        'README.md',
        'index.html',
        'package-lock.json',
        'package.json',
        'prettierrc.json',
        'tsconfig.json',
        'tsconfig.node.json',
        '.png',
        '.config.',
        'public/',
    ],
};
