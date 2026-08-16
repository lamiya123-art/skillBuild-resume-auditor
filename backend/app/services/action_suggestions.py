from typing import List
from app.schemas.match import ActionSuggestion

VERIFIED_LEARNING_RESOURCES = {
    "aws": ActionSuggestion(
        skill_name="AWS",
        type="learning_resource",
        title="AWS Cloud Practitioner Essentials",
        description="Official, free foundational AWS course covering EC2, S3, IAM, and deployment basics.",
        estimated_hours="6 hrs",
        url="https://aws.amazon.com/training/digital/aws-cloud-practitioner-essentials/"
    ),
    "docker": ActionSuggestion(
        skill_name="Docker",
        type="learning_resource",
        title="Docker Official Getting Started Guide",
        description="Hands-on containerization tutorial creating a multi-container Docker app with compose.",
        estimated_hours="4 hrs",
        url="https://docs.docker.com/get-started/"
    ),
    "fastapi": ActionSuggestion(
        skill_name="FastAPI",
        type="learning_resource",
        title="FastAPI Official Tutorial - User Guide",
        description="Build high-performance REST APIs with Pydantic validation and automatic OpenAPI docs.",
        estimated_hours="5 hrs",
        url="https://fastapi.tiangolo.com/tutorial/"
    ),
    "next.js": ActionSuggestion(
        skill_name="Next.js",
        type="learning_resource",
        title="Next.js App Router Foundations",
        description="Learn Server Components, SSR, and dynamic API routing directly from Vercel.",
        estimated_hours="5 hrs",
        url="https://nextjs.org/learn"
    ),
    "postgresql": ActionSuggestion(
        skill_name="PostgreSQL",
        type="learning_resource",
        title="PostgreSQL Official Exercises & Tutorial",
        description="Interactive SQL queries, relational schema design, indexing, and join optimization.",
        estimated_hours="4 hrs",
        url="https://pgexercises.com/"
    )
}

def generate_action_for_gap(skill_name: str) -> ActionSuggestion:
    key = skill_name.lower()
    if key in VERIFIED_LEARNING_RESOURCES:
        return VERIFIED_LEARNING_RESOURCES[key]

    # Generate scoped micro-project idea for un-cataloged gap
    return ActionSuggestion(
        skill_name=skill_name,
        type="micro_project",
        title=f"Build a {skill_name} Micro-Project",
        description=f"Create a standalone, focused repository demonstrating basic CRUD functionality or integration using {skill_name} with clear README documentation.",
        estimated_hours="8-12 hrs",
        url=None
    )
