// Physics constants
const SPRING_STRENGTH = 0.01; // Keep spring very weak during drag
const SPRING_DAMPING = 0.94;
const VELOCITY_LIMIT = 8;
const INERTIA = 0.90;
const COLLISION_RESTITUTION = 0.1;
const COLLISION_CORRECTION = 1.0; // Max correction strength
const COLLISION_BUFFER = 0;      // No buffer
const COLLISION_ITERATIONS = 20; // Increase iterations significantly

let isDragging = false;
let dragStartTime = 0;
let dragStartX = 0;
let dragStartY = 0;
let lastDragX = 0;
let lastDragY = 0;
let targetX = 0;
let targetY = 0;
let lastFrameTime = Date.now();
let dragDeltaX = 0;
let dragDeltaY = 0;

class Bubble {
   constructor(x, y, subcategory, categoryColor) {
       this.x = x;
       this.y = y;
       this.vx = 0;
       this.vy = 0;
       this.name = subcategory.name;
       this.id = subcategory.id;
       this.color = categoryColor;
       this.sizeState = 0;
       this.targetSize = this.getSizeForState(0);
       this.currentSize = this.targetSize;
   }

   getSizeForState(state) {
       const sizes = {
           0: 40,
           1: 60,
           2: 80
       };
       return sizes[state];
   }

   applySpringForce() {
       const dx = (targetX - this.x);
       const dy = (targetY - this.y);
       this.vx += dx * SPRING_STRENGTH;
       this.vy += dy * SPRING_STRENGTH;
       this.vx *= SPRING_DAMPING;
       this.vy *= SPRING_DAMPING;
   }

   applyIdleForces() {
       this.vx *= INERTIA;
       this.vy *= INERTIA;

       const centerX = canvas.width / (2 * window.devicePixelRatio);
       const centerY = canvas.height / (2 * window.devicePixelRatio);
       const towardsCenterX = centerX - this.x;
       const towardsCenterY = centerY - this.y;
       const distanceToCenter = Math.sqrt(towardsCenterX * towardsCenterX + towardsCenterY * towardsCenterY);
       
       if (distanceToCenter > 1) {
           const centeringForce = 0.00005;
           this.vx += (towardsCenterX / distanceToCenter) * centeringForce * distanceToCenter;
           this.vy += (towardsCenterY / distanceToCenter) * centeringForce * distanceToCenter;
       }
       if (Math.abs(this.vx) < 0.01) this.vx = 0;
       if (Math.abs(this.vy) < 0.01) this.vy = 0;
   }

   updatePosition(dt) {
       const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
       if (speed > VELOCITY_LIMIT) {
           this.vx = (this.vx / speed) * VELOCITY_LIMIT;
           this.vy = (this.vy / speed) * VELOCITY_LIMIT;
       }

       this.x += this.vx * dt;
       this.y += this.vy * dt;

       const maxX = canvas.width / window.devicePixelRatio;
       const maxY = canvas.height / window.devicePixelRatio;
       
       if (this.x < this.currentSize) {
           this.x = this.currentSize;
           this.vx *= -COLLISION_RESTITUTION;
       } else if (this.x > maxX - this.currentSize) {
           this.x = maxX - this.currentSize;
           this.vx *= -COLLISION_RESTITUTION;
       }
       if (this.y < this.currentSize) {
           this.y = this.currentSize;
           this.vy *= -COLLISION_RESTITUTION;
       } else if (this.y > maxY - this.currentSize) {
           this.y = maxY - this.currentSize;
           this.vy *= -COLLISION_RESTITUTION;
       }
   }

   updateSize() {
       const sizeGap = this.targetSize - this.currentSize;
       if (Math.abs(sizeGap) > 0.1) {
           this.currentSize += sizeGap * 0.1;
       } else {
           this.currentSize = this.targetSize;
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
       ctx.font = '18px "Gill Sans", "Gill Sans MT", Helvetica, Arial, sans-serif';
       ctx.textAlign = 'center';
       ctx.textBaseline = 'middle';
       
       ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
       ctx.shadowBlur = 2;

       const words = this.name.split(' ');
       let lines = [];
       let currentLine = words[0] || '';

       for (let i = 1; i < words.length; i++) {
           const testLine = currentLine + ' ' + words[i];
           const metrics = ctx.measureText(testLine);
           
           if (metrics.width > maxWidth && currentLine.length > 0) {
               lines.push(currentLine);
               currentLine = words[i];
           } else {
               currentLine = testLine;
           }
       }
       if (currentLine.length > 0) {
           lines.push(currentLine);
       }


       const lineHeight = 20;
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

// Canvas setup
const canvas = document.getElementById('bubbleCanvas');
const ctx = canvas.getContext('2d', { alpha: false });
const bubbles = [];
let isInitialized = false;

function resizeCanvas() {
   const dpr = window.devicePixelRatio || 1;
   canvas.style.width = window.innerWidth + 'px';
   canvas.style.height = window.innerHeight + 'px';
   canvas.width = window.innerWidth * dpr;
   canvas.height = window.innerHeight * dpr;
   ctx.scale(dpr, dpr);
   ctx.textRendering = 'optimizeLegibility';
   ctx.imageSmoothingEnabled = true;
   ctx.imageSmoothingQuality = 'high';
}

function getEventCoordinates(event) {
   const rect = canvas.getBoundingClientRect();
   const x = (event.clientX || event.touches[0].clientX) - rect.left;
   const y = (event.clientY || event.touches[0].clientY) - rect.top;
   return { x, y };
}

function handleDragStart(event) {
   event.preventDefault();
   const { x, y } = getEventCoordinates(event);
   dragStartTime = Date.now();
   dragStartX = x;
   dragStartY = y;
   lastDragX = x;
   lastDragY = y;
   targetX = x;
   targetY = y;
   isDragging = true;
   bubbles.forEach(b => { b.vx = 0; b.vy = 0; });
   dragDeltaX = 0;
   dragDeltaY = 0;
}

function handleDragMove(event) {
   if (!isDragging) return;
   event.preventDefault();
   const { x, y } = getEventCoordinates(event);
   targetX = x;
   targetY = y;
   dragDeltaX = x - lastDragX;
   dragDeltaY = y - lastDragY;
   lastDragX = x;
   lastDragY = y;
}

function handleDragEnd(event) {
   if (!isDragging) return;
   event.preventDefault();

   const timeDiff = Date.now() - dragStartTime;
   const { x, y } = getEventCoordinates(event);
   const dragDistance = Math.sqrt(Math.pow(x - dragStartX, 2) + Math.pow(y - dragStartY, 2));

   if (timeDiff < 200 && dragDistance < 10) {
       for (const bubble of bubbles) {
           if (bubble.handleClick(dragStartX, dragStartY)) { 
               break;
           }
       }
   } else {
       bubbles.forEach(b => {
           b.vx += dragDeltaX * 0.1; // Keep inertia impulse very low
           b.vy += dragDeltaY * 0.1;
       });
   }

   isDragging = false;
   dragDeltaX = 0;
   dragDeltaY = 0;
}

// Event handlers
canvas.addEventListener('mousedown', handleDragStart);
canvas.addEventListener('touchstart', handleDragStart, { passive: false });
canvas.addEventListener('mousemove', handleDragMove);
canvas.addEventListener('touchmove', handleDragMove, { passive: false });
canvas.addEventListener('mouseup', handleDragEnd);
canvas.addEventListener('touchend', handleDragEnd);
canvas.addEventListener('mouseleave', handleDragEnd);
canvas.addEventListener('touchcancel', handleDragEnd);

// Category colors
const categoryColors = {
   'Спорт': 'hsl(200, 70%, 45%)',
   'Культура': 'hsl(0, 70%, 50%)',
   'Развлечения': 'hsl(280, 60%, 45%)'
};

const fallbackColor = 'hsl(200, 70%, 45%)';

function initializeBubbles(categories) {
   console.log('Initializing bubbles with categories:', categories);
   if (!categories || !Array.isArray(categories) || isInitialized) {
       console.error('Invalid categories data or already initialized:', categories);
       return;
   }

   bubbles.length = 0;
   resizeCanvas();
   
   const centerX = window.innerWidth / 2;
   const centerY = window.innerHeight / 2;
   const clusterRadius = 20;
   
   console.log('Canvas dimensions:', {
       width: canvas.width,
       height: canvas.height,
       styleWidth: canvas.style.width,
       styleHeight: canvas.style.height,
       centerX,
       centerY,
       windowWidth: window.innerWidth,
       windowHeight: window.innerHeight
   });

   categories.forEach((category) => {
       const categoryColor = categoryColors[category.name] || fallbackColor;
       category.subcategories.forEach(subcategory => {
           const angle = Math.random() * Math.PI * 2;
           const distance = Math.random() * clusterRadius;
           const x = centerX + Math.cos(angle) * distance;
           const y = centerY + Math.sin(angle) * distance;
           
           bubbles.push(new Bubble(x, y, subcategory, categoryColor));
       });
   });

   isInitialized = true;
}

window.addEventListener('message', (event) => {
   console.log('Received message:', event.data);
   if (event.data.type === 'setCategories' && !isInitialized) {
       initializeBubbles(event.data.categories);
   }
});

console.log('Bubbles script loaded and waiting for categories data');

// Collision resolution function
function resolveCollisions() {
   for (let iter = 0; iter < COLLISION_ITERATIONS; iter++) {
       for (let i = 0; i < bubbles.length; i++) {
           for (let j = i + 1; j < bubbles.length; j++) {
               const b1 = bubbles[i];
               const b2 = bubbles[j];
               const dx = b2.x - b1.x;
               const dy = b2.y - b1.y;
               const distanceSq = dx * dx + dy * dy;
               const minDistance = b1.currentSize + b2.currentSize + COLLISION_BUFFER;
               const minDistanceSq = minDistance * minDistance;

               if (distanceSq < minDistanceSq && distanceSq > 0.001) {
                   const distance = Math.sqrt(distanceSq);
                   const angle = Math.atan2(dy, dx);
                   const overlap = minDistance - distance;
                   
                   const moveX = overlap * Math.cos(angle) * COLLISION_CORRECTION / COLLISION_ITERATIONS;
                   const moveY = overlap * Math.sin(angle) * COLLISION_CORRECTION / COLLISION_ITERATIONS;
                   
                   b1.x -= moveX;
                   b1.y -= moveY;
                   b2.x += moveX;
                   b2.y += moveY;

                   // Apply velocity exchange only if not dragging
                   if (!isDragging) {
                       const normal = { x: dx / distance, y: dy / distance };
                       const relativeVelocity = { x: b1.vx - b2.vx, y: b1.vy - b2.vy };
                       const normalVelocity = relativeVelocity.x * normal.x + relativeVelocity.y * normal.y;
                       
                       if (normalVelocity < 0) {
                           const impulse = (-(1 + COLLISION_RESTITUTION) * normalVelocity) / 2;
                           
                           b1.vx += impulse * normal.x;
                           b1.vy += impulse * normal.y;
                           b2.vx -= impulse * normal.x;
                           b2.vy -= impulse * normal.y;
                       }
                   }
               }
           }
       }
   }
}


function animate() {
   const currentTime = Date.now();
   const dt = Math.min((currentTime - lastFrameTime) / 16.67, 3);
   lastFrameTime = currentTime;

   ctx.fillStyle = '#F9F7FE';
   ctx.fillRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);

   // Apply forces
   bubbles.forEach(bubble => {
       if (isDragging) {
           bubble.applySpringForce();
       } else {
           bubble.applyIdleForces();
       }
   });

   // Update positions
   bubbles.forEach(bubble => bubble.updatePosition(dt));

   // Resolve collisions
   resolveCollisions();

   // Update sizes
   bubbles.forEach(bubble => bubble.updateSize());
   
   // Draw
   bubbles.forEach(bubble => bubble.draw(ctx));

   requestAnimationFrame(animate);
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);
lastFrameTime = Date.now();
animate();
