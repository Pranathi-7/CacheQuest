"use strict";

/* ---------------------------------
   PAGE NAVIGATION
---------------------------------- */

const pageSections = document.querySelectorAll(".page-section");
const navLinks = document.querySelectorAll(".nav-link");
const pageButtons = document.querySelectorAll("[data-page]");

function showPage(pageId) {
    const targetPage = document.getElementById(pageId);

    if (!targetPage) {
        return;
    }

    pageSections.forEach((section) => {
        section.classList.toggle("active", section.id === pageId);
    });

    navLinks.forEach((link) => {
        link.classList.toggle("active", link.dataset.page === pageId);
    });

    if (window.location.hash !== `#${pageId}`) {
        history.replaceState(null, "", `#${pageId}`);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
}

pageButtons.forEach((button) => {
    button.addEventListener("click", () => {
        showPage(button.dataset.page);
    });
});

navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
        event.preventDefault();
        showPage(link.dataset.page);
    });
});

window.addEventListener("load", () => {
    const initialPage = window.location.hash.slice(1);
    if (initialPage && document.getElementById(initialPage)) {
        showPage(initialPage);
    }
});


/* ---------------------------------
   CACHE SIMULATOR
---------------------------------- */

const mappingType = document.getElementById("mappingType");
const lineCountInput = document.getElementById("lineCount");
const applyConfigButton = document.getElementById("applyConfig");
const resetCacheButton = document.getElementById("resetCache");

const memoryBlocksContainer = document.getElementById("memoryBlocks");
const cacheLinesContainer = document.getElementById("cacheLines");
const lineCountLabel = document.getElementById("lineCountLabel");
const mappingHint = document.getElementById("mappingHint");
const feedbackElement = document.getElementById("simFeedback");

const hitCountElement = document.getElementById("hitCount");
const missCountElement = document.getElementById("missCount");
const replacementCountElement = document.getElementById("replacementCount");

const simGuideTitle = document.getElementById("simGuideTitle");
const simGuideIntro = document.getElementById("simGuideIntro");
const simGuideFormula = document.getElementById("simGuideFormula");
const simGuideSteps = document.getElementById("simGuideSteps");

let cacheLineCount = 4;
let cacheContents = [];
let hitCount = 0;
let missCount = 0;
let replacementCount = 0;
let draggedBlock = null;

const TOTAL_MEMORY_BLOCKS = 16;

function getMappingName() {
    if (mappingType.value === "fully") {
        return "Fully Associative";
    }

    if (mappingType.value === "set") {
        return "2-Way Set Associative";
    }

    return "Direct Mapping";
}

function getSetCount() {
    return Math.max(1, Math.floor(cacheLineCount / 2));
}

function getAllowedLine(blockNumber, lineIndex) {
    if (mappingType.value === "fully") {
        return true;
    }

    if (mappingType.value === "set") {
        const setCount = getSetCount();
        const blockSet = blockNumber % setCount;
        const lineSet = Math.floor(lineIndex / 2);
        return blockSet === lineSet;
    }

    return blockNumber % cacheLineCount === lineIndex;
}

function updateMappingHint() {
    if (mappingType.value === "fully") {
        mappingHint.textContent =
            "Fully associative mapping: a memory block can use any cache line.";
        simGuideTitle.textContent = "Fully Associative: Choose any line";
        simGuideIntro.textContent =
            "A block can be placed in any available cache line. If all lines are occupied, a replacement may be needed.";
        simGuideFormula.textContent =
            "Any memory block → Any cache line";
        simGuideSteps.innerHTML = `
            <li>Select any memory block.</li>
            <li>Choose any cache line.</li>
            <li>If the line is occupied, the old block may be replaced.</li>
        `;
    } else if (mappingType.value === "set") {
        mappingHint.textContent =
            "2-way set associative: each block maps to a set and can use either line in that set.";
        simGuideTitle.textContent = "Set Associative: Find the set";
        simGuideIntro.textContent =
            "First calculate the set using the block number MOD the number of sets. The block can occupy either line in that set.";
        simGuideFormula.textContent =
            "Set = Block number MOD Number of sets";
        simGuideSteps.innerHTML = `
            <li>Find the number of sets: cache lines divided by 2.</li>
            <li>Calculate block number MOD number of sets.</li>
            <li>Place the block in either line belonging to that set.</li>
        `;
    } else {
        mappingHint.textContent =
            "Direct mapping: each block has one permitted line.";
        simGuideTitle.textContent = "Direct Mapping: Find the line";
        simGuideIntro.textContent =
            "Calculate the remainder after dividing the block number by the number of cache lines. That remainder is the only valid destination.";
        simGuideFormula.textContent =
            "Line = Block number MOD Number of cache lines";
        simGuideSteps.innerHTML = `
            <li>Read the memory block number.</li>
            <li>Divide it by the number of cache lines.</li>
            <li>Use the remainder as the line number.</li>
        `;
    }
}

function showFeedback(message, type = "") {
    feedbackElement.textContent = message;
    feedbackElement.className = "feedback";

    if (type) {
        feedbackElement.classList.add(type);
    }
}

function updateStats() {
    hitCountElement.textContent = hitCount;
    missCountElement.textContent = missCount;
    replacementCountElement.textContent = replacementCount;
}

function createMemoryBlocks() {
    memoryBlocksContainer.innerHTML = "";

    for (let blockNumber = 0; blockNumber < TOTAL_MEMORY_BLOCKS; blockNumber++) {
        const block = document.createElement("button");

        block.type = "button";
        block.className = "memory-block";
        block.textContent = `Block ${blockNumber}`;
        block.draggable = true;
        block.dataset.block = String(blockNumber);
        block.setAttribute("aria-label", `Memory block ${blockNumber}`);

        block.addEventListener("dragstart", (event) => {
            draggedBlock = blockNumber;
            event.dataTransfer.setData("text/plain", String(blockNumber));
            event.dataTransfer.effectAllowed = "move";
        });

        block.addEventListener("dragend", () => {
            draggedBlock = null;
            document.querySelectorAll(".cache-slot").forEach((slot) => {
                slot.classList.remove("drag-over");
            });
        });

        block.addEventListener("click", () => {
            showFeedback(
                `Block ${blockNumber} selected. Drag it to a cache line to test the mapping rule.`,
                ""
            );
        });

        memoryBlocksContainer.appendChild(block);
    }
}

function createCacheLines() {
    cacheLinesContainer.innerHTML = "";
    lineCountLabel.textContent =
        `${cacheLineCount} ${cacheLineCount === 1 ? "line" : "lines"}`;

    for (let lineIndex = 0; lineIndex < cacheLineCount; lineIndex++) {
        const slot = document.createElement("button");

        slot.type = "button";
        slot.className = "cache-slot";
        slot.dataset.line = String(lineIndex);
        slot.setAttribute("aria-label", `Cache line ${lineIndex}`);

        slot.innerHTML = `
            <span class="line-label">Line ${lineIndex}</span>
            <span class="slot-value">Empty</span>
        `;

        slot.addEventListener("dragover", (event) => {
            event.preventDefault();
            slot.classList.add("drag-over");
            event.dataTransfer.dropEffect = "move";
        });

        slot.addEventListener("dragleave", () => {
            slot.classList.remove("drag-over");
        });

        slot.addEventListener("drop", (event) => {
            event.preventDefault();
            slot.classList.remove("drag-over");

            const data = event.dataTransfer.getData("text/plain");
            const blockNumber = data === ""
                ? draggedBlock
                : Number(data);

            if (blockNumber === null || Number.isNaN(blockNumber)) {
                return;
            }

            placeBlock(blockNumber, lineIndex);
        });

        slot.addEventListener("click", () => {
            const blockNumber = cacheContents[lineIndex];

            if (blockNumber === null || blockNumber === undefined) {
                showFeedback(`Cache line ${lineIndex} is empty.`);
            } else {
                showFeedback(
                    `Cache line ${lineIndex} currently contains block ${blockNumber}.`
                );
            }
        });

        cacheLinesContainer.appendChild(slot);
    }

    renderCacheContents();
}

function renderCacheContents() {
    const slots = cacheLinesContainer.querySelectorAll(".cache-slot");

    slots.forEach((slot, lineIndex) => {
        const value = slot.querySelector(".slot-value");
        const blockNumber = cacheContents[lineIndex];

        if (blockNumber === null || blockNumber === undefined) {
            value.textContent = "Empty";
            slot.classList.remove("occupied");
        } else {
            value.textContent = `Block ${blockNumber}`;
            slot.classList.add("occupied");
        }
    });
}

function placeBlock(blockNumber, lineIndex) {
    if (lineIndex < 0 || lineIndex >= cacheLineCount) {
        return;
    }

    const alreadyPresentAt = cacheContents.indexOf(blockNumber);

    if (alreadyPresentAt !== -1) {
        hitCount++;
        updateStats();

        showFeedback(
            `Cache hit! Block ${blockNumber} is already in cache line ${alreadyPresentAt}.`,
            "success"
        );

        return;
    }

    const allowed = getAllowedLine(blockNumber, lineIndex);

    if (!allowed) {
        missCount++;
        updateStats();

        let correctDestination;

        if (mappingType.value === "direct") {
            correctDestination = blockNumber % cacheLineCount;
            showFeedback(
                `Invalid placement. Block ${blockNumber} maps to line ${correctDestination}, because ${blockNumber} MOD ${cacheLineCount} = ${correctDestination}.`,
                "error"
            );
        } else if (mappingType.value === "set") {
            const setCount = getSetCount();
            const setNumber = blockNumber % setCount;
            const firstLine = setNumber * 2;

            showFeedback(
                `Invalid placement. Block ${blockNumber} maps to set ${setNumber}. Try line ${firstLine}${firstLine + 1 < cacheLineCount ? ` or line ${firstLine + 1}` : ""}.`,
                "error"
            );
        }

        return;
    }

    missCount++;

    if (cacheContents[lineIndex] !== null &&
        cacheContents[lineIndex] !== undefined) {
        replacementCount++;
    }

    cacheContents[lineIndex] = blockNumber;

    renderCacheContents();
    updateStats();

    showFeedback(
        `Block ${blockNumber} placed in cache line ${lineIndex}. This access was a cache miss because the block was not previously in cache.`,
        "success"
    );
}

function resetCache() {
    cacheContents = Array(cacheLineCount).fill(null);
    hitCount = 0;
    missCount = 0;
    replacementCount = 0;

    createCacheLines();
    updateStats();
    showFeedback("Cache has been reset. Drag a memory block into a cache line to begin.");
}

function applyConfiguration() {
    const requestedLines = Number.parseInt(lineCountInput.value, 10);

    if (!Number.isInteger(requestedLines) ||
        requestedLines < 1 ||
        requestedLines > 64) {
        showFeedback("Enter a cache line count between 1 and 64.", "error");
        lineCountInput.value = String(cacheLineCount);
        return;
    }

    if (mappingType.value === "set" && requestedLines < 2) {
        showFeedback(
            "2-way set associative mapping requires at least 2 cache lines.",
            "error"
        );
        lineCountInput.value = String(cacheLineCount);
        return;
    }

    cacheLineCount = requestedLines;
    cacheContents = Array(cacheLineCount).fill(null);

    hitCount = 0;
    missCount = 0;
    replacementCount = 0;

    updateMappingHint();
    createCacheLines();
    updateStats();

    showFeedback(
        `${getMappingName()} applied with ${cacheLineCount} cache lines.`
    );
}

mappingType.addEventListener("change", () => {
    updateMappingHint();
});

applyConfigButton.addEventListener("click", applyConfiguration);
resetCacheButton.addEventListener("click", resetCache);

createMemoryBlocks();
updateMappingHint();
createCacheLines();
updateStats();


/* ---------------------------------
   FLASHCARDS — FLIP, PREVIOUS, NEXT
---------------------------------- */

const flashcardElement = document.getElementById("flashcard");
const flashcardQuestion = document.getElementById("flashcardQuestion");
const flashcardAnswer = document.getElementById("flashcardAnswer");
const flashcardCounter = document.getElementById("flashcardCounter");
const flashcardProgress = document.getElementById("flashcardProgress");

const revealAnswerButton = document.getElementById("revealAnswer");
const previousCardButton = document.getElementById("previousCard");
const nextCardButton = document.getElementById("nextCard");

const flashcards = [
    {
        question: "What is cache memory?",
        answer: "Small, fast memory that stores copies of selected data from lower memory levels."
    },
    {
        question: "What is a cache hit?",
        answer: "A cache hit occurs when the requested data is already present in cache."
    },
    {
        question: "What is a cache miss?",
        answer: "A cache miss occurs when the requested data is not present in cache."
    },
    {
        question: "What is temporal locality?",
        answer: "Recently accessed data or instructions are likely to be accessed again soon."
    },
    {
        question: "What is spatial locality?",
        answer: "Memory locations near a recently accessed location are likely to be accessed soon."
    },
    {
        question: "What is direct mapping?",
        answer: "Each main-memory block can be placed in exactly one specific cache line."
    },
    {
        question: "What is fully associative mapping?",
        answer: "A memory block can be placed in any cache line."
    },
    {
        question: "What is set-associative mapping?",
        answer: "A block maps to one set but can occupy any line within that set."
    }
];

let currentFlashcardIndex = 0;
let isFlashcardFlipped = false;

function setFlashcardFlipped(flipped) {
    isFlashcardFlipped = flipped;

    flashcardElement.classList.toggle("is-flipped", isFlashcardFlipped);
    flashcardElement.setAttribute("aria-pressed", String(isFlashcardFlipped));

    flashcardElement.setAttribute(
        "aria-label",
        isFlashcardFlipped
            ? "Answer shown. Flip back to question"
            : "Flip flashcard to reveal answer"
    );

    revealAnswerButton.textContent = isFlashcardFlipped
        ? "Show Question ↻"
        : "Flip Card ↻";
}

function toggleFlashcard() {
    setFlashcardFlipped(!isFlashcardFlipped);
}

function renderFlashcard() {
    const card = flashcards[currentFlashcardIndex];

    flashcardQuestion.textContent = card.question;
    flashcardAnswer.textContent = card.answer;

    flashcardCounter.textContent =
        `Card ${currentFlashcardIndex + 1} of ${flashcards.length}`;

    flashcardProgress.style.width =
        `${((currentFlashcardIndex + 1) / flashcards.length) * 100}%`;

    previousCardButton.disabled = currentFlashcardIndex === 0;
    nextCardButton.disabled = currentFlashcardIndex === flashcards.length - 1;

    // Every new card begins on the question side.
    setFlashcardFlipped(false);
}

flashcardElement.addEventListener("click", (event) => {
    // The card itself is the flip control.
    if (event.target.closest("button")) {
        return;
    }

    toggleFlashcard();
});

flashcardElement.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleFlashcard();
    }
});

revealAnswerButton.addEventListener("click", toggleFlashcard);

previousCardButton.addEventListener("click", () => {
    if (currentFlashcardIndex > 0) {
        currentFlashcardIndex--;
        renderFlashcard();
    }
});

nextCardButton.addEventListener("click", () => {
    if (currentFlashcardIndex < flashcards.length - 1) {
        currentFlashcardIndex++;
        renderFlashcard();
    }
});

renderFlashcard();


/* ---------------------------------
   QUIZ
---------------------------------- */

const quizCounter = document.getElementById("quizCounter");
const quizScore = document.getElementById("quizScore");
const quizProgress = document.getElementById("quizProgress");
const quizQuestion = document.getElementById("quizQuestion");
const quizOptions = document.getElementById("quizOptions");
const quizExplanation = document.getElementById("quizExplanation");

const submitAnswerButton = document.getElementById("submitAnswer");
const nextQuestionButton = document.getElementById("nextQuestion");
const restartQuizButton = document.getElementById("restartQuiz");

const quizQuestions = [
    {
        question: "What is the main purpose of cache memory?",
        options: [
            "To permanently store files",
            "To reduce average data access time",
            "To replace the CPU",
            "To increase monitor resolution"
        ],
        correct: 1,
        explanations: [
            "Incorrect. Permanent file storage is typically provided by SSDs or hard drives.",
            "Correct. Cache stores copies of selected data close to the CPU to speed up access.",
            "Incorrect. Cache does not replace the processor.",
            "Incorrect. Monitor resolution is unrelated to cache memory."
        ]
    },
    {
        question: "When does a cache hit occur?",
        options: [
            "When the requested data is in cache",
            "When the cache is full",
            "When the CPU is switched off",
            "When main memory is empty"
        ],
        correct: 0,
        explanations: [
            "Correct. A hit means the requested data is already present in cache.",
            "Incorrect. A full cache does not automatically mean a hit.",
            "Incorrect. A CPU being switched off does not define a cache hit.",
            "Incorrect. Main memory being empty is not the definition of a hit."
        ]
    },
    {
        question: "What happens during a cache miss?",
        options: [
            "The computer shuts down",
            "The CPU stops permanently",
            "The requested data must be fetched from a lower memory level",
            "The cache becomes main memory"
        ],
        correct: 2,
        explanations: [
            "Incorrect. A miss does not normally shut down the computer.",
            "Incorrect. A miss does not permanently stop the CPU.",
            "Correct. If the data is absent from cache, the system fetches it from a lower memory level.",
            "Incorrect. Cache and main memory remain distinct memory levels."
        ]
    },
    {
        question: "Which mapping technique gives each block one specific cache line?",
        options: [
            "Fully associative mapping",
            "Direct mapping",
            "Set-associative mapping",
            "Virtual mapping"
        ],
        correct: 1,
        explanations: [
            "Incorrect. Fully associative mapping allows placement in any line.",
            "Correct. Direct mapping assigns each block exactly one possible cache line.",
            "Incorrect. Set-associative mapping allows a block to use any line in its assigned set.",
            "Incorrect. Virtual mapping is not the cache mapping technique described here."
        ]
    },
    {
        question: "In direct mapping, a block maps to which line if its number is 10 and there are 4 cache lines?",
        options: [
            "Line 0",
            "Line 1",
            "Line 2",
            "Line 3"
        ],
        correct: 2,
        explanations: [
            "Incorrect. 10 MOD 4 is 2, not 0.",
            "Incorrect. 10 MOD 4 is 2, not 1.",
            "Correct. Cache line = block number MOD line count = 10 MOD 4 = 2.",
            "Incorrect. 10 MOD 4 is 2, not 3."
        ]
    },
    {
        question: "Which type of locality means recently accessed data may be used again?",
        options: [
            "Spatial locality",
            "Temporal locality",
            "Sequential mapping",
            "Direct locality"
        ],
        correct: 1,
        explanations: [
            "Incorrect. Spatial locality concerns nearby memory locations.",
            "Correct. Temporal locality means recently accessed data may be accessed again soon.",
            "Incorrect. Sequential mapping is not the term for this principle.",
            "Incorrect. Direct locality is not the standard term."
        ]
    },
    {
        question: "What is a key advantage of fully associative mapping?",
        options: [
            "Every block has one fixed line",
            "It needs no tags",
            "A block can use any cache line",
            "It eliminates all cache misses"
        ],
        correct: 2,
        explanations: [
            "Incorrect. One fixed line is a property of direct mapping.",
            "Incorrect. Cache tags are still needed to identify stored blocks.",
            "Correct. Fully associative mapping allows a block to occupy any cache line.",
            "Incorrect. It can reduce placement conflicts but cannot eliminate all cache misses."
        ]
    },
    {
        question: "What does a higher cache hit ratio generally indicate?",
        options: [
            "More requests are served from cache",
            "Main memory has disappeared",
            "The CPU has fewer registers",
            "Every request is a miss"
        ],
        correct: 0,
        explanations: [
            "Correct. A higher hit ratio means a larger fraction of requests are found in cache.",
            "Incorrect. Main memory remains present and necessary.",
            "Incorrect. The number of CPU registers is unrelated to the definition of hit ratio.",
            "Incorrect. Every request being a miss would mean a hit ratio of zero."
        ]
    }
];

let currentQuestionIndex = 0;
let score = 0;
let answerSubmitted = false;

function renderQuizQuestion() {
    const questionData = quizQuestions[currentQuestionIndex];

    answerSubmitted = false;

    quizCounter.textContent =
        `Question ${currentQuestionIndex + 1} of ${quizQuestions.length}`;

    quizScore.textContent = `Score: ${score}`;

    quizProgress.style.width =
        `${(currentQuestionIndex / quizQuestions.length) * 100}%`;

    quizQuestion.textContent = questionData.question;
    quizOptions.innerHTML = "";
    quizExplanation.hidden = true;
    quizExplanation.innerHTML = "";

    questionData.options.forEach((optionText, optionIndex) => {
        const label = document.createElement("label");
        label.className = "quiz-option";

        const input = document.createElement("input");
        input.type = "radio";
        input.name = "quizAnswer";
        input.value = String(optionIndex);

        const text = document.createElement("span");
        text.textContent = optionText;

        label.append(input, text);
        quizOptions.appendChild(label);
    });

    submitAnswerButton.hidden = false;
    nextQuestionButton.hidden = true;
    restartQuizButton.hidden = true;
    submitAnswerButton.disabled = false;
}

function submitQuizAnswer() {
    if (answerSubmitted) {
        return;
    }

    const selected = document.querySelector('input[name="quizAnswer"]:checked');

    if (!selected) {
        quizExplanation.hidden = false;
        quizExplanation.innerHTML =
            "<p>Please select an answer before submitting.</p>";
        return;
    }

    answerSubmitted = true;

    const questionData = quizQuestions[currentQuestionIndex];
    const selectedIndex = Number(selected.value);

    if (selectedIndex === questionData.correct) {
        score++;
    }

    quizOptions.querySelectorAll(".quiz-option").forEach((label, index) => {
        const input = label.querySelector("input");
        input.disabled = true;

        if (index === questionData.correct) {
            label.classList.add("correct-option");
        }

        if (index === selectedIndex && index !== questionData.correct) {
            label.classList.add("wrong-option");
        }
    });

    quizScore.textContent = `Score: ${score}`;
    quizProgress.style.width =
        `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%`;

    quizExplanation.hidden = false;

    const resultHeading = document.createElement("h3");
    resultHeading.className =
        selectedIndex === questionData.correct ? "correct-text" : "wrong-text";
    resultHeading.textContent =
        selectedIndex === questionData.correct
            ? "Correct!"
            : "Not quite — review the explanations";

    const explanationList = document.createElement("ul");

    questionData.explanations.forEach((explanation, index) => {
        const item = document.createElement("li");
        item.textContent = explanation;

        if (index === questionData.correct) {
            item.classList.add("correct-text");
        } else if (index === selectedIndex) {
            item.classList.add("wrong-text");
        }

        explanationList.appendChild(item);
    });

    quizExplanation.append(resultHeading, explanationList);

    submitAnswerButton.hidden = true;

    if (currentQuestionIndex < quizQuestions.length - 1) {
        nextQuestionButton.hidden = false;
    } else {
        restartQuizButton.hidden = false;
        quizProgress.style.width = "100%";

        const finalResult = document.createElement("p");
        finalResult.innerHTML =
            `<strong>Final score: ${score} / ${quizQuestions.length}</strong>`;
        quizExplanation.appendChild(finalResult);
    }
}

function nextQuizQuestion() {
    if (currentQuestionIndex < quizQuestions.length - 1) {
        currentQuestionIndex++;
        renderQuizQuestion();
    }
}

function restartQuiz() {
    currentQuestionIndex = 0;
    score = 0;
    renderQuizQuestion();
}

submitAnswerButton.addEventListener("click", submitQuizAnswer);
nextQuestionButton.addEventListener("click", nextQuizQuestion);
restartQuizButton.addEventListener("click", restartQuiz);

renderQuizQuestion();