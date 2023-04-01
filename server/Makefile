
requirements:
	pip-compile requirements.in &&\
	pip-compile requirements.dev.in

migrations:
	python manage.py makemigrations

migrate:
	python manage.py migrate

format:
	black . &&\
	isort .
