import json
import logging
from typing import Type, TypeVar, Dict, Any, Optional
from pydantic import BaseModel
from app.core.config import settings

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

class LLMProvider:
    @property
    def provider(self) -> str:
        return (settings.LLM_PROVIDER or "gemini").lower()

    @property
    def gemini_key(self) -> Optional[str]:
        k = (settings.GEMINI_API_KEY or "").strip('"\' ')
        return k if k and "your_" not in k.lower() else None

    @property
    def groq_key(self) -> Optional[str]:
        k = (settings.GROQ_API_KEY or "").strip('"\' ')
        return k if k and "your_" not in k.lower() else None

    def generate_structured_output(
        self,
        prompt: str,
        response_schema: Type[T],
        system_instruction: Optional[str] = None
    ) -> T:
        """
        Generic provider-agnostic structured output caller enforcing Pydantic schema validation.
        """
        gemini_key = self.gemini_key
        groq_key = self.groq_key
        provider = self.provider

        # If no key provided or provider is mock, use high-fidelity structured mock responses
        if provider == "mock" or (not gemini_key and not groq_key):
            logger.info("Using mock LLM responses (no active Gemini/Groq keys configured)")
            return self._mock_fallback(prompt, response_schema)

        if self.provider == "groq" and self.groq_key:
            try:
                from groq import Groq
                client = Groq(api_key=self.groq_key)
                full_prompt = f"{system_instruction or ''}\n\nUser Prompt: {prompt}\n\nRespond ONLY with a raw valid JSON object matching this schema:\n{json.dumps(response_schema.model_json_schema())}"
                chat_completion = client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": "You are a JSON generator. You output ONLY valid JSON without markdown formatting or code blocks."},
                        {"role": "user", "content": full_prompt}
                    ],
                    model="llama3-70b-8192",
                    response_format={"type": "json_object"},
                    temperature=0.1
                )
                raw_json = chat_completion.choices[0].message.content
                return response_schema.model_validate_json(raw_json)
            except Exception as e:
                logger.error(f"Groq API call failed: {e}. Falling back to mock/Gemini.")

        # Default Gemini Provider
        if self.gemini_key:
            try:
                from google import genai
                from google.genai import types
                client = genai.Client(api_key=self.gemini_key)
                response = client.models.generate_content(
                    model=settings.GEMINI_MODEL,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        response_mime_type="application/json",
                        response_schema=response_schema,
                        temperature=0.1
                    ),
                )
                return response_schema.model_validate_json(response.text)
            except Exception as e:
                logger.error(f"Gemini API call failed: {e}. Falling back to mock provider.")

        return self._mock_fallback(prompt, response_schema)

    def _mock_fallback(self, prompt: str, response_schema: Type[T]) -> T:
        """
        Generates valid context-aware mock objects for tests or environments without live API keys.
        """
        schema_name = response_schema.__name__

        if schema_name == "ProfileData":
            # Extract text block between delimiters if present
            resume_block = prompt
            if "---" in prompt:
                parts = prompt.split("---")
                if len(parts) >= 2:
                    resume_block = parts[1].strip()

            from app.services.resume_parser import parse_resume_text_to_profile
            parsed_data = parse_resume_text_to_profile(resume_block)
            return response_schema.model_validate(parsed_data)



        if schema_name == "ParsedJDOutput":
            data = {
                "required": [
                    {"skill_name": "Python", "raw_phrase_from_jd": "3+ years experience with Python"},
                    {"skill_name": "FastAPI", "raw_phrase_from_jd": "Proficiency in FastAPI or Django framework"},
                    {"skill_name": "Docker", "raw_phrase_from_jd": "Experience with Docker containers and deployment"}
                ],
                "preferred": [
                    {"skill_name": "AWS", "raw_phrase_from_jd": "Familiarity with AWS services (EC2, S3)"},
                    {"skill_name": "Next.js", "raw_phrase_from_jd": "Frontend experience with React or Next.js"}
                ],
                "nice_to_have": [
                    {"skill_name": "PostgreSQL", "raw_phrase_from_jd": "Relational database design"}
                ],
                "is_inferred": "inferred" in prompt.lower()
            }
            return response_schema.model_validate(data)

        if schema_name == "ClassifySkillTool":
            data = {
                "skill_name": "Python",
                "tier": 3,
                "evidence_repo_id": 1,
                "rationale": "Appears in dedicated project repository with >90% Python codebase and detailed documentation."
            }
            return response_schema.model_validate(data)

        if schema_name == "LLMRepoAuditTool":
            name = "Project"
            if "repository '" in prompt:
                try:
                    name = prompt.split("repository '")[1].split("'")[0].strip()
                except Exception:
                    pass

            data = {
                "readiness_score": 85,
                "readme_exists_score": 25,
                "readme_quality_score": 15,
                "commit_spread_score": 20,
                "commit_messages_score": 10,
                "authorship_score": 15,
                "coaching_flags": [
                    f"AI Assessment for {name}: Verify setup steps and system architecture diagrams before technical interview."
                ],
                "technical_assessment": f"AI technical evaluation for {name}: Demonstrates solid architecture and tech stack evidence."
            }
            return response_schema.model_validate(data)

        # Fallback dummy construct using model default construct if possible
        try:
            return response_schema.model_construct()
        except Exception:
            raise ValueError(f"No mock handler configured for schema {schema_name}")

llm_provider = LLMProvider()
