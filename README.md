# Libri
Libri is a simple library management system built with <3 for 42 Wolfsburg.

## Features
- Book overview with search
- Adding books by scanning codes
- Borrowing, returning and commenting

## Development
### Tech Stack
- Backend: Python + FastAPI + SQLAlchemy
- Frontend: TypeScript + React + Tailwind

### Running
To run for development use `make dev`

`infra/Dockerfile` builds a single production container.

## Deployment
Two options:
- `docker compose up` will run the container
- `make ci` will also check for and pull updates `infra/pull-deploy.sh`