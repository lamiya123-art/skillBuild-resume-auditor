from datetime import datetime, timedelta

def get_well_documented_repo():
    base_date = datetime(2026, 1, 1)
    commits = []
    messages = ["Add initial API models", "Implement JWT auth handler", "Add Docker compose configuration", "Fix PostgreSQL connection pool", "Implement repo audit heuristic engine", "Add pytest test suite", "Update OpenAPI docs", "Refactor skill classification service", "Add resume generator guardrail", "Optimize query performance", "Add application tracker dashboard"]
    for i in range(len(messages)):
        commits.append({
            "author": "demo-candidate",
            "message": messages[i],
            "timestamp": (base_date + timedelta(days=i)).isoformat()
        })
    
    return {
        "github_username": "demo-candidate",
        "readme_content": "# Production Microservices Platform\n\nThis project is a high-availability production microservices platform built using Python, FastAPI, Docker, and PostgreSQL. It implements asynchronous job queues with Redis and Celery, complete with comprehensive integration tests and automated CI/CD pipelines deployed to AWS EC2 instances with automatic failover capabilities.\n\n## Architecture Overview\nThe architecture follows clean domain-driven design principles. Each service maintains its own isolated database instance with Alembic schema migrations. Detailed documentation covers setup, environment variables, API endpoints, database schemas, load testing benchmarks under heavy concurrency, and production security hardening standards.\n\n## Features & Performance Optimization\n- OAuth2 authentication flow with JWT token revocation and refresh mechanisms\n- Distributed asynchronous background task processing pipeline utilizing Celery workers and Redis message brokers\n- Real-time WebSocket event broadcasting server with connection health heartbeats\n- High throughput database connection pooling and optimized index execution plans for complex query filters\n- Comprehensive automated test suite with over 95% line coverage including integration tests\n- Containerized deployment orchestration with Docker Compose and production-ready Kubernetes deployment manifests\n\n## Getting Started & Local Setup Instructions\nClone the repository to your local development workspace, set up environment variables in your .env configuration file, run docker-compose up --build to launch services, and execute pytest to verify full end-to-end system integration testing cleanly.",
        "commits": commits,
        "dependencies": ["FastAPI", "SQLAlchemy", "PostgreSQL", "Docker", "Redis", "pytest"],
        "use_ai_eval": False
    }

def get_unmodified_boilerplate_repo():
    return {
        "github_username": "demo-candidate",
        "readme_content": "# Fusion Starter\n\nGetting started with Create React App. This project was bootstrapped with Create React App. Edit App.tsx and save to test. npm run dev to start local dev server.",
        "commits": [
            {"author": "demo-candidate", "message": "Initial commit", "timestamp": "2026-01-01T10:00:00Z"},
            {"author": "demo-candidate", "message": "update", "timestamp": "2026-01-02T10:00:00Z"}
        ],
        "dependencies": ["react", "react-dom"],
        "use_ai_eval": False
    }

def get_single_bulk_commit_repo():
    return {
        "github_username": "demo-candidate",
        "readme_content": "# My Project\n" + "Word " * 250, # >200 words
        "commits": [
            {"author": "demo-candidate", "message": "Add all source code files at once", "timestamp": "2026-01-01T12:00:00Z"}
        ],
        "dependencies": ["python"],
        "use_ai_eval": False
    }

def get_low_ownership_forked_repo():
    commits = []
    for i in range(10):
        commits.append({
            "author": "original-maintainer",
            "message": f"Feature commit {i}",
            "timestamp": f"2026-01-0{i+1}T10:00:00Z"
        })
    commits.append({
        "author": "demo-candidate",
        "message": "Fix minor typo in README",
        "timestamp": "2026-01-11T10:00:00Z"
    })
    return {
        "github_username": "demo-candidate",
        "readme_content": "# Open Source Contributed Fork\n" + "Word " * 250,
        "commits": commits,
        "dependencies": ["c++"],
        "use_ai_eval": False
    }

def get_generic_commit_messages_repo():
    commits = []
    for i in range(12):
        commits.append({
            "author": "demo-candidate",
            "message": "update" if i % 2 == 0 else "fix",
            "timestamp": f"2026-01-0{min(i+1, 9)}T10:00:00Z"
        })
    return {
        "github_username": "demo-candidate",
        "readme_content": "# Project with poor commit discipline\n" + "Word " * 250,
        "commits": commits,
        "dependencies": ["javascript"],
        "use_ai_eval": False
    }
