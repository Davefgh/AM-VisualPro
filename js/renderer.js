// Renderer Class - Handles all canvas drawing
class Renderer {
    constructor(canvas, dfa) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.dfa = dfa;
        this.stateRadius = 24;
        
        // High DPI scaling for retina displays
        this.dpr = window.devicePixelRatio || 1;
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    /**
     * Handle canvas resizing with proper DPI scaling
     */
    resize() {
        const wrapper = this.canvas.parentElement;
        this.canvas.width = wrapper.clientWidth * this.dpr;
        this.canvas.height = wrapper.clientHeight * this.dpr;
        this.canvas.style.width = wrapper.clientWidth + 'px';
        this.canvas.style.height = wrapper.clientHeight + 'px';
        this.ctx.scale(this.dpr, this.dpr);
        this.draw();
    }

    /**
     * Main draw function - clear and redraw everything
     */
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawTransitions();
        this.drawStates();
    }

    /**
     * Draw all states with proper styling
     */
    drawStates() {
        this.dfa.states.forEach(state => {
            const isSelected = state === this.dfa.selectedState;
            const isCurrent = state === this.dfa.currentState;
            const isStart = state === this.dfa.startState;

            // Add shadow/glow effect
            this.ctx.shadowColor = 'rgba(0,0,0,0.15)';
            this.ctx.shadowBlur = 10;
            this.ctx.shadowOffsetX = 0;
            this.ctx.shadowOffsetY = 4;

            // Special glow for current state
            if (isCurrent) {
                this.ctx.shadowColor = '#ec4899';
                this.ctx.shadowBlur = 20;
            }

            // Draw main circle
            this.ctx.beginPath();
            this.ctx.arc(state.x, state.y, this.stateRadius, 0, Math.PI * 2);
            
            // Fill with white
            this.ctx.fillStyle = '#fff';
            this.ctx.fill();
            
            // Stroke with appropriate color
            this.ctx.lineWidth = isSelected ? 3 : 2;
            this.ctx.strokeStyle = isCurrent ? '#ec4899' : (isStart ? '#10b981' : '#6366f1');
            this.ctx.stroke();

            // Reset shadow
            this.ctx.shadowColor = 'transparent';
            this.ctx.shadowBlur = 0;
            this.ctx.shadowOffsetX = 0;
            this.ctx.shadowOffsetY = 0;

            // Draw double circle for final states
            if (state.isFinal) {
                this.ctx.beginPath();
                this.ctx.arc(state.x, state.y, this.stateRadius - 5, 0, Math.PI * 2);
                this.ctx.strokeStyle = isCurrent ? '#ec4899' : '#6366f1';
                this.ctx.lineWidth = 1.5;
                this.ctx.stroke();
            }

            // Draw state label
            this.ctx.fillStyle = '#1e293b';
            this.ctx.font = 'bold 14px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(state.id, state.x, state.y);

            // Draw start arrow if start state
            if (isStart) {
                this.drawStartArrow(state);
            }
        });
    }

    /**
     * Draw the start arrow pointing to start state
     */
    drawStartArrow(state) {
        const arrowLength = 30;
        const startX = state.x - this.stateRadius - arrowLength;
        const endX = state.x - this.stateRadius - 5;
        const y = state.y;

        // Draw arrow line
        this.ctx.beginPath();
        this.ctx.moveTo(startX, y);
        this.ctx.lineTo(endX, y);
        this.ctx.strokeStyle = '#10b981';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Draw arrowhead
        this.ctx.beginPath();
        this.ctx.moveTo(endX, y);
        this.ctx.lineTo(endX - 7, y - 4);
        this.ctx.lineTo(endX - 7, y + 4);
        this.ctx.closePath();
        this.ctx.fillStyle = '#10b981';
        this.ctx.fill();
    }

    /**
     * Draw all transitions
     */
    drawTransitions() {
        // Group transitions between same states
        const grouped = {};
        this.dfa.transitions.forEach(t => {
            const key = `${t.from.id}-${t.to.id}`;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(t);
        });

        // Draw each group
        Object.values(grouped).forEach(group => {
            const labels = group.map(t => t.symbol).join(',');
            this.drawTransition(group[0].from, group[0].to, labels);
        });

        // Draw temporary transition line if exists
        if (this.dfa.tempTransition) {
            this.drawTempLine(
                this.dfa.tempTransition.from, 
                this.dfa.tempTransition.to
            );
        }
    }

    /**
     * Draw a single transition between two states
     */
    drawTransition(from, to, label) {
        this.ctx.strokeStyle = '#94a3b8';
        this.ctx.fillStyle = '#94a3b8';
        this.ctx.lineWidth = 1.5;
        this.ctx.font = '12px sans-serif';

        // Self-loop case
        if (from === to) {
            this.drawSelfLoop(from, label);
            return;
        }

        // Calculate angle and positions
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const angle = Math.atan2(dy, dx);
        
        const startX = from.x + this.stateRadius * Math.cos(angle);
        const startY = from.y + this.stateRadius * Math.sin(angle);
        const endX = to.x - this.stateRadius * Math.cos(angle);
        const endY = to.y - this.stateRadius * Math.sin(angle);

        // Draw line
        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        this.ctx.lineTo(endX, endY);
        this.ctx.stroke();

        // Draw arrowhead
        this.drawArrowhead(endX, endY, angle);

        // Draw label with background
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        
        // Background rectangle
        this.ctx.fillStyle = '#f8fafc';
        const textWidth = this.ctx.measureText(label).width + 8;
        this.ctx.fillRect(midX - textWidth/2, midY - 10, textWidth, 20);
        
        // Label text
        this.ctx.fillStyle = '#64748b';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(label, midX, midY);
    }

    /**
     * Draw a self-loop transition
     */
    drawSelfLoop(state, label) {
        const radius = this.stateRadius;
        const loopRadius = 25;
        
        // Draw loop arc
        this.ctx.beginPath();
        this.ctx.arc(
            state.x, 
            state.y - radius, 
            loopRadius, 
            -Math.PI/4, 
            Math.PI + Math.PI/4, 
            true
        );
        this.ctx.stroke();
        
        // Draw label above the loop
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(label, state.x, state.y - radius - loopRadius - 10);
    }

    /**
     * Draw arrowhead at the end of a transition
     */
    drawArrowhead(x, y, angle) {
        const headLength = 8;
        
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(
            x - headLength * Math.cos(angle - Math.PI / 6),
            y - headLength * Math.sin(angle - Math.PI / 6)
        );
        this.ctx.lineTo(
            x - headLength * Math.cos(angle + Math.PI / 6),
            y - headLength * Math.sin(angle + Math.PI / 6)
        );
        this.ctx.closePath();
        this.ctx.fillStyle = '#94a3b8';
        this.ctx.fill();
    }

    /**
     * Draw temporary dashed line while creating transition
     */
    drawTempLine(from, toPos) {
        this.ctx.beginPath();
        this.ctx.moveTo(from.x, from.y);
        this.ctx.lineTo(toPos.x, toPos.y);
        this.ctx.strokeStyle = '#cbd5e1';
        this.ctx.setLineDash([5, 5]);
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    /**
     * Get state at given coordinates (for mouse interaction)
     */
    getStateAt(x, y) {
        return this.dfa.states.find(state => {
            const dx = state.x - x;
            const dy = state.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance <= this.stateRadius;
        });
    }
}