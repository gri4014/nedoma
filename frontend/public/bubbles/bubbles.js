// Global variables
let canvas = null;
let ctx = null;
const bubbles = [];

// Configuration
const config = {
  colors: {
    'Спорт': 'hsl(200, 70%, 45%)',
    'Культура': 'hsl(0, 70%, 50%)',
    'Развлечения': 'hsl(280, 60%, 45%)',
    'default': 'hsl(200, 70%, 45%)'
  },
  sizes: {
    0: 40,  // Default/unselected
    1: 60,  // First level
    2: 80   // Second level
  },
  physics: {
    centeringForce: 0.00005,
    friction: 0.995,
    maxVelocity: 2,
    collisionElasticity: 0.95,
    initialVelocityRange: 3
  }
};

let canvasInitialized = false;
let bubblesInitialized = false;

class Bubble {
   constructor(x, y, subcategory, categoryColor) {
       this.x = x;
       this.y = y;
       this.name = subcategory.name;
       this.id = subcategory.id;
       this.color = categoryColor;
       this.sizeState = 0;
       this.targetSize = this.getSizeForState(0);
       this.currentSize = this.targetSize;
       this.dx = (Math.random() - 0.5) * config.physics.initialVelocityRange;
       this.dy = (Math.random() - 0.5) * config.physics.initialVelocityRange;
   }

   getSizeForState(state) {
       return config.sizes[state];
   }

   update(canvas) {
       const centerX = canvas.width / (2 * window.devicePixelRatio);
       const centerY = canvas.height / (2 * window.devicePixelRatio);
       const towardsCenterX = centerX - this.x;
       const towardsCenterY = centerY - this.y;
       const distanceToCenter = Math.sqrt(towardsCenterX * towardsCenterX + towardsCenterY * towardsCenterY);
      
       if (distanceToCenter > 0) {
           this.dx += (towardsCenterX / distanceToCenter) * config.physics.centeringForce * distanceToCenter;
           this.dy += (towardsCenterY / distanceToCenter) * config.physics.centeringForce * distanceToCenter;
       }

       this.dx *= config.physics.friction;
       this.dy *= config.physics.friction;

       const currentVelocity = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
       if (currentVelocity > config.physics.maxVelocity) {
           const scale = config.physics.maxVelocity / currentVelocity;
           this.dx *= scale;
           this.dy *= scale;
       }

       this.x += this.dx;
       this.y += this.dy;

       const maxX = canvas.width / window.devicePixelRatio;
       const maxY = canvas.height / window.devicePixelRatio;
      
       if (this.x < this.currentSize || this.x > maxX - this.currentSize) {
           this.dx *= -1;
           this.x = Math.max(this.currentSize, Math.min(maxX - this.currentSize, this.x));
       }
       if (this.y < this.currentSize || this.y > maxY - this.currentSize) {
           this.dy *= -1;
           this.y = Math.max(this.currentSize, Math.min(maxY - this.currentSize, this.y));
       }

       const sizeGap = this.targetSize - this.currentSize;
       if (Math.abs(sizeGap) > 0.1) {
           this.currentSize += sizeGap * 0.1;
       }
   }

   handleClick(x, y) {
       const distance = Math.sqrt(Math.pow(this.x - x, 2) + Math.pow(this.y - y, 2));
       if (distance < this.currentSize) {
           this.sizeState = (this.sizeState + 1) % 3;
           this.targetSize = this.getSizeForState(this.sizeState);
          
           window.parent.postMessage({
               type: 'preferenceChange',
               subcategoryId: this.id,
               level: this.sizeState
           }, '*');
          
           return true;
       }
       return false;
   }

   draw(ctx) {
       if (!ctx) return;
       
       ctx.save();
      
       const gradient = ctx.createRadialGradient(
           this.x, this.y, 0,
           this.x, this.y, this.currentSize
       );
      
       const baseColor = this.color;
       const lighterColor = this.getLighterVariant(baseColor);

       gradient.addColorStop(0, lighterColor);
       gradient.addColorStop(1, baseColor);

       ctx.beginPath();
       ctx.arc(this.x, this.y, this.currentSize, 0, Math.PI * 2);
       ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
       ctx.shadowBlur = 10;
       ctx.shadowOffsetX = 2;
       ctx.shadowOffsetY = 2;
       ctx.fillStyle = gradient;
       ctx.fill();

       ctx.shadowColor = 'transparent';
       ctx.lineWidth = 1;
       ctx.strokeStyle = lighterColor;
       ctx.stroke();

       const maxWidth = this.currentSize * 1.5;
       ctx.fillStyle = '#fff';
       ctx.font = '16px "Gill Sans", "Gill Sans MT", Helvetica, Arial, sans-serif';
       ctx.textAlign = 'center';
       ctx.textBaseline = 'middle';
       
       ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
       ctx.shadowBlur = 2;

       const words = this.name.split(' ');
       let lines = [];
       let currentLine = words[0];

       for (let i = 1; i < words.length; i++) {
           const testLine = currentLine + ' ' + words[i];
           const metrics = ctx.measureText(testLine);
           
           if (metrics.width > maxWidth) {
               lines.push(currentLine);
               currentLine = words[i];
           } else {
               currentLine = testLine;
           }
       }
       lines.push(currentLine);

       const lineHeight = 18;
       const totalHeight = lineHeight * (lines.length - 1);
       const startY = this.y - totalHeight / 2;

       lines.forEach((line, index) => {
           ctx.fillText(line, this.x, startY + index * lineHeight);
       });
      
       ctx.restore();
   }

   getLighterVariant(baseColor) {
       const match = baseColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
       if (!match) return baseColor;

       const h = parseInt(match[1]);
       const s = parseInt(match[2]);
       const l = parseInt(match[3]);

       return `hsl(${h}, ${s}%, ${Math.min(l + 10, 100)}%)`;
   }
}

function initializeCanvas() {
   if (canvasInitialized) return;
   
   console.log('Initializing canvas');
   canvas = document.getElementById('bubbleCanvas');
   if (!canvas) {
       console.error('Canvas element not found');
       return;
   }
   
   ctx = canvas.getContext('2d', { alpha: false });
   if (!ctx) {
       console.error('Could not get canvas context');
       return;
   }

   resizeCanvas();
   window.addEventListener('resize', resizeCanvas);
   
   canvas.addEventListener('click', (event) => {
       const rect = canvas.getBoundingClientRect();
       const dpr = window.devicePixelRatio || 1;
       const x = (event.clientX - rect.left);
       const y = (event.clientY - rect.top);

       for (const bubble of bubbles) {
           if (bubble.handleClick(x, y)) {
               break;
           }
       }
   });

   canvasInitialized = true;
   animate();
   console.log('Canvas initialized successfully');
}

function resizeCanvas() {
   if (!canvas || !ctx) return;
   
   const dpr = window.devicePixelRatio || 1;
   const displayWidth = window.innerWidth;
   const displayHeight = window.innerHeight;

   canvas.style.width = `${displayWidth}px`;
   canvas.style.height = `${displayHeight}px`;
   
   canvas.width = displayWidth * dpr;
   canvas.height = displayHeight * dpr;

   ctx.scale(dpr, dpr);
   ctx.textRendering = 'optimizeLegibility';
   ctx.imageSmoothingEnabled = true;
   ctx.imageSmoothingQuality = 'high';
}

function animate() {
   if (!canvas || !ctx) return;
   
   ctx.fillStyle = '#F9F7FE';
   ctx.fillRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);

   bubbles.forEach(bubble => {
       bubble.update(canvas);
       bubble.draw(ctx);
   });

   handleCollisions();
   requestAnimationFrame(animate);
}

function handleCollisions() {
   for (let i = 0; i < bubbles.length; i++) {
       for (let j = i + 1; j < bubbles.length; j++) {
           const b1 = bubbles[i];
           const b2 = bubbles[j];
           const dx = b2.x - b1.x;
           const dy = b2.y - b1.y;
           const distance = Math.sqrt(dx * dx + dy * dy);
           const minDistance = b1.currentSize + b2.currentSize;

           if (distance < minDistance) {
               const angle = Math.atan2(dy, dx);
               const overlap = minDistance - distance;
              
               const moveX = overlap * Math.cos(angle) * 0.3;
               const moveY = overlap * Math.sin(angle) * 0.3;
              
               b1.x -= moveX;
               b1.y -= moveY;
               b2.x += moveX;
               b2.y += moveY;

               const normalX = dx / distance;
               const normalY = dy / distance;
               const p = 2.0 * (b1.dx * normalX + b1.dy * normalY);
              
               b1.dx = (b1.dx - normalX * p) * config.physics.collisionElasticity;
               b1.dy = (b1.dy - normalY * p) * config.physics.collisionElasticity;
               b2.dx = (b2.dx + normalX * p) * config.physics.collisionElasticity;
               b2.dy = (b2.dy + normalY * p) * config.physics.collisionElasticity;
           }
       }
   }
}

function initializeBubbles(categories) {
   console.log('Attempting to initialize bubbles with categories:', categories);
   
   if (!canvasInitialized) {
       console.error('Canvas not initialized yet');
       return;
   }
   
   if (!categories || !Array.isArray(categories)) {
       console.error('Invalid categories data:', categories);
       return;
   }

   bubbles.length = 0;
   const centerX = canvas.width / (2 * window.devicePixelRatio);
   const centerY = canvas.height / (2 * window.devicePixelRatio);
   const clusterRadius = Math.min(centerX, centerY) * 0.3;

   categories.forEach(category => {
       if (!category.children || !Array.isArray(category.children)) return;
       
       category.children.forEach(subcategory => {
           const categoryColor = config.colors[subcategory.categoryName] || config.colors.default;

           const angle = Math.random() * Math.PI * 2;
           const distance = Math.random() * clusterRadius;
           const x = centerX + Math.cos(angle) * distance;
           const y = centerY + Math.sin(angle) * distance;
           
           bubbles.push(new Bubble(x, y, subcategory, categoryColor));
       });
   });

   bubblesInitialized = true;
   console.log('Bubbles initialized successfully:', bubbles.length);
}

window.addEventListener('message', (event) => {
   console.log('Received message:', event.data);
   if (event.data.type === 'setCategories') {
       if (!canvasInitialized) {
           console.warn('Received categories before canvas initialization');
       }
       initializeBubbles(event.data.categories);
   }
});

document.addEventListener('DOMContentLoaded', () => {
   console.log('DOMContentLoaded, initializing canvas');
   initializeCanvas();
});
