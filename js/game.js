// 定义植物类型
const PLANT_TYPES = {
    PEASHOOTER: {
        color: '#73E66B',
        secondaryColor: '#4BAD45',
        borderColor: '#275E24',
        icon: '🌱',
        points: 80
    },
    SUNFLOWER: {
        color: '#FFE93B',
        secondaryColor: '#FFD000',
        borderColor: '#A88A0F',
        icon: '🌻',
        points: 100
    },
    WALLNUT: {
        color: '#C69C6D',
        secondaryColor: '#A67C4B',
        borderColor: '#654321',
        icon: '🥜',
        points: 120
    },
    CHOMPER: {
        color: '#FF6B9C',
        secondaryColor: '#E6457B',
        borderColor: '#8B2D4B',
        icon: '🌺',
        points: 90
    },
    REPEATER: {
        color: '#00E600',
        secondaryColor: '#00B300',
        borderColor: '#006600',
        icon: '🌿',
        points: 110
    }
};

// 添加消除特效类
class GrowthAnimation {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.particles = [];
        this.type = type;
        this.startTime = Date.now();
        this.duration = 500;
        
        // 创建更多粒子以强效果
        for(let i = 0; i < 15; i++) {
            this.particles.push({
                x: x + Math.random() * 30,
                y: y + Math.random() * 30,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                size: Math.random() * 15 + 5,
                color: PLANT_TYPES[type].color,
                alpha: 1,
                rotation: Math.random() * Math.PI * 2
            });
        }
    }

    update() {
        const progress = (Date.now() - this.startTime) / this.duration;
        
        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.2; // 添加重力效果
            p.alpha = 1 - progress;
            p.rotation += 0.1;
        });
        
        return progress < 1;
    }

    draw(ctx) {
        this.particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            
            // 绘制闪光粒子
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            
            // 绘制星形粒子
            ctx.beginPath();
            for(let i = 0; i < 5; i++) {
                const angle = (i * Math.PI * 2) / 5;
                const x = Math.cos(angle) * p.size;
                const y = Math.sin(angle) * p.size;
                if(i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            
            // 使用渐变填充
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
            gradient.addColorStop(0.5, p.color);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.fillStyle = gradient;
            ctx.fill();
            
            ctx.restore();
        });
    }
}

// 添加浇水动画效果
class WaterAnimation {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.particles = [];
        this.type = type;
        this.startTime = Date.now();
        this.duration = 500;
        this.blockSize = 50; // 设置固定大小
        
        // 创建水滴粒子
        for(let i = 0; i < 20; i++) {
            this.particles.push({
                x: x + this.blockSize/2,
                y: y + this.blockSize/2,
                vx: (Math.random() - 0.5) * 6,
                vy: Math.random() * -8,
                size: Math.random() * 4 + 2,
                alpha: 1
            });
        }
    }

    update() {
        const progress = (Date.now() - this.startTime) / this.duration;
        
        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.5; // 重
            p.alpha = 1 - progress;
        });
        
        return progress < 1;
    }

    draw(ctx) {
        this.particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = '#4AA5FF';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }
}

class PlantGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.cols = 8;
        this.rows = 8;
        this.blockSize = this.canvas.width / this.cols;
        
        this.grid = [];
        this.selectedBlock = null;
        this.animations = [];
        this.isProcessing = false;
        
        this.score = 0;
        this.currentLevel = 1;
        this.movesLeft = 50;
        this.rewardsCollected = {};
        
        // 完善关卡目标配置
        this.levelGoals = {
            1: { 
                SUNFLOWER: 20,
                moves: 50,
                scoreTarget: 1500
            },
            2: { 
                SUNFLOWER: 30,
                PEASHOOTER: 15,
                moves: 40,
                scoreTarget: 2000
            },
            3: { 
                SUNFLOWER: 40,
                PEASHOOTER: 30,
                WALLNUT: 10,
                moves: 30,
                scoreTarget: 2500
            }
        };
        
        this.levelMechanics = {
            1: {
                matchBonus: 1.0
            },
            // ... 其他机制配置 ...
        };
        
        this.collectedPlants = {
            SUNFLOWER: 0,
            PEASHOOTER: 0,
            WALLNUT: 0,
            CHOMPER: 0,
            REPEATER: 0
        };
        
        // 修改道具相关属性名称
        this.powerUps = {
            lightning: 3,    // 闪电道具数量（原种子道具）
            water: 2        // 浇水道具数量
        };
        this.selectedPowerUp = null;  // 当前选中的道具
        
        this.initializeGame();
        this.bindEvents();
        this.startGameLoop();
    }

    initializeGame() {
        // 初始化网格
        for(let y = 0; y < this.rows; y++) {
            this.grid[y] = [];
            for(let x = 0; x < this.cols; x++) {
                this.grid[y][x] = this.createRandomBlock();
            }
        }
        
        // 确保初始状态没有匹配
        this.removeInitialMatches();
        
        // 初始化目标显示
        this.updateGoalDisplay();
    }

    // 添加缺失的方法
    createRandomBlock() {
        const types = Object.keys(PLANT_TYPES);
        const type = types[Math.floor(Math.random() * types.length)];
        return {
            type: type,
            ...PLANT_TYPES[type]
        };
    }

    removeInitialMatches() {
        let hasMatches;
        do {
            hasMatches = false;
            // 检查水平方向
            for(let y = 0; y < this.rows; y++) {
                for(let x = 0; x < this.cols - 2; x++) {
                    if(!this.grid[y][x]) continue;
                    
                    let matchCount = 1;
                    while(x + matchCount < this.cols && 
                          this.grid[y][x].type === this.grid[y][x + matchCount]?.type) {
                        matchCount++;
                    }
                    
                    if(matchCount >= 3) {
                        this.grid[y][x] = this.createRandomBlock();
                        hasMatches = true;
                    }
                }
            }
            
            // 检查垂直方向
            for(let x = 0; x < this.cols; x++) {
                for(let y = 0; y < this.rows - 2; y++) {
                    if(!this.grid[y][x]) continue;
                    
                    let matchCount = 1;
                    while(y + matchCount < this.rows && 
                          this.grid[y][x].type === this.grid[y + matchCount]?.[x]?.type) {
                        matchCount++;
                    }
                    
                    if(matchCount >= 3) {
                        this.grid[y][x] = this.createRandomBlock();
                        hasMatches = true;
                    }
                }
            }
        } while(hasMatches);
    }

    bindEvents() {
        this.canvas.addEventListener('click', (e) => {
            if(this.isProcessing) return; // 如果正在处理动画，忽略点击
            
            const rect = this.canvas.getBoundingClientRect();
            const x = Math.floor((e.clientX - rect.left) / this.blockSize);
            const y = Math.floor((e.clientY - rect.top) / this.blockSize);
            
            if(this.selectedPowerUp) {
                this.usePowerUp(x, y);
            } else {
                this.handleBlockClick(x, y);
            }
        });

        document.querySelectorAll('.power-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if(this.isProcessing) return; // 如果正在处理动画，忽略点击
                
                const powerType = e.currentTarget.querySelector('.power-icon').textContent;
                this.selectPowerUp(powerType);
            });
        });
    }

    handleBlockClick(x, y) {
        if(!this.isValidPosition(x, y) || this.movesLeft <= 0 || 
           this.gameOver || this.isProcessing) return;
        
        if(!this.selectedBlock) {
            this.selectedBlock = {x, y};
        } else {
            if(this.isAdjacent(this.selectedBlock, {x, y})) {
                this.swapBlocks(this.selectedBlock, {x, y});
            } else {
                this.selectedBlock = {x, y};
            }
        }
    }

    isValidPosition(x, y) {
        return x >= 0 && x < this.cols && y >= 0 && y < this.rows;
    }

    isAdjacent(pos1, pos2) {
        const dx = Math.abs(pos1.x - pos2.x);
        const dy = Math.abs(pos1.y - pos2.y);
        return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
    }

    swapBlocks(pos1, pos2) {
        const temp = this.grid[pos1.y][pos1.x];
        this.grid[pos1.y][pos1.x] = this.grid[pos2.y][pos2.x];
        this.grid[pos2.y][pos2.x] = temp;
        
        const matches = this.findMatches();
        if(matches.length > 0) {
            this.movesLeft--;
            this.handleMatches(matches);
        } else {
            const temp = this.grid[pos1.y][pos1.x];
            this.grid[pos1.y][pos1.x] = this.grid[pos2.y][pos2.x];
            this.grid[pos2.y][pos2.x] = temp;
        }
        
        this.selectedBlock = null;
        this.updateUI();
    }

    findMatches() {
        const matches = new Set();
        
        // 检查水平匹配
        for(let y = 0; y < this.rows; y++) {
            for(let x = 0; x < this.cols - 2; x++) {
                if(!this.grid[y][x]) continue;
                
                let matchCount = 1;
                while(x + matchCount < this.cols && 
                      this.grid[y][x].type === this.grid[y][x + matchCount]?.type) {
                    matchCount++;
                }
                
                if(matchCount >= 3) {
                    for(let i = 0; i < matchCount; i++) {
                        matches.add(`${y},${x + i}`);
                    }
                }
            }
        }
        
        // 检查垂直匹配
        for(let x = 0; x < this.cols; x++) {
            for(let y = 0; y < this.rows - 2; y++) {
                if(!this.grid[y][x]) continue;
                
                let matchCount = 1;
                while(y + matchCount < this.rows && 
                      this.grid[y][x].type === this.grid[y + matchCount]?.[x]?.type) {
                    matchCount++;
                }
                
                if(matchCount >= 3) {
                    for(let i = 0; i < matchCount; i++) {
                        matches.add(`${y + i},${x}`);
                    }
                }
            }
        }
        
        return Array.from(matches);
    }

    handleMatches(matches) {
        matches.forEach(pos => {
            const [y, x] = pos.split(',').map(Number);
            const block = this.grid[y][x];
            this.collectedPlants[block.type]++;
            
            // 添加消除动画
            this.animations.push(new GrowthAnimation(
                x * this.blockSize,
                y * this.blockSize,
                block.type
            ));
            
            this.grid[y][x] = null;
        });
        
        this.updateScore(matches.length * 10);
        this.dropBlocks();
        this.fillEmptySpaces();
        
        // 检查是否达成关卡目标
        this.checkLevelComplete();
        
        // 检查新的匹配
        setTimeout(() => {
            this.checkNewMatches();
        }, 300);
    }

    dropBlocks() {
        for(let x = 0; x < this.cols; x++) {
            let writePos = this.rows - 1;
            for(let y = this.rows - 1; y >= 0; y--) {
                if(this.grid[y][x]) {
                    if(y !== writePos) {
                        this.grid[writePos][x] = this.grid[y][x];
                        this.grid[y][x] = null;
                    }
                    writePos--;
                }
            }
        }
    }

    fillEmptySpaces() {
        for(let y = 0; y < this.rows; y++) {
            for(let x = 0; x < this.cols; x++) {
                if(!this.grid[y][x]) {
                    this.grid[y][x] = this.createRandomBlock();
                }
            }
        }
    }

    checkNewMatches() {
        const matches = this.findMatches();
        if(matches.length > 0) {
            setTimeout(() => {
                this.handleMatches(matches);
            }, 300);
        }
    }

    updateScore(points) {
        this.score += points;
        document.getElementById('score').textContent = this.score;
    }

    updateUI() {
        // 更新分数和步数
        document.getElementById('score').textContent = this.score;
        document.getElementById('movesLeft').textContent = this.movesLeft;
        
        // 更新收集数量
        const currentGoals = this.levelGoals[this.currentLevel];
        Object.entries(currentGoals).forEach(([type, target]) => {
            if(type !== 'moves' && type !== 'scoreTarget') {
                const countElement = document.getElementById(`${type.toLowerCase()}Count`);
                if(countElement) {
                    countElement.textContent = this.collectedPlants[type];
                }
            }
        });
    }

    drawBlock(x, y, block) {
        const size = this.blockSize;
        const ctx = this.ctx;
        const padding = 2;
        
        ctx.save();
        
        // 绘制方块底部阴影
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(
            x * size + padding + 2,
            y * size + padding + 2,
            size - padding * 2,
            size - padding * 2
        );
        
        // 绘制主体背景
        const gradient = ctx.createLinearGradient(
            x * size + padding,
            y * size + padding,
            x * size + padding,
            y * size + size - padding
        );
        gradient.addColorStop(0, block.color);
        gradient.addColorStop(1, block.secondaryColor);
        
        // 绘制圆角矩形
        ctx.beginPath();
        const radius = 8;
        ctx.roundRect(
            x * size + padding,
            y * size + padding,
            size - padding * 2,
            size - padding * 2,
            radius
        );
        
        // 填充渐变色
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // 绘制边框
        ctx.strokeStyle = block.borderColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 添加高光效果
        const highlightGradient = ctx.createLinearGradient(
            x * size + padding,
            y * size + padding,
            x * size + padding,
            y * size + padding + (size - padding * 2) * 0.5
        );
        highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = highlightGradient;
        ctx.fill();
        
        // 绘制图标
        ctx.font = `${size * 0.6}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = block.borderColor;
        ctx.fillText(
            block.icon,
            x * size + size/2,
            y * size + size/2
        );
        
        ctx.restore();
    }

    drawSelection(x, y) {
        const size = this.blockSize;
        const ctx = this.ctx;
        const padding = 2;
        
        ctx.save();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.strokeRect(
            x * size + padding,
            y * size + padding,
            size - padding * 2,
            size - padding * 2
        );
        ctx.restore();
    }

    startGameLoop() {
        const gameLoop = () => {
            this.draw();
            requestAnimationFrame(gameLoop);
        };
        gameLoop();
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制深色背景
        this.ctx.fillStyle = '#1a4f1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制网格线
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        for(let i = 0; i <= this.rows; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, i * this.blockSize);
            this.ctx.lineTo(this.canvas.width, i * this.blockSize);
            this.ctx.stroke();
        }
        for(let i = 0; i <= this.cols; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.blockSize, 0);
            this.ctx.lineTo(i * this.blockSize, this.canvas.height);
            this.ctx.stroke();
        }
        
        // 绘制方块
        for(let y = 0; y < this.rows; y++) {
            for(let x = 0; x < this.cols; x++) {
                const block = this.grid[y][x];
                if(block) {
                    this.drawBlock(x, y, block);
                }
            }
        }
        
        // 绘制选中效果
        if(this.selectedBlock) {
            this.drawSelection(this.selectedBlock.x, this.selectedBlock.y);
        }
        
        // 绘制动画
        this.animations = this.animations.filter(anim => {
            anim.draw(this.ctx);
            return anim.update();
        });
    }

    // 修改关卡完成检查逻辑
    checkLevelComplete() {
        const currentGoals = this.levelGoals[this.currentLevel];
        let completed = true;
        
        // 检查每个目标是否达成
        Object.entries(currentGoals).forEach(([type, target]) => {
            if(type !== 'moves' && type !== 'scoreTarget') {
                if(this.collectedPlants[type] < target) {
                    completed = false;
                }
            }
        });
        
        if(completed && this.movesLeft > 0) {
            setTimeout(() => {
                this.levelUp();
            }, 500);
        }
    }

    // 修改升级方法
    levelUp() {
        if(this.currentLevel < 3) {
            alert(`恭喜！完成第 ${this.currentLevel} 关！`);
            this.currentLevel++;
            
            // 重置游戏状态
            this.movesLeft = this.levelGoals[this.currentLevel].moves;
            this.selectedBlock = null;
            this.animations = [];
            this.isProcessing = false;
            
            // 重置收集数量（仅重置新关卡的目标植物）
            const nextGoals = this.levelGoals[this.currentLevel];
            Object.keys(nextGoals).forEach(type => {
                if(type !== 'moves' && type !== 'scoreTarget') {
                    this.collectedPlants[type] = 0;
                }
            });
            
            // 重置网格
            this.grid = [];
            this.initializeGame();
            
            // 更新目标显示
            this.updateGoalDisplay();
            
            // 更新UI
            this.updateUI();
            
            alert(`开始第 ${this.currentLevel} 关！`);
        } else {
            alert('恭喜通关！');
            if(confirm('要重新开始吗？')) {
                this.resetGame();
            }
        }
    }

    // 修改更新目标显示的方法
    updateGoalDisplay() {
        const goalContainer = document.querySelector('.goal-items');
        goalContainer.innerHTML = ''; // 清空现有目标
        
        // 添加当前关卡的所有目标
        const currentGoals = this.levelGoals[this.currentLevel];
        Object.entries(currentGoals).forEach(([type, target]) => {
            if(type !== 'moves' && type !== 'scoreTarget') {
                const plantType = PLANT_TYPES[type];
                const goalItem = document.createElement('div');
                goalItem.className = 'goal-item';
                goalItem.innerHTML = `
                    <span class="emoji">${plantType.icon}</span>
                    <span id="${type.toLowerCase()}Count">0</span>/${target}
                `;
                goalContainer.appendChild(goalItem);
            }
        });
    }

    // 修改重置游戏方
    resetGame() {
        this.currentLevel = 1;
        this.score = 0;
        this.movesLeft = this.levelGoals[1].moves;
        this.collectedPlants = {
            SUNFLOWER: 0,
            PEASHOOTER: 0,
            WALLNUT: 0,
            CHOMPER: 0,
            REPEATER: 0
        };
        this.selectedBlock = null;
        this.animations = [];
        this.isProcessing = false;
        
        this.grid = [];
        this.initializeGame();
        this.updateUI();
    }

    // 修改道具选择逻辑
    selectPowerUp(powerType) {
        // 先移除所有道具的选中状态
        document.querySelectorAll('.power-item').forEach(item => {
            item.classList.remove('selected');
        });

        if(powerType === '⚡️' && this.powerUps.lightning > 0) {
            this.selectedPowerUp = 'lightning';
            this.canvas.style.cursor = 'url(data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><text y="20" font-size="20">⚡️</text></svg>), auto';
            // 修正选择器
            document.querySelector('.power-item[data-type="lightning"]').classList.add('selected');
        } else if(powerType === '💧' && this.powerUps.water > 0) {
            this.selectedPowerUp = 'water';
            this.canvas.style.cursor = 'url(data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><text y="20" font-size="20">💧</text></svg>), auto';
            // 修正选择器
            document.querySelector('.power-item[data-type="water"]').classList.add('selected');
        } else {
            // 如果道具数量为0，显示提示
            if(powerType === '⚡️' && this.powerUps.lightning <= 0) {
                alert('闪电道具已用完！');
            } else if(powerType === '💧' && this.powerUps.water <= 0) {
                alert('浇水道具已用完！');
            }
        }
    }

    // 修改道具使用逻辑
    usePowerUp(x, y) {
        if(!this.isValidPosition(x, y) || this.isProcessing) return;

        this.isProcessing = true; // 开始处理
        let used = false;

        if(this.selectedPowerUp === 'lightning') {
            used = this.useLightningPowerUp(y);
        } else if(this.selectedPowerUp === 'water') {
            used = this.useWaterPowerUp(x, y);
        }

        if(used) {
            // 重置所有状态
            this.selectedPowerUp = null;
            this.selectedBlock = null; // 确保选中方块状态也被重置
            this.canvas.style.cursor = 'default';
            
            // 移除道具选中状态
            document.querySelectorAll('.power-item').forEach(item => {
                item.classList.remove('selected');
            });
            
            this.updatePowerUpDisplay();
            
            // 延迟重置处理状态，等待动画完成
            setTimeout(() => {
                this.isProcessing = false;
            }, 500);
        } else {
            this.isProcessing = false; // 如果没有使用道具，立即重置状态
        }
    }

    // 新增闪电道具效果
    useLightningPowerUp(row) {
        if(this.powerUps.lightning <= 0) return false;

        const removedBlocks = [];
        
        for(let x = 0; x < this.cols; x++) {
            if(this.grid[row][x]) {
                removedBlocks.push({
                    x: x,
                    y: row,
                    block: this.grid[row][x]
                });
                this.grid[row][x] = null;
            }
        }

        if(removedBlocks.length > 0) {
            this.animations.push(new LightningAnimation(row, this.blockSize));
            
            removedBlocks.forEach(({x, y, block}) => {
                this.collectedPlants[block.type]++;
                this.updateScore(PLANT_TYPES[block.type].points);
            });

            this.powerUps.lightning--;
            
            setTimeout(() => {
                this.dropBlocks();
                this.fillEmptySpaces();
                this.checkNewMatches();
            }, 300);

            return true;
        }
        return false;
    }

    // 更新道具显示
    updatePowerUpDisplay() {
        const powerItems = document.querySelectorAll('.power-item');
        powerItems[0].querySelector('.power-count').textContent = this.powerUps.lightning;
        powerItems[1].querySelector('.power-count').textContent = this.powerUps.water;
    }

    // 修改浇水道具使用逻辑
    useWaterPowerUp(x, y) {
        if(this.powerUps.water <= 0) return false;

        const block = this.grid[y][x];
        if(block) {
            this.collectedPlants[block.type]++;
            this.updateScore(PLANT_TYPES[block.type].points * 2);
            
            this.animations.push(new WaterAnimation(
                x * this.blockSize,
                y * this.blockSize,
                block.type
            ));
            
            this.grid[y][x] = null;
            this.powerUps.water--;
            
            setTimeout(() => {
                this.dropBlocks();
                this.fillEmptySpaces();
                this.checkNewMatches();
            }, 300);

            return true;
        }
        return false;
    }
}

// 添加闪电动画效果
class LightningAnimation {
    constructor(row, blockSize) {
        this.row = row;
        this.blockSize = blockSize;
        this.startTime = Date.now();
        this.duration = 500;
        this.particles = [];
        
        // 创建闪电粒子
        for(let i = 0; i < 30; i++) {
            this.particles.push({
                x: Math.random() * (blockSize * 8),
                y: row * blockSize + blockSize/2,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                size: Math.random() * 3 + 2,
                alpha: 1
            });
        }
    }

    update() {
        const progress = (Date.now() - this.startTime) / this.duration;
        
        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.alpha = 1 - progress;
        });
        
        return progress < 1;
    }

    draw(ctx) {
        ctx.save();
        
        // 绘制闪电主体效果
        const gradient = ctx.createLinearGradient(0, this.row * this.blockSize, 
                                                ctx.canvas.width, this.row * this.blockSize);
        gradient.addColorStop(0, 'rgba(255, 255, 0, 0)');
        gradient.addColorStop(0.5, `rgba(255, 255, 0, ${1 - (Date.now() - this.startTime) / this.duration})`);
        gradient.addColorStop(1, 'rgba(255, 255, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, this.row * this.blockSize, ctx.canvas.width, this.blockSize);
        
        // 绘制粒子效果
        this.particles.forEach(p => {
            ctx.fillStyle = `rgba(255, 255, 0, ${p.alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        
        ctx.restore();
    }
}

// 启动游戏
window.onload = () => {
    new PlantGame();
};