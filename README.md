# Modus AI Agents with Knowledge Graphs

## Introduction

GraphRAG is a project designed to enable AI-driven agents to interact seamlessly with knowledge graphs. The goal is to simplify how users query and retrieve information from knowledge graphs by using natural language. With features like text-to-Cypher translation, tool-calling, and memory integration, this project demonstrates how AI can make complex graph queries accessible to everyone.

## Project Demo

### Preview

Include a preview image or architecture diagram of the project here. Add the following markdown to link an image:

![Project Preview](/assets/graphql.png)

## Installation

### Prerequisites

- Node.js and npm installed on your machine
- Modus CLI installed globally
- Access to a Neo4j database instance with your Knowledge Graph.
- An OpenAI API key for LLM integration

### Steps to Install

1. **Install the Modus CLI**
   Install the Modus CLI using npm:

   ```bash
   npm install -g @hypermode/modus-cli
   ```

2. **Initialize Your Modus App**
   Create a new Modus app by running:

   ```bash
   modus new
   ```

   Follow the prompts to set up the app. Choose AssemblyScript as the language for your app.

3. **Configure the Project Connection and Models**
   Replace the content of `modus.json` in your project directory with the following configuration:
   Add `.env` file and paste your password and Api Keys.

   ```MODUS_NEO4JSANDBOX_NEO4J_PASSWORD=
   MODUS_OPENAI_API_KEY=
   ```

   ```json
   {
     "$schema": "https://schema.hypermode.com/modus.json",
     "endpoints": {
       "default": {
         "type": "graphql",
         "path": "/graphql",
         "auth": "bearer-token"
       }
     },
     "models": {
       "llm": {
         "sourceModel": "gpt-4o-mini",
         "connection": "openai",
         "path": "v1/chat/completions"
       }
     },
     "connections": {
       "neo4jsandbox": {
         "type": "neo4j",
         "dbUri": "bolt://98.81.35.253:7687",
         "username": "neo4j",
         "password": "{{NEO4J_PASSWORD}}"
       },
       "openai": {
         "type": "http",
         "baseUrl": "https://api.openai.com/",
         "headers": {
           "Authorization": "Bearer {{API_KEY}}"
         }
       }
     }
   }
   ```

4. **Build and Run the App**
   Navigate to the app directory and run the following command to start the app in development mode:
   ```bash
   modus dev
   ```
   Access the local endpoint at `http://localhost:8686/explorer` to interact with the API.
