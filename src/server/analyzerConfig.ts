export interface AnalyzerConfig {
    repoPath: string; // a path to the git repo that we want to analyze. this can be a relative or absolute path.
    filesToIgnore: string[]; // any files that contain these strings in their name or path will not be included in the analysis.
    recentThreshold: number; // a commit is considered recent when it is less than this number of milliseconds old. the analyzer will ignore commits that are older than this.
    mediumCoChangesThreshold: number; // if a file has been modified together with the same file at least this many times in recent changes, it will be flagged as medium likelihood of high interest tech debt.
    highCoChangesThreshold: number; // if a file has been modified together with the same file at least this many times in recent changes, it will be flagged as high likelihood of high interest tech debt.
    // the idea behind the contributor thresholds is that many different people contributing to the same piece of code can make that code harder to understand if everybody has their own coding style,
    // but this depends a lot on the experience level of the developers and how well they communicate, in some cases more eyes on the same code leads to better code
    // so you should assess what this situation is like for your project and choose very high numbers if you think this is not a problem or low numbers if you think this might be a problem.
    // an alternative use case for this setting is to temporarily set the contributor thresholds lower than usual while temporarily setting the coChange thresholds much higer than usual
    // such that the colors in the circle diagram will no longer reflect coChanges but instead they will give you a clear overview of which files have recently been changed by multiple people.
    // this is not an indicator of tech debt but this information is still useful because it tells you these are files that are important to keep in a good condition.
    // if you have technical debt in these files, it will not just slow down one person, it will slow down multiple people.
    mediumContributorsThreshold: number; // if the file has more or equal to this number of recent contributors, it will be flagged as medium likelihood of high interest tech debt.
    highContributorsThreshold: number; // if the file has more or equal to this number of recent contributors, it will be flagged as high likelihood of high interest tech debt.
}

export const analyzerConfig: AnalyzerConfig = {
    repoPath: '../../',
    recentThreshold: 182 * 86400000, // 182 days, or 6 months. There are 86400000 ms in one day so to make this number more human readable we can write it as the number of days (182) and multiply by 86400000
    mediumCoChangesThreshold: 3,
    highCoChangesThreshold: 6,
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
        'yarn.lock',
        '.yarn',
        '.github/',
    ],
};

export const SERVER_PORT = 3000;
