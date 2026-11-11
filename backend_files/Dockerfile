# Build from the project root:
#   docker build -f backend_files/Dockerfile -t fruit-freshness-api .
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app/backend_files

COPY backend_files/requirements.txt /app/backend_files/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend_files/ /app/backend_files/
COPY model_train/saved_models/ /app/model_train/saved_models/

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

