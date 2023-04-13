FROM python:3.11-slim-buster

WORKDIR /usr/src/app
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONBUFFERED 1

RUN apt-get update \
    && apt-get -y install  \
    gcc  \
    postgresql \
    graphviz \
    graphviz-dev \
    && apt-get clean


RUN pip install --upgrade pip
COPY ./requirements.dev.txt .
RUN pip install -r requirements.dev.txt
COPY . .
