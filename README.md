# Graph Rewriting As A Service

## Prerequisites

This repository contains all files necessary to run the application in a local development environment.
It does depend on Docker and Node.js being available on your system.

It's recommended to use VS Code as your IDE, as this repository contains a few helpful tools that make for a better developing experience in VS Code.

## Gettings Started

In order to install and run this application in your local development environment, you first need to install all dependencies via npm

    npm install

Next an .env file should be created by copying the .env.example and setting the appropriate values.

If using VSCode you can then power up your local dev environment by running the VSCode-Task `Start dev environment`.

If not using VS Code you may start the project by running the tasks `docker compose up` and `npm run dev` in your terminal.
