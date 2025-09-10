## Prerequisites

Before you begin, ensure you have node.js, npm and git installed on your machine. Additionally this program requires
permissions to read files and execute the `git log` command in the directory that you want to analyze.

## Installing dependencies

```
npm install
```

## Configuration

- Edit the file `src/server/ananlyzerConfig.ts` and specify the path to the directory that you want to analyze. This can
  be an absolute or a relative path.

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
  default, can be changed by editing `SERVER_PORT` in server.ts.

Note that the first time you run this command there is a chance Nodemon will try to start the server before the
server-code has finished compiling and you will get an error. If that happens, just run the command again and it should
work from then on.

## Production

This application is intended to be used as a local tool, therefore it does not come with a setup for creating a
production build and the current code does not consider security implications for deployment in an environment where
other people can access it. If you want to host this somewhere you must review and implement proper security measures
first.
