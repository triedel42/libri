dev:
	docker compose -f infra/compose-dev.yml up --watch --build

down:
	docker compose -f infra/compose-dev.yml down

update:
	docker compose exec app uv run python -m backend.update_catalogue

ci:
	git checkout main
	git branch --set-upstream-to=origin/main
	./infra/pull-deploy.sh

.PHONY: dev down update ci
