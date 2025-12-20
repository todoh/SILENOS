/* SILENOS 3/prog-ui-manager.js */

class ProgUIManager {
    constructor(container, owner) {
        this.container = container;
        this.owner = owner;
        this.scale = 1;
        this.panX = 0;
        this.panY = 0;
        this.isPanning = false;
    }

    setupEvents() {
        this.container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = -Math.sign(e.deltaY) * 0.1;
            this.scale = Math.min(Math.max(0.2, this.scale + delta), 3);
            this.updateTransform();
            this.owner.triggerChange();
        });

        this.container.addEventListener('mousedown', (e) => {
            if (e.target === this.container || e.target.classList.contains('prog-world') || e.target.tagName === 'svg') {
                this.isPanning = true;
                this.startX = e.clientX - this.panX;
                this.startY = e.clientY - this.panY;
                this.container.style.cursor = 'grabbing';
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (this.isPanning) {
                this.panX = e.clientX - this.startX;
                this.panY = e.clientY - this.startY;
                this.updateTransform();
            }
        });

        window.addEventListener('mouseup', () => {
            if (this.isPanning) this.owner.triggerChange();
            this.isPanning = false;
            this.container.style.cursor = 'default';
        });
    }

    updateTransform() {
        const world = this.container.querySelector('.prog-world');
        if (world) world.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
    }
}