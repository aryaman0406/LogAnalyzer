FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8002

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app/ml_service

EXPOSE 8002

CMD ["sh", "-c", "uvicorn ml_service.main:app --host 0.0.0.0 --port ${PORT}"]
