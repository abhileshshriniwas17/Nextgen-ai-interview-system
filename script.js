// ============================
// GLOBAL DATA
// ============================

let strengths = [];
let weaknesses = [];
let improvements = [];

let totalAttempts = 0;
let activeResponses = 0;

let emotionData = { focused: 0, distracted: 0 };

let recognition;
let isListening = false;
let silenceTimer;

const video = document.getElementById("video");
const emotionText = document.getElementById("emotionText");
const confidenceText = document.getElementById("confidenceText");
const answerInput = document.getElementById("answerInput");

// ============================
// START BUTTON
// ============================

document.getElementById("startBtn").onclick = () => {
    startCamera();
    initSpeechRecognition();
    startInterview();
};

// ============================
// RESUME UPLOAD (NEW - FIXED)
// ============================

document.getElementById("resumeUpload").addEventListener("change", function(){

    const file = this.files[0];

    if(!file){
        alert("No file selected ❌");
        return;
    }

    console.log("📄 Uploading:", file.name);

    const formData = new FormData();
    formData.append("resume", file);

    fetch("http://127.0.0.1:5000/upload-resume",{
        method:"POST",
        body:formData
    })
    .then(res=>res.json())
    .then(data=>{

        console.log("✅ Server Response:", data);

        alert(`Resume uploaded ✅\nText Length: ${data.length}`);

        // ⚠️ Important check
        if(data.length < 50){
            alert("⚠️ Resume not properly read. Use text-based PDF.");
        }

    })
    .catch(err=>{
        console.error(err);
        alert("❌ Upload failed");
    });
});

// ============================
// INTERVIEW FLOW
// ============================

function startInterview(){

    fetch("http://127.0.0.1:5000/generate-question")
    .then(res=>res.json())
    .then(data=>{

        if(data.finished){
            showFinalReport();
            return;
        }

        totalAttempts++;

        document.getElementById("questionBox").innerText =
        `Q${data.number}: ${data.question}`;

        speak(data.question);
    });
}

// ============================
// TEXT TO SPEECH
// ============================

function speak(text){

    const speech = new SpeechSynthesisUtterance(text);

    speech.lang = "en-US";
    speech.rate = 1;

    speech.onend = () => {
        startAutoListening(); // 🔥 auto mic start
    };

    speechSynthesis.cancel();
    speechSynthesis.speak(speech);
}

// ============================
// AUTO SPEECH DETECTION
// ============================

function initSpeechRecognition(){

    const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

    if(!SpeechRecognition){
        alert("Speech Recognition not supported");
        return;
    }

    recognition = new SpeechRecognition();

    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
        isListening = true;
        console.log("🎤 Listening...");
    };

    recognition.onresult = (event) => {

        const transcript = event.results[0][0].transcript;

        console.log("🗣️ You said:", transcript);

        answerInput.value = transcript;

        activeResponses++;
        clearTimeout(silenceTimer);

        evaluateAnswer(transcript);
    };

    recognition.onend = () => {
        isListening = false;
    };

    recognition.onerror = (err) => {
        console.log("Speech error:", err);
        isListening = false;
    };
}

// ============================
// START AUTO LISTEN
// ============================

function startAutoListening(){

    if(!recognition) return;

    setTimeout(() => {
        try {
            recognition.start();
        } catch (e) {}
    }, 500);

    // ⏱️ 10 sec reminder
    silenceTimer = setTimeout(() => {

        if(!isListening){
            alert("⏳ Please answer by speaking or typing");
        }

    }, 10000);
}

// ============================
// SUBMIT BUTTON (SAFE)
// ============================

document.getElementById("submitAnswer").onclick = ()=>{

    let ans = answerInput.value;

    if(!ans){
        alert("Answer required");
        return;
    }

    activeResponses++;
    clearTimeout(silenceTimer);

    evaluateAnswer(ans);

    answerInput.value="";
};

// ============================
// VOICE BUTTON (BACKUP)
// ============================

document.getElementById("voiceBtn").onclick = ()=>{

    if(recognition && !isListening){
        recognition.start();
    }
};

// ============================
// EVALUATE ANSWER
// ============================

function evaluateAnswer(answer){

    fetch("http://127.0.0.1:5000/evaluate-answer",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({answer})
    })
    .then(res=>res.json())
    .then(data=>{

        parseFeedback(data.feedback);

        startInterview();
    });
}

// ============================
// PARSE FEEDBACK
// ============================

function parseFeedback(text){

    let s = text.match(/Strength:(.*)/i);
    let w = text.match(/Weakness:(.*)/i);
    let i = text.match(/Improve:(.*)/i);

    if(s) strengths.push(s[1].trim());
    if(w) weaknesses.push(w[1].trim());
    if(i) improvements.push(i[1].trim());
}

// ============================
// FINAL REPORT
// ============================

function showFinalReport(){

    fetch("http://127.0.0.1:5000/final-score")
    .then(res=>res.json())
    .then(r=>{

        document.getElementById("reportBox").classList.remove("hidden");

        document.getElementById("finalScore").innerText =
        `Score: ${r.score}/${r.max_score}`;

        document.getElementById("strengthText").innerText =
        strengths.join(", ") || "None";

        document.getElementById("weaknessText").innerText =
        weaknesses.join(", ") || "None";

        document.getElementById("improveText").innerText =
        improvements.join(", ") || "None";

        generateCharts(r.score, r.max_score);
    });
}

// ============================
// CHARTS
// ============================

function generateCharts(score,max){

    new Chart(document.getElementById("resultChart"),{
        type:"bar",
        data:{
            labels:["Score","Remaining"],
            datasets:[{data:[score,max-score]}]
        }
    });

    new Chart(document.getElementById("emotionChart"),{
        type:"pie",
        data:{
            labels:["Focused","Distracted"],
            datasets:[{data:[emotionData.focused,emotionData.distracted]}]
        }
    });

    let confidence = Math.round((activeResponses/totalAttempts)*100);

    confidenceText.innerText = `Confidence: ${confidence}%`;
}

// ============================
// CAMERA + EMOTION
// ============================

function startCamera(){

    const faceDetection = new FaceDetection({
        locateFile: file =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`
    });

    faceDetection.setOptions({model:"short"});

    faceDetection.onResults(results=>{

        if(results.detections.length>0){
            emotionText.innerText="😊 Focused";
            emotionData.focused++;
        }else{
            emotionText.innerText="😐 Distracted";
            emotionData.distracted++;
        }
    });

    const cam = new Camera(video,{
        onFrame: async ()=>{
            await faceDetection.send({image:video});
        },
        width:640,
        height:480
    });

    cam.start();
}