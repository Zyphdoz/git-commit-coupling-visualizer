export interface VisualizerConfig {
    repoPath: string; // a path to the git repo that we want to visualize. this can be a relative or absolute path.
    filesToIgnore: string[]; // files containing any of these substrings in their paths will be excluded from the visualization and commit history. note: this does not have to be an exact match, e.g. excluding 'test' will also exclude files named 'testament'.
    recentCutoff: number; // a commit is considered recent when it is newer than this timestamp. the format of the timestamp is the number of milliseconds since the unix epoch.
    mediumCouplingThreshold: number; // the circle will be orange in the diagram if a file has been modified together with the same file at least this many times in recent commits.
    highCouplingThreshold: number; // the circle will be red in the diagram if a file has been modified together with the same file at least this many times in recent commits.
    mediumContributorsThreshold: number; // the circle will be orange in the diagram if the file has more or equal to this number of recent contributors.
    highContributorsThreshold: number; // the circle will be red in the diagram if the file has more or equal to this number of recent contributors.
}

export const visualizerConfig: VisualizerConfig = {
    repoPath: '../..',
    recentCutoff: new Date().getTime() - 182 * 86400000, // this will not show commits older than 182 days, or 6 months. There are 86400000 ms in one day so to make this number more human readable we can write it as the number of days (182) and multiply by 86400000
    mediumCouplingThreshold: 3,
    highCouplingThreshold: 6,
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

export const CIRCLE_COLOR = {
    green: '#b3ffb3',
    orange: '#ffbf80',
    red: '#e66565',
} as const;

export type CircleColor = (typeof CIRCLE_COLOR)[keyof typeof CIRCLE_COLOR];

export const SERVER_PORT = 3000;
