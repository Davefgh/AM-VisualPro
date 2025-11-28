// Main Application Controller
class App {
    constructor() {
        this.dfa = new DFA();
        this.canvas = document.getElementById('canvas');
        this.renderer = new Renderer(this.canvas, this.dfa);
        this.mode = 'addState';
        
        // Simulation state
        this.simString = "";
        this.simIndex = 0;
        this.simInterval = null;

        this.setupInput();
        this.setupMouse();
        this.setupToolButtons();
    }

    /**
     * Setup tool button event listeners
     */
    setupToolButtons() {
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = btn.dataset.action;
                const mode = btn.dataset.mode;
                
                if (action === 'delete') {
                    this.deleteSelected();
                } else if (mode) {
                    this.setMode(mode, btn);
                }
            });
        });
        
        console.log('✅ Tool buttons initialized');
    }

    /**
     * Setup keyboard input handlers
     */
    setupInput() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' && this.dfa.selectedState) {
                this.deleteSelected();
            }
        });
    }

    /**
     * Setup mouse event handlers for canvas interaction
     */
    setupMouse() {
        let isDragging = false;
        let draggedState = null;

        const getPos = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            return { 
                x: (e.clientX - rect.left) * this.renderer.dpr, 
                y: (e.clientY - rect.top) * this.renderer.dpr
            };
        };

        // Mouse down event
        this.canvas.addEventListener('mousedown', (e) => {
            const pos = getPos(e);
            // Adjust for DPI when checking collision
            const checkPos = { x: pos.x / this.renderer.dpr, y: pos.y / this.renderer.dpr };
            
            // We need to check against state coordinates which are in logical pixels
            // But the renderer handles scaling. Let's keep logic simple:
            // The state coordinates are logical. The mouse event gives client coordinates.
            // We should use client coordinates relative to canvas for logic if we want 1:1 mapping with drawing
            // BUT, the renderer scales the context. 
            // Let's stick to logical coordinates for state positions.
            
            const logicalPos = {
                x: e.offsetX,
                y: e.offsetY
            };
            
            const state = this.renderer.getStateAt(logicalPos.x, logicalPos.y);

            // Add new state ONLY if clicking empty space in addState mode
            if (this.mode === 'addState' && !state) {
                this.dfa.addState(logicalPos.x, logicalPos.y);
                this.renderer.draw();
                return;
            }

            // Prevent any action if clicking empty space in non-addState modes
            if (!state && this.mode !== 'addState') {
                this.dfa.selectedState = null; // Deselect
                this.renderer.draw();
                return;
            }

            // Handle clicking on existing state
            if (state) {
                if (this.mode === 'addState') {
                    // Enable dragging
                    isDragging = true;
                    draggedState = state;
                    this.dfa.selectedState = state;
                    this.renderer.draw();
                } 
                else if (this.mode === 'addTransition') {
                    // Start creating transition
                    this.dfa.tempTransition = { from: state, to: logicalPos };
                } 
                else if (this.mode === 'setStart') {
                    // Set as start state
                    this.dfa.startState = state;
                    this.showToast(`Start state set to: ${state.id}`);
                    this.renderer.draw();
                } 
                else if (this.mode === 'toggleFinal') {
                    // Toggle final state
                    state.isFinal = !state.isFinal;
                    const status = state.isFinal ? 'final' : 'non-final';
                    this.showToast(`${state.id} is now ${status}`);
                    this.renderer.draw();
                }
            }
        });

        // Mouse move event
        this.canvas.addEventListener('mousemove', (e) => {
            const logicalPos = {
                x: e.offsetX,
                y: e.offsetY
            };
            
            // Drag state
            if (isDragging && draggedState) {
                draggedState.x = logicalPos.x;
                draggedState.y = logicalPos.y;
                this.renderer.draw();
            } 
            // Update temporary transition line
            else if (this.dfa.tempTransition) {
                this.dfa.tempTransition.to = logicalPos;
                this.renderer.draw();
            }
        });

        // Mouse up event
        this.canvas.addEventListener('mouseup', (e) => {
            const logicalPos = {
                x: e.offsetX,
                y: e.offsetY
            };
            const state = this.renderer.getStateAt(logicalPos.x, logicalPos.y);

            // Complete transition if ending on a state
            if (this.dfa.tempTransition && state) {
                const symbol = prompt(`Transition on input (${this.dfa.alphabet.join(',')}):`);
                
                if (symbol) {
                    // Split by comma to allow multiple symbols at once
                    const symbols = symbol.split(',').map(s => s.trim()).filter(s => s);
                    let added = 0;
                    
                    symbols.forEach(s => {
                        if (this.dfa.alphabet.includes(s)) {
                            this.dfa.addTransition(
                                this.dfa.tempTransition.from, 
                                state, 
                                s
                            );
                            added++;
                        }
                    });
                    
                    if (added > 0) {
                        this.showToast(`Added ${added} transition(s)`);
                    } else {
                        this.showToast('Invalid symbol(s)! Must be in alphabet.', true);
                    }
                }
            }

            // Reset temporary states
            this.dfa.tempTransition = null;
            isDragging = false;
            draggedState = null;
            this.renderer.draw();
        });
    }

    /**
     * Change interaction mode
     */
    setMode(mode, btnElement) {
        this.mode = mode;
        
        // Update UI active class
        document.querySelectorAll('.tool-btn').forEach(b => {
            b.classList.remove('active');
        });
        if (btnElement) {
            btnElement.classList.add('active');
        }

        // Change cursor based on mode
        const cursors = {
            'addState': 'crosshair',
            'addTransition': 'pointer',
            'setStart': 'pointer',
            'toggleFinal': 'pointer'
        };
        this.canvas.style.cursor = cursors[mode] || 'default';

        // Show toast to inform user of mode change
        const modeNames = {
            'addState': 'Add State - Click to create',
            'addTransition': 'Add Transition - Drag between states',
            'setStart': 'Set Start - Click a state',
            'toggleFinal': 'Toggle Final - Click a state'
        };
        
        if (modeNames[mode]) {
            this.showToast(modeNames[mode], false);
        }
    }

    /**
     * Delete currently selected state
     */
    deleteSelected() {
        if (this.dfa.selectedState) {
            this.dfa.deleteState(this.dfa.selectedState);
            this.showToast('State deleted');
            this.renderer.draw();
        } else {
            this.showToast('No state selected. Click a state first!', true);
        }
    }

    /**
     * Clear entire canvas
     */
    clearAll() {
        if (confirm('Clear entire canvas? This cannot be undone.')) {
            this.dfa.reset();
            this.stopSimulation();
            this.renderer.draw();
            this.showToast('Canvas cleared');
        }
    }

    /**
     * Update alphabet from input
     */
    updateAlphabet() {
        const val = document.getElementById('alphabetInput').value;
        this.dfa.alphabet = val.split(',')
            .map(s => s.trim())
            .filter(s => s);
        
        this.showToast('Alphabet updated: ' + this.dfa.alphabet.join(', '));
    }

    // ==================== SIMULATION ====================

    /**
     * Start simulation with input string
     */
    startSimulation() {
        const input = document.getElementById('simulateInput').value;
        
        if (!this.dfa.startState) {
            return this.showToast('Set a start state first!', true);
        }
        
        this.simString = input;
        this.simIndex = 0;
        this.dfa.currentState = this.dfa.startState;
        
        // Show simulation controls
        document.getElementById('simControls').classList.remove('hidden');
        this.updateSimUI();
        this.renderer.draw();
    }

    /**
     * Stop simulation
     */
    stopSimulation() {
        clearInterval(this.simInterval);
        this.dfa.currentState = null;
        document.getElementById('simControls').classList.add('hidden');
        this.renderer.draw();
    }

    /**
     * Step through simulation (forward or backward)
     */
    stepSimulation(dir = 1) {
        if (dir === 1) {
            // Step forward
            if (this.simIndex >= this.simString.length) {
                this.finishSimulation();
                return;
            }
            
            const char = this.simString[this.simIndex];
            const trans = this.dfa.getTransition(this.dfa.currentState, char);
            
            if (trans) {
                this.dfa.currentState = trans.to;
                this.simIndex++;
                this.updateSimUI();
                this.renderer.draw();
            } else {
                this.showToast(`Crashed! No transition for '${char}' from ${this.dfa.currentState.id}`, true);
                this.stopSimulation();
            }
        }
    }

    /**
     * Auto-run simulation with interval
     */
    autoSimulation() {
        if (this.simInterval) clearInterval(this.simInterval);
        this.simInterval = setInterval(() => {
            this.stepSimulation(1);
        }, 800);
    }

    /**
     * Finish simulation and show result
     */
    finishSimulation() {
        clearInterval(this.simInterval);
        const accepted = this.dfa.currentState.isFinal;
        const status = document.getElementById('simStatus');
        
        status.innerHTML = accepted 
            ? '<span style="color:var(--success)">✓ ACCEPTED</span>' 
            : '<span style="color:var(--error)">✗ REJECTED</span>';
        
        this.showToast(
            accepted ? 'String accepted!' : 'String rejected!',
            !accepted
        );
    }

    /**
     * Update simulation UI display
     */
    updateSimUI() {
        const display = document.getElementById('simDisplay');
        let html = '';
        
        for (let i = 0; i < this.simString.length; i++) {
            if (i === this.simIndex) {
                html += `<span class="char active">${this.simString[i]}</span>`;
            } else {
                html += `<span class="char">${this.simString[i]}</span>`;
            }
        }
        
        if (this.simIndex === this.simString.length) {
            html += ' <span style="font-size:12px; color:var(--text-muted)">END</span>';
        }
        
        display.innerHTML = html;
        document.getElementById('simStatus').innerText = "Running...";
    }

    // ==================== BATCH TESTING ====================

    /**
     * Run batch tests on multiple strings
     */
    runBatchTests() {
        const lines = document.getElementById('testInput').value.split('\n');
        const resultsDiv = document.getElementById('testResults');
        resultsDiv.innerHTML = '';

        if (!this.dfa.startState) {
            return this.showToast('No start state defined!', true);
        }

        lines.forEach(str => {
            if (!str.trim()) return;
            
            // Simulate the string
            let curr = this.dfa.startState;
            let valid = true;
            
            for (let char of str.trim()) {
                const t = this.dfa.getTransition(curr, char);
                if (t) {
                    curr = t.to;
                } else {
                    valid = false;
                    break;
                }
            }
            
            const accepted = valid && curr.isFinal;
            const color = accepted ? 'var(--success)' : 'var(--error)';
            const text = accepted ? 'PASS' : 'FAIL';
            
            resultsDiv.innerHTML += `
                <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-family:monospace; background:rgba(0,0,0,0.2); padding:6px 10px; border-radius:4px; border-left: 3px solid ${color}; color: var(--text-main)">
                    <span>${str}</span>
                    <span style="color:${color}; font-weight:bold">${text}</span>
                </div>
            `;
        });
    }

    // ==================== MINIMIZATION ====================

    /**
     * Minimize DFA using backend
     */
    minimizeDFA() {
        const dfaData = this.dfa.toJSON();
        
        fetch('/api/minimize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dfaData)
        })
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                this.showToast(data.error, true);
                return;
            }
            
            this.showMinimizationSteps(data.steps);
        })
        .catch(err => {
            console.error(err);
            this.showToast('Error minimizing DFA', true);
        });
    }

    /**
     * Show minimization steps in modal
     */
    showMinimizationSteps(steps) {
        const modal = document.getElementById('minModalOverlay');
        const body = document.getElementById('minStepsBody');
        body.innerHTML = '';
        
        steps.forEach((step, index) => {
            const partitionsHtml = step.partitions.map(p => 
                `{${p.join(', ')}}`
            ).join(' | ');
            
            body.innerHTML += `
                <div class="step-card">
                    <div class="step-title">${step.description}</div>
                    <div class="partition-display">${partitionsHtml}</div>
                </div>
            `;
        });
        
        modal.classList.add('open');
    }

    /**
     * Close minimization modal
     */
    closeMinModal() {
        document.getElementById('minModalOverlay').classList.remove('open');
    }

    // ==================== IMPORT/EXPORT ====================

    /**
     * Export DFA to JSON file
     */
    exportDFA() {
        const data = JSON.stringify(this.dfa.toJSON(), null, 2);
        
        const blob = new Blob([data], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'dfa.json';
        a.click();
        
        this.showToast('DFA exported successfully');
    }

    /**
     * Import DFA from JSON file
     */
    importDFA(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.dfa.fromJSON(data);
                
                // Update UI
                document.getElementById('alphabetInput').value = this.dfa.alphabet.join(',');
                this.renderer.draw();
                
                this.showToast('DFA imported successfully');
            } catch (err) {
                this.showToast('Error loading file: Invalid JSON', true);
                console.error(err);
            }
        };
        reader.readAsText(file);
    }

    /**
     * Import JFLAP file
     */
    importJFLAP(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const xmlContent = e.target.result;
            
            fetch('/api/import-jflap', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ xml: xmlContent })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    this.dfa.fromJSON(data.dfa);
                    document.getElementById('alphabetInput').value = this.dfa.alphabet.join(',');
                    this.renderer.draw();
                    this.showToast('JFLAP file imported successfully');
                } else {
                    this.showToast(data.error, true);
                }
            })
            .catch(err => {
                console.error(err);
                this.showToast('Error importing JFLAP file', true);
            });
        };
        reader.readAsText(file);
    }

    // ==================== UTILITIES ====================

    /**
     * Show toast notification
     */
    showToast(msg, isError = false) {
        const t = document.getElementById('toast');
        t.innerText = msg;
        if (isError) {
            t.classList.add('error');
        } else {
            t.classList.remove('error');
        }
        t.classList.add('show');
        
        setTimeout(() => {
            t.classList.remove('show');
        }, 3000);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    try {
        window.app = new App();
        console.log('✅ Automata Pro initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize Automata Pro:', error);
    }
});