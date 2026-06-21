// ============================================================
// 🎮  OLEADAS DE HIERRO  -  Versión 3.1 (Escalado hasta 100)
// ============================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;

// ---- UI ----
const hpSpan = document.getElementById('hp-bar');
const waveSpan = document.getElementById('wave-counter');
const coinSpan = document.getElementById('coin-counter');
const scoreDisplay = document.getElementById('score-display');
const scoreboardList = document.getElementById('scoreboard-list');

// ---- Constantes ----
const GRAVEDAD = 0.5;
const SUELO_Y = H - 20;
const OLEADAS_PARA_TIENDA = 3;
const MAX_OLEADA_TIENDA = 15;

// ---- Estado global ----
let oleadaActual = 1;
let monedas = 0;
let puntuacionTotal = 0;
let proyectiles = [];
let enemigos = [];
let enemigosPorGenerar = 0;
let timerGeneracion = 0;
let enemigosEliminados = 0;
let enemigosTotalOla = 0;
let gameOver = false;
let enPausa = false;
let enTienda = false;
let frames = 0;
let ataqueFlanco = false;
let mejoras = {
    dobleSalto: false,
    disparoArea: false,
    velocidad: false,
    vidaExtra: false,
    danoExtra: 0
};

// ---- Tabla de puntuación ----
let tablaPuntuacion = JSON.parse(localStorage.getItem('tablaPuntuacionOleadas')) || [];

// ---- Teclas ----
const teclas = {
    izquierda: false,
    derecha: false,
    saltar: false,
    disparar: false,
    dash: false,
    bloquear: false,
    pausa: false
};

// ============================================================
// 🧑 CLASE JUGADOR
// ============================================================
class Player {
    constructor() {
        this.x = 380;
        this.y = 200;
        this.width = 30;
        this.height = 50;
        this.color = '#00ffcc';
        this.hp = 100;
        this.maxHp = 100;

        this.velX = 0;
        this.velY = 0;
        this.speed = 5;
        this.jumpForce = -11;
        this.enSuelo = false;
        this.mirandoDerecha = true;
        this.saltosRestantes = 1;

        this.isBlocking = false;
        this.isDashing = false;
        this.dashSpeed = 15;
        this.dashFrames = 0;
        this.dashCooldown = 0;

        this.framesInvulnerabilidad = 0;
        this.shootCooldown = 0;
        this.shootDelay = 12;

        this.animFrame = 0;
        this.animTimer = 0;

        this.dobleSaltoActivo = false;
        this.disparoAreaActivo = false;
        this.danoExtra = 0;
    }

    update() {
        if (this.dashFrames > 0) this.dashFrames--;
        else this.isDashing = false;
        if (this.dashCooldown > 0) this.dashCooldown--;
        if (this.framesInvulnerabilidad > 0) this.framesInvulnerabilidad--;
        if (this.shootCooldown > 0) this.shootCooldown--;

        this.velY += GRAVEDAD;
        this.y += this.velY;

        if (this.isBlocking && this.enSuelo) this.velX = 0;
        this.x += this.velX;

        this.x = Math.max(0, Math.min(W - this.width, this.x));

        if (this.y + this.height >= SUELO_Y) {
            this.y = SUELO_Y - this.height;
            this.velY = 0;
            this.enSuelo = true;
            this.saltosRestantes = this.dobleSaltoActivo ? 2 : 1;
        } else {
            this.enSuelo = false;
        }

        if (Math.abs(this.velX) > 0.5 && this.enSuelo) {
            this.animTimer++;
            if (this.animTimer > 6) {
                this.animTimer = 0;
                this.animFrame = (this.animFrame + 1) % 4;
            }
        } else {
            this.animFrame = 0;
            this.animTimer = 0;
        }
    }

    draw() {
        if (this.framesInvulnerabilidad > 0 && Math.floor(Date.now() / 100) % 2 === 0) return;

        ctx.save();
        ctx.shadowColor = this.isDashing ? '#88ddff' : 'rgba(0,255,200,0.15)';
        ctx.shadowBlur = this.isDashing ? 30 : 10;

        let color = this.color;
        if (this.isBlocking) color = '#ffaa00';
        else if (this.isDashing) color = '#88ddff';
        else if (this.framesInvulnerabilidad > 0) color = '#ff6666';

        ctx.fillStyle = color;
        const r = 6,
            x = this.x,
            y = this.y,
            w = this.width,
            h = this.height;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        const ojoX = this.mirandoDerecha ? this.x + this.width - 8 : this.x + 4;
        const ojoY = this.y + 14;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ojoX, ojoY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ojoX + (this.mirandoDerecha ? -6 : 6), ojoY + 8, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.arc(ojoX + (this.mirandoDerecha ? -2 : 2), ojoY + 1, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ojoX + (this.mirandoDerecha ? -8 : 4), ojoY + 9, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        const hpW = 34;
        const hpX = this.x + this.width / 2 - hpW / 2;
        const hpY = this.y - 14;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(hpX - 1, hpY - 1, hpW + 2, 7);
        ctx.fillStyle = '#ff3333';
        ctx.fillRect(hpX, hpY, hpW, 5);
        ctx.fillStyle = '#44ff44';
        ctx.fillRect(hpX, hpY, (this.hp / this.maxHp) * hpW, 5);
    }

    saltar() {
        if (this.saltosRestantes > 0 && !this.isBlocking) {
            this.velY = this.jumpForce;
            this.saltosRestantes--;
            this.enSuelo = false;
        }
    }

    dash() {
        if (this.dashCooldown === 0 && !this.isBlocking) {
            this.isDashing = true;
            this.dashFrames = 12;
            this.dashCooldown = 90;
            this.velX = this.mirandoDerecha ? this.dashSpeed : -this.dashSpeed;
        }
    }

    disparar() {
        if (this.shootCooldown > 0 || this.isBlocking) return;
        const dir = this.mirandoDerecha ? 1 : -1;
        const danoBase = 25 + this.danoExtra;

        if (this.disparoAreaActivo) {
            for (let i = -1; i <= 1; i++) {
                proyectiles.push({
                    x: this.mirandoDerecha ? this.x + this.width : this.x - 12,
                    y: this.y + 18 + i * 8,
                    width: 14,
                    height: 6,
                    velX: 12 * dir,
                    velY: i * 1.5,
                    color: '#ff00aa',
                    damage: danoBase * 0.65
                });
            }
        } else {
            proyectiles.push({
                x: this.mirandoDerecha ? this.x + this.width : this.x - 12,
                y: this.y + 18,
                width: 14,
                height: 6,
                velX: 12 * dir,
                velY: 0,
                color: '#ff0044',
                damage: danoBase
            });
        }
        this.shootCooldown = this.shootDelay;
    }
}

// ============================================================
// 👾 CLASE ENEMIGO
// ============================================================
class Enemy {
    constructor(x, y, tipo, flanco = 'normal') {
        this.x = x;
        this.y = y;
        this.tipo = tipo;
        this.flanco = flanco;
        this.enSuelo = false;
        this.velY = 0;
        this.velX = 0;
        this.esquivando = false;
        this.tiempoEsquiva = 0;
        this.saltoCooldown = 0;
        this.estado = 'perseguir';
        this.esVolador = false;
        this.alturaVuelo = 0;
        this.oscilarTimer = 0;

        const factorEscalado = Math.min(oleadaActual, 100) / 10;
        const multVida = 1 + factorEscalado * 0.6;
        const multVel = 1 + factorEscalado * 0.08;
        const multDano = 1 + factorEscalado * 0.4;

        switch (tipo) {
            case 'rapido':
                this.width = 22;
                this.height = 38;
                this.color = '#f1c40f';
                this.colorSec = '#f39c12';
                this.hp = Math.floor((20 + oleadaActual * 1.2) * multVida);
                this.speed = (3.8 + oleadaActual * 0.06) * multVel;
                this.damage = Math.floor((10 + Math.floor(oleadaActual / 3)) * multDano);
                this.recompensa = 8;
                this.emoji = '⚡';
                break;
            case 'tanque':
                this.width = 48;
                this.height = 68;
                this.color = '#e74c3c';
                this.colorSec = '#c0392b';
                this.hp = Math.floor((130 + oleadaActual * 4) * multVida);
                this.speed = (1.0 + oleadaActual * 0.015) * multVel;
                this.damage = Math.floor((35 + Math.floor(oleadaActual / 2)) * multDano);
                this.recompensa = 15;
                this.emoji = '🛡️';
                break;
            case 'saltador':
                this.width = 28;
                this.height = 48;
                this.color = '#2ecc71';
                this.colorSec = '#27ae60';
                this.hp = Math.floor((50 + oleadaActual * 2.5) * multVida);
                this.speed = (2.2 + oleadaActual * 0.04) * multVel;
                this.damage = Math.floor((18 + Math.floor(oleadaActual / 2)) * multDano);
                this.recompensa = 10;
                this.emoji = '⬆️';
                this.saltoCooldown = 35 + Math.floor(Math.random() * 20);
                this.fuerzaSalto = -10 - Math.floor(oleadaActual / 6);
                break;
            case 'esquivador':
                this.width = 24;
                this.height = 44;
                this.color = '#3498db';
                this.colorSec = '#2980b9';
                this.hp = Math.floor((30 + oleadaActual * 1.8) * multVida);
                this.speed = (3.0 + oleadaActual * 0.05) * multVel;
                this.damage = Math.floor((14 + Math.floor(oleadaActual / 3)) * multDano);
                this.recompensa = 12;
                this.emoji = '🌀';
                break;
            case 'volador':
                this.width = 30;
                this.height = 30;
                this.color = '#ff6b6b';
                this.colorSec = '#ee5a24';
                this.hp = Math.floor((25 + oleadaActual * 1.8) * multVida);
                this.speed = (2.5 + oleadaActual * 0.05) * multVel;
                this.damage = Math.floor((12 + Math.floor(oleadaActual / 3)) * multDano);
                this.recompensa = 10;
                this.emoji = '🦅';
                this.esVolador = true;
                this.alturaVuelo = 80 + Math.random() * 60;
                this.y = y - this.alturaVuelo;
                this.velY = 0;
                break;
            case 'jefe':
                this.width = 58;
                this.height = 82;
                this.color = '#8e44ad';
                this.colorSec = '#6c3483';
                this.hp = Math.floor((200 + oleadaActual * 12) * multVida);
                this.speed = (0.7 + oleadaActual * 0.012) * multVel;
                this.damage = Math.floor((40 + Math.floor(oleadaActual / 1.5)) * multDano);
                this.recompensa = 50;
                this.emoji = '👑';
                break;
            default:
                this.width = 30;
                this.height = 50;
                this.color = '#9b59b6';
                this.colorSec = '#7d3c98';
                this.hp = Math.floor((50 + oleadaActual * 2) * multVida);
                this.speed = (2.0 + oleadaActual * 0.04) * multVel;
                this.damage = Math.floor((15 + Math.floor(oleadaActual / 2)) * multDano);
                this.recompensa = 5;
                this.emoji = '👾';
                break;
        }

        this.hp = Math.min(this.hp, 2500);
        this.speed = Math.min(this.speed, 12);
        this.damage = Math.min(this.damage, 120);

        this.maxHp = this.hp;
        this.hitTimer = 0;
        this.tiempoVida = 0;
        this.animFrame = 0;
        this.animTimer = 0;

        if (this.flanco === 'izquierda') {
            this.x = -80 - Math.random() * 40;
        } else if (this.flanco === 'derecha') {
            this.x = W + 80 + Math.random() * 40;
        }
    }

    update() {
        this.tiempoVida++;

        if (!this.esVolador) {
            this.velY += GRAVEDAD;
            this.y += this.velY;
            if (this.y + this.height >= SUELO_Y) {
                this.y = SUELO_Y - this.height;
                this.velY = 0;
                this.enSuelo = true;
            } else {
                this.enSuelo = false;
            }
        } else {
            this.oscilarTimer += 0.03;
            this.y = (this.yInicial || this.y) + Math.sin(this.oscilarTimer) * 15;
            this.velY = 0;
            this.enSuelo = false;
        }

        const centroJugador = jugador.x + jugador.width / 2;
        const centroEnemigo = this.x + this.width / 2;
        const dx = centroJugador - centroEnemigo;
        const dist = Math.abs(dx);

        if (this.esVolador) {
            this.iaVolador(dx, dist);
        } else {
            switch (this.tipo) {
                case 'saltador':
                    this.iaSaltador(dx, dist);
                    break;
                case 'esquivador':
                    this.iaEsquivador(dx, dist);
                    break;
                case 'jefe':
                    this.iaJefe(dx, dist);
                    break;
                default:
                    this.iaBasica(dx, dist);
                    break;
            }
        }

        this.x = Math.max(-150, Math.min(W + 150, this.x));
        if (this.hitTimer > 0) this.hitTimer--;

        if (Math.abs(this.velX) > 0.5 && !this.esVolador) {
            this.animTimer++;
            if (this.animTimer > 8) {
                this.animTimer = 0;
                this.animFrame = (this.animFrame + 1) % 4;
            }
        }
    }

    iaBasica(dx, dist) {
        if (dist > 5) {
            this.x += (dx > 0 ? 1 : -1) * this.speed;
        }
    }

    iaSaltador(dx, dist) {
        if (this.saltoCooldown > 0) this.saltoCooldown--;
        if (dist > 10) {
            this.x += (dx > 0 ? 1 : -1) * this.speed;
        }
        if (dist < 180 && this.enSuelo && this.saltoCooldown <= 0) {
            this.velY = this.fuerzaSalto || -10;
            this.saltoCooldown = 40 + Math.floor(Math.random() * 20);
        }
    }

    iaEsquivador(dx, dist) {
        for (const p of proyectiles) {
            const pDist = Math.abs(p.x - this.x);
            if (pDist < 80 && Math.abs(p.y - this.y) < 30) {
                if (this.enSuelo && Math.random() < 0.04) {
                    this.velY = -7;
                }
                this.x += (Math.random() < 0.5 ? 1 : -1) * this.speed * 0.6;
                this.esquivando = true;
                this.tiempoEsquiva = 20;
                break;
            }
        }
        if (this.tiempoEsquiva > 0) {
            this.tiempoEsquiva--;
        } else {
            this.esquivando = false;
            if (dist > 10) {
                this.x += (dx > 0 ? 1 : -1) * this.speed * 0.8;
            }
        }
    }

    iaVolador(dx, dist) {
        if (dist > 5) {
            this.x += (dx > 0 ? 1 : -1) * this.speed;
        }
        const dy = (jugador.y + jugador.height / 2) - (this.y + this.height / 2);
        if (Math.abs(dy) > 30) {
            this.y += Math.sign(dy) * 0.8;
        }
        this.y = Math.max(30, Math.min(H - 100, this.y));
    }

    iaJefe(dx, dist) {
        if (dist > 20) {
            this.x += (dx > 0 ? 1 : -1) * this.speed;
        }
        if (dist < 120 && this.enSuelo && Math.random() < 0.025) {
            this.velY = -10;
        }
        if (this.tiempoVida % 150 === 0 && enemigos.length < 30) {
            const tipoMini = ['normal', 'rapido', 'normal', 'saltador'][Math.floor(Math.random() * 4)];
            const mini = new Enemy(
                this.x + (Math.random() - 0.5) * 100,
                this.y - 20,
                tipoMini
            );
            mini.hp = Math.floor(mini.hp * 0.5);
            mini.maxHp = mini.hp;
            enemigos.push(mini);
        }
    }

    draw() {
        ctx.save();

        ctx.shadowColor = this.color;
        ctx.shadowBlur = this.tipo === 'jefe' ? 30 : 15;

        const colorActual = this.hitTimer > 0 ? '#ffffff' : this.color;
        ctx.fillStyle = colorActual;

        const x = this.x,
            y = this.y,
            w = this.width,
            h = this.height;

        // ---- Diseños ----
        if (this.esVolador) {
            ctx.beginPath();
            ctx.moveTo(x + w / 2, y);
            ctx.quadraticCurveTo(x + w, y + h * 0.2, x + w * 0.8, y + h * 0.5);
            ctx.quadraticCurveTo(x + w, y + h * 0.8, x + w / 2, y + h);
            ctx.quadraticCurveTo(x, y + h * 0.8, x + w * 0.2, y + h * 0.5);
            ctx.quadraticCurveTo(x, y + h * 0.2, x + w / 2, y);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = this.colorSec;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = '#fff';
            ctx.fillRect(x + w * 0.3, y + h * 0.25, 6, 6);
            ctx.fillRect(x + w * 0.55, y + h * 0.25, 6, 6);
            ctx.fillStyle = '#000';
            ctx.fillRect(x + w * 0.35, y + h * 0.3, 3, 3);
            ctx.fillRect(x + w * 0.6, y + h * 0.3, 3, 3);
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.fillRect(x - 8, y + h * 0.2, 6, h * 0.3);
            ctx.fillRect(x + w + 2, y + h * 0.2, 6, h * 0.3);
        } else if (this.tipo === 'rapido') {
            ctx.beginPath();
            ctx.moveTo(x, y + h / 2);
            ctx.lineTo(x + w * 0.3, y);
            ctx.lineTo(x + w * 0.5, y + h * 0.3);
            ctx.lineTo(x + w * 0.8, y);
            ctx.lineTo(x + w, y + h * 0.4);
            ctx.lineTo(x + w * 0.7, y + h * 0.7);
            ctx.lineTo(x + w, y + h);
            ctx.lineTo(x + w * 0.5, y + h * 0.7);
            ctx.lineTo(x + w * 0.2, y + h);
            ctx.lineTo(x, y + h * 0.6);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = this.colorSec;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = '#fff';
            ctx.fillRect(x + w * 0.25, y + h * 0.3, 6, 4);
            ctx.fillRect(x + w * 0.6, y + h * 0.3, 6, 4);
            ctx.fillStyle = '#000';
            ctx.fillRect(x + w * 0.35, y + h * 0.35, 3, 2);
            ctx.fillRect(x + w * 0.7, y + h * 0.35, 3, 2);
        } else if (this.tipo === 'tanque') {
            ctx.fillRect(x + 4, y, w - 8, h);
            ctx.fillStyle = this.colorSec;
            ctx.fillRect(x, y + 4, 6, h - 8);
            ctx.fillRect(x + w - 6, y + 4, 6, h - 8);
            ctx.fillStyle = '#fff';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('💪', x + w / 2, y + h / 2 + 8);
            ctx.fillStyle = '#fff';
            ctx.fillRect(x + w * 0.25, y + 8, 6, 6);
            ctx.fillRect(x + w * 0.6, y + 8, 6, 6);
            ctx.fillStyle = '#000';
            ctx.fillRect(x + w * 0.3, y + 10, 3, 3);
            ctx.fillRect(x + w * 0.65, y + 10, 3, 3);
        } else if (this.tipo === 'saltador') {
            ctx.beginPath();
            ctx.moveTo(x + w / 2, y);
            ctx.quadraticCurveTo(x + w, y + h * 0.2, x + w * 0.8, y + h * 0.4);
            ctx.quadraticCurveTo(x + w * 0.3, y + h * 0.3, x + w * 0.6, y + h * 0.6);
            ctx.quadraticCurveTo(x + w * 0.1, y + h * 0.5, x + w * 0.4, y + h * 0.8);
            ctx.quadraticCurveTo(x, y + h * 0.7, x + w / 2, y + h);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = this.colorSec;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(x + w * 0.3, y + h * 0.3, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x + w * 0.7, y + h * 0.3, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(x + w * 0.35, y + h * 0.35, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x + w * 0.75, y + h * 0.35, 3, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.tipo === 'esquivador') {
            ctx.beginPath();
            for (let i = 0; i < 20; i++) {
                const t = i / 20;
                const ang = t * Math.PI * 4;
                const rx = w / 2 * (0.3 + t * 0.7);
                const px = x + w / 2 + Math.cos(ang) * rx;
                const py = y + h / 2 + Math.sin(ang) * rx * 0.6;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = this.colorSec;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = '#fff';
            ctx.fillRect(x + w * 0.3, y + h * 0.3, 5, 5);
            ctx.fillRect(x + w * 0.55, y + h * 0.3, 5, 5);
            ctx.fillStyle = '#000';
            ctx.fillRect(x + w * 0.35, y + h * 0.35, 3, 2);
            ctx.fillRect(x + w * 0.6, y + h * 0.35, 3, 2);
        } else if (this.tipo === 'jefe') {
            ctx.fillRect(x + 6, y + 8, w - 12, h - 16);
            ctx.fillStyle = this.colorSec;
            ctx.fillRect(x, y + 12, 8, h - 24);
            ctx.fillRect(x + w - 8, y + 12, 8, h - 24);
            ctx.fillStyle = '#ffd700';
            ctx.font = '30px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('👑', x + w / 2, y - 2);
            ctx.fillStyle = '#ff0000';
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 20;
            ctx.fillRect(x + w * 0.2, y + h * 0.25, 10, 10);
            ctx.fillRect(x + w * 0.6, y + h * 0.25, 10, 10);
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#fff';
            ctx.fillRect(x + w * 0.25, y + h * 0.3, 4, 4);
            ctx.fillRect(x + w * 0.65, y + h * 0.3, 4, 4);
        } else {
            const r = 6;
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + r);
            ctx.lineTo(x + w, y + h - r);
            ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            ctx.lineTo(x + r, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = this.colorSec;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = '#fff';
            ctx.fillRect(x + w * 0.2, y + h * 0.2, 6, 6);
            ctx.fillRect(x + w * 0.55, y + h * 0.2, 6, 6);
            ctx.fillStyle = '#000';
            ctx.fillRect(x + w * 0.3, y + h * 0.25, 3, 3);
            ctx.fillRect(x + w * 0.65, y + h * 0.25, 3, 3);
        }

        ctx.restore();

        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(this.emoji, this.x + this.width / 2, this.y - 8);

        const hpW = this.tipo === 'jefe' ? this.width + 20 : this.width;
        const hpX = this.x + this.width / 2 - hpW / 2;
        const hpY = this.y - (this.tipo === 'jefe' ? 18 : 10);
        const hpHeight = this.tipo === 'jefe' ? 8 : 4;
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(hpX - 1, hpY - 1, hpW + 2, hpHeight + 2);
        ctx.fillStyle = '#ff3333';
        ctx.fillRect(hpX, hpY, hpW, hpHeight);
        ctx.fillStyle = this.hp / this.maxHp > 0.5 ? '#44ff44' : '#ffaa00';
        ctx.fillRect(hpX, hpY, (this.hp / this.maxHp) * hpW, hpHeight);

        if (this.esVolador) {
            ctx.fillStyle = 'rgba(255,100,100,0.3)';
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    tomarDano(dano) {
        this.hp -= dano;
        this.hitTimer = 6;
        const dir = this.x < jugador.x ? -1 : 1;
        this.x += dir * 5;
        if (this.hp <= 0) {
            this.hp = 0;
            return true;
        }
        return false;
    }
}

// ============================================================
// 🧠 INSTANCIAS
// ============================================================
const jugador = new Player();

// ============================================================
// 🏪 TIENDA DE MEJORAS (con botón CONTINUAR arriba)
// ============================================================
function mostrarTienda() {
    enTienda = true;
    enPausa = true;

    const tiendaDiv = document.createElement('div');
    tiendaDiv.id = 'tienda-overlay';
    tiendaDiv.innerHTML = `
        <h2>🏪 TIENDA</h2>
        <p class="subtitle">Oleada ${oleadaActual} | 🪙 ${monedas} monedas</p>
        <button class="btn-continuar" onclick="cerrarTienda()">➡️ CONTINUAR</button>
        <div class="tienda-grid">
            ${generarBotonesTienda()}
        </div>
    `;

    document.getElementById('game-container').appendChild(tiendaDiv);
}

function generarBotonesTienda() {
    const items = [
        { id: 'dobleSalto', nombre: '⬆️⬆️ Doble Salto', precio: 30, comprado: jugador.dobleSaltoActivo },
        { id: 'disparoArea', nombre: '💥 Disparo en Área', precio: 40, comprado: jugador.disparoAreaActivo },
        { id: 'velocidad', nombre: '💨 +Velocidad', precio: 25, comprado: mejoras.velocidad },
        { id: 'vidaExtra', nombre: '❤️ +25 Vida Max', precio: 35, comprado: mejoras.vidaExtra },
        { id: 'danoExtra', nombre: '⚔️ +5 Daño (máx. 3 veces)', precio: 30, comprado: mejoras.danoExtra >= 3 },
        { id: 'curar', nombre: '🩹 Curar 50 HP', precio: 20, comprado: false },
    ];

    return items.map(item => {
        if (item.id === 'danoExtra') {
            const comprado = mejoras.danoExtra >= 3;
            const texto = comprado ? '✅ MÁXIMO' : `🪙 ${item.precio}`;
            return `
                <button class="tienda-btn" onclick="comprarMejora('${item.id}')" ${comprado ? 'disabled' : ''}>
                    ${item.nombre} (${mejoras.danoExtra}/3)<br>
                    <span class="${comprado ? 'comprado' : 'precio'}">${texto}</span>
                </button>
            `;
        }
        return `
            <button class="tienda-btn" onclick="comprarMejora('${item.id}')" ${item.comprado ? 'disabled' : ''}>
                ${item.nombre}<br>
                <span class="${item.comprado ? 'comprado' : 'precio'}">${item.comprado ? '✅ COMPRADO' : '🪙 ' + item.precio}</span>
            </button>
        `;
    }).join('');
}

function comprarMejora(id) {
    const precios = {
        dobleSalto: 30,
        disparoArea: 40,
        velocidad: 25,
        vidaExtra: 35,
        danoExtra: 30,
        curar: 20
    };

    if (monedas < precios[id]) {
        alert('❌ No tienes suficientes monedas!');
        return;
    }

    switch (id) {
        case 'dobleSalto':
            if (jugador.dobleSaltoActivo) return;
            jugador.dobleSaltoActivo = true;
            monedas -= precios[id];
            break;
        case 'disparoArea':
            if (jugador.disparoAreaActivo) return;
            jugador.disparoAreaActivo = true;
            monedas -= precios[id];
            break;
        case 'velocidad':
            if (mejoras.velocidad) return;
            jugador.speed += 1.2;
            mejoras.velocidad = true;
            monedas -= precios[id];
            break;
        case 'vidaExtra':
            if (mejoras.vidaExtra) return;
            jugador.maxHp += 25;
            jugador.hp = Math.min(jugador.hp + 25, jugador.maxHp);
            mejoras.vidaExtra = true;
            monedas -= precios[id];
            break;
        case 'danoExtra':
            if (mejoras.danoExtra >= 3) return;
            jugador.danoExtra += 5;
            mejoras.danoExtra++;
            monedas -= precios[id];
            break;
        case 'curar':
            jugador.hp = Math.min(jugador.hp + 50, jugador.maxHp);
            monedas -= precios[id];
            break;
    }

    actualizarUI();
    // Refrescar la tienda
    const tiendaDiv = document.getElementById('tienda-overlay');
    if (tiendaDiv) {
        tiendaDiv.innerHTML = `
            <h2>🏪 TIENDA</h2>
            <p class="subtitle">Oleada ${oleadaActual} | 🪙 ${monedas} monedas</p>
            <button class="btn-continuar" onclick="cerrarTienda()">➡️ CONTINUAR</button>
            <div class="tienda-grid">
                ${generarBotonesTienda()}
            </div>
        `;
    }
}

function cerrarTienda() {
    const tiendaDiv = document.getElementById('tienda-overlay');
    if (tiendaDiv) tiendaDiv.remove();
    enTienda = false;
    enPausa = false;
}

window.comprarMejora = comprarMejora;
window.cerrarTienda = cerrarTienda;

// ============================================================
// 🎮 SISTEMA DE OLEADAS
// ============================================================
function iniciarOleada() {
    if (oleadaActual > 1 && oleadaActual <= MAX_OLEADA_TIENDA &&
        oleadaActual % OLEADAS_PARA_TIENDA === 0 && !enTienda) {
        mostrarTienda();
        return;
    }

    let baseEnemigos = 3 + Math.floor(oleadaActual * 1.5);

    if (oleadaActual <= 20) {
        baseEnemigos = 3 + Math.floor(oleadaActual * 1.6);
    } else if (oleadaActual <= 40) {
        baseEnemigos = 20 + Math.floor((oleadaActual - 20) * 0.9);
    } else if (oleadaActual <= 60) {
        baseEnemigos = 38 + Math.floor((oleadaActual - 40) * 0.6);
    } else if (oleadaActual <= 80) {
        baseEnemigos = 50 + Math.floor((oleadaActual - 60) * 0.4);
    } else {
        baseEnemigos = 58 + Math.floor((oleadaActual - 80) * 0.25);
    }

    enemigosTotalOla = Math.min(baseEnemigos, 120);
    enemigosPorGenerar = enemigosTotalOla;
    enemigosEliminados = 0;
    ataqueFlanco = (oleadaActual >= 6 && oleadaActual % 2 === 0);
}

function gestionarOleadas() {
    if (enPausa || enTienda || gameOver) return;

    if (enemigosPorGenerar > 0) {
        timerGeneracion++;
        let delay = Math.max(6, 70 - oleadaActual * 2);
        if (oleadaActual > 30) delay = Math.max(4, 30 - oleadaActual * 0.8);
        if (oleadaActual > 60) delay = Math.max(3, 15 - oleadaActual * 0.4);

        if (timerGeneracion > delay) {
            const enemigo = generarEnemigo();
            enemigos.push(enemigo);
            enemigosPorGenerar--;
            timerGeneracion = 0;

            if (ataqueFlanco && Math.random() < 0.45 && enemigosPorGenerar > 0) {
                const enemigo2 = generarEnemigo(true);
                enemigos.push(enemigo2);
                enemigosPorGenerar--;
            }
        }
    } else if (enemigos.length === 0 && enemigosEliminados === enemigosTotalOla) {
        oleadaActual++;
        monedas += Math.floor(oleadaActual * 2.5);
        puntuacionTotal += Math.floor(oleadaActual * 12);
        iniciarOleada();
        actualizarUI();
    }
}

function generarEnemigo(flancoAlternativo = false) {
    let tipo = 'normal';
    const rand = Math.random();
    const ola = oleadaActual;

    if (ola >= 25) {
        if (rand < 0.07) tipo = 'jefe';
        else if (rand < 0.16) tipo = 'volador';
        else if (rand < 0.30) tipo = 'saltador';
        else if (rand < 0.44) tipo = 'esquivador';
        else if (rand < 0.58) tipo = 'tanque';
        else if (rand < 0.72) tipo = 'rapido';
        else tipo = 'normal';
    } else if (ola >= 15) {
        if (rand < 0.05) tipo = 'jefe';
        else if (rand < 0.14) tipo = 'volador';
        else if (rand < 0.28) tipo = 'saltador';
        else if (rand < 0.42) tipo = 'esquivador';
        else if (rand < 0.58) tipo = 'tanque';
        else if (rand < 0.76) tipo = 'rapido';
        else tipo = 'normal';
    } else if (ola >= 10) {
        if (rand < 0.04) tipo = 'jefe';
        else if (rand < 0.12) tipo = 'volador';
        else if (rand < 0.25) tipo = 'saltador';
        else if (rand < 0.38) tipo = 'esquivador';
        else if (rand < 0.55) tipo = 'tanque';
        else if (rand < 0.75) tipo = 'rapido';
        else tipo = 'normal';
    } else if (ola >= 5) {
        if (rand < 0.02) tipo = 'jefe';
        else if (rand < 0.08) tipo = 'volador';
        else if (rand < 0.20) tipo = 'saltador';
        else if (rand < 0.35) tipo = 'esquivador';
        else if (rand < 0.55) tipo = 'tanque';
        else if (rand < 0.75) tipo = 'rapido';
        else tipo = 'normal';
    } else {
        if (rand < 0.25) tipo = 'rapido';
        else tipo = 'normal';
    }

    let flanco = 'normal';
    if (flancoAlternativo) {
        flanco = Math.random() < 0.5 ? 'izquierda' : 'derecha';
    } else if (ataqueFlanco && Math.random() < 0.3) {
        flanco = Math.random() < 0.5 ? 'izquierda' : 'derecha';
    }

    const lado = Math.random() < 0.5 ? -1 : 1;
    let spawnX = lado === -1 ? -60 : W + 60;
    let spawnY = 50 + Math.random() * 100;

    if (tipo === 'volador') {
        spawnY = 60 + Math.random() * 120;
    }

    return new Enemy(spawnX, spawnY, tipo, flanco);
}

// ============================================================
// 💥 COLISIONES
// ============================================================
function chequearColisiones() {
    for (let i = proyectiles.length - 1; i >= 0; i--) {
        const p = proyectiles[i];
        let proyectilUsado = false;

        for (let j = enemigos.length - 1; j >= 0; j--) {
            const e = enemigos[j];
            if (p.x < e.x + e.width && p.x + p.width > e.x &&
                p.y < e.y + e.height && p.y + p.height > e.y) {

                const murio = e.tomarDano(p.damage);
                proyectilUsado = true;

                if (murio) {
                    monedas += e.recompensa || 5;
                    puntuacionTotal += e.recompensa * 2;
                    enemigos.splice(j, 1);
                    enemigosEliminados++;
                    actualizarUI();
                }
                break;
            }
        }

        if (proyectilUsado) {
            proyectiles.splice(i, 1);
        }
    }

    for (const e of enemigos) {
        if (jugador.x < e.x + e.width && jugador.x + jugador.width > e.x &&
            jugador.y < e.y + e.height && jugador.y + jugador.height > e.y) {

            if (jugador.framesInvulnerabilidad <= 0 && !jugador.isDashing) {
                let dano = e.damage;
                if (jugador.isBlocking) {
                    dano = Math.max(1, Math.floor(dano * 0.2));
                }
                jugador.hp -= dano;
                jugador.framesInvulnerabilidad = 60;

                if (jugador.hp <= 0) {
                    gameOver = true;
                    mostrarGameOver();
                }
                actualizarUI();
            }
        }
    }
}

// ============================================================
// 🏆 TABLA DE PUNTUACIÓN
// ============================================================
function guardarPuntuacion() {
    const nombre = prompt('🏆 ¡RÉCORD! Ingresa tu nombre:', 'Jugador') || 'Anónimo';
    const entrada = {
        nombre: nombre.substring(0, 12),
        oleada: oleadaActual,
        monedas: monedas,
        puntuacion: puntuacionTotal,
        fecha: new Date().toLocaleDateString()
    };

    tablaPuntuacion.push(entrada);
    tablaPuntuacion.sort((a, b) => b.puntuacion - a.puntuacion);
    if (tablaPuntuacion.length > 20) tablaPuntuacion = tablaPuntuacion.slice(0, 20);

    localStorage.setItem('tablaPuntuacionOleadas', JSON.stringify(tablaPuntuacion));
    actualizarTablaPuntuacion();
}

function actualizarTablaPuntuacion() {
    if (!scoreboardList) return;
    if (tablaPuntuacion.length === 0) {
        scoreboardList.innerHTML = '<div class="score-entry" style="color:#667788;text-align:center;padding:8px;">Sin puntuaciones aún. ¡Sé el primero!</div>';
        return;
    }

    scoreboardList.innerHTML = tablaPuntuacion.map((entry, index) => `
        <div class="score-entry">
            <span class="pos">#${index + 1}</span>
            <span class="name">${entry.nombre}</span>
            <span class="score">${entry.puntuacion}</span>
            <span class="wave-info">🌊 ${entry.oleada} | 🪙 ${entry.monedas}</span>
        </div>
    `).join('');
}

// ============================================================
// 📺 GAME OVER
// ============================================================
function mostrarGameOver() {
    guardarPuntuacion();

    const mensaje = `💀 ¡HAS MUERTO!\n\n` +
        `🔥 Oleada: ${oleadaActual}\n` +
        `🪙 Monedas: ${monedas}\n` +
        `🏆 Puntuación: ${puntuacionTotal}\n\n` +
        `🔄 ¿Reiniciar?`;

    setTimeout(() => {
        if (confirm(mensaje)) {
            location.reload();
        }
    }, 300);
}

// ============================================================
// 🖥️ UI
// ============================================================
function actualizarUI() {
    hpSpan.textContent = `❤️ Vida: ${Math.max(0, Math.round(jugador.hp))}/${jugador.maxHp}`;
    waveSpan.textContent = `🔥 Oleada: ${oleadaActual}`;
    coinSpan.textContent = `🪙 Monedas: ${monedas}`;
    scoreDisplay.textContent = `🏆 ${puntuacionTotal}`;
}

// ============================================================
// 🎮 CONTROLES
// ============================================================
function manejarEntrada(accion, estado) {
    switch (accion) {
        case 'izq':
            teclas.izquierda = estado;
            if (estado) jugador.mirandoDerecha = false;
            break;
        case 'der':
            teclas.derecha = estado;
            if (estado) jugador.mirandoDerecha = true;
            break;
        case 'saltar':
            if (estado) jugador.saltar();
            break;
        case 'disparar':
            if (estado) jugador.disparar();
            break;
        case 'dash':
            if (estado) jugador.dash();
            break;
        case 'bloquear':
            jugador.isBlocking = estado;
            break;
        case 'pausa':
            if (estado && !enTienda) {
                enPausa = !enPausa;
            }
            break;
    }
}

// ---- Teclado ----
document.addEventListener('keydown', (e) => {
    switch (e.key.toLowerCase()) {
        case 'a':
        case 'arrowleft':
            manejarEntrada('izq', true);
            e.preventDefault();
            break;
        case 'd':
        case 'arrowright':
            manejarEntrada('der', true);
            e.preventDefault();
            break;
        case 'w':
        case 'arrowup':
            manejarEntrada('saltar', true);
            e.preventDefault();
            break;
        case 'j':
            manejarEntrada('disparar', true);
            e.preventDefault();
            break;
        case 'k':
            manejarEntrada('dash', true);
            e.preventDefault();
            break;
        case 'l':
            manejarEntrada('bloquear', true);
            e.preventDefault();
            break;
        case 'p':
            manejarEntrada('pausa', true);
            e.preventDefault();
            break;
    }
});

document.addEventListener('keyup', (e) => {
    switch (e.key.toLowerCase()) {
        case 'a':
        case 'arrowleft':
            manejarEntrada('izq', false);
            e.preventDefault();
            break;
        case 'd':
        case 'arrowright':
            manejarEntrada('der', false);
            e.preventDefault();
            break;
        case 'l':
            manejarEntrada('bloquear', false);
            e.preventDefault();
            break;
        case 'p':
            manejarEntrada('pausa', false);
            e.preventDefault();
            break;
    }
});

// ---- Botones móviles ----
const botonesMap = [
    { id: 'btn-left', accion: 'izq' },
    { id: 'btn-right', accion: 'der' },
    { id: 'btn-jump', accion: 'saltar' },
    { id: 'btn-shoot', accion: 'disparar' },
    { id: 'btn-dash', accion: 'dash' },
    { id: 'btn-block', accion: 'bloquear' }
];

botonesMap.forEach(({ id, accion }) => {
    const btn = document.getElementById(id);
    if (!btn) return;

    const start = (e) => { e.preventDefault();
        manejarEntrada(accion, true); };
    const end = (e) => { e.preventDefault();
        manejarEntrada(accion, false); };

    btn.addEventListener('mousedown', start);
    btn.addEventListener('mouseup', end);
    btn.addEventListener('mouseleave', end);
    btn.addEventListener('touchstart', start, { passive: false });
    btn.addEventListener('touchend', end, { passive: false });
});

// ============================================================
// 🔄 BUCLE PRINCIPAL
// ============================================================
function gameLoop() {
    frames++;

    ctx.clearRect(0, 0, W, H);

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#1a2330');
    grad.addColorStop(1, '#111a22');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#1a252f';
    ctx.fillRect(0, SUELO_Y, W, 20);
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let i = 0; i < W; i += 20) {
        ctx.fillRect(i, SUELO_Y, 1, 20);
    }

    if (enPausa && !enTienda) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 40px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⏸️ PAUSA', W / 2, H / 2 - 20);
        ctx.font = '18px monospace';
        ctx.fillStyle = '#888';
        ctx.fillText('Presiona [P] para continuar', W / 2, H / 2 + 40);
        requestAnimationFrame(gameLoop);
        return;
    }

    if (!gameOver && !enTienda) {
        if (!jugador.isDashing) {
            if (teclas.izquierda && !jugador.isBlocking) jugador.velX = -jugador.speed;
            else if (teclas.derecha && !jugador.isBlocking) jugador.velX = jugador.speed;
            else jugador.velX = 0;
        }

        jugador.update();
        jugador.draw();

        gestionarOleadas();
        chequearColisiones();

        for (const e of enemigos) {
            e.update();
            e.draw();
        }

        for (let i = proyectiles.length - 1; i >= 0; i--) {
            const p = proyectiles[i];
            p.x += p.velX;
            if (p.velY !== undefined) p.y += p.velY;

            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 15;
            ctx.fillRect(p.x, p.y, p.width, p.height);
            ctx.shadowBlur = 0;

            if (p.x < -30 || p.x > W + 30 || p.y < -30 || p.y > H + 30) {
                proyectiles.splice(i, 1);
            }
        }

        actualizarUI();

        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`👾 ${enemigos.length}  |  🌀 ${enemigosPorGenerar}  |  🌊 ${oleadaActual}`, 16, H - 8);

        if (ataqueFlanco && enemigos.length > 0) {
            ctx.fillStyle = 'rgba(255,100,0,0.15)';
            ctx.fillRect(0, 0, 4, H);
            ctx.fillRect(W - 4, 0, 4, H);
            ctx.fillStyle = 'rgba(255,100,0,0.4)';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('⚔️ FLANCO ⚔️', W / 2, 14);
        }

        if (oleadaActual > 50) {
            ctx.fillStyle = `rgba(255,0,0,${Math.min(0.3, (oleadaActual - 50) / 150)})`;
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.font = 'bold 16px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`⚠️ OLEADA ${oleadaActual} ⚠️`, W / 2, 30);
        }
    }

    requestAnimationFrame(gameLoop);
}

// ============================================================
// 🚀 INICIO
// ============================================================
actualizarTablaPuntuacion();
iniciarOleada();
gameLoop();
