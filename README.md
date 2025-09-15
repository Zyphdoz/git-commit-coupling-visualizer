![Screenshot of the asbplayer codebase opened in visualizer](https://raw.githubusercontent.com/Zyphdoz/git-commit-coupling-visualizer/master/assets/readme-screenshots/overview.png)

# Git Commit Coupling Visualizer

This is a tool that reads git history and helps you find potential design issues by visualizing commit coupling, i.e.
when the same files are frequently being changed together.

## What you can do with this

- Identify files that are often changed together
- Discover non-obvious relationships between files in the codebase
- Browse recent commit history for specific files
- Spot files frequently modified by many contributors. These files are extra important to keep in a good condition as
  any technical debt here will not just slow down one person, it will slow down many people
- Limit the tool to only show recent commits so that you can prioritize fixing high interest techical debt in code that
  is actively being changed rather than wasting time fixing coupling in old files that never change
- Or you can just use this as a fancy way to navigate and familiarize yourself with a new codebase because
  double-clicking the circles opens the files directly in your editor

## How to read the diagram

![screenshot explaining that the number on the selected file, in this case 8, means that the file has been recently changed in 8 commits. the numbers on all the other files is how many times those files have changed together with the selected file. for example: out of the eight commits where en.json was changed, binding.ts was changed in two of them.](https://raw.githubusercontent.com/Zyphdoz/git-commit-coupling-visualizer/master/assets/readme-screenshots/locales-en-with-annotations.png)
Color coding:

- Orange: the file has been changed together with the same file 3 or more times, or has been changed by 3 or more
  contributors in recent commits
- Red: the file has been changed together with the same file 6 or more times, or has been changed by 5 or more
  contributors in recent commits.
- Green: the rest of the files, which does not meet any of the conditions above.

All of these values and the cutoff for what counts as a recent commit can be configured in the config file in
`src/server/visualizerConfig.ts`.

Note that the default values are not necessarily recommended values. You are encouraged to change and experiment with
the cutoff and thresholds as different numbers may be better suited for different projects and use cases.

When using this tool it is important to understand that when you find files with high coupling it does not automatically
mean that you have found a problem. This tool can help you find areas with high coupling but it is up to you to look at
the context and determine if that coupling is good or bad. In the screenshot above, we can see that almost every time
`en.json` changes, all of the other files in the same folder also change. Additionally we can see that files all over
the codebase are being changed together with `en.json`. These can be signs of problems but in this particular case, they
are not problems because `en.json` is a localization file containing strings for the English version of the app. The
other files in the same folder contain translations for other languages. It is natural to update translations for many
languages at the same time which explains the high coupling in that folder, and whenever you add/change a feature that
is part of some user interface there is often text on that UI, which explains why the commits are touching so many
different parts of the codebase.

Another example of good coupling are test files and documentation, as tests and documentation is often changed alongside
the code that is being changed.

## Controls

- Click and drag to pan.
- Scroll to zoom.
- Click on a file to toggle the lines and show its recent commit history in the sidebar.
- Click on a commit in the sidebar to view that commit on GitHub.
- Double click on a circle to open that file or directory in VS Code (tells node to execute the `code path/to/your/file`
  command). This command will by default open files in an existing VSCode window and directories in a new window.
    - If you prefer files to open in your current instance of VS Code, double click files and avoid double clicking
      directories.
    - If you prefer opening the files in a separate instance of VS Code, double click the root directory first to spawn
      a new window for that project and then any files you double click will open in that window.
    - If you prefer a different code editor, you can replace the command that gets executed in `openInCodeEditor.ts`
      with an equivalent for your editor (most editors come with a command for this).

## Installing dependencies

Before you begin, ensure you have node.js, npm and git installed on your machine. Install Dependencies with:

```
npm install
```

## Configuration

- Edit the file `src/server/visualizerConfig.ts` and specify the path to the directory for the project you want to open.
  This can be an absolute or a relative path.

## Running the application:

To start the application in development mode, run:

```
npm run dev
```

This command does three things:

- Starts the Vite dev server on [http://localhost:5173/](http://localhost:5173/). This is the url you put in the browser
  to access the application.
- Recompiles the server-side TypeScript code whenever it changes using `tsc --watch`
- Runs the nodejs server with Nodemon, which restarts the server whenever the compiled code changes. Uses port 3000 by
  default, can be changed by editing `SERVER_PORT` in visualizerConfig.ts.

Note that the first time you run this command there is a chance Nodemon will try to start the server before the
server-code has been compiled for the first time and you will get an error. If that happens, just run the command again
and it should work from then on.

## Production

This application is intended to be used as a local tool, therefore it does not come with a setup for creating a
production build and the current code does not consider security implications for deployment in an environment where
other people can access it. If you want to host this somewhere you must review and implement proper security measures
first.
