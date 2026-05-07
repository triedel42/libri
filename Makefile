dev:
	docker compose -f infra/compose-dev.yml up --watch --build

down:
	docker compose -f infra/compose-dev.yml down

update:
	docker compose exec app uv run python -m backend.tools.update_catalogue

export:
	docker compose exec app uv run python -m backend.tools.isbn_export

ci:
	git checkout main
	git branch --set-upstream-to=origin/main
	./infra/pull-deploy.sh

.PHONY: dev down update export ci
