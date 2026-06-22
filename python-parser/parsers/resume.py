import io
import re
from pdfminer.high_level import extract_text_to_fp
from pdfminer.layout import LAParams
import spacy

try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    nlp = None

TECH_SKILLS = [
    "Python", "JavaScript", "TypeScript", "Go", "Golang", "Java", "Rust", "C++", "C#",
    "Ruby", "Kotlin", "Swift", "Scala", "PHP", "React", "Vue", "Angular", "Next.js",
    "Node.js", "Express", "FastAPI", "Django", "Flask", "Spring", "Docker", "Kubernetes",
    "AWS", "GCP", "Azure", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch",
    "GraphQL", "REST", "gRPC", "Kafka", "RabbitMQ", "Terraform", "Ansible", "CI/CD",
    "Git", "Linux", "System Design", "Distributed Systems", "Microservices", "Machine Learning",
    "Deep Learning", "PyTorch", "TensorFlow", "Pandas", "NumPy", "SQL", "NoSQL",
]


def extract_pdf_text(pdf_bytes: bytes) -> str:
    output = io.StringIO()
    with io.BytesIO(pdf_bytes) as f:
        extract_text_to_fp(f, output, laparams=LAParams(), output_type="text")
    return output.getvalue()


def extract_skills(text: str) -> list[dict]:
    text_lower = text.lower()
    found_skills = []

    for skill in TECH_SKILLS:
        if skill.lower() in text_lower:
            count = text_lower.count(skill.lower())
            evidence = []

            lines = text.split("\n")
            for line in lines:
                if skill.lower() in line.lower() and len(line.strip()) > 10:
                    evidence.append(line.strip()[:200])
                    if len(evidence) >= 3:
                        break

            found_skills.append({
                "name": skill,
                "evidence": evidence,
                "frequency": count,
            })

    found_skills.sort(key=lambda x: x["frequency"], reverse=True)
    return found_skills[:15]


def parse_resume(pdf_bytes: bytes) -> dict:
    try:
        text = extract_pdf_text(pdf_bytes)
    except Exception as e:
        text = pdf_bytes.decode("utf-8", errors="ignore")

    skills = extract_skills(text)

    email_match = re.search(r"[\w.+-]+@[\w-]+\.[a-z]{2,}", text)
    phone_match = re.search(r"\+?[\d\s\-()]{10,}", text)

    return {
        "text": text[:8000],
        "skills": [{"name": s["name"], "evidence": s["evidence"]} for s in skills],
        "metadata": {
            "email": email_match.group() if email_match else None,
            "char_count": len(text),
            "skills_found": len(skills),
        },
    }
