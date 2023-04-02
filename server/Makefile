
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

run:
	python manage.py runserver

test:
	python manage.py test
