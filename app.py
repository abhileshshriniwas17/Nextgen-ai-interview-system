from flask import Flask, jsonify, request
from flask_cors import CORS
import ollama
import re
import PyPDF2

app = Flask(__name__)
CORS(app)

# ==============================
# GLOBAL VARIABLES
# ==============================

total_score = 0
question_count = 0
max_questions = 5

resume_text = ""   # 🔥 stores resume


# ==============================
# 📄 UPLOAD RESUME
# ==============================

@app.route("/upload-resume", methods=["POST"])
def upload_resume():

    global resume_text

    if "resume" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["resume"]

    print("📄 Received file:", file.filename)

    try:
        pdf_reader = PyPDF2.PdfReader(file)

        text = ""

        for i, page in enumerate(pdf_reader.pages):
            page_text = page.extract_text()

            print(f"📄 Page {i} preview:", str(page_text)[:100])

            text += page_text or ""

        resume_text = text.strip()

        print("🧠 Resume length:", len(resume_text))

        return jsonify({
            "message": "Resume uploaded successfully",
            "length": len(resume_text),
            "preview": resume_text[:200]
        })

    except Exception as e:
        print("❌ Error reading PDF:", e)
        return jsonify({
            "error": "Failed to read PDF",
            "length": 0
        })


# ==============================
# ❓ GENERATE QUESTION
# ==============================

@app.route("/generate-question", methods=["GET"])
def generate_question():

    global question_count, resume_text

    if question_count >= max_questions:
        return jsonify({"finished": True})

    # 🔥 Resume-based logic
    if resume_text and len(resume_text) > 50:

        print("🧠 Using resume for questions")

        prompt = f"""
You are a professional interviewer.

Candidate Resume:
{resume_text[:2000]}

Ask ONE interview question based on:
- skills
- projects
- technologies

Make it relevant to the candidate profile.
Keep it short.
"""

    else:

        print("⚠️ No resume, normal questions")

        prompt = """
You are a technical interviewer.

Ask ONE technical interview question for a Computer Science student.
Keep it short and clear.
"""

    response = ollama.chat(
        model="gemma3:4b",
        messages=[{"role": "user", "content": prompt}]
    )

    question = response["message"]["content"]

    question_count += 1

    return jsonify({
        "question": question,
        "number": question_count
    })


# ==============================
# 🧠 EVALUATE ANSWER
# ==============================

@app.route("/evaluate-answer", methods=["POST"])
def evaluate_answer():

    global total_score, resume_text

    data = request.json
    answer = data.get("answer", "")

    # 🔥 Resume-aware evaluation
    if resume_text and len(resume_text) > 50:

        prompt = f"""
You are a professional interviewer.

Candidate Resume:
{resume_text[:1500]}

Evaluate the answer considering candidate background.

Answer:
{answer}

Respond strictly:

Score: X/10
Strength: one short sentence
Weakness: one short sentence
Improve: one topic to study
"""

    else:

        prompt = f"""
You are a technical interviewer.

Evaluate the candidate answer.

Answer:
{answer}

Respond strictly:

Score: X/10
Strength: one short sentence
Weakness: one short sentence
Improve: one topic to study
"""

    response = ollama.chat(
        model="gemma3:4b",
        messages=[{"role": "user", "content": prompt}]
    )

    feedback = response["message"]["content"]

    # Extract score
    score_match = re.search(r"\b([0-9]|10)\s*/?\s*10\b", feedback)

    if score_match:
        score = int(score_match.group(1))
    else:
        score = 0

    total_score += score

    return jsonify({
        "feedback": feedback,
        "score": score,
        "total_score": total_score
    })


# ==============================
# 📊 FINAL SCORE
# ==============================

@app.route("/final-score", methods=["GET"])
def final_score():

    global total_score, question_count, resume_text

    result = {
        "questions": question_count,
        "score": total_score,
        "max_score": question_count * 10
    }

    # 🔁 RESET everything
    total_score = 0
    question_count = 0
    resume_text = ""

    return jsonify(result)


# ==============================
# 🚀 RUN SERVER
# ==============================

if __name__ == "__main__":
    app.run(debug=True)