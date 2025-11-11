# PRD
## Vision and purpose
- Create an external memory layer for people to store their AI interaction with AI tool like chatgpt, claude, etc. and don't get locked in to these providers in the future
- Anyone use AI and has some technical knowledge to understand the memory and the need to not get locked in to these app
- 2 important things want to guarantee here: avoid lock in and protect user data (we don't see the messages/chat and it would just store directly to users' storage of choice)

## Use case
- 3 steps. first step: set up to integrate with what AI tool and where to store the data
- second step: seamlessly store messages to the storage when using the AI product
- third step: user can review the message in an easy to see form (depend on their storage of choice though) and can export it and have a way to use it in other AI tool (depend on what other AI tool is and how they read input. In this sense should have tool to convert between different data format)

## Goal
- I can use this to store AI chat message between chatgpt and claude into google docs, obsidian, or sql table. Will add more AI tool (claude code, cursor, etc.) and more storage (notions, etc) later

# Milestones & tasks
## Milestone 1: Set up chrome extension project that can run on chatgpt and claude.com
- Task 1: set up new chrome project and make it run in chrome
- Task 2: make it run on chatgpt and claude.com, be able to read the content of the chat

## Milestone 2: make the extension read/parse user and ai messages and store to internal storage/database
- Task 1: make the extension read message in chatgpt
- Task 2: make the extension read message in claude.com
- Task 3: create the schema and store the message in the right format for user. decide if we want to have an abstract data layer in between before save the data into user storage, or save it directly to their storage

## Milestone 3: integrate with external storage
- Task 1: save messages into obsidian as markdown. decide the format to store the format or have setting for user to decide how they store their data.
- Task 2: save message into google docs
- Task 3: save message into user database, likely only support 1 local database right now such as postgres

# Future work
- Adding more AI tools input
- Adding more storage type output
- Support more text format within the message