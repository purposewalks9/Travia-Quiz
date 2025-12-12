        let questions = [];
        let currentQuestionIndex = 0;
        let score = 0;
        let startTime = 0;
        let questionStartTime = 0;
        let totalTimeTaken = 0;

        const settingsPanel = document.getElementById('settingsPanel');
        const quizContainer = document.getElementById('quizContainer');
        const resultsPanel = document.getElementById('resultsPanel');
        const startBtn = document.getElementById('startBtn');
        const restartBtn = document.getElementById('restartBtn');
        const skipBtn = document.getElementById('skipBtn');
        const scoreboardBtn = document.getElementById('scoreboardBtn');
        const scoreboardModal = document.getElementById('scoreboardModal');
        const closeScoreboard = document.getElementById('closeScoreboard');
        const clearScores = document.getElementById('clearScores');

        function decodeHTML(html) {
            const txt = document.createElement('textarea');
            txt.innerHTML = html;
            return txt.value;
        }

        function saveScore(score, total, category, difficulty, timeTaken) {
            const scores = JSON.parse(localStorage.getItem('quizScores') || '[]');
            const newScore = {
                score: score,
                total: total,
                percentage: Math.round((score / total) * 100),
                category: category || 'Mixed',
                difficulty: difficulty || 'Mixed',
                timeTaken: timeTaken,
                date: new Date().toISOString()
            };
            scores.push(newScore);
            scores.sort((a, b) => b.percentage - a.percentage || a.timeTaken - b.timeTaken); 
            localStorage.setItem('quizScores', JSON.stringify(scores.slice(0, 20)));
        }

        function loadScoreboard() {
            const scores = JSON.parse(localStorage.getItem('quizScores') || '[]');
            const content = document.getElementById('scoreboardContent');
            const empty = document.getElementById('emptyScoreboard');

            if (scores.length === 0) {
                content.classList.add('hidden');
                empty.classList.remove('hidden');
                return;
            }

            content.classList.remove('hidden');
            empty.classList.add('hidden');

            content.innerHTML = scores.map((s, index) => {
                const medalColor = index === 0 ? 'text-yellow-400' : 
                                 index === 1 ? 'text-gray-400' : 
                                 index === 2 ? 'text-amber-700' : 
                                 'text-gray-500';
                const medal = index < 3 ? `<i class="fas fa-medal ${medalColor}"></i>` : 
                             `<span class="text-gray-400">#${index + 1}</span>`;
                const date = new Date(s.date).toLocaleDateString();
                
                let percentColor = 'text-gray-400';
                if (s.percentage === 100) percentColor = 'text-yellow-400';
                else if (s.percentage >= 80) percentColor = 'text-green-500';
                else if (s.percentage >= 60) percentColor = 'text-white';

                return `
                    <div class="bg-black rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between border-2 border-white gap-3">
                        <div class="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                            <div class="text-2xl sm:text-3xl font-bold w-10 sm:w-12 text-center">${medal}</div>
                            <div class="flex-1">
                                <div class="font-bold text-base sm:text-lg text-white">${s.score}/${s.total} (${s.percentage}%)</div>
                                <div class="text-xs sm:text-sm text-gray-400 flex flex-wrap items-center gap-2">
                                    <span><i class="fas fa-list-ul mr-1"></i>${s.category}</span>
                                    <span><i class="fas fa-signal mr-1"></i>${s.difficulty}</span>
                                    <span><i class="far fa-clock mr-1"></i>${s.timeTaken}s</span>
                                </div>
                                <div class="text-xs text-gray-500"><i class="far fa-calendar mr-1"></i>${date}</div>
                            </div>
                        </div>
                        <div class="text-xl sm:text-2xl font-bold ${percentColor} sm:ml-4">
                            ${s.percentage}%
                        </div>
                    </div>
                `;
            }).join('');
        }

        async function fetchQuestions() {
            const category = document.getElementById('category').value;
            const difficulty = document.getElementById('difficulty').value;
            const amount = document.getElementById('numQuestions').value;
            const type = document.getElementById('type').value;

            let url = `https://opentdb.com/api.php?amount=${amount}`;
            if (category) url += `&category=${category}`;
            if (difficulty) url += `&difficulty=${difficulty}`;
            if (type) url += `&type=${type}`;

            try {
                startBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Loading Questions...';
                startBtn.disabled = true;
                
                const response = await fetch(url);
                const data = await response.json();
                
                if (data.response_code === 0) {
                    questions = data.results;
                    startQuiz();
                } else {
                    alert('Failed to load questions. Please try different settings.');
                    startBtn.innerHTML = '<i class="fas fa-rocket"></i> Start Quiz';
                    startBtn.disabled = false;
                }
            } catch (error) {
                alert('Error connecting to quiz API. Please check your internet connection.');
                startBtn.innerHTML = '<i class="fas fa-rocket"></i> Start Quiz';
                startBtn.disabled = false;
            }
        }

        function startQuiz() {
            settingsPanel.classList.add('hidden');
            quizContainer.classList.remove('hidden');
            scoreboardBtn.classList.add('hidden');
            currentQuestionIndex = 0;
            score = 0;
            startTime = Date.now();
            totalTimeTaken = 0;
            document.getElementById('totalQuestions').textContent = questions.length;
            document.getElementById('score').textContent = score;
            loadQuestion();
            startTimer();
        }

        function startTimer() {
            questionStartTime = Date.now();
            const timerInterval = setInterval(() => {
                if (quizContainer.classList.contains('hidden')) {
                    clearInterval(timerInterval);
                    return;
                }
                const elapsed = Math.floor((Date.now() - questionStartTime) / 1000);
                document.getElementById('timer').textContent = elapsed;
            }, 1000);
        }

        function loadQuestion() {
            if (currentQuestionIndex >= questions.length) {
                showResults();
                return;
            }

            const question = questions[currentQuestionIndex];
            const progress = ((currentQuestionIndex) / questions.length) * 100;
            
            document.getElementById('progressBar').style.width = progress + '%';
            document.getElementById('currentQuestion').textContent = currentQuestionIndex + 1;
            document.getElementById('categoryBadge').textContent = decodeHTML(question.category);
            document.getElementById('difficultyBadge').textContent = question.difficulty.toUpperCase();
            document.getElementById('questionText').textContent = decodeHTML(question.question);

            const answers = [...question.incorrect_answers, question.correct_answer]
                .sort(() => Math.random() - 0.5);

            const answersContainer = document.getElementById('answersContainer');
            answersContainer.innerHTML = '';

            answers.forEach((answer, index) => {
                const button = document.createElement('button');
                button.className = 'w-full bg-black hover:bg-gray-900 border-2 border-white rounded-xl px-4 sm:px-6 py-3 sm:py-4 text-left font-semibold transition transform hover:scale-[1.01] text-white text-sm sm:text-base';
                button.innerHTML = `<span class="text-gray-400 font-bold mr-2 sm:mr-3">${String.fromCharCode(65 + index)}.</span>${decodeHTML(answer)}`;
                button.onclick = () => selectAnswer(answer, button);
                answersContainer.appendChild(button);
            });

            questionStartTime = Date.now();
        }

        function selectAnswer(selectedAnswer, button) {
            const question = questions[currentQuestionIndex];
            const correct = selectedAnswer === question.correct_answer;
            const timeTaken = Math.floor((Date.now() - questionStartTime) / 1000);
            totalTimeTaken += timeTaken;

            const buttons = document.querySelectorAll('#answersContainer button');
            buttons.forEach(btn => {
                btn.disabled = true;
                const btnText = btn.textContent.substring(3);
                
                btn.classList.remove('hover:bg-gray-900', 'bg-black', 'border-white', 'text-white');
                btn.classList.add('bg-black', 'border-gray-800', 'text-gray-600');

                if (decodeHTML(question.correct_answer) === btnText) {
                    btn.classList.remove('bg-black', 'border-gray-800', 'text-gray-600');
                    btn.classList.add('bg-green-600/20', 'border-green-500', 'text-green-300', 'pulse-animation', 'font-bold');
                    btn.querySelector('span').classList.replace('text-gray-400', 'text-green-500');
                } else if (btn === button && !correct) {
                    btn.classList.remove('bg-black', 'border-gray-800', 'text-gray-600');
                    btn.classList.add('bg-red-600/20', 'border-red-500', 'text-red-300', 'pulse-animation', 'font-bold');
                    btn.querySelector('span').classList.replace('text-gray-400', 'text-red-500');
                }
            });

            if (correct) {
                score++;
                document.getElementById('score').textContent = score;
            }

            setTimeout(() => {
                currentQuestionIndex++;
                loadQuestion();
            }, 1500);
        }

        function showResults() {
            quizContainer.classList.add('hidden');
            resultsPanel.classList.remove('hidden');
            scoreboardBtn.classList.remove('hidden');

            const percentage = Math.round((score / questions.length) * 100);
            document.getElementById('finalScore').textContent = score;
            document.getElementById('finalTotal').textContent = questions.length;
            document.getElementById('percentage').textContent = percentage + '%';
            document.getElementById('correctAnswers').textContent = score;
            document.getElementById('wrongAnswers').textContent = questions.length - score;
            document.getElementById('totalTime').textContent = totalTimeTaken + 's';
            document.getElementById('avgTime').textContent = Math.round(totalTimeTaken / questions.length) + 's';

            let message = '';
            if (percentage === 100) message = 'Perfect Score! You are a genius!';
            else if (percentage >= 80) message = 'Excellent work!';
            else if (percentage >= 60) message = 'Good job! Keep it up!';
            else if (percentage >= 40) message = 'Not bad! Room for improvement!';
            else message = 'Keep practicing! You will do better next time!';

            document.getElementById('resultMessage').textContent = message;

            const category = document.getElementById('category').selectedOptions[0].text;
            const difficulty = document.getElementById('difficulty').value || 'mixed';
            saveScore(score, questions.length, category, difficulty, totalTimeTaken);
        }

        startBtn.addEventListener('click', fetchQuestions);
        
        restartBtn.addEventListener('click', () => {
            resultsPanel.classList.add('hidden');
            settingsPanel.classList.remove('hidden');
            scoreboardBtn.classList.remove('hidden');
            startBtn.innerHTML = '<i class="fas fa-rocket"></i> Start Quiz';
            startBtn.disabled = false;
        });

        skipBtn.addEventListener('click', () => {
            const timeTaken = Math.floor((Date.now() - questionStartTime) / 1000);
            totalTimeTaken += timeTaken;
            currentQuestionIndex++;
            loadQuestion();
        });

        scoreboardBtn.addEventListener('click', () => {
            loadScoreboard();
            scoreboardModal.classList.remove('hidden');
        });

        closeScoreboard.addEventListener('click', () => {
            scoreboardModal.classList.add('hidden');
        });

        scoreboardModal.addEventListener('click', (e) => {
            if (e.target === scoreboardModal) {
                scoreboardModal.classList.add('hidden');
            }
        });

        clearScores.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all scores? This cannot be undone.')) {
                localStorage.removeItem('quizScores');
                loadScoreboard();
            }
        });