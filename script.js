// --- Configuração da API ---
const API_KEY = "AIzaSyClK_YfF9Btn-8RFzDWXKiHckbAw8TzN3o"; // <<< COLOQUE SUA CHAVE DE API AQUI
const MODEL_NAME = "gemini-2.5-flash-preview-05-20";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

// --- Elementos do DOM ---
const startScreen = document.getElementById("start-screen");
const gameScreen = document.getElementById("game-screen");
const startBtn = document.getElementById("start-btn");
const questionDisplay = document.getElementById("question-display");
const answerButtonsContainer = document.getElementById("answer-buttons");
const answerButtons = document.querySelectorAll(".answer-btn");
const loadingSpinner = document.getElementById("loading-spinner");
const finalGuessArea = document.getElementById("final-guess-area");
const playAgainBtn = document.getElementById("play-again-btn");

// --- Estado do Jogo ---
let chatHistory = [];
let isLoading = false;
let isGameOver = false;

// --- O CÉREBRO DO GEMINATOR: A INSTRUÇÃO DO SISTEMA ---
const systemPrompt = `
    Você é 'Adivinhus', uma IA superinteligente especialista em adivinhar personagens (reais ou fictícios) em que o usuário está pensando.
    Seu objetivo é adivinhar o personagem fazendo uma série de perguntas de sim/não.
    
     REGRAS EXTREMAMENTE ESTRITAS:
    1.  Sua resposta deve conter APENAS a pergunta e nada mais. Sem comentários, sem introduções, apenas uma apresentação breve, quando for adivinhar uma nova pessoa. Exemplo: "O seu personagem é um homem?".
    2.  Faça sempre apenas UMA pergunta por vez.
    3.  Suas perguntas devem ser curtas, claras e objetivas, para serem respondidas com 'Sim', 'Não', 'Não Sei'.
    4.  Com base na resposta do usuário, refine suas possibilidades e faça uma pergunta mais específica.
    5.  Suas perguntas nunca devem ser do tipo "Isto ou aquilo".
    6.  Nunca revele seu processo de pensamento. Apenas faça a pergunta.
    7.  Quando tiver 95% de certeza, em vez de uma pergunta, faça um palpite final. Seu palpite DEVE começar com a frase exata: "Meu palpite final é: ".
    8.  Comece o jogo com uma boa primeira pergunta geral.
`;

// --- Funções do Jogo ---
function startGame() {
  startScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  isGameOver = false;
  isLoading = true;
  chatHistory = [
    {
      role: "user",
      parts: [
        { text: "Pensei em um personagem. Comece a me fazer perguntas." },
      ],
    },
  ];
  finalGuessArea.classList.add("hidden");
  answerButtonsContainer.classList.remove("hidden");
  questionDisplay.textContent = "";
  updateLoadingUI(true);
  callGeminatorAPI();
}

function handleAnswer(userAnswer) {
  if (isLoading || isGameOver) return;
  isLoading = true;
  chatHistory.push({
    role: "user",
    parts: [{ text: `Minha resposta é: ${userAnswer}` }],
  });
  updateLoadingUI(true);
  callGeminatorAPI();
}

async function callGeminatorAPI() {
  if (!API_KEY) {
    questionDisplay.textContent =
      "Erro de configuração: A chave da API não foi definida. Por favor, adicione sua chave de API no arquivo script.js.";
    isGameOver = true;
    isLoading = false;
    updateLoadingUI(false);
    answerButtonsContainer.classList.add("hidden");
    finalGuessArea.classList.remove("hidden");
    return;
  }

  const payload = {
    contents: chatHistory,
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      temperature: 0.7,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ],
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    // --- NOSSO DETETIVE (Ainda aqui para garantir) ---
    console.log("[DADOS BRUTOS DA API]", result);

    if (!response.ok) {
      throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
    }

    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (text) {
      chatHistory.push({ role: "model", parts: [{ text }] });
      processModelResponse(text);
    } else {
      const blockReason =
        result.promptFeedback?.blockReason ||
        result.candidates?.[0]?.finishReason;
      if (blockReason) {
        throw new Error(
          `A resposta foi bloqueada ou finalizada pela API. Motivo: ${blockReason}`
        );
      } else {
        throw new Error("A resposta da API está vazia.");
      }
    }
  } catch (error) {
    console.error("Falha ao comunicar com a API da Gemini:", error);
    questionDisplay.textContent = `Oops! Tive um problema para pensar. Verifique o console para mais detalhes. (${error.message})`;
    isGameOver = true;
  } finally {
    isLoading = false;
    updateLoadingUI(false);
  }
}

function processModelResponse(text) {
  if (text.startsWith("Meu palpite final é:")) {
    isGameOver = true;
    const guess = text.replace("Meu palpite final é:", "").trim();
    questionDisplay.innerHTML = `<p class="text-lg text-gray-400 mb-2">Meu palpite final é...</p><p class="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500">${guess}!</p>`;
    answerButtonsContainer.classList.add("hidden");
    finalGuessArea.classList.remove("hidden");
  } else {
    questionDisplay.textContent = text;
  }
}

function updateLoadingUI(show) {
  loadingSpinner.classList.toggle("hidden", !show);
  questionDisplay.classList.toggle("hidden", show);
}

// --- Event Listeners ---
startBtn.addEventListener("click", startGame);
playAgainBtn.addEventListener("click", startGame);
answerButtons.forEach((button) => {
  button.addEventListener("click", () => {
    handleAnswer(button.dataset.answer);
  });
});
