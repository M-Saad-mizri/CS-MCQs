// QuickFacts & MCQ Practice Portal - Application Core Logic

document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 QuickFacts MCQs Build Commit: 576bd73 (Latest Deploy)");
  // --- APPLICATION STATE ---
  let state = {
    activeSubject: "Computer Networking",
    theme: "dark",
    showAllAnswers: false,
    hideQuizHistory: false, // boolean flag for show/hide attempt history
    activeMode: "practice", // "practice" | "quiz"
    selectedTopic: "ALL",   // "ALL" | specific topic string
    customSubjects: {},     // { [subjectName]: [ { id, category, question, options, answerIndex, explanation } ] }
    bookmarks: {},          // { [subjectName]: [id1, id2, ...] }
    covered: {},            // { [subjectName]: [id1, id2, ...] }
    checkpoints: {},        // { [subjectName]: id }
    attempts: {},           // { [subjectName]: { [mcqId]: { wrongOptions: [0, 1], isCorrect: boolean } } }
    revealedAnswers: {},    // { [subjectName]: [id1, id2, ...] }
    comments: {},           // { [subjectName]: { [mcqId]: string } }
    quizStats: {},          // { [subjectName]: { totalAttempted: number, totalCorrect: number } }
    quizHistory: []         // Array of past quiz attempt objects
  };

  // --- QUIZ TEST SESSION STATE ---
  let quizSession = {
    active: false,
    questions: [],
    currentIndex: 0,
    userAnswers: {}, // { [questionId]: selectedIndex }
    checked: {},     // { [questionId]: boolean }
    timerSeconds: 0,
    timerInterval: null
  };

  // --- LOCAL STORAGE KEY ---
  const STORAGE_KEY = "quickfacts_mcq_state_v3";

  // --- DOM ELEMENTS ---
  const body = document.body;
  const sidebar = document.getElementById("settingsSidebar");
  const sidebarOverlay = document.getElementById("sidebarOverlay");
  const sidebarToggleBtn = document.getElementById("sidebarToggle");
  const sidebarCloseBtn = document.getElementById("sidebarClose");
  const themeToggleTopBtn = document.getElementById("themeToggleTop");
  const darkModeToggle = document.getElementById("darkModeToggle");
  const globalShowAnswersToggle = document.getElementById("globalShowAnswersToggle");

  // Mode Switchers
  const btnModePractice = document.getElementById("btnModePractice");
  const btnModeQuiz = document.getElementById("btnModeQuiz");

  // Hero Stats & Controls
  const currentSubjectBadge = document.getElementById("currentSubjectBadge");
  const progressPercentage = document.getElementById("progressPercentage");
  const progressBarFill = document.getElementById("progressBarFill");
  const progressCount = document.getElementById("progressCount");
  const accuracyStat = document.getElementById("accuracyStat");
  const bookmarkCount = document.getElementById("bookmarkCount");

  const topicsScroll = document.getElementById("topicsScroll");
  const searchActionsBar = document.querySelector(".search-actions-bar");
  const searchInput = document.getElementById("searchInput");
  const searchClear = document.getElementById("searchClear");

  // Filter Chips
  const filterAll = document.getElementById("filterAll");
  const filterBookmarks = document.getElementById("filterBookmarks");
  const filterUncovered = document.getElementById("filterUncovered");
  const filterMistakes = document.getElementById("filterMistakes");

  // Checkpoint Banner
  const checkpointBanner = document.getElementById("checkpointBanner");
  const checkpointNumber = document.getElementById("checkpointNumber");
  const jumpToCheckpointBtn = document.getElementById("jumpToCheckpoint");

  // Containers
  const factsListContainer = document.getElementById("factsList");
  const quizContainer = document.getElementById("quizContainer");

  // Quiz Setup DOM
  const quizSetupCard = document.getElementById("quizSetupCard");
  const quizTopicSelect = document.getElementById("quizTopicSelect");
  const startQuizBtn = document.getElementById("startQuizBtn");

  // Custom Mock Exam Builder DOM
  const tabSingleSubjectQuiz = document.getElementById("tabSingleSubjectQuiz");
  const tabMultiSubjectMock = document.getElementById("tabMultiSubjectMock");
  const singleSubjectPanel = document.getElementById("singleSubjectPanel");
  const multiSubjectMockPanel = document.getElementById("multiSubjectMockPanel");
  const presetFullMockBtn = document.getElementById("presetFullMockBtn");
  const presetMiniMockBtn = document.getElementById("presetMiniMockBtn");
  const subjectDistContainer = document.getElementById("subjectDistContainer");
  const mockTotalCounter = document.getElementById("mockTotalCounter");
  const mockTimerSelector = document.getElementById("mockTimerSelector");
  const startMockExamBtn = document.getElementById("startMockExamBtn");
  const quizQuestionSubject = document.getElementById("quizQuestionSubject");
  const modalSubjectBreakdownBox = document.getElementById("modalSubjectBreakdownBox");
  const modalSubjectBreakdownGrid = document.getElementById("modalSubjectBreakdownGrid");

  // Active Quiz DOM
  const quizActiveCard = document.getElementById("quizActiveCard");
  const quizQuestionCounter = document.getElementById("quizQuestionCounter");
  const quizTimer = document.getElementById("quizTimer");
  const quizProgressFill = document.getElementById("quizProgressFill");
  const quizQuestionCategory = document.getElementById("quizQuestionCategory");
  const quizQuestionStatement = document.getElementById("quizQuestionStatement");
  const quizOptionsGrid = document.getElementById("quizOptionsGrid");
  const quizExplanationBox = document.getElementById("quizExplanationBox");
  const quizPrevBtn = document.getElementById("quizPrevBtn");
  const quizCheckBtn = document.getElementById("quizCheckBtn");
  const quizNextBtn = document.getElementById("quizNextBtn");

  // Quiz Modal DOM
  const quizResultsModal = document.getElementById("quizResultsModal");
  const quizModalClose = document.getElementById("quizModalClose");
  const modalScorePercent = document.getElementById("modalScorePercent");
  const modalScoreFraction = document.getElementById("modalScoreFraction");
  const modalCorrectCount = document.getElementById("modalCorrectCount");
  const modalWrongCount = document.getElementById("modalWrongCount");
  const modalTimeSpent = document.getElementById("modalTimeSpent");
  const modalReviewMistakesBtn = document.getElementById("modalReviewMistakesBtn");
  const modalRetakeQuizBtn = document.getElementById("modalRetakeQuizBtn");

  // Sidebar Controls
  const sidebarSubjectList = document.getElementById("sidebarSubjectList");
  const newSubjectNameInput = document.getElementById("newSubjectName");
  const rawFactsPasteInput = document.getElementById("rawFactsPaste");
  const addFactsBtn = document.getElementById("addFactsBtn");
  const resetProgressBtn = document.getElementById("resetProgressBtn");
  const clearAllDataBtn = document.getElementById("clearAllDataBtn");

  // Active Filter Modes
  let searchFilter = "";
  let currentFilter = "all"; // "all" | "bookmarks" | "uncovered" | "mistakes"

  // --- TOPIC COVERAGE HELPER ---
  function isTopicCovered(topic) {
    const allMCQs = getActiveSubjectMCQs();
    const topicMCQs = topic === "ALL" ? allMCQs : allMCQs.filter(m => m.category === topic);
    if (topicMCQs.length === 0) return false;

    // Check if user attempted at least 1 quiz for this topic
    const history = state.quizHistory || [];
    const hasQuizAttempt = history.some(h =>
      h.subject === state.activeSubject && (h.category === topic || h.category === "ALL")
    );
    if (hasQuizAttempt) return true;

    // Or check if all MCQs in this topic are covered in practice mode
    const coveredList = state.covered[state.activeSubject] || [];
    return topicMCQs.every(m => coveredList.includes(m.id));
  }

  function getTopicProgress(topic) {
    const allMCQs = getActiveSubjectMCQs();
    const topicMCQs = topic === "ALL" ? allMCQs : allMCQs.filter(m => m.category === topic);
    if (topicMCQs.length === 0) return { count: 0, total: 0, percent: 0 };

    let count = 0;
    const attempts = state.attempts[state.activeSubject] || {};
    const coveredList = state.covered[state.activeSubject] || [];

    if (state.activeMode === "quiz") {
      // Quiz Mode: Correctly answered or covered MCQs / Total MCQs
      count = topicMCQs.filter(m => (attempts[m.id] && attempts[m.id].isCorrect) || coveredList.includes(m.id)).length;
    } else {
      // Practice Mode: Covered MCQs / Total MCQs
      count = topicMCQs.filter(m => coveredList.includes(m.id)).length;
    }

    const percent = Math.min(100, Math.max(0, Math.round((count / topicMCQs.length) * 100)));
    return { count, total: topicMCQs.length, percent };
  }

  // --- STATE PERSISTENCE ---
  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        state = {
          ...state,
          ...parsed,
          comments: parsed.comments || {},
          hideQuizHistory: !!parsed.hideQuizHistory,
          lastUpdated: parsed.lastUpdated || state.lastUpdated || new Date().toISOString()
        };
      }
    } catch (e) {
      console.error("Failed to load state", e);
    }
  }

  function saveState() {
    try {
      state.lastUpdated = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      if (window.GoogleDriveSync && typeof window.GoogleDriveSync.scheduleAutoSync === "function") {
        window.GoogleDriveSync.scheduleAutoSync();
      }
    } catch (e) {
      console.error("Failed to save state", e);
    }
  }

  // --- SUBJECT & MCQs HELPERS ---
  let shuffledSubjectCache = {};

  function shuffleMCQItem(mcq) {
    if (!mcq || !Array.isArray(mcq.options) || mcq.options.length < 2) {
      return mcq;
    }
    const correctAnswerText = mcq.options[mcq.answerIndex];
    if (correctAnswerText === undefined) return mcq;

    const shuffledOptions = [...mcq.options];
    for (let i = shuffledOptions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
    }

    const newAnswerIndex = shuffledOptions.indexOf(correctAnswerText);

    return {
      ...mcq,
      options: shuffledOptions,
      answerIndex: newAnswerIndex
    };
  }

  function formatExplanation(exp) {
    if (!exp) return "";
    if (typeof exp === "string") return exp;
    if (typeof exp === "object") {
      if (exp.correctReason) {
        return exp.correctReason;
      }
      const textVals = Object.values(exp).filter(v => typeof v === "string" && v.trim());
      if (textVals.length > 0) {
        return textVals[0];
      }
    }
    return String(exp);
  }

  function getActiveSubjectMCQs() {
    const subject = state.activeSubject;
    if (shuffledSubjectCache[subject]) {
      return shuffledSubjectCache[subject];
    }

    let rawList = [];
    if (state.customSubjects[subject]) {
      rawList = state.customSubjects[subject];
    } else if (window.factsData && window.factsData[subject]) {
      rawList = window.factsData[subject];
    }

    shuffledSubjectCache[subject] = rawList.map(shuffleMCQItem);
    return shuffledSubjectCache[subject];
  }

  function getAllSubjects() {
    const builtIn = window.factsData ? Object.keys(window.factsData) : [];
    const custom = Object.keys(state.customSubjects);
    return Array.from(new Set([...builtIn, ...custom]));
  }

  function getAvailableTopics() {
    const mcqs = getActiveSubjectMCQs();
    const categories = mcqs.map(q => q.category).filter(Boolean);
    return Array.from(new Set(categories));
  }

  // --- UI THEME & MODE SWITCHERS ---
  function applyTheme() {
    if (state.theme === "dark") {
      body.classList.add("dark-mode");
      body.classList.remove("light-mode");
      if (darkModeToggle) darkModeToggle.checked = true;
    } else {
      body.classList.add("light-mode");
      body.classList.remove("dark-mode");
      if (darkModeToggle) darkModeToggle.checked = false;
    }
  }

  function toggleTheme() {
    state.theme = state.theme === "dark" ? "light" : "dark";
    applyTheme();
    saveState();
  }

  function switchMode(mode) {
    state.activeMode = mode;
    saveState();

    if (mode === "practice") {
      btnModePractice.classList.add("active");
      btnModeQuiz.classList.remove("active");
      if (searchActionsBar) searchActionsBar.style.display = "flex";
      factsListContainer.style.display = "flex";
      quizContainer.style.display = "none";
      updateProgressUI();
      renderTopicPills();
      renderFactsList();
    } else {
      btnModeQuiz.classList.add("active");
      btnModePractice.classList.remove("active");
      if (searchActionsBar) searchActionsBar.style.display = "none";
      if (checkpointBanner) checkpointBanner.style.display = "none";
      factsListContainer.style.display = "none";
      quizContainer.style.display = "block";
      renderTopicPills();
      initQuizSetup();
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openSidebar() {
    sidebar.classList.add("active");
    sidebarOverlay.classList.add("active");
  }

  function closeSidebar() {
    sidebar.classList.remove("active");
    sidebarOverlay.classList.remove("active");
  }

  // --- TOPIC & CATEGORY PILLS ---
  function renderTopicPills() {
    topicsScroll.innerHTML = "";
    const topics = getAvailableTopics();
    const allMCQs = getActiveSubjectMCQs();

    // "All" Pill
    const allProg = getTopicProgress("ALL");
    const isAllActive = state.selectedTopic === 'ALL';
    const allPill = document.createElement("button");
    allPill.className = `topic-pill ${isAllActive ? 'active' : ''}`;
    allPill.textContent = `All (${allMCQs.length})`;

    if (!isAllActive && allProg.percent > 0) {
      const p = allProg.percent;
      allPill.style.background = `linear-gradient(90deg, rgba(16, 185, 129, 0.25) 0%, rgba(16, 185, 129, 0.25) ${p}%, var(--option-bg) ${p}%, var(--option-bg) 100%)`;
      allPill.style.borderColor = `rgba(16, 185, 129, ${Math.min(0.6, 0.25 + (p / 100) * 0.35)})`;
    }

    allPill.addEventListener("click", () => {
      state.selectedTopic = "ALL";
      saveState();
      renderTopicPills();
      renderFactsList();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    topicsScroll.appendChild(allPill);

    // Individual Topics
    topics.forEach(topic => {
      const topicCount = allMCQs.filter(m => m.category === topic).length;
      const prog = getTopicProgress(topic);
      const isActive = state.selectedTopic === topic;
      const pill = document.createElement("button");
      pill.className = `topic-pill ${isActive ? 'active' : ''}`;
      pill.textContent = `${topic} (${topicCount})`;

      if (!isActive && prog.percent > 0) {
        const p = prog.percent;
        pill.style.background = `linear-gradient(90deg, rgba(16, 185, 129, 0.25) 0%, rgba(16, 185, 129, 0.25) ${p}%, var(--option-bg) ${p}%, var(--option-bg) 100%)`;
        pill.style.borderColor = `rgba(16, 185, 129, ${Math.min(0.6, 0.25 + (p / 100) * 0.35)})`;
      }

      pill.addEventListener("click", () => {
        state.selectedTopic = topic;
        saveState();
        renderTopicPills();
        renderFactsList();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
      topicsScroll.appendChild(pill);
    });
  }

  // --- PROGRESS & STATS UI ---
  function updateProgressUI() {
    const mcqs = getActiveSubjectMCQs();
    const total = mcqs.length;

    if (!state.covered[state.activeSubject]) state.covered[state.activeSubject] = [];
    if (!state.bookmarks[state.activeSubject]) state.bookmarks[state.activeSubject] = [];
    if (!state.attempts[state.activeSubject]) state.attempts[state.activeSubject] = {};

    const coveredCount = state.covered[state.activeSubject].length;
    const bookmarkedCount = state.bookmarks[state.activeSubject].length;

    // Calculate Accuracy from Quiz Mode performance
    if (!state.quizStats) state.quizStats = {};
    const quizStats = state.quizStats[state.activeSubject] || { totalAttempted: 0, totalCorrect: 0 };
    const accuracy = quizStats.totalAttempted > 0
      ? Math.round((quizStats.totalCorrect / quizStats.totalAttempted) * 100)
      : 0;
    const percent = total > 0 ? Math.round((coveredCount / total) * 100) : 0;

    currentSubjectBadge.textContent = state.activeSubject;
    progressPercentage.textContent = `${percent}% Covered`;
    progressBarFill.style.width = `${percent}%`;
    progressCount.textContent = `${coveredCount} / ${total} MCQs covered`;
    accuracyStat.textContent = quizStats.totalAttempted > 0 ? `Accuracy: ${accuracy}%` : `Accuracy: 0%`;
    bookmarkCount.textContent = `${bookmarkedCount} bookmarked`;

    // Render Checkpoint Banner (Only in practice mode)
    const checkpointId = state.checkpoints[state.activeSubject];
    if (checkpointId && state.activeMode === "practice") {
      const mcqIndex = mcqs.findIndex(m => m.id === checkpointId);
      if (mcqIndex !== -1) {
        checkpointBanner.style.display = "flex";
        checkpointNumber.textContent = `#${mcqIndex + 1}`;
      } else {
        checkpointBanner.style.display = "none";
      }
    } else {
      checkpointBanner.style.display = "none";
    }

    // Refresh sidebar mini progress bars
    renderSubjectsList();
  }

  // --- RENDER PRACTICE MCQs LIST ---
  function renderFactsList() {
    if (state.activeMode !== "practice") return;

    factsListContainer.innerHTML = "";
    const mcqs = getActiveSubjectMCQs();

    if (mcqs.length === 0) {
      factsListContainer.innerHTML = `
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <p>No MCQs found in this subject. Use the sidebar to import questions!</p>
        </div>
      `;
      return;
    }

    const coveredList = state.covered[state.activeSubject] || [];
    const bookmarkedList = state.bookmarks[state.activeSubject] || [];
    const activeCheckpoint = state.checkpoints[state.activeSubject] || null;
    const attempts = state.attempts[state.activeSubject] || {};
    const revealedList = state.revealedAnswers[state.activeSubject] || [];

    // Filter MCQs
    const filtered = mcqs.filter(mcq => {
      // Topic Filter
      if (state.selectedTopic !== "ALL" && mcq.category !== state.selectedTopic) {
        return false;
      }

      // Search Filter
      if (searchFilter) {
        const query = searchFilter.toLowerCase();
        const inQuestion = mcq.question.toLowerCase().includes(query);
        const inCategory = (mcq.category || "").toLowerCase().includes(query);
        const inOptions = mcq.options.some(opt => opt.toLowerCase().includes(query));
        const expStr = formatExplanation(mcq.explanation);
        const inExplanation = expStr.toLowerCase().includes(query);
        const userComment = (state.comments && state.comments[state.activeSubject] && state.comments[state.activeSubject][mcq.id]) || "";
        const inComments = userComment.toLowerCase().includes(query);
        if (!inQuestion && !inCategory && !inOptions && !inExplanation && !inComments) return false;
      }

      // Chip Filters
      if (currentFilter === "bookmarks" && !bookmarkedList.includes(mcq.id)) return false;
      if (currentFilter === "uncovered" && coveredList.includes(mcq.id)) return false;
      if (currentFilter === "mistakes") {
        const att = attempts[mcq.id];
        if (!att || att.isCorrect || !att.wrongOptions || att.wrongOptions.length === 0) return false;
      }

      return true;
    });

    if (filtered.length === 0) {
      factsListContainer.innerHTML = `
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <p>No MCQs match your selected topic or filter criteria.</p>
        </div>
      `;
      return;
    }

    // Render filtered cards
    filtered.forEach(mcq => {
      const absoluteIndex = mcqs.findIndex(m => m.id === mcq.id) + 1;
      const isCovered = coveredList.includes(mcq.id);
      const isBookmarked = bookmarkedList.includes(mcq.id);
      const isCheckpoint = activeCheckpoint === mcq.id;

      const att = attempts[mcq.id] || { wrongOptions: [], isCorrect: false };
      const isRevealed = state.showAllAnswers || revealedList.includes(mcq.id);

      const userSubjectComments = (state.comments && state.comments[state.activeSubject]) || {};
      const existingComment = userSubjectComments[mcq.id] || "";
      const hasComment = Boolean(existingComment && existingComment.trim());

      const card = document.createElement("article");
      card.className = `fact-card ${isCheckpoint ? 'is-checkpoint' : ''}`;
      card.id = `fact-card-${mcq.id}`;

      // Build Option Buttons HTML
      const optionsHTML = mcq.options.map((optText, idx) => {
        const letter = String.fromCharCode(65 + idx);
        let stateClass = "";
        let badgeHTML = "";

        if (isRevealed && idx === mcq.answerIndex) {
          stateClass = "state-correct";
          badgeHTML = `<span class="mcq-opt-badge">✓ Answer</span>`;
        }

        return `
          <button class="mcq-option-btn ${stateClass}" data-id="${mcq.id}" data-index="${idx}">
            <span class="mcq-opt-letter">${letter}</span>
            <span class="mcq-opt-text">${optText}</span>
            ${badgeHTML}
          </button>
        `;
      }).join("");
      //google play icon
      card.innerHTML = ` 
        <div class="fact-header">
        <a style="text-decoration: none;" class="fact-num" href="https://share.google/MWDnunmxWZwzvFXqe">MCQ #${absoluteIndex}</a>
          
          <span class="fact-category">${mcq.category || 'General'}</span>
        </div>
        <h3 class="fact-question">${mcq.question}</h3>
        
        <div class="mcq-options-list">
          ${optionsHTML}
        </div>

        <div class="fact-explanation-box" style="display: ${isRevealed ? 'block' : 'none'}">
          <strong>Key Concept / Answer:</strong> Option ${String.fromCharCode(65 + mcq.answerIndex)}: ${mcq.options[mcq.answerIndex]}<br>
          <span style="opacity: 0.9;">${formatExplanation(mcq.explanation)}</span>
        </div>

        <div class="fact-comments-box" id="fact-comments-${mcq.id}" style="display: none;">
          <div class="comment-header">
            <div class="comment-title">
              <span>your Notes</span>
            </div>
            <div class="comment-save-status status-idle" id="comment-status-${mcq.id}">
<span>Auto-saves</span>
            </div>
          </div>
          <textarea class="mcq-comment-textarea" data-id="${mcq.id}" placeholder="Write personal notes, key concepts, or memory tricks for MCQ #${absoluteIndex}...">${existingComment}</textarea>
        </div>

        <div class="fact-actions">
          <div class="action-left">
            <button class="card-action-btn btn-cover" data-id="${mcq.id}" data-covered="${isCovered}">
              <span>${isCovered ? 'Covered' : 'Covered'}</span>
            </button>
            
            <button class="card-action-btn btn-bookmark" data-id="${mcq.id}" data-bookmarked="${isBookmarked}" title="Add to Revision Bookmarks">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            </button>

            <button class="card-action-btn btn-checkpoint" data-id="${mcq.id}" data-checkpoint="${isCheckpoint}" title="Pin Study Checkpoint">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </button>

            <button class="card-action-btn btn-google-search" data-id="${mcq.id}" title="Search Google in Popup Window with Full Prompt">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
            </button>

            <button class="card-action-btn btn-copy-mcq" data-id="${mcq.id}" title="Copy Question, Options & Correct Answer (✔)">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>

            <button class="card-action-btn btn-comment-mcq ${hasComment ? 'has-comment' : ''}" data-id="${mcq.id}" title="${hasComment ? 'View / Edit Personal Note' : 'Add Personal Note / Comment'}">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </button>
          </div>

          <div class="action-right">
            <button class="card-action-btn btn-toggle-answer" data-id="${mcq.id}">
              ${isRevealed ? `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" y1="2" x2="22" y2="22"></line></svg>
              ` : `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              `}
            </button>
          </div>
        </div>
      `;

      const googleBtn = card.querySelector(".btn-google-search");
      if (googleBtn) {
        googleBtn.addEventListener("click", () => {
          const prompt = generateFormattedPrompt(mcq, state.activeSubject || "Computer Science");
          openMiniPopupWindow(`https://www.google.com/search?q=${encodeURIComponent(prompt)}`, "GoogleSearchWindow");
        });
      }

      const copyMcqBtn = card.querySelector(".btn-copy-mcq");
      if (copyMcqBtn) {
        copyMcqBtn.addEventListener("click", () => {
          const copyText = generateCopyableMCQText(mcq);
          navigator.clipboard.writeText(copyText).then(() => {
            const origHTML = copyMcqBtn.innerHTML;
            copyMcqBtn.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34D399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            `;
            setTimeout(() => { copyMcqBtn.innerHTML = origHTML; }, 2000);
          }).catch(err => {
            alert("Copy failed: " + err);
          });
        });
      }

      // Comments Mini Text Editor & Auto-Save Logic
      const commentBtn = card.querySelector(".btn-comment-mcq");
      const commentsBox = card.querySelector(".fact-comments-box");
      const commentTextarea = card.querySelector(".mcq-comment-textarea");
      const commentStatus = card.querySelector(`#comment-status-${mcq.id}`);
      let autoSaveTimer = null;

      if (commentBtn && commentsBox) {
        commentBtn.addEventListener("click", () => {
          const isHidden = commentsBox.style.display === "none";
          commentsBox.style.display = isHidden ? "flex" : "none";
          if (isHidden && commentTextarea) {
            commentTextarea.focus();
          }
        });
      }

      if (commentTextarea) {
        const saveComment = () => {
          const val = commentTextarea.value;
          if (!state.comments) state.comments = {};
          if (!state.comments[state.activeSubject]) {
            state.comments[state.activeSubject] = {};
          }

          if (val.trim() === "") {
            delete state.comments[state.activeSubject][mcq.id];
          } else {
            state.comments[state.activeSubject][mcq.id] = val;
          }

          saveState();

          const hasNoteNow = Boolean(val && val.trim());
          if (commentBtn) {
            if (hasNoteNow) {
              commentBtn.classList.add("has-comment");
              if (!commentBtn.querySelector(".comment-dot-badge")) {
                commentBtn.insertAdjacentHTML("beforeend", ` `);
              }
            } else {
              commentBtn.classList.remove("has-comment");
              const dot = commentBtn.querySelector(".comment-dot-badge");
              if (dot) dot.remove();
            }
          }

          if (commentStatus) {
            commentStatus.className = "comment-save-status status-saved";
            commentStatus.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span>Saved</span>
            `;
            setTimeout(() => {
              if (commentStatus.classList.contains("status-saved")) {
                commentStatus.className = "comment-save-status status-idle";
                commentStatus.innerHTML = `
<span>Auto-saves</span>
                `;
              }
            }, 2000);
          }
        };

        commentTextarea.addEventListener("input", () => {
          if (commentStatus) {
            commentStatus.className = "comment-save-status status-saving";
            commentStatus.innerHTML = `
              <svg class="spin-icon" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
            `;
          }
          clearTimeout(autoSaveTimer);
          autoSaveTimer = setTimeout(saveComment, 400);
        });

        commentTextarea.addEventListener("blur", () => {
          clearTimeout(autoSaveTimer);
          saveComment();
        });
      }

      // Option Click Handler (Instant feedback, auto-mark covered if correct, auto-reset back to normal in 2.5s)
      const optBtns = card.querySelectorAll(".mcq-option-btn");
      optBtns.forEach(btn => {
        btn.addEventListener("click", () => {
          const selectedIdx = parseInt(btn.getAttribute("data-index"), 10);
          const isCorrect = selectedIdx === mcq.answerIndex;

          // Lock option buttons temporarily during feedback display
          optBtns.forEach(b => b.disabled = true);

          if (!state.attempts[state.activeSubject]) {
            state.attempts[state.activeSubject] = {};
          }
          let currentAtt = state.attempts[state.activeSubject][mcq.id] || { wrongOptions: [], isCorrect: false };

          if (isCorrect) {
            currentAtt.isCorrect = true;
            btn.classList.add("state-correct");
            if (!btn.querySelector(".mcq-opt-badge")) {
              btn.insertAdjacentHTML("beforeend", `<span class="mcq-opt-badge">✓ Correct</span>`);
            }

            // Auto-mark as covered on correct answer
            let covered = state.covered[state.activeSubject] || [];
            if (!covered.includes(mcq.id)) {
              covered.push(mcq.id);
              state.covered[state.activeSubject] = covered;
              saveState();
              const coverBtn = card.querySelector(".btn-cover");
              if (coverBtn) {
                coverBtn.setAttribute("data-covered", "true");
                coverBtn.querySelector("span").textContent = "Covered";
              }
            }
          } else {
            if (!currentAtt.wrongOptions.includes(selectedIdx)) {
              currentAtt.wrongOptions.push(selectedIdx);
            }
            btn.classList.add("state-wrong");
            if (!btn.querySelector(".mcq-opt-badge")) {
              btn.insertAdjacentHTML("beforeend", `<span class="mcq-opt-badge">✕ Wrong</span>`);
            }
          }

          state.attempts[state.activeSubject][mcq.id] = currentAtt;
          saveState();
          updateProgressUI();

          // Auto reset option styles back to normal after 2.5 seconds for fresh re-attempting
          setTimeout(() => {
            btn.classList.remove("state-correct", "state-wrong");
            const badge = btn.querySelector(".mcq-opt-badge");
            if (badge) badge.remove();
            optBtns.forEach(b => b.disabled = false);
          }, 2500);
        });
      });

      // Show/Hide Answer Toggle
      const toggleAnswerBtn = card.querySelector(".btn-toggle-answer");
      const explanationBox = card.querySelector(".fact-explanation-box");
      toggleAnswerBtn.addEventListener("click", () => {
        let rev = state.revealedAnswers[state.activeSubject] || [];
        const isCurrentlyRevealed = rev.includes(mcq.id);

        if (isCurrentlyRevealed) {
          rev = rev.filter(id => id !== mcq.id);
          explanationBox.style.display = "none";
          //eye opener svg
          toggleAnswerBtn.innerHTML = ` 
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          `;
        } else {
          rev.push(mcq.id);
          explanationBox.style.display = "block";
          toggleAnswerBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" y1="2" x2="22" y2="22"></line></svg>
          `;

          // Also highlight correct answer button if not yet solved
          const correctBtn = card.querySelector(`.mcq-option-btn[data-index="${mcq.answerIndex}"]`);
          if (correctBtn && !correctBtn.classList.contains("state-correct")) {
            correctBtn.classList.add("state-correct");
            if (!correctBtn.querySelector(".mcq-opt-badge")) {
              correctBtn.insertAdjacentHTML("beforeend", `<span class="mcq-opt-badge">✓</span>`);
            }
          }
        }

        state.revealedAnswers[state.activeSubject] = rev;
        saveState();
      });

      // Mark Covered Manual Toggle
      const coverBtn = card.querySelector(".btn-cover");
      coverBtn.addEventListener("click", () => {
        let covered = state.covered[state.activeSubject] || [];
        if (covered.includes(mcq.id)) {
          covered = covered.filter(id => id !== mcq.id);
          coverBtn.setAttribute("data-covered", "false");
          coverBtn.querySelector("span").textContent = "Covered";
        } else {
          covered.push(mcq.id);
          coverBtn.setAttribute("data-covered", "true");
          coverBtn.querySelector("span").textContent = "Covered";
        }
        state.covered[state.activeSubject] = covered;
        saveState();
        updateProgressUI();
      });

      // Toggle Bookmark
      const bookmarkBtn = card.querySelector(".btn-bookmark");
      bookmarkBtn.addEventListener("click", () => {
        let bookmarks = state.bookmarks[state.activeSubject] || [];
        if (bookmarks.includes(mcq.id)) {
          bookmarks = bookmarks.filter(id => id !== mcq.id);
          bookmarkBtn.setAttribute("data-bookmarked", "false");
        } else {
          bookmarks.push(mcq.id);
          bookmarkBtn.setAttribute("data-bookmarked", "true");
        }
        state.bookmarks[state.activeSubject] = bookmarks;
        saveState();
        updateProgressUI();
      });

      // Toggle Checkpoint
      const checkpointBtn = card.querySelector(".btn-checkpoint");
      checkpointBtn.addEventListener("click", () => {
        const currentCheckpoint = state.checkpoints[state.activeSubject];
        state.checkpoints[state.activeSubject] = (currentCheckpoint === mcq.id) ? null : mcq.id;
        saveState();
        updateProgressUI();
        renderFactsList();
      });

      factsListContainer.appendChild(card);
    });
  }

  // --- QUIZ TEST ENGINE ---
  let selectedQuizPool = "all"; // "all" | "bookmarks" | "uncovered" | "mistakes"
  let selectedQuizCount = 10;
  let lastAttemptedQuizId = null;

  const quizOptionsWrapper = document.getElementById("quizOptionsWrapper");
  const quizPoolSelector = document.getElementById("quizPoolSelector");
  const quizCountSelector = document.getElementById("quizCountSelector");

  function getDynamicCountSteps(N) {
    if (N <= 0) return [];
    if (N === 1) return [{ label: "All", value: "ALL" }];
    if (N <= 4) {
      const steps = [];
      for (let i = 1; i < N; i++) {
        steps.push({ label: `${i}`, value: i });
      }
      steps.push({ label: "All", value: "ALL" });
      return steps;
    }
    if (N <= 10) {
      const s1 = Math.max(1, Math.round(N * 0.3));
      const s2 = Math.min(N - 1, Math.max(s1 + 1, Math.round(N * 0.7)));
      const steps = [
        { label: `${s1}`, value: s1 },
        { label: `${s2}`, value: s2 },
        { label: "All", value: "ALL" }
      ];
      return steps;
    }
    if (N <= 25) {
      const s1 = Math.round(N * 0.25);
      const s2 = Math.round(N * 0.50);
      const s3 = Math.round(N * 0.75);
      const raw = Array.from(new Set([s1, s2, s3])).filter(v => v > 0 && v < N);
      const steps = raw.map(v => ({ label: `${v}`, value: v }));
      steps.push({ label: "All", value: "ALL" });
      return steps;
    }
    if (N <= 60) {
      const raw = Array.from(new Set([10, 20, 35])).filter(v => v < N);
      const steps = raw.map(v => ({ label: `${v}`, value: v }));
      steps.push({ label: "All", value: "ALL" });
      return steps;
    }
    const raw = Array.from(new Set([10, 25, 50, 100])).filter(v => v < N);
    const steps = raw.map(v => ({ label: `${v}`, value: v }));
    steps.push({ label: "All", value: "ALL" });
    return steps;
  }

  function renderCountChips(availableCount) {
    if (!quizCountSelector) return;
    quizCountSelector.innerHTML = "";

    const steps = getDynamicCountSteps(availableCount);
    if (steps.length === 0) return;

    // Pick first step or "ALL" as default selectedQuizCount
    selectedQuizCount = steps[0].value;

    steps.forEach((step, idx) => {
      const chip = document.createElement("button");
      chip.className = `count-chip ${idx === 0 ? 'active' : ''}`;
      chip.setAttribute("data-count", step.value);
      chip.textContent = step.label;

      chip.addEventListener("click", () => {
        const allChips = quizCountSelector.querySelectorAll(".count-chip");
        allChips.forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        selectedQuizCount = step.value;
      });

      quizCountSelector.appendChild(chip);
    });
  }

  function updateQuizOptionsForSelectedTopic() {
    const topicVal = quizTopicSelect ? quizTopicSelect.value : "";
    if (!topicVal) {
      if (quizOptionsWrapper) quizOptionsWrapper.style.display = "none";
      return;
    }

    const allMCQs = getActiveSubjectMCQs();
    const topicMCQs = topicVal === "ALL" ? allMCQs : allMCQs.filter(m => m.category === topicVal);

    if (topicMCQs.length === 0) {
      if (quizOptionsWrapper) quizOptionsWrapper.style.display = "none";
      return;
    }

    // Reveal options wrapper
    if (quizOptionsWrapper) {
      quizOptionsWrapper.style.display = "flex";
    }

    // Calculate pool counts for selected topic
    const coveredList = state.covered[state.activeSubject] || [];
    const bookmarkedList = state.bookmarks[state.activeSubject] || [];
    const attempts = state.attempts[state.activeSubject] || {};

    const allCount = topicMCQs.length;
    const bmCount = topicMCQs.filter(m => bookmarkedList.includes(m.id)).length;
    const uncCount = topicMCQs.filter(m => !coveredList.includes(m.id)).length;
    const mistCount = topicMCQs.filter(m => {
      const att = attempts[m.id];
      return att && !att.isCorrect && att.wrongOptions && att.wrongOptions.length > 0;
    }).length;

    // Define pool objects with SVG icons and filter only those with count > 0
    const poolDefs = [
      {
        id: "all",
        label: `All`,
        iconSVG: ``,
        count: allCount
      },
      {
        id: "bookmarks",
        label: `(${bmCount})`,
        iconSVG: `<svg class="chip-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`,
        count: bmCount
      },
      {
        id: "uncovered",
        label: `Uncovered (${uncCount})`,
        iconSVG: ``,
        count: uncCount
      },
      {
        id: "mistakes",
        label: `Mistakes (${mistCount})`,
        iconSVG: ``,
        count: mistCount
      }
    ].filter(p => p.count > 0);

    // If current selectedQuizPool is not among available pools, pick the first pool
    const activePoolExists = poolDefs.some(p => p.id === selectedQuizPool);
    if (!activePoolExists && poolDefs.length > 0) {
      selectedQuizPool = poolDefs[0].id;
    }

    // Render Pool Chips
    if (quizPoolSelector) {
      quizPoolSelector.innerHTML = "";
      poolDefs.forEach(pool => {
        const chip = document.createElement("button");
        const isActive = pool.id === selectedQuizPool;
        chip.className = `pool-chip ${isActive ? 'active' : ''}`;
        chip.setAttribute("data-pool", pool.id);
        chip.setAttribute("title", pool.id === "bookmarks" ? `Bookmarks (${pool.count})` : pool.label);
        chip.innerHTML = `${pool.iconSVG}<span>${pool.label}</span>`;

        chip.addEventListener("click", () => {
          const allPoolChips = quizPoolSelector.querySelectorAll(".pool-chip");
          allPoolChips.forEach(c => c.classList.remove("active"));
          chip.classList.add("active");
          selectedQuizPool = pool.id;
          renderCountChips(pool.count);
        });

        quizPoolSelector.appendChild(chip);
      });
    }

    // Render Count Chips for active pool
    const activePoolDef = poolDefs.find(p => p.id === selectedQuizPool) || poolDefs[0];
    if (activePoolDef) {
      renderCountChips(activePoolDef.count);
    }
  }

  let activeQuizTab = "single"; // "single" | "mock"
  let selectedMockTimerSeconds = 2700; // default 45 mins

  // Setup Tab Switchers
  if (tabSingleSubjectQuiz && tabMultiSubjectMock) {
    tabSingleSubjectQuiz.addEventListener("click", () => {
      activeQuizTab = "single";
      tabSingleSubjectQuiz.classList.add("active");
      tabMultiSubjectMock.classList.remove("active");
      if (singleSubjectPanel) singleSubjectPanel.style.display = "block";
      if (multiSubjectMockPanel) multiSubjectMockPanel.style.display = "none";
    });

    tabMultiSubjectMock.addEventListener("click", () => {
      activeQuizTab = "mock";
      tabMultiSubjectMock.classList.add("active");
      tabSingleSubjectQuiz.classList.remove("active");
      if (singleSubjectPanel) singleSubjectPanel.style.display = "none";
      if (multiSubjectMockPanel) multiSubjectMockPanel.style.display = "flex";
      renderSubjectDistList();
    });
  }

  function renderSubjectDistList() {
    if (!subjectDistContainer) return;
    subjectDistContainer.innerHTML = "";

    const subjects = getAllSubjects();
    subjects.forEach(subj => {
      let totalAvailable = 0;
      if (state.customSubjects[subj]) totalAvailable = state.customSubjects[subj].length;
      else if (window.factsData && window.factsData[subj]) totalAvailable = window.factsData[subj].length;

      const row = document.createElement("div");
      row.className = "subject-dist-row";

      const defaultCount = Math.min(10, totalAvailable);

      row.innerHTML = `
        <div class="subject-dist-info">
          <input type="checkbox" class="subject-dist-checkbox" data-subj="${subj}" checked>
          <div>
            <div class="subject-dist-label">${subj}</div>
            <div class="subject-dist-max">${totalAvailable} MCQs available</div>
          </div>
        </div>
        <div class="subject-dist-controls">
          <button class="dist-quick-btn" data-subj="${subj}" data-add="5">+5</button>
          <button class="dist-quick-btn" data-subj="${subj}" data-add="10">+10</button>
          <button class="dist-quick-btn" data-subj="${subj}" data-add="20">+20</button>
          <input type="number" class="dist-count-input" data-subj="${subj}" min="0" max="${totalAvailable}" value="${defaultCount}">
        </div>
      `;

      const cb = row.querySelector(".subject-dist-checkbox");
      const numInput = row.querySelector(".dist-count-input");

      cb.addEventListener("change", () => {
        if (!cb.checked) numInput.value = 0;
        else numInput.value = Math.min(10, totalAvailable);
        updateMockTotalCounter();
      });

      numInput.addEventListener("input", () => {
        let val = parseInt(numInput.value, 10) || 0;
        if (val < 0) val = 0;
        if (val > totalAvailable) val = totalAvailable;
        numInput.value = val;
        cb.checked = val > 0;
        updateMockTotalCounter();
      });

      row.querySelectorAll(".dist-quick-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const addVal = parseInt(btn.getAttribute("data-add"), 10);
          let curr = parseInt(numInput.value, 10) || 0;
          let newCount = Math.min(curr + addVal, totalAvailable);
          numInput.value = newCount;
          cb.checked = newCount > 0;
          updateMockTotalCounter();
        });
      });

      subjectDistContainer.appendChild(row);
    });

    updateMockTotalCounter();
  }

  function updateMockTotalCounter() {
    if (!mockTotalCounter) return;
    let total = 0;
    const inputs = document.querySelectorAll(".dist-count-input");
    const checkboxes = document.querySelectorAll(".subject-dist-checkbox");

    inputs.forEach((inp, i) => {
      if (checkboxes[i] && checkboxes[i].checked) {
        total += parseInt(inp.value, 10) || 0;
      }
    });

    mockTotalCounter.textContent = `Total: ${total} MCQs`;
  }

  if (presetFullMockBtn) {
    presetFullMockBtn.addEventListener("click", () => {
      setMockPreset(20, 5400);
    });
  }

  if (presetMiniMockBtn) {
    presetMiniMockBtn.addEventListener("click", () => {
      setMockPreset(10, 2700);
    });
  }

  function setMockPreset(countPerSubj, durationSecs) {
    const rows = document.querySelectorAll(".subject-dist-row");
    rows.forEach(row => {
      const cb = row.querySelector(".subject-dist-checkbox");
      const numInput = row.querySelector(".dist-count-input");
      const maxAvailable = parseInt(numInput.getAttribute("max"), 10) || 0;
      const count = Math.min(countPerSubj, maxAvailable);
      numInput.value = count;
      cb.checked = count > 0;
    });

    updateMockTotalCounter();
    setTimerDuration(durationSecs);
  }

  function setTimerDuration(durationSecs) {
    selectedMockTimerSeconds = durationSecs;
    if (mockTimerSelector) {
      mockTimerSelector.querySelectorAll(".timer-chip").forEach(chip => {
        const secs = parseInt(chip.getAttribute("data-seconds"), 10);
        if (secs === durationSecs) chip.classList.add("active");
        else chip.classList.remove("active");
      });
    }
  }

  if (mockTimerSelector) {
    mockTimerSelector.querySelectorAll(".timer-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        const secs = parseInt(chip.getAttribute("data-seconds"), 10);
        setTimerDuration(secs);
      });
    });
  }

  if (startMockExamBtn) {
    startMockExamBtn.addEventListener("click", () => {
      let sampledQuestions = [];

      const rows = document.querySelectorAll(".subject-dist-row");
      rows.forEach(row => {
        const cb = row.querySelector(".subject-dist-checkbox");
        const numInput = row.querySelector(".dist-count-input");
        const subjName = numInput.getAttribute("data-subj");

        if (cb && cb.checked) {
          const reqCount = parseInt(numInput.value, 10) || 0;
          if (reqCount > 0) {
            let subjMCQs = [];
            if (state.customSubjects[subjName]) subjMCQs = [...state.customSubjects[subjName]];
            else if (window.factsData && window.factsData[subjName]) subjMCQs = [...window.factsData[subjName]];

            subjMCQs = subjMCQs.sort(() => Math.random() - 0.5);
            const picked = subjMCQs.slice(0, reqCount).map(m => ({
              ...m,
              subject: subjName
            }));
            sampledQuestions.push(...picked);
          }
        }
      });

      if (sampledQuestions.length === 0) {
        alert("Please select at least 1 MCQ across any subject to launch the Mock Exam!");
        return;
      }

      sampledQuestions = sampledQuestions.sort(() => Math.random() - 0.5);

      const isCountdown = selectedMockTimerSeconds > 0;
      let timerVal = isCountdown ? selectedMockTimerSeconds : 0;

      if (quizSession && quizSession.timerInterval) {
        clearInterval(quizSession.timerInterval);
      }

      quizSession = {
        active: true,
        isMockExam: true,
        questions: sampledQuestions,
        currentIndex: 0,
        userAnswers: {},
        checked: {},
        timerMode: isCountdown ? "countdown" : "stopwatch",
        timerSeconds: timerVal,
        countdownDuration: selectedMockTimerSeconds,
        timerInterval: setInterval(() => {
          if (quizSession.timerMode === "countdown") {
            quizSession.timerSeconds--;

            const mins = String(Math.floor(Math.max(0, quizSession.timerSeconds) / 60)).padStart(2, '0');
            const secs = String(Math.max(0, quizSession.timerSeconds) % 60).padStart(2, '0');
            quizTimer.textContent = `Time: ${mins}:${secs}`;

            if (quizSession.timerSeconds <= 300 && quizSession.timerSeconds > 0) {
              quizTimer.classList.add("warning-pulse");
            } else {
              quizTimer.classList.remove("warning-pulse");
            }

            if (quizSession.timerSeconds <= 0) {
              clearInterval(quizSession.timerInterval);
              alert("⏰ Time is up! Submitting your Mock Exam now.");
              finishQuizTest();
            }
          } else {
            quizSession.timerSeconds++;
            const mins = String(Math.floor(quizSession.timerSeconds / 60)).padStart(2, '0');
            const secs = String(quizSession.timerSeconds % 60).padStart(2, '0');
            quizTimer.textContent = `Time: ${mins}:${secs}`;
          }
        }, 1000)
      };

      quizTimer.classList.remove("warning-pulse");
      quizSetupCard.style.display = "none";
      const quizHistoryCard = document.getElementById("quizHistoryCard");
      if (quizHistoryCard) quizHistoryCard.style.display = "none";
      quizActiveCard.style.display = "flex";
      renderActiveQuizQuestion();
    });
  }

  function initQuizSetup() {
    const quizHistoryCard = document.getElementById("quizHistoryCard");
    quizSetupCard.style.display = "flex";
    if (quizHistoryCard) quizHistoryCard.style.display = "flex";
    quizActiveCard.style.display = "none";

    // Dynamically populate quizTopicSelect with visual coverage styling
    if (quizTopicSelect) {
      quizTopicSelect.innerHTML = "";
      const allMCQs = getActiveSubjectMCQs();
      const topics = getAvailableTopics();

      // Placeholder prompt option
      const promptOpt = document.createElement("option");
      promptOpt.value = "";
      promptOpt.disabled = true;
      promptOpt.selected = true;
      promptOpt.textContent = "-- Select Category / Topic --";
      quizTopicSelect.appendChild(promptOpt);

      // ALL Option
      const allOpt = document.createElement("option");
      allOpt.value = "ALL";
      allOpt.textContent = `All Topics (${allMCQs.length} MCQs)`;
      if (isTopicCovered("ALL")) {
        allOpt.className = "is-topic-covered";
        allOpt.style.backgroundColor = "rgba(16, 185, 129, 0.18)";
        allOpt.style.color = "#34D399";
        allOpt.style.fontWeight = "600";
      }
      quizTopicSelect.appendChild(allOpt);

      // Topic Options
      topics.forEach(topic => {
        const topicCount = allMCQs.filter(m => m.category === topic).length;
        const opt = document.createElement("option");
        opt.value = topic;
        opt.textContent = `${topic} (${topicCount} MCQs)`;
        if (isTopicCovered(topic)) {
          opt.className = "is-topic-covered";
          opt.style.backgroundColor = "rgba(16, 185, 129, 0.18)";
          opt.style.color = "#34D399";
          opt.style.fontWeight = "600";
        }
        quizTopicSelect.appendChild(opt);
      });

      // Add change event listener
      quizTopicSelect.removeEventListener("change", updateQuizOptionsForSelectedTopic);
      quizTopicSelect.addEventListener("change", updateQuizOptionsForSelectedTopic);
    }

    // Hide options wrapper initially until topic is selected
    if (quizOptionsWrapper) {
      quizOptionsWrapper.style.display = "none";
    }

    renderQuizHistoryList();
  }

  startQuizBtn.addEventListener("click", () => {
    const allMCQs = getActiveSubjectMCQs();
    const topicVal = quizTopicSelect ? quizTopicSelect.value : "ALL";

    // 1. Topic Filter
    let filtered = topicVal === "ALL" ? [...allMCQs] : allMCQs.filter(m => m.category === topicVal);

    // 2. Pool Filter (Bookmarks, Uncovered, Mistakes)
    const coveredList = state.covered[state.activeSubject] || [];
    const bookmarkedList = state.bookmarks[state.activeSubject] || [];
    const attempts = state.attempts[state.activeSubject] || {};

    if (selectedQuizPool === "bookmarks") {
      filtered = filtered.filter(m => bookmarkedList.includes(m.id));
    } else if (selectedQuizPool === "uncovered") {
      filtered = filtered.filter(m => !coveredList.includes(m.id));
    } else if (selectedQuizPool === "mistakes") {
      filtered = filtered.filter(m => {
        const att = attempts[m.id];
        return att && !att.isCorrect && att.wrongOptions && att.wrongOptions.length > 0;
      });
    }

    if (filtered.length === 0) {
      alert(`No MCQs found matching topic "${topicVal}" and pool "${selectedQuizPool}". Try selecting another option!`);
      return;
    }

    filtered = filtered.sort(() => Math.random() - 0.5);

    if (selectedQuizCount !== "ALL") {
      const limit = parseInt(selectedQuizCount, 10);
      filtered = filtered.slice(0, limit);
    }

    quizSession = {
      active: true,
      questions: filtered,
      currentIndex: 0,
      userAnswers: {},
      checked: {},
      timerSeconds: 0,
      timerInterval: setInterval(() => {
        quizSession.timerSeconds++;
        const mins = String(Math.floor(quizSession.timerSeconds / 60)).padStart(2, '0');
        const secs = String(quizSession.timerSeconds % 60).padStart(2, '0');
        quizTimer.textContent = `Time: ${mins}:${secs}`;
      }, 1000)
    };

    quizSetupCard.style.display = "none";
    const quizHistoryCard = document.getElementById("quizHistoryCard");
    if (quizHistoryCard) quizHistoryCard.style.display = "none";
    quizActiveCard.style.display = "flex";
    renderActiveQuizQuestion();
  });

  function renderActiveQuizQuestion() {
    const q = quizSession.questions[quizSession.currentIndex];
    const total = quizSession.questions.length;

    quizQuestionCounter.textContent = `Question ${quizSession.currentIndex + 1} of ${total}`;
    quizProgressFill.style.width = `${((quizSession.currentIndex + 1) / total) * 100}%`;

    if (quizQuestionSubject) {
      if (q.subject || quizSession.isMockExam) {
        quizQuestionSubject.style.display = "inline-block";
        quizQuestionSubject.textContent = q.subject || state.activeSubject;
      } else {
        quizQuestionSubject.style.display = "none";
      }
    }

    quizQuestionCategory.textContent = q.category || "General";
    quizQuestionStatement.textContent = q.question;

    const selectedIdx = quizSession.userAnswers[q.id];
    const isChecked = quizSession.checked[q.id];

    quizOptionsGrid.innerHTML = "";
    q.options.forEach((optText, idx) => {
      const letter = String.fromCharCode(65 + idx);
      const btn = document.createElement("button");
      btn.className = "mcq-option-btn";

      if (isChecked) {
        if (idx === q.answerIndex) {
          btn.classList.add("state-correct");
        } else if (idx === selectedIdx) {
          btn.classList.add("state-wrong");
        }
      } else if (idx === selectedIdx) {
        btn.style.borderColor = "var(--accent-color)";
        btn.style.backgroundColor = "var(--option-hover)";
      }

      btn.innerHTML = `
        <span class="mcq-opt-letter">${letter}</span>
        <span class="mcq-opt-text">${optText}</span>
      `;

      btn.addEventListener("click", () => {
        if (isChecked) return;
        quizSession.userAnswers[q.id] = idx;
        quizCheckBtn.disabled = false;
        renderActiveQuizQuestion();
      });

      quizOptionsGrid.appendChild(btn);
    });

    if (isChecked) {
      quizExplanationBox.style.display = "block";
      quizExplanationBox.innerHTML = `
        <strong>Explanation:</strong> Option ${String.fromCharCode(65 + q.answerIndex)}: ${q.options[q.answerIndex]}<br>
        <span style="opacity: 0.9;">${formatExplanation(q.explanation)}</span>
      `;
    } else {
      quizExplanationBox.style.display = "none";
    }

    quizPrevBtn.disabled = quizSession.currentIndex === 0;
    quizCheckBtn.disabled = selectedIdx === undefined || isChecked;

    if (isChecked) {
      quizCheckBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" y1="2" x2="22" y2="22"></line></svg>`;
      quizCheckBtn.setAttribute("title", "Answer Checked");
      quizCheckBtn.setAttribute("aria-label", "Answer Checked");
    } else {
      quizCheckBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
      quizCheckBtn.setAttribute("title", "Check Answer");
      quizCheckBtn.setAttribute("aria-label", "Check Answer");
    }

    if (quizSession.currentIndex === total - 1) {
      quizNextBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
      quizNextBtn.setAttribute("title", "Finish & Submit Test");
      quizNextBtn.setAttribute("aria-label", "Finish & Submit Test");
    } else {
      quizNextBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
      quizNextBtn.setAttribute("title", "Next Question");
      quizNextBtn.setAttribute("aria-label", "Next Question");
    }
  }

  quizPrevBtn.addEventListener("click", () => {
    if (quizSession.currentIndex > 0) {
      quizSession.currentIndex--;
      renderActiveQuizQuestion();
    }
  });

  quizCheckBtn.addEventListener("click", () => {
    const q = quizSession.questions[quizSession.currentIndex];
    quizSession.checked[q.id] = true;

    const selectedIdx = quizSession.userAnswers[q.id];
    const isCorrect = selectedIdx === q.answerIndex;
    if (!state.attempts[state.activeSubject]) state.attempts[state.activeSubject] = {};

    let att = state.attempts[state.activeSubject][q.id] || { wrongOptions: [], isCorrect: false };
    if (isCorrect) att.isCorrect = true;
    else if (!att.wrongOptions.includes(selectedIdx)) att.wrongOptions.push(selectedIdx);

    state.attempts[state.activeSubject][q.id] = att;

    saveState();
    updateProgressUI();
    renderActiveQuizQuestion();
  });

  quizNextBtn.addEventListener("click", () => {
    const total = quizSession.questions.length;
    if (quizSession.currentIndex < total - 1) {
      quizSession.currentIndex++;
      renderActiveQuizQuestion();
    } else {
      finishQuizTest();
    }
  });

  function finishQuizTest() {
    clearInterval(quizSession.timerInterval);
    quizTimer.classList.remove("warning-pulse");

    let correct = 0;
    let subjectBreakdown = {};

    quizSession.questions.forEach(q => {
      const qSubj = q.subject || state.activeSubject;
      if (!state.covered[qSubj]) state.covered[qSubj] = [];
      if (!state.attempts[qSubj]) state.attempts[qSubj] = {};

      if (!subjectBreakdown[qSubj]) subjectBreakdown[qSubj] = { total: 0, correct: 0 };
      subjectBreakdown[qSubj].total++;

      const sel = quizSession.userAnswers[q.id];
      const isCorrect = sel === q.answerIndex;
      let att = state.attempts[qSubj][q.id] || { wrongOptions: [], isCorrect: false };

      if (isCorrect) {
        correct++;
        subjectBreakdown[qSubj].correct++;
        att.isCorrect = true;
        if (!state.covered[qSubj].includes(q.id)) {
          state.covered[qSubj].push(q.id);
        }
      } else if (sel !== undefined && sel !== null) {
        if (!att.wrongOptions.includes(sel)) {
          att.wrongOptions.push(sel);
        }
      }
      state.attempts[qSubj][q.id] = att;
    });

    const total = quizSession.questions.length;
    const wrong = total - correct;
    const percent = Math.round((correct / total) * 100);

    let elapsedSecs = quizSession.timerSeconds;
    if (quizSession.timerMode === "countdown") {
      elapsedSecs = Math.max(0, (quizSession.countdownDuration || selectedMockTimerSeconds) - quizSession.timerSeconds);
    }
    const mins = String(Math.floor(elapsedSecs / 60)).padStart(2, '0');
    const secs = String(elapsedSecs % 60).padStart(2, '0');

    if (!state.quizStats) state.quizStats = {};
    const primarySubj = quizSession.isMockExam ? "Multi-Subject Mock Exam" : state.activeSubject;
    const subStats = state.quizStats[primarySubj] || { totalAttempted: 0, totalCorrect: 0 };
    subStats.totalAttempted += total;
    subStats.totalCorrect += correct;
    state.quizStats[primarySubj] = subStats;

    if (!state.quizHistory) state.quizHistory = [];
    const historyItem = {
      id: "qhist_" + Date.now(),
      timestamp: new Date().toISOString(),
      dateFormatted: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      subject: primarySubj,
      category: quizSession.isMockExam ? "Custom Mock Exam" : (quizTopicSelect ? quizTopicSelect.value : "ALL"),
      poolFilter: quizSession.isMockExam ? "MULTI-SUBJECT" : selectedQuizPool,
      totalQuestions: total,
      correctCount: correct,
      wrongCount: wrong,
      scorePercent: percent,
      timeSpentSeconds: elapsedSecs,
      timeSpentFormatted: `${mins}:${secs}`,
      isMockExam: !!quizSession.isMockExam,
      subjectBreakdown: subjectBreakdown,
      questions: quizSession.questions.map(q => ({
        id: q.id,
        question: q.question,
        category: q.category || "General",
        subject: q.subject || state.activeSubject,
        userAnswer: quizSession.userAnswers[q.id],
        correctAnswer: q.answerIndex,
        isCorrect: quizSession.userAnswers[q.id] === q.answerIndex,
        options: q.options,
        explanation: q.explanation || ""
      }))
    };

    state.quizHistory.unshift(historyItem);
    lastAttemptedQuizId = historyItem.id;
    saveState();
    updateProgressUI();
    renderTopicPills();

    modalScorePercent.textContent = `${percent}%`;
    modalScoreFraction.textContent = `${correct} / ${total} Correct`;
    modalCorrectCount.textContent = correct;
    modalWrongCount.textContent = wrong;
    modalTimeSpent.textContent = `${mins}:${secs}`;

    if (modalSubjectBreakdownBox && modalSubjectBreakdownGrid) {
      const breakKeys = Object.keys(subjectBreakdown);
      if (breakKeys.length > 1 || quizSession.isMockExam) {
        modalSubjectBreakdownBox.style.display = "flex";
        modalSubjectBreakdownGrid.innerHTML = breakKeys.map(sbj => {
          const stats = subjectBreakdown[sbj];
          const pct = Math.round((stats.correct / stats.total) * 100);
          return `
            <div class="subject-score-chip">
              <span class="chip-name">${sbj}:</span>
              <span class="chip-score">${stats.correct}/${stats.total} (${pct}%)</span>
            </div>
          `;
        }).join("");
      } else {
        modalSubjectBreakdownBox.style.display = "none";
      }
    }

    quizResultsModal.style.display = "flex";
  }

  // --- QUIZ ATTEMPT HISTORY LIST & BREAKDOWN MODAL ---
  const quizHistoryList = document.getElementById("quizHistoryList");
  const clearQuizHistoryBtn = document.getElementById("clearQuizHistoryBtn");
  const toggleQuizHistoryVisBtn = document.getElementById("toggleQuizHistoryVisBtn");
  const quizHistoryDetailModal = document.getElementById("quizHistoryDetailModal");
  const historyDetailModalClose = document.getElementById("historyDetailModalClose");
  const historyDetailTitle = document.getElementById("historyDetailTitle");
  const historyDetailModalBody = document.getElementById("historyDetailModalBody");

  function updateQuizHistoryVisibility() {
    if (!quizHistoryList || !toggleQuizHistoryVisBtn) return;
    const isHidden = !!state.hideQuizHistory;

    const eyeOpen = toggleQuizHistoryVisBtn.querySelector(".eye-open-icon");
    const eyeClosed = toggleQuizHistoryVisBtn.querySelector(".eye-closed-icon");

    if (isHidden) {
      quizHistoryList.style.display = "none";
      if (eyeOpen) eyeOpen.style.display = "none";
      if (eyeClosed) eyeClosed.style.display = "block";
      toggleQuizHistoryVisBtn.title = "Show History";
      toggleQuizHistoryVisBtn.setAttribute("aria-label", "Show History");
    } else {
      quizHistoryList.style.display = "flex";
      if (eyeOpen) eyeOpen.style.display = "block";
      if (eyeClosed) eyeClosed.style.display = "none";
      toggleQuizHistoryVisBtn.title = "Hide History";
      toggleQuizHistoryVisBtn.setAttribute("aria-label", "Hide History");
    }
  }

  if (toggleQuizHistoryVisBtn) {
    toggleQuizHistoryVisBtn.addEventListener("click", () => {
      state.hideQuizHistory = !state.hideQuizHistory;
      saveState();
      updateQuizHistoryVisibility();
    });
  }

  function renderQuizHistoryList() {
    if (!quizHistoryList) return;
    quizHistoryList.innerHTML = "";

    const history = (state.quizHistory || []).filter(h => h.subject === state.activeSubject || h.isMockExam);

    if (history.length === 0) {
      quizHistoryList.innerHTML = `
        <div class="empty-history">
          <p>No past quiz attempts yet. Start a quiz test above to track your progress!</p>
        </div>
      `;
      updateQuizHistoryVisibility();
      return;
    }

    history.forEach(item => {
      const card = document.createElement("div");
      card.className = "history-item-card";

      let scoreClass = "score-high";
      if (item.scorePercent < 50) scoreClass = "score-low";
      else if (item.scorePercent < 75) scoreClass = "score-med";

      card.innerHTML = `
        <div class="history-item-main">
          <div class="history-item-left">
            <span class="history-date">${item.dateFormatted}</span>
            <div class="history-tags">
              <span class="history-tag category">${item.category}</span>
              <span class="history-tag pool">${item.poolFilter ? item.poolFilter.toUpperCase() : 'PRACTICE'}</span>
            </div>
          </div>
          <div class="history-item-right">
            <span class="history-score-badge ${scoreClass}">${item.scorePercent}%</span>
          </div>
        </div>
        <div class="history-item-sub">
          <span>${item.correctCount} / ${item.totalQuestions} Correct</span>
          <span>⏱️ ${item.timeSpentFormatted}</span>
          <button class="card-action-btn view-history-btn" data-id="${item.id}">Review Details</button>
        </div>
      `;

      card.querySelector(".view-history-btn").addEventListener("click", () => {
        openHistoryDetailModal(item.id);
      });

      quizHistoryList.appendChild(card);
    });

    updateQuizHistoryVisibility();
  }

  if (clearQuizHistoryBtn) {
    clearQuizHistoryBtn.addEventListener("click", () => {
      if (!confirm("Are you sure you want to clear quiz attempt history?")) return;
      state.quizHistory = (state.quizHistory || []).filter(h => h.subject !== state.activeSubject && !h.isMockExam);
      saveState();
      renderQuizHistoryList();
      renderTopicPills();
    });
  }

  function openHistoryDetailModal(historyId) {
    const historyItem = (state.quizHistory || []).find(h => h.id === historyId);
    if (!historyItem) return;

    historyDetailTitle.textContent = `${historyItem.category} Details (${historyItem.scorePercent}%)`;

    let breakdownHtml = "";
    if (historyItem.subjectBreakdown) {
      const keys = Object.keys(historyItem.subjectBreakdown);
      if (keys.length > 0) {
        breakdownHtml = `
          <div class="subject-breakdown-card" style="margin-bottom: 14px;">
            <span class="breakdown-title">Subject Performance Breakdown</span>
            <div class="breakdown-grid">
              ${keys.map(sbj => {
          const s = historyItem.subjectBreakdown[sbj];
          const pct = Math.round((s.correct / s.total) * 100);
          return `
                  <div class="subject-score-chip">
                    <span class="chip-name">${sbj}:</span>
                    <span class="chip-score">${s.correct}/${s.total} (${pct}%)</span>
                  </div>
                `;
        }).join("")}
            </div>
          </div>
        `;
      }
    }

    historyDetailModalBody.innerHTML = `
      <div class="history-summary-box">
        <div><strong>Score:</strong> ${historyItem.scorePercent}% (${historyItem.correctCount}/${historyItem.totalQuestions})</div>
        <div><strong>Time Taken:</strong> ${historyItem.timeSpentFormatted}</div>
        <div><strong>Date:</strong> ${historyItem.dateFormatted}</div>
      </div>
      ${breakdownHtml}
      <div class="history-questions-breakdown">
        ${historyItem.questions.map((q, idx) => `
          <div class="history-q-card ${q.isCorrect ? 'q-correct' : 'q-wrong'}">
            <div class="history-q-header">
              <span class="history-q-num">Q${idx + 1} (${q.subject ? q.subject + ' • ' : ''}${q.category})</span>
              <span class="history-q-status">${q.isCorrect ? '✓ Correct' : '✕ Incorrect'}</span>
            </div>
            <p class="history-q-text">${q.question}</p>
            <div class="history-q-options">
              ${q.options.map((opt, optIdx) => {
      let optClass = "";
      if (optIdx === q.correctAnswer) optClass = "opt-correct";
      else if (optIdx === q.userAnswer) optClass = "opt-user-wrong";
      const letter = String.fromCharCode(65 + optIdx);
      return `<div class="history-opt ${optClass}">${letter}. ${opt}</div>`;
    }).join("")}
            </div>
            ${q.explanation ? `<div class="history-q-explanation"><strong>Explanation:</strong> ${formatExplanation(q.explanation)}</div>` : ''}
          </div>
        `).join("")}
      </div>
    `;

    quizHistoryDetailModal.style.display = "flex";
  }

  if (historyDetailModalClose) {
    historyDetailModalClose.addEventListener("click", () => {
      quizHistoryDetailModal.style.display = "none";
    });
  }

  quizModalClose.addEventListener("click", () => {
    quizResultsModal.style.display = "none";
    initQuizSetup();
  });

  modalRetakeQuizBtn.addEventListener("click", () => {
    quizResultsModal.style.display = "none";
    initQuizSetup();
  });

  modalReviewMistakesBtn.addEventListener("click", () => {
    quizResultsModal.style.display = "none";
    if (lastAttemptedQuizId) {
      openHistoryDetailModal(lastAttemptedQuizId);
    } else {
      switchMode("practice");
    }
  });

  // --- FILTER CHIPS LOGIC ---
  function updateFilterChipUI() {
    filterAll.setAttribute("data-active", currentFilter === "all" ? "true" : "false");
    filterBookmarks.setAttribute("data-active", currentFilter === "bookmarks" ? "true" : "false");
    filterUncovered.setAttribute("data-active", currentFilter === "uncovered" ? "true" : "false");
    filterMistakes.setAttribute("data-active", currentFilter === "mistakes" ? "true" : "false");
  }

  filterAll.addEventListener("click", () => {
    currentFilter = "all";
    updateFilterChipUI();
    renderFactsList();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  filterBookmarks.addEventListener("click", () => {
    currentFilter = currentFilter === "bookmarks" ? "all" : "bookmarks";
    updateFilterChipUI();
    renderFactsList();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  filterUncovered.addEventListener("click", () => {
    currentFilter = currentFilter === "uncovered" ? "all" : "uncovered";
    updateFilterChipUI();
    renderFactsList();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  filterMistakes.addEventListener("click", () => {
    currentFilter = currentFilter === "mistakes" ? "all" : "mistakes";
    updateFilterChipUI();
    renderFactsList();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // --- SEARCH BAR LOGIC ---
  searchInput.addEventListener("input", (e) => {
    searchFilter = e.target.value;
    searchClear.style.display = searchFilter ? "block" : "none";
    renderFactsList();
  });

  searchClear.addEventListener("click", () => {
    searchFilter = "";
    searchInput.value = "";
    searchClear.style.display = "none";
    renderFactsList();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // --- CHECKPOINT JUMP ---
  function jumpToCheckpoint() {
    const checkpointId = state.checkpoints[state.activeSubject];
    if (!checkpointId) return;

    if (searchFilter || currentFilter !== "all" || state.selectedTopic !== "ALL") {
      searchFilter = "";
      searchInput.value = "";
      searchClear.style.display = "none";
      currentFilter = "all";
      state.selectedTopic = "ALL";
      updateFilterChipUI();
      renderTopicPills();
      renderFactsList();
    }

    setTimeout(() => {
      const card = document.getElementById(`fact-card-${checkpointId}`);
      if (card) {
        card.scrollIntoView({ behavior: "smooth", block: "center" });
        card.classList.add("is-checkpoint");
      }
    }, 100);
  }

  jumpToCheckpointBtn.addEventListener("click", jumpToCheckpoint);

  // --- SIDEBAR & CUSTOM IMPORT ---
  sidebarToggleBtn.addEventListener("click", openSidebar);
  sidebarCloseBtn.addEventListener("click", closeSidebar);
  sidebarOverlay.addEventListener("click", closeSidebar);
  themeToggleTopBtn.addEventListener("click", toggleTheme);

  if (darkModeToggle) {
    darkModeToggle.addEventListener("change", () => {
      state.theme = darkModeToggle.checked ? "dark" : "light";
      applyTheme();
      saveState();
    });
  }

  // Export & Import Progress History Features
  const exportProgressBtn = document.getElementById("exportProgressBtn");
  const importProgressBtn = document.getElementById("importProgressBtn");
  const importFileInput = document.getElementById("importFileInput");

  const downloadBlobFallback = (content, filename) => {
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  const exportAndShareData = async (dataObj, filename, title) => {
    // Explicitly guarantee all quiz history and user progress fields are exported
    const exportPayload = {
      activeSubject: dataObj.activeSubject || "Computer Networking",
      theme: dataObj.theme || "dark",
      showAllAnswers: !!dataObj.showAllAnswers,
      hideQuizHistory: !!dataObj.hideQuizHistory,
      activeMode: dataObj.activeMode || "practice",
      selectedTopic: dataObj.selectedTopic || "ALL",
      customSubjects: dataObj.customSubjects || {},
      bookmarks: dataObj.bookmarks || {},
      covered: dataObj.covered || {},
      checkpoints: dataObj.checkpoints || {},
      attempts: dataObj.attempts || {},
      revealedAnswers: dataObj.revealedAnswers || {},
      comments: dataObj.comments || {},
      quizStats: dataObj.quizStats || {},
      quizHistory: Array.isArray(dataObj.quizHistory) ? dataObj.quizHistory : []
    };

    const jsonStr = JSON.stringify(exportPayload, null, 2);
    const txtFilename = filename.replace(/\.json$/, ".txt");

    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (window.matchMedia && window.matchMedia("(max-width: 768px)").matches);

    // On laptop/desktop, always trigger a direct file download
    if (!isMobileDevice) {
      downloadBlobFallback(jsonStr, filename);
    }

    if (navigator.share) {
      try {
        const txtFile = new File([jsonStr], txtFilename, { type: "text/plain" });

        if (navigator.canShare && navigator.canShare({ files: [txtFile] })) {
          await navigator.share({
            title: title,
            files: [txtFile]
          });
          return;
        }

        await navigator.share({
          title: title,
          text: jsonStr
        });
        return;
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }
        console.warn("Native sharing failed, falling back to direct download:", err);
      }
    }

    if (isMobileDevice) {
      downloadBlobFallback(jsonStr, filename);
    }
  };

  if (exportProgressBtn) {
    exportProgressBtn.addEventListener("click", () => {
      const filename = `quickfacts_mcq_backup_${new Date().toISOString().slice(0, 10)}.json`;
      exportAndShareData(state, filename, "QuickFacts MCQs Backup");
    });
  }

  // --- INSTANT GOOGLE & WEB SEARCH HELPERS ---
  const openMiniPopupWindow = (url, title = "SearchWindow") => {
    const width = 850;
    const height = 700;
    const left = Math.max(0, Math.round((window.screen.width / 2) - (width / 2)));
    const top = Math.max(0, Math.round((window.screen.height / 2) - (height / 2)));
    const pop = window.open(
      url,
      title,
      `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes,status=yes`
    );
    if (!pop || pop.closed || typeof pop.closed === 'undefined') {
      window.open(url, '_blank');
    }
  };

  function generateCopyableMCQText(mcq) {
    const optionsList = (mcq.options || []).map((opt, i) => {
      const letter = String.fromCharCode(65 + i);
      const isCorrect = i === mcq.answerIndex;
      return `${letter}. ${opt}${isCorrect ? " ✔" : ""}`;
    }).join("\n");

    const correctLetter = String.fromCharCode(65 + mcq.answerIndex);
    const correctOptText = (mcq.options && mcq.options[mcq.answerIndex]) ? mcq.options[mcq.answerIndex] : "";

    return `Question:
${mcq.question}

Options:
${optionsList}

Correct Answer:
${correctLetter}. ${correctOptText}`;
  }

  function generateFormattedPrompt(mcq, subjectName) {
    const optionsList = (mcq.options || []).map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join("\n");
    const correctLetter = String.fromCharCode(65 + mcq.answerIndex);
    const correctOptText = mcq.options[mcq.answerIndex];
    const incorrectOpts = (mcq.options || []).filter((_, i) => i !== mcq.answerIndex).join(", ");

    return `Question:
${mcq.question}

Options:
${optionsList}

Correct Answer:
${correctLetter}. ${correctOptText}

Instructions:
1. Explain why option ${correctLetter} (${correctOptText}) is correct.
2. Explain why the other options (${incorrectOpts}) are incorrect.
3. Provide simple real-world examples.
4. Provide an easy memory trick / mnemonic to remember this concept.
5. Mention where this concept is used in ${subjectName || 'Computer Science'}.`;
  }

  const testBtns = document.querySelectorAll(".test-share-btn");
  testBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const mode = btn.getAttribute("data-test");
      const filename = `quickfacts_mcq_backup_${new Date().toISOString().slice(0, 10)}.json`;
      exportAndShareData(state, filename, "QuickFacts MCQs Backup", mode);
    });
  });

  const importBackupModal = document.getElementById("importBackupModal");
  const importModalClose = document.getElementById("importModalClose");
  const importModalCancelBtn = document.getElementById("importModalCancelBtn");
  const importModalConfirmBtn = document.getElementById("importModalConfirmBtn");

  let pendingImportData = null;

  if (importProgressBtn && importFileInput) {
    importProgressBtn.addEventListener("click", () => {
      importFileInput.value = "";
      importFileInput.click();
    });
    importFileInput.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (!parsed || typeof parsed !== "object") {
            throw new Error("Invalid JSON file format.");
          }
          if (!parsed.covered && !parsed.attempts && !parsed.quizHistory && !parsed.customSubjects && !parsed.comments) {
            throw new Error("File does not appear to contain valid QuickFacts MCQ backup data.");
          }
          pendingImportData = parsed;
          if (importBackupModal) {
            importBackupModal.style.display = "flex";
          }
        } catch (err) {
          alert("Error reading backup file: " + err.message);
        }
      };
      reader.readAsText(file);
    });
  }

  function closeImportModal() {
    if (importBackupModal) importBackupModal.style.display = "none";
    pendingImportData = null;
    if (importFileInput) importFileInput.value = "";
  }

  if (importModalClose) importModalClose.addEventListener("click", closeImportModal);
  if (importModalCancelBtn) importModalCancelBtn.addEventListener("click", closeImportModal);

  if (importModalConfirmBtn) {
    importModalConfirmBtn.addEventListener("click", () => {
      if (!pendingImportData) {
        closeImportModal();
        return;
      }

      const selectedOption = document.querySelector('input[name="importModeChoice"]:checked');
      const mode = selectedOption ? selectedOption.value : "merge";

      if (mode === "merge") {
        mergeBackupData(pendingImportData);
      } else {
        overwriteBackupData(pendingImportData);
      }

      closeImportModal();
      closeSidebar();
    });
  }

  function mergeBackupData(incoming) {
    // 1. Merge Covered (Union per subject)
    const mergedCovered = { ...state.covered };
    if (incoming.covered && typeof incoming.covered === "object") {
      Object.keys(incoming.covered).forEach(subj => {
        const currentArr = Array.isArray(mergedCovered[subj]) ? mergedCovered[subj] : [];
        const incomingArr = Array.isArray(incoming.covered[subj]) ? incoming.covered[subj] : [];
        mergedCovered[subj] = Array.from(new Set([...currentArr, ...incomingArr]));
      });
    }

    // 2. Merge Bookmarks (Union per subject)
    const mergedBookmarks = { ...state.bookmarks };
    if (incoming.bookmarks && typeof incoming.bookmarks === "object") {
      Object.keys(incoming.bookmarks).forEach(subj => {
        const currentArr = Array.isArray(mergedBookmarks[subj]) ? mergedBookmarks[subj] : [];
        const incomingArr = Array.isArray(incoming.bookmarks[subj]) ? incoming.bookmarks[subj] : [];
        mergedBookmarks[subj] = Array.from(new Set([...currentArr, ...incomingArr]));
      });
    }

    // 3. Merge Checkpoints (Highest index)
    const mergedCheckpoints = { ...state.checkpoints };
    if (incoming.checkpoints && typeof incoming.checkpoints === "object") {
      Object.keys(incoming.checkpoints).forEach(subj => {
        const currentVal = mergedCheckpoints[subj] || 0;
        const incomingVal = incoming.checkpoints[subj] || 0;
        mergedCheckpoints[subj] = Math.max(currentVal, incomingVal);
      });
    }

    // 4. Merge Attempts (Union wrongOptions, isCorrect true wins)
    const mergedAttempts = { ...state.attempts };
    if (incoming.attempts && typeof incoming.attempts === "object") {
      Object.keys(incoming.attempts).forEach(subj => {
        if (!mergedAttempts[subj]) mergedAttempts[subj] = {};
        const incomingSubjAttempts = incoming.attempts[subj] || {};

        Object.keys(incomingSubjAttempts).forEach(mcqId => {
          const currentAtt = mergedAttempts[subj][mcqId];
          const incomingAtt = incomingSubjAttempts[mcqId];

          if (!currentAtt) {
            mergedAttempts[subj][mcqId] = incomingAtt;
          } else {
            const combinedWrong = Array.from(new Set([
              ...(currentAtt.wrongOptions || []),
              ...(incomingAtt.wrongOptions || [])
            ]));
            mergedAttempts[subj][mcqId] = {
              wrongOptions: combinedWrong,
              isCorrect: !!(currentAtt.isCorrect || incomingAtt.isCorrect)
            };
          }
        });
      });
    }

    // 5. Merge Revealed Answers
    const mergedRevealed = { ...state.revealedAnswers };
    if (incoming.revealedAnswers && typeof incoming.revealedAnswers === "object") {
      Object.keys(incoming.revealedAnswers).forEach(subj => {
        const currentArr = Array.isArray(mergedRevealed[subj]) ? mergedRevealed[subj] : [];
        const incomingArr = Array.isArray(incoming.revealedAnswers[subj]) ? incoming.revealedAnswers[subj] : [];
        mergedRevealed[subj] = Array.from(new Set([...currentArr, ...incomingArr]));
      });
    }

    // 6. Merge Custom Subjects
    const mergedCustom = { ...state.customSubjects };
    if (incoming.customSubjects && typeof incoming.customSubjects === "object") {
      Object.keys(incoming.customSubjects).forEach(subj => {
        if (!mergedCustom[subj]) {
          mergedCustom[subj] = incoming.customSubjects[subj];
        } else {
          const currentQs = Array.isArray(mergedCustom[subj]) ? mergedCustom[subj] : [];
          const incomingQs = Array.isArray(incoming.customSubjects[subj]) ? incoming.customSubjects[subj] : [];
          const currentTextSet = new Set(currentQs.map(q => q.question));
          const newQs = incomingQs.filter(q => !currentTextSet.has(q.question));
          mergedCustom[subj] = [...currentQs, ...newQs];
        }
      });
    }

    // 7. Merge Quiz History
    const currentHistory = Array.isArray(state.quizHistory) ? state.quizHistory : [];
    const incomingHistory = Array.isArray(incoming.quizHistory) ? incoming.quizHistory : [];
    const historyMap = new Map();

    [...currentHistory, ...incomingHistory].forEach(item => {
      const key = item.id || item.timestamp || JSON.stringify(item);
      if (!historyMap.has(key)) {
        historyMap.set(key, item);
      }
    });

    const mergedHistory = Array.from(historyMap.values()).sort((a, b) => {
      const timeA = new Date(a.date || a.timestamp || 0).getTime();
      const timeB = new Date(b.date || b.timestamp || 0).getTime();
      return timeB - timeA;
    });

    // 8. Merge Comments
    const mergedComments = { ...state.comments };
    if (incoming.comments && typeof incoming.comments === "object") {
      Object.keys(incoming.comments).forEach(subj => {
        if (!mergedComments[subj]) mergedComments[subj] = {};
        const incomingSubjComments = incoming.comments[subj] || {};
        Object.keys(incomingSubjComments).forEach(mcqId => {
          if (incomingSubjComments[mcqId] !== undefined) {
            mergedComments[subj][mcqId] = incomingSubjComments[mcqId];
          }
        });
      });
    }

    state = {
      ...state,
      covered: mergedCovered,
      bookmarks: mergedBookmarks,
      checkpoints: mergedCheckpoints,
      attempts: mergedAttempts,
      revealedAnswers: mergedRevealed,
      customSubjects: mergedCustom,
      comments: mergedComments,
      quizHistory: mergedHistory
    };

    saveState();
    shuffledSubjectCache = {};
    initSubjectView();
    if (typeof renderQuizHistoryList === "function") renderQuizHistoryList();
    if (typeof updateQuizHistoryVisibility === "function") updateQuizHistoryVisibility();
    alert(`Backup merged successfully! Total quiz attempts: ${state.quizHistory.length}`);
  }

  function overwriteBackupData(incoming) {
    state = {
      ...state,
      ...incoming,
      comments: incoming.comments || {},
      hideQuizHistory: typeof incoming.hideQuizHistory === "boolean" ? incoming.hideQuizHistory : !!state.hideQuizHistory
    };
    saveState();
    shuffledSubjectCache = {};
    initSubjectView();
    if (typeof renderQuizHistoryList === "function") renderQuizHistoryList();
    if (typeof updateQuizHistoryVisibility === "function") updateQuizHistoryVisibility();
    alert("Application data replaced successfully from backup!");
  }

  globalShowAnswersToggle.addEventListener("change", () => {
    state.showAllAnswers = globalShowAnswersToggle.checked;
    saveState();
    renderFactsList();
  });

  btnModePractice.addEventListener("click", () => switchMode("practice"));
  btnModeQuiz.addEventListener("click", () => switchMode("quiz"));

  function renderSubjectsList() {
    if (!sidebarSubjectList) return;
    sidebarSubjectList.innerHTML = "";
    const subjects = getAllSubjects();

    subjects.forEach(subject => {
      let count = 0;
      if (state.customSubjects[subject]) count = state.customSubjects[subject].length;
      else if (window.factsData && window.factsData[subject]) count = window.factsData[subject].length;

      const coveredList = state.covered[subject] || [];
      const coveredCount = coveredList.length;
      const percent = count > 0 ? Math.round((coveredCount / count) * 100) : 0;

      const button = document.createElement("button");
      button.className = `subject-item ${state.activeSubject === subject ? 'active' : ''}`;
      button.innerHTML = `
        <div class="subject-item-top">
          <span class="subject-name">${subject}</span>
          <span class="subject-count">${count} MCQs</span>
        </div>
        <div class="subject-bottom-progress-track">
          <div class="subject-bottom-progress-fill" style="width: ${percent}%"></div>
        </div>
      `;
      button.addEventListener("click", () => {
        state.activeSubject = subject;
        state.selectedTopic = "ALL";
        saveState();
        closeSidebar();
        initSubjectView();
      });
      sidebarSubjectList.appendChild(button);
    });
  }

  if (addFactsBtn) {
    addFactsBtn.addEventListener("click", () => {
      const rawSubject = newSubjectNameInput.value.trim();
      const rawText = rawFactsPasteInput.value.trim();

      if (!rawText) {
        alert("Please paste MCQs text first.");
        return;
      }

      const subjectName = rawSubject || state.activeSubject;
      let newMCQs = [];

      if (window.parseRawSubject) {
        newMCQs = window.parseRawSubject(subjectName, rawText);
      }

      if (newMCQs.length === 0) {
        alert("Could not extract valid questions. Ensure standard format.");
        return;
      }

      if (!state.customSubjects[subjectName]) {
        state.customSubjects[subjectName] = [];
      }

      const existing = state.customSubjects[subjectName];
      const builtIn = (window.factsData && window.factsData[subjectName]) || [];
      const allCurrent = [...builtIn, ...existing];

      let addedCount = 0;
      newMCQs.forEach(m => {
        m.id = allCurrent.length + addedCount + 1;
        existing.push(m);
        addedCount++;
      });

      state.activeSubject = subjectName;
      saveState();
      newSubjectNameInput.value = "";
      rawFactsPasteInput.value = "";
      alert(`Added ${addedCount} MCQs to "${subjectName}".`);
      initSubjectView();
      closeSidebar();
    });
  }

  resetProgressBtn.addEventListener("click", () => {
    if (confirm(`Reset progress for "${state.activeSubject}"?`)) {
      state.covered[state.activeSubject] = [];
      state.bookmarks[state.activeSubject] = [];
      state.checkpoints[state.activeSubject] = null;
      state.attempts[state.activeSubject] = {};
      state.revealedAnswers[state.activeSubject] = [];
      if (state.comments) state.comments[state.activeSubject] = {};
      if (state.quizStats) state.quizStats[state.activeSubject] = { totalAttempted: 0, totalCorrect: 0 };
      saveState();
      initSubjectView();
      closeSidebar();
    }
  });

  clearAllDataBtn.addEventListener("click", () => {
    if (confirm("Reset ALL application data and progress?")) {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    }
  });

  // --- BACK TO TOP FLOATING BUTTON LOGIC ---
  const backToTopBtn = document.getElementById("backToTopBtn");
  let lastScrollY = window.scrollY;

  function checkBackToTopVisibility() {
    if (!backToTopBtn) return;

    const currentScrollY = window.scrollY;
    const isScrollingUp = currentScrollY < lastScrollY;
    lastScrollY = currentScrollY;

    const cards = document.querySelectorAll(".fact-card");
    let pastThreshold = false;

    if (cards.length >= 20) {
      const card20 = cards[19];
      const rect = card20.getBoundingClientRect();
      pastThreshold = rect.top <= window.innerHeight;
    } else {
      pastThreshold = currentScrollY > 1200;
    }

    // Only show button if user is past 20th card AND is scrolling UP
    if (pastThreshold && isScrollingUp && currentScrollY > 200) {
      backToTopBtn.classList.add("show");
    } else {
      backToTopBtn.classList.remove("show");
    }
  }

  if (backToTopBtn) {
    backToTopBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    window.addEventListener("scroll", checkBackToTopVisibility, { passive: true });
  }

  // --- INITIALIZATION ---
  function initSubjectView() {
    updateProgressUI();
    renderTopicPills();
    renderSubjectsList();
    if (state.activeMode === "practice") {
      renderFactsList();
    } else {
      initQuizSetup();
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  loadState();
  applyTheme();
  globalShowAnswersToggle.checked = state.showAllAnswers;
  switchMode(state.activeMode || "practice");
  initSubjectView();

  // --- GOOGLE DRIVE CLOUD SYNC INTEGRATION ---
  function applyCloudState(cloudState) {
    if (!cloudState || typeof cloudState !== "object") return;
    state = {
      ...state,
      ...cloudState,
      comments: cloudState.comments || {},
      customSubjects: cloudState.customSubjects || {},
      bookmarks: cloudState.bookmarks || {},
      covered: cloudState.covered || {},
      checkpoints: cloudState.checkpoints || {},
      attempts: cloudState.attempts || {},
      quizStats: cloudState.quizStats || {},
      quizHistory: Array.isArray(cloudState.quizHistory) ? cloudState.quizHistory : []
    };
    // Save to localStorage directly without re-triggering cloud upload loop
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Failed to save state after cloud restore", e);
    }
    applyTheme();
    if (globalShowAnswersToggle) globalShowAnswersToggle.checked = state.showAllAnswers;
    switchMode(state.activeMode || "practice");
    initSubjectView();
  }

  if (window.GoogleDriveSync && typeof window.GoogleDriveSync.init === "function") {
    window.GoogleDriveSync.init({
      getLocalState: () => state,
      applyCloudState: applyCloudState
    });
  }

  // --- PWA SERVICE WORKER REGISTRATION & INSTALL PROMPT ---
  let deferredPrompt = null;
  const pwaInstallBtn = document.getElementById("pwaInstallBtn");

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('../sw.js')
        .then(reg => console.log('QuickFacts MCQs PWA registered:', reg.scope))
        .catch(err => console.log('QuickFacts MCQs SW registration failed:', err));
    });
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (pwaInstallBtn) {
      pwaInstallBtn.style.display = "inline-flex";
    }
  });

  if (pwaInstallBtn) {
    pwaInstallBtn.addEventListener('click', () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User installed QuickFacts App');
          }
          deferredPrompt = null;
          pwaInstallBtn.style.display = "none";
        });
      }
    });
  }

  // --- PRINTABLE PDF WORKSHEET GENERATOR ---
  const btnPrintWorksheet = document.getElementById("btnPrintWorksheet");
  const printWorksheetModal = document.getElementById("printWorksheetModal");
  const printModalClose = document.getElementById("printModalClose");
  const printModalCancelBtn = document.getElementById("printModalCancelBtn");
  const printConfirmBtn = document.getElementById("printConfirmBtn");
  const printableWorksheetArea = document.getElementById("printableWorksheetArea");

  const printSourceSelect = document.getElementById("printSourceSelect");
  const printOptionTopic = document.getElementById("printOptionTopic");
  const printCountSelect = document.getElementById("printCountSelect");
  const printIncludeHeader = document.getElementById("printIncludeHeader");
  const printIncludeAnswerKey = document.getElementById("printIncludeAnswerKey");
  const printIncludeExplanations = document.getElementById("printIncludeExplanations");

  if (btnPrintWorksheet) {
    btnPrintWorksheet.addEventListener("click", () => {
      if (printOptionTopic) {
        if (state.selectedTopic && state.selectedTopic !== "ALL") {
          printOptionTopic.textContent = `Active Topic Only (${state.selectedTopic})`;
        } else {
          printOptionTopic.textContent = `Active Topic Only (All Topics)`;
        }
      }
      if (printWorksheetModal) printWorksheetModal.style.display = "flex";
    });
  }

  if (printModalClose) {
    printModalClose.addEventListener("click", () => {
      if (printWorksheetModal) printWorksheetModal.style.display = "none";
    });
  }

  if (printModalCancelBtn) {
    printModalCancelBtn.addEventListener("click", () => {
      if (printWorksheetModal) printWorksheetModal.style.display = "none";
    });
  }

  if (printConfirmBtn) {
    printConfirmBtn.addEventListener("click", () => {
      generateAndPrintWorksheet();
      if (printWorksheetModal) printWorksheetModal.style.display = "none";
    });
  }

  function generateAndPrintWorksheet() {
    if (!printableWorksheetArea) return;

    const sourceVal = printSourceSelect ? printSourceSelect.value : "subject";
    const countVal = printCountSelect ? printCountSelect.value : "25";
    const incHeader = printIncludeHeader ? printIncludeHeader.checked : true;
    const incKey = printIncludeAnswerKey ? printIncludeAnswerKey.checked : true;
    const incExp = printIncludeExplanations ? printIncludeExplanations.checked : true;

    let pool = [];
    let titleSubject = state.activeSubject;

    if (sourceVal === "topic") {
      const activeTopicName = (state.selectedTopic && state.selectedTopic !== "ALL") ? state.selectedTopic : "All Topics";
      titleSubject = `${state.activeSubject} (${activeTopicName})`;
      const allMCQs = getActiveSubjectMCQs();
      if (state.selectedTopic && state.selectedTopic !== "ALL") {
        pool = allMCQs.filter(m => m.category === state.selectedTopic);
      } else {
        pool = allMCQs;
      }
    } else if (sourceVal === "bookmarks") {
      titleSubject = `${state.activeSubject} (Bookmarked MCQs)`;
      const bmList = state.bookmarks[state.activeSubject] || [];
      const allMCQs = getActiveSubjectMCQs();
      pool = allMCQs.filter(m => bmList.includes(m.id));
    } else if (sourceVal === "mistakes") {
      titleSubject = `${state.activeSubject} (Mistakes)`;
      const attempts = state.attempts[state.activeSubject] || {};
      const allMCQs = getActiveSubjectMCQs();
      pool = allMCQs.filter(m => {
        const att = attempts[m.id];
        return att && !att.isCorrect && att.wrongOptions && att.wrongOptions.length > 0;
      });
    } else if (sourceVal === "uncovered") {
      titleSubject = `${state.activeSubject} (Uncovered MCQs)`;
      const coveredList = state.covered[state.activeSubject] || [];
      const allMCQs = getActiveSubjectMCQs();
      pool = allMCQs.filter(m => !coveredList.includes(m.id));
    } else {
      pool = getActiveSubjectMCQs();
    }

    if (pool.length === 0) {
      alert("No MCQs found matching your selected criteria!");
      return;
    }

    if (countVal !== "ALL") {
      const limit = parseInt(countVal, 10);
      pool = pool.slice(0, limit);
    }

    const todayStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    let headerHtml = `
      <div class="print-header">
        <div class="print-header-top">
          <div>
            <h1 class="print-title">${titleSubject}</h1>
            <div class="print-subtitle">QuickFacts CS & IT MCQs Practice Worksheet • ${pool.length} Questions</div>
          </div>
          <div style="text-align: right; font-size: 0.85rem; font-weight: 600;">Date: ${todayStr}</div>
        </div>
        ${incHeader ? `
          <div class="print-student-fields">
            <span>Name: _______________________________</span>
            <span>Roll / ID No: _________________</span>
            <span>Score: _______ / ${pool.length}</span>
          </div>
        ` : ''}
      </div>
    `;

    let questionsHtml = pool.map((q, idx) => {
      return `
        <div class="print-q-block">
          <div class="print-q-text">Q${idx + 1}. ${q.question}</div>
          <div class="print-q-options">
            ${q.options.map((opt, optIdx) => {
        const letter = String.fromCharCode(65 + optIdx);
        return `
                <div class="print-opt-item">
                  <span class="print-bubble"></span>
                  <strong>${letter}.</strong> ${opt}
                </div>
              `;
      }).join("")}
          </div>
        </div>
      `;
    }).join("");

    let answerKeyHtml = "";
    if (incKey) {
      answerKeyHtml = `
        <div class="print-answer-key-section">
          <h2 class="print-key-title">Answer Key</h2>
          <div class="print-key-grid">
            ${pool.map((q, idx) => {
        const letter = String.fromCharCode(65 + q.answerIndex);
        return `<div class="print-key-cell"><strong>Q${idx + 1}:</strong> ${letter}</div>`;
      }).join("")}
          </div>

          ${incExp ? `
            <h3 style="font-size: 1.1rem; font-weight: 800; text-transform: uppercase; margin-bottom: 12px; margin-top: 20px;">Explanations & Solutions</h3>
            <div class="print-explanations-list">
              ${pool.map((q, idx) => {
        const letter = String.fromCharCode(65 + q.answerIndex);
        return `
                  <div class="print-exp-item">
                    <strong>Q${idx + 1} (${letter}): ${q.options[q.answerIndex]}</strong><br>
                    <span>${formatExplanation(q.explanation || 'No detailed explanation required.')}</span>
                  </div>
                `;
      }).join("")}
            </div>
          ` : ''}
        </div>
      `;
    }

    printableWorksheetArea.innerHTML = `
      ${headerHtml}
      <div class="print-questions-grid">
        ${questionsHtml}
      </div>
      ${answerKeyHtml}
    `;

    const originalTitle = document.title;
    let pdfFileName = state.activeSubject;
    if (state.selectedTopic && state.selectedTopic !== "ALL") {
      pdfFileName += ` - ${state.selectedTopic}`;
    }
    pdfFileName += " - Practice Worksheet";

    document.title = pdfFileName;

    window.print();

    setTimeout(() => {
      document.title = originalTitle;
    }, 500);
  }

  window.addEventListener('appinstalled', () => {
    if (pwaInstallBtn) pwaInstallBtn.style.display = "none";
    deferredPrompt = null;
  });
});
