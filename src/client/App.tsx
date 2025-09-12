import type { PieceOfCode } from '../server/readGitFiles/readGitFiles';
import CircleDiagram from './CircleDiagram';
import CommitHistoryCard from './CommitHistoryCard';

// mock data
const pieceOfCode: PieceOfCode = {
    filePath: 'LICENSE.md',
    linesOfCode: 21,
    techDebtLikelyhood: 'low',
    gitHistory: [
        {
            commitHash: 'c54679aadb46275403b80174966e93a7fd53b0f9',
            authorName: 'bob',
            date: 1752310992000,
            changedFiles: ['LICENSE.md'],
            comment: 'Add license',
        },
        {
            commitHash: '19259e9c3dee860bd2160e9778739cd37815d7e9',
            authorName: 'sam',
            date: 1752310992001,
            changedFiles: ['LICENSE.md', 'common/components/About.tsx'],
            comment:
                'Culpa est delectus numquam quasi consequatur eos. Facere omnis optio voluptatem minima. Et et esse pariatur. Sunt repudiandae eos voluptas vero et. Veritatis assumenda magnam rerum ducimus. Consequuntur quos et ea voluptatibus omnis consequatur. Accusamus ut consequuntur tempore. Nostrum et totam dolorem sunt numquam blanditiis error. Modi vel distinctio ut a voluptate voluptas illum sed. Quos voluptas occaecati tenetur mollitia odio. Neque in et perferendis debitis. Veritatis inventore quia illum blanditiis sunt quas. Dolore aut vitae minus explicabo dolor autem sit. Earum similique et laboriosam qui. Ut rerum perferendis qui laboriosam. Quia eius assumenda non libero voluptatibus molestiae. Voluptatem dolores quo sint id nam quod. Vel aliquid soluta hic pariatur omnis quasi voluptatum. Veritatis nesciunt adipisci voluptatem. Ab temporibus excepturi rerum ratione earum odio tenetur fugiat. Consequatur eaque et cumque.',
        },
        {
            commitHash: '19259e9c3dee860bd2160e9778739cd37815d7e9',
            authorName: 'john',
            date: 1752320993001,
            changedFiles: ['LICENSE.md', 'common/components/Contacts.tsx'],
            comment:
                'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
        },
    ],
    contributors: ['bob', 'john', 'sam'],
    recentContributors: ['bob', 'john', 'sam'],
    recentlyChangedTogether: [
        {
            filePath: 'common/components/About.tsx',
            count: 1,
        },
        {
            filePath: 'common/components/Contacts.tsx',
            count: 1,
        },
    ],
};

function App() {
    return (
        <div className="flex">
            <div className="h-screen w-60 overflow-y-auto border-r border-gray-600 bg-[#0f1624] px-6 py-14">
                <CommitHistoryCard pieceOfCode={pieceOfCode}></CommitHistoryCard>
            </div>
            <CircleDiagram></CircleDiagram>
        </div>
    );
}

export default App;
