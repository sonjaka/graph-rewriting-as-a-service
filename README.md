# Graph Rewriting As A Service

## Prerequisites

This repository contains all files necessary to run the application in a local development environment.
It does depend on Docker and Node.js being available on your system.

When cloning this repository and opening it through VSCode, it will ask you to install all recommended VSCode extensions.

## Getting started

In order to install and run this application in your local development environment, you first need to install all dependencies via npm

    npm install

Next an .env file should be created by copying the .env.example and setting the appropriate values.

## Running the application

You may start the project by running the tasks `docker compose up` and `npm run dev` in your terminal.

If using VSCode you can instead run the VSCode-Task `Start dev environment` as a shortcut.

## API Collection

This repository contains a collection of usage examples for the API endpoints.
These can be run from VS Code with the [httpYak VSCode Extension](https://marketplace.visualstudio.com/items?itemName=anweber.vscode-httpyac), or through [httpYak on the CLI](https://httpyac.github.io/guide/installation_cli.html).

## SwaggerUI / OpenAPI

When the server is running, you can access the SwaggerUI / OpenAPI documentation via the following url:

https://<api_host>:<api_port>/documentation
