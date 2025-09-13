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
      with an equivalent for your editor.

## Installing dependencies

Before you begin, ensure you have node.js, npm and git installed on your machine. Install Dependencies with:

```
npm install
```

## Configuration

- Edit the file `src/server/visualizerConfig.ts` and specify the path to the git directory for the project you want to
  open. This can be an absolute or a relative path.

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
server-code has finished compiling and you will get an error. If that happens, just run the command again and it should
work from then on.

## Production

This application is intended to be used as a local tool, therefore it does not come with a setup for creating a
production build and the current code does not consider security implications for deployment in an environment where
other people can access it. If you want to host this somewhere you must review and implement proper security measures
first.
