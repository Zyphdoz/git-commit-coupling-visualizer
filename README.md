## Prerequisites

Before you begin, ensure you have node.js, npm and git installed on your machine.

## Installing dependencies

```
npm install
```

## Running the application:

To start the application in development mode, run:

```
npm run dev
```

This command does the following:

- Starts the Vite dev server on [http://localhost:5173/](http://localhost:5173/)
- Recompiles the server-side TypeScript code whenever it changes using `tsc --watch`
- Runs the server with Nodemon in order to refresh on change (uses port 3000 by default, can be changed by editing
  `SERVER_PORT` in server.ts)

## Production

This application is intended to be used as a local tool, therefore it does not come with a setup for creating a
production build and the current code does not consider security implications for deployment in an environment where
other people can access it. If you want to host this somewhere you must review and implement proper security measures
first.
